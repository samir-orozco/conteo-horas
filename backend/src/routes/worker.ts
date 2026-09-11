import { FastifyInstance } from 'fastify';
import { Prisma, ModalidadTrabajo } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { esDescriptorValido, identificarRostro } from '../utils/rostro';
import { camposDeAutenticacion } from '../utils/metodoMarcacion';
import { enviarTelegram } from '../utils/telegram';
import { notificar } from '../utils/notificaciones';
import { rangoDiaBogota } from '../utils/fechas';
import { exigeDispositivo, permiteCedula, geocercoConfig, dispositivoValido, sedesConGeocercaDe, empresaUsaSedes, exigeRetoDePose } from '../utils/kioscoConfig';
import { decidirUbicacionDeMarca, MODALIDAD_POR_DEFECTO, puedeCerrarAqui } from '../utils/modalidad';
import { VENTANA_TURNO_MS } from '../utils/cierreTurnos';
import { puedeSalirAAlmorzar, dentroDeLaVentana } from '../utils/almuerzo';
import { salidaAntesDeHora, ventanaDeSalidaTemprana, ventanaDeLlegadaTarde, llegadaTarde } from '../utils/tardanzas';
import { almuerzoSinRegreso } from '../utils/cierreAlmuerzo';
import { asegurarDiaSinFallar } from '../utils/materializarDias';

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// Motivos de novedad válidos (mismos de la vista interna del colaborador)
const TIPOS_NOVEDAD = new Set([
  'VACACIONES', 'INCAPACIDAD_EPS', 'INCAPACIDAD_ARL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD',
  'LICENCIA_LUTO', 'CALAMIDAD', 'MEDICO', 'PERSONAL', 'NO_REMUNERADO', 'OTRO',
]);

// Ventana máxima para considerar que una entrada abierta es el turno en curso al
// marcar salida. Cubre turnos que cruzan medianoche (ej. 22:00→06:00) sin atar por
// error una salida a un turno olvidado de días atrás (que el auto-cierre ya maneja).
//
// La define el auto-cierre porque es él quien no puede violarla: mientras esta
// ventana siga abierta, el turno es de la persona y el barrido no lo toca.

// Candado en memoria contra marcas dobles concurrentes del mismo colaborador
// (reintento de red, doble pestaña). El kiosco corre en un único proceso Node.
const marcandoAhora = new Set<string>();

// Límite de rate para los endpoints públicos del kiosco (anti fuerza bruta / enumeración)
const rlPublico = { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } };

// Cachea los descriptores faciales enrolados por empresa unos segundos: los
// reintentos de login-rostro (lo normal es 2-3 seguidos) no vuelven a golpear la BD.
// TTL corto para que un enrolamiento nuevo entre en efecto casi de inmediato.
const CACHE_ROSTROS_MS = 30_000;
type Enrolado = { id: string; nombre: string; apellido: string; cargo: string | null; cedula: string; empresaId: string; modalidad: ModalidadTrabajo; rostroDescriptor: Prisma.JsonValue };
const cacheRostros = new Map<string, { ts: number; enrolados: Enrolado[] }>();
async function enroladosDeEmpresa(empresaId: string): Promise<Enrolado[]> {
  const hit = cacheRostros.get(empresaId);
  if (hit && Date.now() - hit.ts < CACHE_ROSTROS_MS) return hit.enrolados;
  const enrolados = await prisma.colaborador.findMany({
    where: { empresaId, activo: true, rostroDescriptor: { not: Prisma.DbNull } },
    select: { id: true, nombre: true, apellido: true, cargo: true, cedula: true, empresaId: true, modalidad: true, rostroDescriptor: true },
  });
  cacheRostros.set(empresaId, { ts: Date.now(), enrolados });
  return enrolados;
}

// ¿A ESTA persona se le va a validar la ubicación al marcar?
//
// No basta con saber si la empresa usa geolocalización: eso es lo único que el
// kiosco sabe ANTES del login, y con eso le anunciaba "sin ubicación no podrás
// marcar" a gente a la que no se le iba a validar nada. Un presencial sin sedes
// en una empresa que usa sedes, por ejemplo, no tiene contra qué compararse.
async function seLeValidaLaUbicacion(colaboradorId: string, empresaId: string, modalidad: ModalidadTrabajo): Promise<boolean> {
  if (modalidad !== 'PRESENCIAL') return false;
  if ((await sedesConGeocercaDe(colaboradorId)).length > 0) return true;
  return (await geocercoConfig(empresaId)) !== null;
}

// Foto de verificación facial: data URI JPEG pequeño tomado en el navegador al
// marcar. Valida el prefijo, el tamaño y que los bytes empiecen con la firma JPEG
// (FF D8 FF), para no almacenar datos arbitrarios en la columna.
function fotoValida(foto: unknown): foto is string {
  const PREFIJO = 'data:image/jpeg;base64,';
  if (typeof foto !== 'string' || !foto.startsWith(PREFIJO) || foto.length > 300_000) return false;
  try {
    const cabecera = Buffer.from(foto.slice(PREFIJO.length, PREFIJO.length + 24), 'base64');
    return cabecera.length >= 3 && cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff;
  } catch {
    return false;
  }
}

// Ventana de almuerzo del turno en curso y si esa salida ya se marcó.
//
// La ventana sale de `dias_esperados`, NO del horario vigente. Si el admin la
// configuró hoy, el día de hoy ya se congeló sin ella y su descuento se sigue
// haciendo a la manera vieja (minutos fijos); ofrecer el almuerzo ahí lo cobraría
// dos veces. Aplica desde mañana, igual que cualquier cambio de horario.
//
// `fechaAncla` es la del turno abierto, no la de hoy: un turno nocturno que
// almuerza a la 01:00 pertenece al día en que ENTRÓ, y su ventana vive en la
// fila de ese día.
async function almuerzoDelTurno(colaboradorId: string, fechaAncla: Date) {
  const { inicioDia, finDia } = rangoDiaBogota(fechaAncla);
  const [dia, marcados] = await Promise.all([
    // Por rango y no por clave exacta: MySQL puede devolver la fecha con
    // milisegundos y una fila así quedaría huérfana sin que nadie se entere.
    prisma.diaEsperado.findFirst({
      where: { colaboradorId, fecha: { gte: inicioDia, lt: finDia } },
      // `fecha` hace falta para saber si la persona está DENTRO de la ventana
      // ahora mismo: la de un turno nocturno cae en la madrugada siguiente.
      select: { fecha: true, almuerzoInicio: true, almuerzoFin: true },
    }),
    prisma.registro.count({
      where: { colaboradorId, salidaAlmuerzo: true, salida: { gte: new Date(Date.now() - VENTANA_TURNO_MS) } },
    }),
  ]);
  const yaAlmorzo = marcados > 0;
  return { ventana: dia, yaAlmorzo, puede: puedeSalirAAlmorzar(dia, yaAlmorzo) };
}

// Deja una novedad pendiente de aprobación y avisa al administrador. La usan el
// endpoint propio y la salida temprana, que la guarda junto con la marca: en dos
// llamadas separadas, si la segunda fallaba la salida quedaba escrita y el motivo
// se perdía sin que nadie se enterara.
// `registroId` va cuando la novedad nace de una salida temprana: esa novedad es
// parte de la marcación y muere con ella. Sin él —cuando la reporta el worker
// desde su propia pantalla— la novedad vive por su cuenta.
//
// No sirve identificarlas por colaborador y día: un día puede tener varias
// novedades legítimas (cita médica en la mañana, una urgencia en la tarde), así
// que el vínculo tiene que ser explícito.
//
// `ventana` también viene de la salida temprana: el tramo que la novedad excusa,
// desde que se fue hasta el fin de su franja. Sin ella la novedad queda de día
// completo, y al aprobarla el saldo excusaba también las horas que sí trabajó.
async function crearNovedad(colaboradorId: string, tipo: string, descripcion: string, registroId?: string, ventana?: { horaInicio: string; horaFin: string } | null) {
  const { inicioDia } = rangoDiaBogota();
  const permiso = await prisma.permiso.create({
    data: {
      colaboradorId,
      tipo: tipo as any,
      descripcion: descripcion.trim() || null,
      fechaInicio: inicioDia,
      fechaFin: inicioDia,
      aprobado: false,
      ...(registroId ? { registroId } : {}),
      ...(ventana ?? {}),
    },
  });
  const quien = await prisma.colaborador.findUnique({
    where: { id: colaboradorId },
    select: { nombre: true, apellido: true, empresaId: true },
  });
  if (quien) {
    notificar(quien.empresaId, {
      tipo: 'NOVEDAD_PENDIENTE',
      titulo: `Novedad por aprobar: ${quien.nombre} ${quien.apellido}`,
      cuerpo: `Reportó una novedad (${tipo}) pendiente de tu aprobación.`,
      entidad: 'colaborador', entidadId: colaboradorId,
    });
  }
  return permiso;
}

// Alerta de llegada tarde por Telegram (si la empresa lo activó). No bloquea la marca.
async function alertarTardanzaTelegram(empresaId: string, nombre: string, ahoraBog: Date, minutosTarde: number) {
  const cfgs = await prisma.configuracion.findMany({
    where: { empresaId, clave: { in: ['TELEGRAM_ALERTAS_TARDE', 'TELEGRAM_CHAT_ID'] } },
  });
  const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
  if (map.TELEGRAM_ALERTAS_TARDE !== '1' || !map.TELEGRAM_CHAT_ID) return;
  const h = ahoraBog.getHours();
  const hora = `${h % 12 || 12}:${String(ahoraBog.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
  const tardeTxt = minutosTarde >= 60 ? `${Math.floor(minutosTarde / 60)}h ${minutosTarde % 60}min` : `${minutosTarde} min`;
  await enviarTelegram(map.TELEGRAM_CHAT_ID, `⚠️ <b>${nombre}</b> llegó tarde\n🕐 ${hora} · ${tardeTxt} tarde`);
}

// Esquemas de body: rechazan tipos inesperados (p. ej. `cedula` como objeto de
// filtro Prisma) ANTES del handler → cierran la inyección de operadores.
const loginSchema = {
  body: {
    type: 'object', additionalProperties: false,
    required: ['cedula', 'marcadorToken'],
    properties: {
      cedula: { type: 'string', minLength: 1, maxLength: 30 },
      marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
      deviceToken: { type: 'string', maxLength: 100 },
    },
  },
};
const loginRostroSchema = {
  body: {
    type: 'object', additionalProperties: false,
    required: ['descriptor', 'marcadorToken'],
    properties: {
      descriptor: { type: 'array', items: { type: 'number' }, maxItems: 256 },
      marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
      deviceToken: { type: 'string', maxLength: 100 },
    },
  },
};
const vincularSchema = {
  body: {
    type: 'object', additionalProperties: false,
    required: ['marcadorToken', 'codigo'],
    properties: {
      marcadorToken: { type: 'string', minLength: 1, maxLength: 100 },
      codigo: { type: 'string', minLength: 1, maxLength: 12 },
    },
  },
};

// Nota: el kiosco NUNCA se bloquea por mora o suspensión — los colaboradores
// siguen marcando sus horas; el cobro se gestiona en el panel del admin.
export default async function workerRoutes(app: FastifyInstance) {
  // Info del kiosco a partir del token del link único de la empresa
  app.get('/kiosco/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken: token } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });
    return {
      empresa: empresa.nombre,
      requiereDispositivo: await exigeDispositivo(empresa.id),
      permiteCedula: await permiteCedula(empresa.id),
      // Si el ingreso facial pide girar la cabeza antes de capturar. Apagado por
      // defecto: un reto que falle deja a la gente sin marcar, así que se
      // enciende por empresa y se puede apagar sin desplegar.
      exigeReto: await exigeRetoDePose(empresa.id),
      // El kiosco pide el GPS si lo exige la geocerca de la empresa O si hay
      // alguna sede con ubicación: con sedes, quién marca dónde solo se sabe
      // por coordenadas, así que hay que pedirlas antes de saber quién es.
      exigeUbicacion: (await geocercoConfig(empresa.id)) !== null || (await empresaUsaSedes(empresa.id)),
    };
  });

  // Vincula este dispositivo al kiosco con el código de 6 dígitos que genera el admin
  app.post('/vincular', { ...rlPublico, schema: vincularSchema }, async (request, reply) => {
    const { marcadorToken, codigo } = request.body as { marcadorToken: string; codigo: string };
    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    const cfg = await prisma.configuracion.findUnique({
      where: { empresaId_clave: { empresaId: empresa.id, clave: 'CODIGO_KIOSCO' } },
    });
    const guardado = cfg ? JSON.parse(cfg.valor) as { codigo: string; expira: number } : null;
    if (!guardado || guardado.codigo !== codigo || Date.now() > guardado.expira) {
      return reply.code(401).send({ error: 'Código inválido o vencido. Genera uno nuevo en el panel.' });
    }

    const cantidad = await prisma.dispositivoKiosco.count({ where: { empresaId: empresa.id } });
    const dispositivo = await prisma.dispositivoKiosco.create({
      data: {
        empresaId: empresa.id,
        nombre: `Dispositivo ${cantidad + 1}`,
        token: crypto.randomBytes(24).toString('hex'),
      },
    });
    // El código es de un solo uso
    await prisma.configuracion.delete({ where: { id: cfg!.id } });
    return { deviceToken: dispositivo.token, nombre: dispositivo.nombre };
  });

  // Login del kiosco con cédula, amarrado al link único de la empresa
  app.post('/login', { ...rlPublico, schema: loginSchema }, async (request, reply) => {
    const { cedula, marcadorToken, deviceToken } = request.body as { cedula: string; marcadorToken: string; deviceToken?: string };

    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    if (!(await permiteCedula(empresa.id))) {
      return reply.code(403).send({ error: 'Esta empresa desactivó la marcación con cédula. Usa el reconocimiento facial.' });
    }

    // Con la protección activa, solo dispositivos vinculados pueden marcar
    if (await exigeDispositivo(empresa.id)) {
      if (!(await dispositivoValido(empresa.id, deviceToken))) {
        return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
      }
    }

    const col = await prisma.colaborador.findFirst({
      where: { cedula, activo: true, empresaId: empresa.id },
    });
    if (!col) return reply.code(401).send({ error: 'Cédula no registrada en esta empresa' });

    // `metodo` viaja DENTRO del token firmado y no en la respuesta: es la única
    // forma de que la marcación registre con qué se autenticó de verdad. Si el
    // kiosco lo declarara en el cuerpo de `/marcar`, cualquiera lo cambiaría
    // desde el inspector y la medición diría lo contrario de la realidad.
    const token = app.jwt.sign(
      { id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId, metodo: 'CEDULA' },
      { expiresIn: '12h' }
    );
    // Las sedes viajan con la sesión para que el kiosco pueda mostrar dónde le
    // toca marcar a esta persona, junto al nombre.
    const sedesDelCol = await prisma.colaboradorSede.findMany({
      where: { colaboradorId: col.id, sede: { activa: true } },
      select: { sede: { select: { id: true, nombre: true } } },
      orderBy: { sede: { nombre: 'asc' } },
    });
    return {
      token,
      colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo, modalidad: col.modalidad },
      sedes: sedesDelCol.map(s => s.sede),
      validaUbicacion: await seLeValidaLaUbicacion(col.id, col.empresaId, col.modalidad),
    };
  });

  // Login del kiosco con reconocimiento facial: el navegador ya calculó el
  // descriptor (128 floats) con face-api.js tras una captura estable. El servidor
  // compara contra los enrolados de esa empresa.
  // OJO: el descriptor lo calcula el cliente; hoy no hay liveness ni anti-replay en
  // el servidor, así que la foto adjunta debe tomarse como evidencia, no como
  // prueba fuerte de identidad (pendiente: liveness real / reto firmado).
  app.post('/login-rostro', { ...rlPublico, schema: loginRostroSchema }, async (request, reply) => {
    const { descriptor, marcadorToken, deviceToken } = request.body as {
      descriptor: unknown; marcadorToken: string; deviceToken?: string;
    };
    if (!esDescriptorValido(descriptor)) return reply.code(400).send({ error: 'Rostro no capturado correctamente' });

    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    if (await exigeDispositivo(empresa.id)) {
      if (!(await dispositivoValido(empresa.id, deviceToken))) {
        return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
      }
    }

    const veredicto = identificarRostro(descriptor, await enroladosDeEmpresa(empresa.id));

    // Se registra SIEMPRE, acepte o no. El margen es el dato que hoy no existe y
    // que hace falta para fijar `MARGEN_AMBIGUO` con la distribución real en vez
    // de con un juicio. Sin esto, afinar el umbral seguiría siendo adivinar.
    app.log.info({
      evento: 'login-rostro', empresaId: empresa.id, veredicto: veredicto.tipo,
      distancia: veredicto.tipo === 'SIN_COINCIDENCIA' ? null : veredicto.distancia,
      margen: veredicto.tipo === 'SIN_COINCIDENCIA' ? null : veredicto.margen,
    }, 'reconocimiento facial');

    if (veredicto.tipo === 'SIN_COINCIDENCIA') {
      return reply.code(401).send({ error: 'Rostro no reconocido. Intenta de nuevo o marca con tu cédula.' });
    }

    // DOS PERSONAS DEMASIADO CERCA: se sabe que es alguien de las dos y no cuál.
    // Antes se elegía a la más parecida y se seguía, que es exactamente cómo se
    // le abonan las horas de una persona a otra. Un rechazo cuesta ocho segundos;
    // una identificación falsa no se descubre hasta que alguien reclama su
    // nómina. El mensaje NO dice que hubo dos parecidos: eso le contaría a quien
    // marca algo sobre las caras de sus compañeros.
    if (veredicto.tipo === 'AMBIGUA') {
      return reply.code(401).send({ error: 'No pudimos confirmar quién eres. Acércate un poco más e intenta de nuevo, o marca con tu cédula.' });
    }

    const col = veredicto.colaborador;
    // La distancia del match la calculaba `mejorCoincidencia` y se tiraba. Ahora
    // viaja en el token y queda en la marcación: una distancia repetida al
    // milímetro entre marcaciones es la huella de un descriptor copiado y
    // reenviado, cosa que no ocurre en capturas vivas.
    const token = app.jwt.sign(
      { id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId, metodo: 'ROSTRO', distancia: veredicto.distancia },
      { expiresIn: '12h' }
    );
    // Las sedes viajan con la sesión para que el kiosco pueda mostrar dónde le
    // toca marcar a esta persona, junto al nombre.
    const sedesDelCol = await prisma.colaboradorSede.findMany({
      where: { colaboradorId: col.id, sede: { activa: true } },
      select: { sede: { select: { id: true, nombre: true } } },
      orderBy: { sede: { nombre: 'asc' } },
    });
    return {
      token,
      colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo, modalidad: col.modalidad },
      sedes: sedesDelCol.map(s => s.sede),
      validaUbicacion: await seLeValidaLaUbicacion(col.id, col.empresaId, col.modalidad),
    };
  });

  // Estado del día: retorna si hay entrada abierta (sin salida). Select mínimo: no
  // trae las fotos (LongText) ni el resto de columnas que el kiosco no usa.
  app.get('/estado', { preHandler: [app.authenticate] }, async (request) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return { error: 'No autorizado' };

    const { inicioDia, finDia } = rangoDiaBogota();
    const [abierto, cerradoHoy, ultimoCerrado] = await Promise.all([
      prisma.registro.findFirst({
        where: {
          colaboradorId: payload.id,
          entrada: { gte: new Date(Date.now() - VENTANA_TURNO_MS) },
          salida: null,
        },
        orderBy: { creadoEn: 'desc' },
        select: { entrada: true, fecha: true },
      }),
      // Último turno YA COMPLETO de hoy (entrada + salida). El kiosco lo usa para
      // mostrar el resumen del día y para confirmar antes de abrir un turno nuevo
      // (evita la entrada duplicada de quien cree que no le quedó la salida).
      prisma.registro.findFirst({
        where: {
          colaboradorId: payload.id,
          fecha: { gte: inicioDia, lt: finDia },
          entrada: { not: null },
          salida: { not: null },
        },
        orderBy: { salida: 'desc' },
        select: { entrada: true, salida: true },
      }),
      // Último turno cerrado del TURNO en curso (no del día calendario): si fue
      // una salida a almorzar, la persona está en su almuerzo ahora mismo.
      prisma.registro.findFirst({
        where: {
          colaboradorId: payload.id,
          salida: { not: null, gte: new Date(Date.now() - VENTANA_TURNO_MS) },
        },
        orderBy: { salida: 'desc' },
        select: { salida: true, salidaAlmuerzo: true },
      }),
    ]);

    // La ventana se ancla al turno abierto; sin turno abierto, al día de hoy.
    const almuerzo = await almuerzoDelTurno(payload.id, abierto?.fecha ?? inicioDia);
    const enAlmuerzo = !abierto && ultimoCerrado?.salidaAlmuerzo === true;

    // ¿Se le pasó la hora de volver? Si sí, el kiosco le pregunta a qué hora
    // regresó en vez de abrirle el turno a esta hora: quien marca a las 17:00 el
    // regreso de un almuerzo de las 12:00 perdería la tarde entera.
    let regresoSugerido: Date | null = null;
    if (enAlmuerzo && ultimoCerrado?.salida) {
      const diaDelAlmuerzo = await prisma.diaEsperado.findFirst({
        where: {
          colaboradorId: payload.id,
          fecha: { gte: rangoDiaBogota(ultimoCerrado.salida).inicioDia, lt: rangoDiaBogota(ultimoCerrado.salida).finDia },
        },
        select: { fecha: true, almuerzoMin: true, almuerzoInicio: true, almuerzoFin: true },
      });
      if (diaDelAlmuerzo) {
        const p = almuerzoSinRegreso(ultimoCerrado.salida, diaDelAlmuerzo, new Date());
        if (p.vencido) regresoSugerido = p.finVentana;
      }
    }

    return {
      entradaAbierta: abierto ? { entrada: abierto.entrada } : null,
      dentroAhora: !!abierto,
      turnoCerradoHoy: cerradoHoy ? { entrada: cerradoHoy.entrada, salida: cerradoHoy.salida } : null,
      // Solo se manda la ventana cuando de verdad se puede usar: el kiosco
      // pregunta exactamente cuando el servidor va a creerle.
      almuerzo: almuerzo.puede
        ? {
            inicio: almuerzo.ventana!.almuerzoInicio!,
            fin: almuerzo.ventana!.almuerzoFin!,
            // Estando dentro, el kiosco lo ofrece en el botón grande en vez de
            // esconderlo detrás de "Registrar Salida". Lo decide el servidor, que
            // es quien tiene la fecha del turno: la ventana de un nocturno cae en
            // la madrugada del día siguiente al que ancla su fila.
            ahora: dentroDeLaVentana(new Date(), almuerzo.ventana!),
          }
        : null,
      enAlmuerzo,
      salidaAlmuerzo: enAlmuerzo ? ultimoCerrado!.salida : null,
      // Con hora: se le pregunta a qué hora volvió. Sin ella: está a tiempo.
      regresoSugerido,
    };
  });

  // Registrar entrada o salida. Si el login fue con rostro, llega la foto de
  // verificación (se conserva 2 meses y luego se borra automáticamente).
  app.post('/marcar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = (request as any).user as { id: string; rol: string; empresaId: string; metodo?: unknown; distancia?: unknown };
    if (payload.rol !== 'WORKER') return reply.code(403).send({ error: 'No autorizado' });

    // Evita marcas dobles concurrentes del mismo colaborador (reintento/doble tap).
    if (marcandoAhora.has(payload.id)) {
      return reply.code(409).send({ error: 'Tu marca se está procesando, espera un momento.' });
    }
    marcandoAhora.add(payload.id);
    try {
      const { foto, lat, lng, almuerzo, regresoA } = (request.body ?? {}) as { foto?: unknown; lat?: unknown; lng?: unknown; almuerzo?: unknown; regresoA?: unknown };
      const fotoGuardar = fotoValida(foto) ? foto : null;
      const pidioAlmuerzo = almuerzo === true;
      // Hora de regreso del almuerzo que la propia persona confirma en el
      // kiosco cuando se le olvidó marcarla. Solo se acepta un instante válido;
      // más abajo se comprueba además que caiga donde debe.
      const regresoPedido = typeof regresoA === 'string' && !Number.isNaN(Date.parse(regresoA))
        ? new Date(regresoA) : null;

      // El colaborador se lee ANTES de decidir sobre la ubicación, y ese orden
      // es el cambio: la geocerca dejó de ser una regla de la empresa para ser
      // una de la persona, así que hay que saber quién es antes de aplicarla.
      const col = await prisma.colaborador.findUnique({
        where: { id: payload.id },
        include: { horario: { include: { franjas: true } } },
      });
      // Si el colaborador no aparece, se trata como PRESENCIAL: ante la duda, la
      // opción segura es la que valida, no la que deja pasar.
      const modalidad = col?.modalidad ?? MODALIDAD_POR_DEFECTO;

      // ===== Dónde está marcando =====
      //
      // A un REMOTO no se le pide ni se le mira la ubicación, así que ni siquiera
      // se consultan sus sedes. A un HIBRIDO sí se le miran, pero solo para dejar
      // constancia de en cuál estaba: nunca para bloquearlo, y por eso tampoco se
      // consulta la geocerca de la empresa, que no identifica ninguna sede.
      const sedesDelTrabajador = modalidad === 'REMOTO' ? [] : await sedesConGeocercaDe(payload.id);
      const geocercaEmpresa = modalidad === 'PRESENCIAL' && sedesDelTrabajador.length === 0
        ? await geocercoConfig(payload.empresaId)
        : null;

      // POST /marcar es la única ruta del kiosco sin schema de Fastify, así que
      // `lat` y `lng` llegan sin tipar. `Number(null)` y `Number('')` dan 0, que
      // es finito y además es una coordenada real (el golfo de Guinea): por eso
      // se comprueban los dos y no se acepta un 0 que en realidad es un faltante.
      const latN = Number(lat), lngN = Number(lng);
      const coords = Number.isFinite(latN) && Number.isFinite(lngN) && (lat !== null && lat !== '' && lng !== null && lng !== '')
        ? { lat: latN, lng: lngN }
        : null;

      const decision = decidirUbicacionDeMarca({ modalidad, sedes: sedesDelTrabajador, geocercaEmpresa, coords });
      if (decision.accion === 'EXIGIR_COORDENADAS') {
        return reply.code(400).send({ error: 'Necesitamos tu ubicación para marcar. Activa el GPS y permite el acceso.', codigo: 'UBICACION_REQUERIDA' });
      }
      if (decision.accion === 'RECHAZAR') {
        return reply.code(403).send({
          error: decision.mensaje, codigo: 'FUERA_DE_UBICACION',
          distancia: decision.distancia, radio: decision.radio,
        });
      }
      const sedeDeLaMarca: string | null = decision.sedeId;

      const ahora = new Date();
      const { ahoraBog, inicioDia, finDia } = rangoDiaBogota(ahora);

      // Turno abierto en curso: se busca por ventana (no por día calendario), para
      // que un turno que cruzó medianoche encuentre su entrada y registre salida en
      // vez de crear una entrada nueva.
      const abierto = await prisma.registro.findFirst({
        where: {
          colaboradorId: payload.id,
          entrada: { gte: new Date(ahora.getTime() - VENTANA_TURNO_MS) },
          salida: null,
        },
        orderBy: { creadoEn: 'desc' },
      });

      // Festivo legal (global) o propio de la empresa del colaborador
      const festHoy = await prisma.diaFestivo.findFirst({
        where: {
          fecha: { gte: inicioDia, lt: finDia },
          OR: [{ empresaId: null }, { empresaId: col?.empresaId }],
        },
      });
      const tipo = festHoy ? 'FESTIVO' : 'NORMAL';

      // El motivo que manda el kiosco cuando el servidor lo pidió: al salir antes
      // de hora o al llegar tarde. Solo se aceptan los tipos conocidos.
      const novedad = (request.body ?? {}) as { novedadTipo?: unknown; novedadDescripcion?: unknown };
      const tipoNovedad = typeof novedad.novedadTipo === 'string' && TIPOS_NOVEDAD.has(novedad.novedadTipo)
        ? novedad.novedadTipo : null;
      const descripcionNovedad = typeof novedad.novedadDescripcion === 'string' ? novedad.novedadDescripcion : '';

      if (abierto) {
        // Entrada y salida en el MISMO sitio. Si abrió turno en El Poblado no
        // puede cerrarlo en Laureles: el turno pertenece a una sede, y permitir
        // lo contrario haría imposible saber dónde trabajó realmente.
        // Los turnos abiertos ANTES de existir las sedes no tienen sede: esos se
        // dejan cerrar donde sea, o quedarían atrapados sin poder marcar salida.
        //
        // Solo aplica a PRESENCIAL. A un HIBRIDO esta regla lo bloquearía justo a
        // la hora de irse —abrió en El Poblado y cierra desde la casa— y quedaría
        // con el turno atrapado sin poder cerrarlo desde ningún lado, que es
        // exactamente lo que la modalidad viene a evitar.
        //
        // Tampoco aplica a quien tiene `puedeCerrarEnOtraSede`: el supervisor que
        // recorre varias sedes en el mismo turno. Aun con el permiso, la salida
        // tiene que marcarse DENTRO de una de sus sedes, porque la geocerca ya se
        // decidió más arriba. La decisión vive en `puedeCerrarAqui`
        // (utils/modalidad.ts), con sus pruebas.
        //
        // Lo que antes se perdía ya no: la salida guarda dónde se cerró en
        // `sedeSalidaId`, así que un turno que cruza sedes se ve entero.
        const cierraAqui = puedeCerrarAqui({
          modalidad,
          // `=== true` y no un truthy: si el colaborador no apareció, falla
          // cerrado, que es la regla de siempre.
          puedeCerrarEnOtraSede: col?.puedeCerrarEnOtraSede === true,
          sedeDelTurno: abierto.sedeId,
          sedeDeLaMarca,
        });
        if (!cierraAqui) {
          const sedeEntrada = sedesDelTrabajador.find(s => s.id === abierto.sedeId);
          // El mensaje dice QUÉ HACER y no solo qué pasó: quien lo lee está
          // frente al kiosco con el turno abierto y sin forma de cerrarlo.
          return reply.code(403).send({
            error: `Abriste el turno en ${sedeEntrada?.nombre ?? 'otra sede'}. Marca la salida allí, o pide a tu administrador que te permita cerrar en otra sede.`,
            codigo: 'SEDE_DISTINTA',
          });
        }
        // Salida a almorzar: se valida contra el día congelado y contra si ya
        // almorzó. Que lo diga el cliente no basta — el flag decide cómo se lee
        // el día después, y nadie debería poder inventarlo desde el navegador.
        const esAlmuerzo = pidioAlmuerzo && (await almuerzoDelTurno(payload.id, abierto.fecha)).puede;

        // ¿Se va antes de que termine su franja? Se resuelve ANTES de escribir
        // nada. Irse a su descanso no es irse temprano: ahí no se pregunta.
        //
        // Si se va temprano, la novedad guarda qué tramo excusa: desde ahora hasta
        // el fin de su franja. Sin eso quedaba de día completo, y al aprobarla el
        // saldo excusaba también las horas que sí trabajó y la tardanza de la
        // mañana desaparecía.
        let salidaTemprana = false;
        let ventanaNovedad: { horaInicio: string; horaFin: string } | null = null;
        const horario = col?.horario;
        if (!esAlmuerzo && horario && horario.activo && !festHoy) {
          const franja = horario.franjas.find(f => ((f.dias as string[]) ?? []).includes(DIAS_SEMANA[ahoraBog.getDay()]));
          if (franja) salidaTemprana = salidaAntesDeHora(ahoraBog, franja, horario.toleranciaMin ?? 0);
          if (franja && salidaTemprana) ventanaNovedad = ventanaDeSalidaTemprana(ahoraBog, franja);
        }

        // Sin motivo no se cierra la jornada.
        //
        // Antes se guardaba la salida y DESPUÉS se pedía el motivo, con un botón
        // de "Omitir" al lado: irse temprano sin decir por qué salía gratis. Y
        // como la salida ya estaba escrita, quien se equivocaba de botón no tenía
        // forma de volver atrás. Ahora no se escribe nada hasta que haya motivo,
        // y por eso cancelar es posible: no hay nada que deshacer.
        if (salidaTemprana && !tipoNovedad) {
          return reply.code(409).send({
            codigo: 'REQUIERE_MOTIVO',
            error: 'Te vas antes de que termine tu jornada. Cuéntanos por qué.',
          });
        }

        const updated = await prisma.registro.update({
          where: { id: abierto.id },
          data: {
            salida: ahora,
            // La marcó la persona, así que deja de ser estimada. Si el barrido
            // había alcanzado a marcarla sin hora, el chip "el sistema cerró
            // este turno" se quedaba pegado sobre una salida real.
            salidaEstimada: false,
            ...(esAlmuerzo ? { salidaAlmuerzo: true } : {}),
            // Dónde se CERRÓ, con la misma regla que la entrada: donde ocurrió la
            // marca. Se escribe para todos, también para un híbrido, que así
            // recupera la fidelidad que antes perdía. Sin sede identificada va
            // null, que es «no se sabe», nunca la sede de la entrada. Y va SIEMPRE:
            // saltarse el null dejaba viva la sede de una salida anterior en un
            // turno que un administrador había reabierto.
            sedeSalidaId: sedeDeLaMarca,
            ...(fotoGuardar ? { fotoSalida: fotoGuardar } : {}),
            ...camposDeAutenticacion(payload, 'salida'),
          },
        });

        // La novedad viaja con la marca, no en una llamada aparte: si esa segunda
        // llamada fallaba, la salida quedaba registrada y el motivo se perdía.
        if (tipoNovedad) {
          await crearNovedad(payload.id, tipoNovedad, descripcionNovedad, updated.id, ventanaNovedad)
            .catch(err => app.log.error(err, 'No se pudo guardar la novedad de la salida temprana'));
        }

        return { accion: 'SALIDA', registro: updated, hora: ahora, salidaTemprana, salidaAlmuerzo: esAlmuerzo };
      } else {
        // ¿Ya había marcado entrada hoy? (para alertar tardanza solo en la 1a entrada)
        const entradasPrevias = await prisma.registro.count({
          where: { colaboradorId: payload.id, fecha: { gte: inicioDia, lt: finDia }, entrada: { not: null } },
        });

        // Volver del almuerzo es la MISMA jornada, así que el tramo pertenece al
        // día en que se entró, no al día en que se vuelve. Solo se nota en un
        // turno nocturno, donde el almuerzo cae después de medianoche: sin esto
        // el regreso quedaba anclado al día siguiente, la jornada se partía en
        // dos días y el reporte contaba media noche en cada uno. En el turno de
        // día `fecha` es la misma y esto no cambia nada.
        const volviendoDeAlmorzar = await prisma.registro.findFirst({
          where: {
            colaboradorId: payload.id,
            salidaAlmuerzo: true,
            salida: { not: null, gte: new Date(ahora.getTime() - VENTANA_TURNO_MS) },
          },
          orderBy: { salida: 'desc' },
          select: { fecha: true, salida: true },
        });

        // ¿Llega tarde a su primera entrada del día? Se resuelve ANTES de escribir
        // nada, igual que la salida temprana: sin motivo no se marca la entrada.
        // Volver del almuerzo no es llegar tarde, aunque en un turno nocturno sea
        // la primera marca del día calendario.
        // La decisión vive en `llegadaTarde` (utils/tardanzas.ts), con sus pruebas.
        const tardanza = llegadaTarde(ahoraBog, {
          esPrimeraEntrada: entradasPrevias === 0,
          vuelveDeAlmorzar: !!volviendoDeAlmorzar,
          esFestivo: !!festHoy,
          horario: col?.horario,
        });
        if (tardanza && !tipoNovedad) {
          return reply.code(409).send({
            codigo: 'REQUIERE_MOTIVO_TARDANZA',
            error: 'Llegaste tarde. Cuéntanos por qué.',
          });
        }

        // Regreso del almuerzo con hora corregida por la propia persona. Se
        // valida contra la ventana de SU día, no contra lo que mande el cliente:
        // tiene que estar después de la salida a almorzar, no puede ser futura,
        // y no puede pasarse del fin de su ventana. Así lo peor que alguien
        // puede conseguir manipulando el navegador es declarar que volvió a la
        // hora a la que le tocaba, que es exactamente lo que el kiosco propone.
        let entradaReal = ahora;
        let esRegresoEstimado = false;
        if (regresoPedido && volviendoDeAlmorzar?.salida) {
          const rango = rangoDiaBogota(volviendoDeAlmorzar.fecha);
          const diaAlm = await prisma.diaEsperado.findFirst({
            where: { colaboradorId: payload.id, fecha: { gte: rango.inicioDia, lt: rango.finDia } },
            select: { fecha: true, almuerzoMin: true, almuerzoInicio: true, almuerzoFin: true },
          });
          const p = diaAlm ? almuerzoSinRegreso(volviendoDeAlmorzar.salida, diaAlm, ahora) : null;
          const tope = p?.finVentana;
          const dentro = tope
            && regresoPedido > volviendoDeAlmorzar.salida
            && regresoPedido <= ahora
            && regresoPedido <= tope;
          if (dentro) {
            entradaReal = regresoPedido;
            // Queda en el DATO que esa hora no la marcó nadie en su momento: el
            // día que alguien reclame, el registro tiene que poder decirlo.
            esRegresoEstimado = true;
          }
        }

        const nuevo = await prisma.registro.create({
          data: {
            colaboradorId: payload.id,
            fecha: volviendoDeAlmorzar?.fecha ?? inicioDia,
            entrada: entradaReal,
            ...(esRegresoEstimado ? { entradaEstimada: true } : {}),
            tipo: tipo as any,
            // Queda guardado DÓNDE marcó, no dónde debía: el filtro por sede de
            // los reportes tiene que reflejar la realidad.
            ...(sedeDeLaMarca ? { sedeId: sedeDeLaMarca } : {}),
            ...(fotoGuardar ? { fotoEntrada: fotoGuardar } : {}),
            ...camposDeAutenticacion(payload, 'entrada'),
          },
        });

        // Un día con marcación es un día que va a salir en un reporte. Si llega
        // ahí sin fila se resuelve con el horario VIGENTE, y vuelve a ser
        // reescribible: cambiar el horario mañana le movería este día. La
        // creación manual de registros ya lo hacía; el kiosco no.
        await asegurarDiaSinFallar(payload.id, nuevo.fecha, app.log);

        // La novedad de la llegada tarde viaja con la marca, igual que la de la
        // salida temprana: en una llamada aparte, un fallo dejaba la entrada
        // escrita y el motivo perdido.
        if (tardanza && tipoNovedad) {
          await crearNovedad(payload.id, tipoNovedad, descripcionNovedad, nuevo.id, ventanaDeLlegadaTarde(ahoraBog, tardanza.franja))
            .catch(err => app.log.error(err, 'No se pudo guardar la novedad de la llegada tarde'));
        }

        // Alerta de llegada tarde por Telegram y en la campana.
        if (tardanza && col) {
          const tarde = tardanza.minutos;
          alertarTardanzaTelegram(col.empresaId, `${col.nombre} ${col.apellido}`, ahoraBog, tarde).catch(() => {});
          const tardeTxt = tarde >= 60 ? `${Math.floor(tarde / 60)}h ${tarde % 60}min` : `${tarde} min`;
          notificar(col.empresaId, {
            tipo: 'LLEGADA_TARDE',
            titulo: `${col.nombre} ${col.apellido} llegó tarde`,
            cuerpo: `Marcó entrada con ${tardeTxt} de retraso.`,
            entidad: 'colaborador', entidadId: col.id,
          });
        }
        return { accion: 'ENTRADA', registro: nuevo, hora: entradaReal, regresoEstimado: esRegresoEstimado };
      }
    } finally {
      marcandoAhora.delete(payload.id);
    }
  });

  // El colaborador reporta el motivo de una salida temprana desde el kiosco.
  // Crea una novedad del día, pendiente de aprobación por el administrador.
  app.post('/novedad', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return reply.code(403).send({ error: 'No autorizado' });
    const { tipo, descripcion } = (request.body ?? {}) as { tipo?: string; descripcion?: string };
    if (!tipo || !TIPOS_NOVEDAD.has(tipo)) return reply.code(400).send({ error: 'Motivo inválido' });
    const permiso = await crearNovedad(payload.id, tipo, descripcion ?? '');
    return reply.code(201).send({ ok: true, id: permiso.id });
  });
}
