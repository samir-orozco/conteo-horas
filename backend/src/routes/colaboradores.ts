import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { calcularValorHora } from '../utils/horasColombiana';
import { jornadaVigente, horasMesDeJornada } from '../utils/vigencias';
import { capacidadesEmpresa } from '../utils/capacidades';
import { esListaDescriptoresValida, cuantasMuestras } from '../utils/rostro';
import { normalizarModalidad, normalizarPermisoOtraSede } from '../utils/modalidad';
import { fotoPerfilValida, fotoParaEnrolar, miniValida } from '../utils/fotoPerfil';
import { resumenDeContrato } from '../utils/estadoContratoResumen';
import { validarImportacion, COLUMNAS_FORMATO } from '../utils/importarColaboradores';
import { medianocheBogota, hoyEnBogota } from '../utils/fechas';
import { documentoValido, tipoDeDocumento, nombreDeDocumento, cambioDeDocumento } from '../utils/documentos';
import { retiroEsCoherente, fechaMinimaDeRetiro } from '../utils/vinculacion';
import { regenerarDiasDeColaborador, mantenerVentanaDeColaborador } from '../utils/materializarDias';
import { COLABORADOR_SIN_FOTOS, COLABORADOR_SIN_DESCRIPTOR } from '../utils/columnasDeColaborador';
import { textoMuyLargo } from '../utils/largoDeColumna';
import { crearTokenDeEnlace, DURACION_ENLACE_MS, MAX_INTENTOS_CEDULA, TEXTO_AUTORIZACION_ADMINISTRADOR } from '../utils/registroFacial';
import { permiteCedula } from '../utils/kioscoConfig';

export default async function colaboradorRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Deja constancia de un movimiento de vinculación. Todo lo que mueve el
  // estado de "trabaja aquí" pasa por acá, para que la línea de tiempo no
  // dependa de que alguien se acuerde de escribirla.
  async function registrarEvento(opts: {
    colaboradorId: string; tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO'; fecha: Date;
    motivo?: string | null; nota?: string | null; usuarioId?: string | null;
    documento?: string; documentoNombre?: string;
  }) {
    const datos: any = {
      colaboradorId: opts.colaboradorId, tipo: opts.tipo, fecha: opts.fecha,
      motivo: (opts.motivo ?? null) as any, nota: opts.nota ?? null,
      usuarioId: opts.usuarioId ?? null,
    };
    if (documentoValido(opts.documento)) {
      datos.documento = opts.documento;
      datos.documentoTipo = tipoDeDocumento(opts.documento);
      datos.documentoNombre = nombreDeDocumento(opts.documentoNombre);
    }
    await prisma.vinculacionEvento.create({ data: datos });
  }

  // Cierra el contrato vigente de quien se retira. Sin esto el módulo de
  // contratos seguiría avisando del vencimiento de alguien que ya no está.
  async function cerrarContratoVigente(colaboradorId: string) {
    await prisma.contrato.updateMany({
      where: { colaboradorId, estado: 'VIGENTE' },
      data: { estado: 'TERMINADO' },
    });
  }

  // Barrido de los retiros que quedaron PROGRAMADOS antes de este cambio.
  //
  // Aplazar el retiro a fin de mes venía de cuando el precio dependía del número
  // de colaboradores: se cobraba el mes y se dejaba el cupo ocupado. Hoy el
  // precio es plano por plan y no mira cuántos hay, así que aplazar no protegía
  // ingreso: solo impedía contratar al reemplazo el mismo día. Ya no se
  // programan retiros nuevos, pero pueden quedar filas viejas en producción y
  // hay que aplicarlas, ahora sí dejando la fecha registrada.
  async function aplicarRetiros(empresaId: string) {
    const pendientes = await prisma.colaborador.findMany({
      where: { empresaId, activo: true, retiroProgramado: { lte: new Date() } },
      select: { id: true, retiroProgramado: true },
    });
    for (const c of pendientes) {
      await prisma.colaborador.update({
        where: { id: c.id },
        data: { activo: false, fechaRetiro: c.retiroProgramado, retiroProgramado: null },
      });
      await registrarEvento({ colaboradorId: c.id, tipo: 'RETIRO', fecha: c.retiroProgramado!,
        nota: 'Retiro que había quedado programado a fin de mes' });
      await cerrarContratoVigente(c.id);
    }
  }

  app.get('/', auth, async (request) => {
    await aplicarRetiros(request.empresaId!);
    // Se incluyen las sedes para que el modal de edición de la LISTA pueda
    // mostrarlas sin pedir cada colaborador por separado.
    // Sin la foto grande ni el descriptor facial. Antes la consulta traía las dos fotos y el
    // descriptor, quitaba la grande al responder y mandaba el descriptor, que es un dato biométrico,
    // al navegador sin que ninguna pantalla lo use (13 de septiembre de 2026).
    const filas = await prisma.colaborador.findMany({
      where: { empresaId: request.empresaId, activo: true },
      select: {
        ...COLABORADOR_SIN_FOTOS,
        fotoMini: true,
        // Con el nombre, no solo el id: la lista pinta una columna de sede y
        // pedir los nombres aparte sería una consulta por cada carga.
        sedes: { select: { sedeId: true, sede: { select: { nombre: true } } } },
        // El contrato vigente, para poder decir en la lista quién tiene el
        // preaviso encima sin abrir ficha por ficha. Solo el más reciente:
        // vigente debería haber uno, y si hubiera dos manda el nuevo.
        contratos: {
          where: { estado: 'VIGENTE' },
          select: {
            tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
            prorrogas: { select: { desde: true, hasta: true } },
          },
          orderBy: { fechaInicio: 'desc' },
          take: 1,
        },
      },
      orderBy: { nombre: 'asc' },
    });
    const hoy = new Date();
    // Viaja la miniatura, nunca la grande: la lista pinta un círculo de 36
    // píxeles, y mandar la de la ficha por cada persona son cientos de
    // kilobytes por carga. La grande se pide con la ficha, que es donde se ve.
    return filas.map(({ sedes, contratos, ...c }) => ({
      ...c,
      sedeIds: sedes.map(s => s.sedeId),
      sedeNombres: sedes.map(s => s.sede.nombre),
      estadoContrato: resumenDeContrato(contratos[0] ?? null, hoy),
    }));
  });

  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    // La ficha sí lleva las dos fotos, pero no el descriptor facial: es un dato biométrico que
    // viajaba al navegador y ninguna pantalla lo usa (13 de septiembre de 2026).
    const col = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId },
      select: {
        ...COLABORADOR_SIN_DESCRIPTOR,
        // Se lee solo para contar las tomas: el descriptor no sale de esta ruta.
        rostroDescriptor: true,
        horario: { include: { franjas: true } },
        // Con el nombre, no solo el id: la lista pinta una columna de sede y
        // pedir los nombres aparte sería una consulta por cada carga.
        sedes: { select: { sedeId: true, sede: { select: { nombre: true } } } },
      },
    });
    if (!col) return reply.status(404).send({ error: 'No encontrado' });
    // Lo del registro facial que pinta la ficha (14 de septiembre de 2026): cuántas
    // tomas tiene, la última constancia, si hay un enlace que todavía sirva y si la
    // empresa deja marcar con cédula, que es la salida de quien no autoriza.
    const [ultimaConstancia, enlace, conCedula] = await Promise.all([
      prisma.constanciaBiometrica.findFirst({
        where: { colaboradorId: id }, orderBy: { creadoEn: 'desc' },
        select: { decision: true, origen: true, creadoEn: true },
      }),
      prisma.enlaceRegistroFacial.findFirst({
        where: { colaboradorId: id, usadoEn: null, anuladoEn: null, venceEn: { gt: new Date() }, intentosCedula: { lt: MAX_INTENTOS_CEDULA } },
        orderBy: { creadoEn: 'desc' }, select: { venceEn: true },
      }),
      permiteCedula(request.empresaId!),
    ]);
    // Se aplana a una lista de ids: es lo que el selector múltiple necesita, y
    // evita que el frontend tenga que conocer la tabla de unión.
    const { sedes, rostroDescriptor, ...resto } = col as any;
    return {
      ...resto,
      sedeIds: (sedes ?? []).map((s: any) => s.sedeId),
      biometria: {
        tomas: cuantasMuestras(rostroDescriptor),
        ultimaConstancia,
        enlaceVenceEn: enlace?.venceEn ?? null,
        permiteCedula: conCedula,
        textoAutorizacionAdministrador: TEXTO_AUTORIZACION_ADMINISTRADOR,
      },
    };
  });

  // Valida que el horario asignado sea de la misma empresa
  async function horarioValido(horarioId: string | null | undefined, empresaId: string): Promise<boolean> {
    if (!horarioId) return true;
    const h = await prisma.horario.findFirst({ where: { id: horarioId, empresaId, activo: true } });
    return Boolean(h);
  }

  // Reemplaza las sedes donde este colaborador puede marcar. Se validan contra
  // la empresa del token: sin eso, un id de otra empresa colaría a alguien en
  // una sede ajena. `undefined` significa "no se tocó" y se distingue de `[]`,
  // que sí quiere decir "quítale todas".
  async function sincronizarSedes(colaboradorId: string, sedeIds: unknown, empresaId: string) {
    if (!Array.isArray(sedeIds)) return;
    const validas = await prisma.sede.findMany({
      where: { id: { in: sedeIds.filter((x): x is string => typeof x === 'string') }, empresaId, activa: true },
      select: { id: true },
    });
    await prisma.$transaction([
      prisma.colaboradorSede.deleteMany({ where: { colaboradorId } }),
      ...(validas.length
        ? [prisma.colaboradorSede.createMany({ data: validas.map(s => ({ colaboradorId, sedeId: s.id })), skipDuplicates: true })]
        : []),
    ]);
  }

  // La fecha de nacimiento llega como "YYYY-MM-DD"; la normalizamos a Date (o null)
  function normalizar(data: any) {
    if ('fechaNacimiento' in data) {
      data.fechaNacimiento = data.fechaNacimiento ? new Date(`${data.fechaNacimiento}T12:00:00Z`) : null;
    }
    if ('modalidad' in data) data.modalidad = normalizarModalidad(data.modalidad);
    if ('puedeCerrarEnOtraSede' in data) data.puedeCerrarEnOtraSede = normalizarPermisoOtraSede(data.puedeCerrarEnOtraSede);
    return data;
  }

  // La modalidad decide si a esta persona se le valida la ubicación al marcar,
  // así que un valor que no se reconoce no puede pasar de largo: sin esto llega
  // crudo al enum de MySQL y sale como un 500 sin explicación.
  const modalidadInvalida = (data: any) => 'modalidad' in data && data.modalidad === null;

  // Mismo motivo que la modalidad: este permiso decide si /marcar deja cerrar un
  // turno en otra sede, y sin esta guarda un valor que no es booleano llega crudo
  // a Prisma y sale como un 500.
  const permisoOtraSedeInvalido = (data: Record<string, unknown>) => 'puedeCerrarEnOtraSede' in data && data.puedeCerrarEnOtraSede === null;

  // La foto viaja como data URL dentro del cuerpo, y tanto POST como PUT hacen
  // spread de lo que llega: sin esta guarda, una foto de celular sin recortar
  // (varios megabytes) entra derecho a la fila del colaborador. La misma
  // comprobación que ya hacía `PUT /:id/foto`, ahora también al crear.
  function fotoInvalida(data: any): string | null {
    if ('foto' in data && data.foto != null && !fotoPerfilValida(data.foto)) {
      return 'La foto debe ser JPG, PNG o WEBP y pesar menos de 500 KB.';
    }
    if ('fotoMini' in data && data.fotoMini != null && !miniValida(data.fotoMini)) {
      // La miniatura es una comodidad de la lista: si no sirve se descarta y la
      // lista cae a las iniciales, en vez de rechazar la foto entera.
      data.fotoMini = null;
    }
    return null;
  }

  // Las columnas del formato de carga masiva, y los horarios que se pueden
  // escribir en él.
  //
  // Las manda el servidor y no las define la pantalla a propósito: son el
  // contrato entre el archivo que alguien descarga y el validador que lo lee.
  // Si viviera una copia en el frontend, cambiar una columna aquí dejaría
  // generando formatos que ya no validan.
  app.get('/formato', auth, async (request) => {
    // Horarios y sedes van con id porque la pantalla los ofrece en selectores
    // por fila, no porque haya que escribirlos en el archivo.
    const [horarios, sedes] = await Promise.all([
      prisma.horario.findMany({
        where: { empresaId: request.empresaId! },
        select: { id: true, nombre: true }, orderBy: { nombre: 'asc' },
      }),
      prisma.sede.findMany({
        where: { empresaId: request.empresaId!, activa: true },
        select: { id: true, nombre: true }, orderBy: { nombre: 'asc' },
      }),
    ]);
    return { columnas: COLUMNAS_FORMATO, horarios, sedes };
  });

  // Carga masiva desde el formato de Excel.
  //
  // Se valida TODO antes de crear nada. Con 40 filas y un error en la 37,
  // crear las 36 primeras deja a la empresa sin saber qué quedó y qué no, y sin
  // poder volver a subir el archivo completo.
  //
  // `soloValidar` es lo que usa la vista previa: mismo camino, misma
  // validación, sin escribir. Así lo que se ve en pantalla es exactamente lo
  // que el servidor va a hacer, y no una segunda opinión del navegador.
  app.post('/masivo', auth, async (request, reply) => {
    const { filas, soloValidar } = request.body as { filas: unknown; soloValidar?: boolean };
    if (!Array.isArray(filas)) return reply.status(400).send({ error: 'Formato inválido' });
    if (filas.length > 500) {
      return reply.status(400).send({ error: 'El archivo trae más de 500 filas. Súbelo por partes.' });
    }

    // Todo el cuerpo va envuelto para que el registro diga qué llegó y qué falló.
    // A la pantalla va un texto fijo: el mensaje interno no le sirve a quien
    // importa el archivo, y no tiene por qué verlo.
    try {
    const [horarios, sedes, existentes, cap] = await Promise.all([
      prisma.horario.findMany({ where: { empresaId: request.empresaId! }, select: { id: true } }),
      prisma.sede.findMany({ where: { empresaId: request.empresaId!, activa: true }, select: { id: true } }),
      prisma.colaborador.findMany({ where: { empresaId: request.empresaId! }, select: { cedula: true, activo: true } }),
      capacidadesEmpresa(request.empresaId!),
    ]);
    const activos = existentes.filter(c => c.activo).length;

    const resultado = validarImportacion(filas as Record<string, unknown>[], {
      horariosValidos: new Set(horarios.map(h => h.id)),
      sedesValidas: new Set(sedes.map(x => x.id)),
      cedulasActivas: new Set(existentes.filter(c => c.activo).map(c => c.cedula)),
      cedulasRetiradas: new Set(existentes.filter(c => !c.activo).map(c => c.cedula)),
      cupoDisponible: cap.limite === Infinity ? Number.MAX_SAFE_INTEGER : Math.max(0, cap.limite - activos),
    });

    const respuesta = {
      ...resultado,
      // Number.MAX_SAFE_INTEGER no se le muestra a nadie: si el plan es
      // ilimitado, la pantalla no habla de cupo.
      cupoDisponible: cap.limite === Infinity ? null : resultado.cupoDisponible,
      nombrePlan: cap.nombrePlan,
      creados: 0,
    };

    const hayProblemas = resultado.errores.length > 0 || resultado.excedeCupo || resultado.vacio;
    if (soloValidar || hayProblemas) return respuesta;

    const creados = await prisma.$transaction(
      resultado.validas.map(c => prisma.colaborador.create({
        data: {
          empresaId: request.empresaId!,
          nombre: c.nombre, apellido: c.apellido, cedula: c.cedula,
          cargo: c.cargo, salarioMensual: c.salarioMensual,
          email: c.email, telefono: c.telefono,
          fechaNacimiento: c.fechaNacimiento ? new Date(`${c.fechaNacimiento}T12:00:00Z`) : null,
          horarioId: c.horarioId,
        },
        select: { id: true },
      })),
    );

    // Fuera de la transacción, igual que en el alta individual: si materializar
    // los días falla, el colaborador ya existe y la pasada diaria lo recoge.
    // Perder la ficha por eso sería peor.
    for (const [i, { id }] of creados.entries()) {
      const sedeId = resultado.validas[i]?.sedeId;
      if (sedeId) await sincronizarSedes(id, [sedeId], request.empresaId!);
      await registrarEvento({
        colaboradorId: id, tipo: 'INGRESO',
        fecha: medianocheBogota(hoyEnBogota()), usuarioId: request.usuarioId ?? null,
        nota: 'Creado en una carga masiva',
      });
      try {
        await mantenerVentanaDeColaborador(id);
      } catch (err) {
        request.log.error(err, 'No se pudo materializar la ventana de un colaborador importado');
      }
    }

    return { ...respuesta, creados: creados.length };
    } catch (err) {
      request.log.error({ err, filas: filas.length, soloValidar }, 'Falló la carga masiva de colaboradores');
      // Antes iba la primera línea del error, y la de Prisma empieza con un salto
      // de línea: la pantalla quedaba en «No pudimos procesar el archivo: » sin
      // nada más (13 de septiembre de 2026).
      return reply.status(500).send({ error: 'No pudimos procesar el archivo. Intenta de nuevo en un momento.' });
    }
  });

  app.post('/', auth, async (request, reply) => {
    const { sedeIds, ...cuerpo } = request.body as any;
    const data = normalizar(cuerpo);
    if (!(await horarioValido(data.horarioId, request.empresaId!))) {
      return reply.status(400).send({ error: 'Horario inválido' });
    }
    if (modalidadInvalida(data)) {
      return reply.status(400).send({ error: 'Modalidad de trabajo no válida' });
    }
    if (permisoOtraSedeInvalido(data)) {
      return reply.status(400).send({ error: 'El permiso de cerrar en otra sede tiene que ser sí o no' });
    }
    const malaFoto = fotoInvalida(data);
    if (malaFoto) return reply.status(400).send({ error: malaFoto });
    // Un texto más largo que su columna lo rechazaba MySQL al guardar, y la
    // pantalla solo decía «Ocurrió un error inesperado».
    const muyLargo = textoMuyLargo(data);
    if (muyLargo) return reply.status(400).send({ error: muyLargo });

    // La cédula es única por empresa. Si ya existe desactivado (lo "borraron"),
    // se reactiva con los datos nuevos y conserva todo su historial de horas.
    const existente = await prisma.colaborador.findUnique({
      where: { empresaId_cedula: { empresaId: request.empresaId!, cedula: data.cedula } },
      select: { id: true, activo: true, nombre: true, apellido: true },
    });
    if (existente?.activo) {
      return reply.status(409).send({ error: `La cédula ${data.cedula} ya está registrada para ${existente.nombre} ${existente.apellido}` });
    }

    // Límite de colaboradores según el plan (crear o reactivar suma un activo)
    const cap = await capacidadesEmpresa(request.empresaId!);
    if (cap.limite !== Infinity) {
      const activos = await prisma.colaborador.count({ where: { empresaId: request.empresaId!, activo: true } });
      if (activos >= cap.limite) {
        return reply.status(403).send({
          error: `Tu plan ${cap.nombrePlan} permite hasta ${cap.limite} colaboradores.`,
          codigo: 'LIMITE_PLAN', limite: cap.limite, plan: cap.plan,
        });
      }
    }

    // Se materializa la ventana de una vez, no en la pasada diaria: si alguien
    // se crea y marca el mismo día, ese día tiene que tener su fila.
    const materializar = async (colaboradorId: string) => {
      try {
        await mantenerVentanaDeColaborador(colaboradorId);
      } catch (err) {
        request.log.error(err, 'No se pudo materializar la ventana del colaborador');
      }
    };

    if (existente) {
      // Lo que devuelven esta ruta y las que editan, retiran o reingresan llega al navegador: sin el
      // descriptor facial (13 de septiembre de 2026).
      const reactivado = await prisma.colaborador.update({
        where: { id: existente.id },
        data: { ...data, activo: true, retiroProgramado: null },
        select: COLABORADOR_SIN_DESCRIPTOR,
      });
      // Aquí SÍ hay que pisar: quien vuelve trae filas viejas de cuando estuvo
      // activo, y `mantenerVentanaDeColaborador` solo rellena huecos. Sin esto
      // reingresaba con el horario que tenía el día que se fue.
      try {
        await regenerarDiasDeColaborador(reactivado.id);
      } catch (err) {
        request.log.error(err, 'No se pudieron regenerar los días del colaborador reactivado');
      }
      await registrarEvento({ colaboradorId: reactivado.id, tipo: 'REINGRESO',
        fecha: medianocheBogota(hoyEnBogota()), usuarioId: request.usuarioId ?? null,
        nota: 'Reingresó al volver a registrar su cédula' });
      await sincronizarSedes(reactivado.id, sedeIds, request.empresaId!);
      return reply.status(200).send({ ...reactivado, reactivado: true });
    }

    const colaborador = await prisma.colaborador.create({
      data: { ...data, empresaId: request.empresaId! },
      select: COLABORADOR_SIN_DESCRIPTOR,
    });
    await registrarEvento({ colaboradorId: colaborador.id, tipo: 'INGRESO',
      fecha: medianocheBogota(hoyEnBogota()), usuarioId: request.usuarioId ?? null });
    await materializar(colaborador.id);
    await sincronizarSedes(colaborador.id, sedeIds, request.empresaId!);
    return reply.status(201).send(colaborador);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true, horarioId: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    const { empresaId: _ignorar, horario: _rel, sedeIds, ...rest } = request.body as any;
    const data = normalizar(rest);
    if (!(await horarioValido(data.horarioId, request.empresaId!))) {
      return reply.status(400).send({ error: 'Horario inválido' });
    }
    if (modalidadInvalida(data)) {
      return reply.status(400).send({ error: 'Modalidad de trabajo no válida' });
    }
    if (permisoOtraSedeInvalido(data)) {
      return reply.status(400).send({ error: 'El permiso de cerrar en otra sede tiene que ser sí o no' });
    }
    const malaFoto = fotoInvalida(data);
    if (malaFoto) return reply.status(400).send({ error: malaFoto });
    const muyLargo = textoMuyLargo(data);
    if (muyLargo) return reply.status(400).send({ error: muyLargo });
    const actualizado = await prisma.colaborador.update({ where: { id }, data, select: COLABORADOR_SIN_DESCRIPTOR });
    await sincronizarSedes(id, sedeIds, request.empresaId!);

    // Cambiar a alguien de horario es la otra forma de reescribir el pasado:
    // `Colaborador.horarioId` tampoco tiene historial. Aplica desde HOY si su día
    // sigue intacto, y desde mañana si ya marcó. Lo anterior no se toca.
    let aplicadoHoy = null;
    if (data.horarioId !== undefined && data.horarioId !== existente.horarioId) {
      try {
        aplicadoHoy = (await regenerarDiasDeColaborador(id)).aplicadoHoy;
      } catch (err) {
        request.log.error(err, 'No se pudieron regenerar los días del colaborador');
      }
    }

    return { ...actualizado, aplicadoHoy };
  });

  // Estilo Notion: si el mes ya está pagado, el colaborador queda cubierto y
  // sigue activo hasta fin de mes; el retiro se aplica al iniciar el siguiente.
  // Si no hay mes pagado, se desactiva de inmediato.
  const MOTIVOS = ['RENUNCIA', 'FIN_CONTRATO', 'SIN_JUSTA_CAUSA', 'JUSTA_CAUSA', 'FIN_OBRA', 'OTRO'];

  // Registrar el retiro de un colaborador.
  //
  // No borra nada: marcaciones, novedades, contratos y reportes quedan igual, y
  // tienen que quedar, porque la ley obliga a conservar esa información y porque
  // borrarla reescribiría meses ya liquidados. Lo que hace es sacarlo de la
  // operación, dejar constancia de cuándo y por qué, y liberar el cupo del plan
  // el mismo día para que el reemplazo pueda entrar.
  app.post('/:id/retirar', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { fecha, motivo, documento, documentoNombre } = (request.body ?? {}) as {
      fecha?: string; motivo?: string; documento?: string; documentoNombre?: string;
    };

    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true, activo: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    if (!existente.activo) return reply.status(409).send({ error: 'Ese colaborador ya está retirado.' });

    const fechaRetiro = typeof fecha === 'string' && fecha.length >= 10
      ? medianocheBogota(fecha) : medianocheBogota(hoyEnBogota());
    if (!fechaRetiro) return reply.status(400).send({ error: 'La fecha de retiro no es válida.' });
    if (motivo && !MOTIVOS.includes(motivo)) {
      return reply.status(400).send({ error: 'Motivo de retiro no válido.' });
    }

    // Un retiro fechado antes del último reingreso deja una historia imposible:
    // la persona habría salido antes de volver. Se rechaza con la fecha desde
    // la que sí es válido, para que quien lo registra sepa qué corregir.
    const historia = await prisma.vinculacionEvento.findMany({
      where: { colaboradorId: id }, select: { tipo: true, fecha: true },
    });
    if (!retiroEsCoherente(fechaRetiro, historia)) {
      const desde = fechaMinimaDeRetiro(historia)!;
      return reply.status(400).send({
        error: `El retiro no puede ser anterior a su último ingreso, del ${desde.toISOString().slice(0, 10)}.`,
        codigo: 'RETIRO_ANTERIOR_AL_INGRESO',
        fechaMinima: desde.toISOString().slice(0, 10),
      });
    }

    // El soporte se comprueba ANTES de escribir nada. Lo que sigue son tres
    // escrituras seguidas sin transacción (el colaborador, el evento y el
    // contrato), así que rechazar a mitad de camino dejaría a la persona
    // retirada y sin la constancia de por qué. Y `registrarEvento` descarta en
    // silencio lo que no pasa, con lo cual el retiro quedaba hecho y la carta
    // de renuncia no se guardaba en ninguna parte.
    const soporte = cambioDeDocumento(documento, documentoNombre);
    if (soporte.accion === 'rechazar') return reply.status(400).send({ error: soporte.motivo });

    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        activo: false,
        fechaRetiro,
        motivoRetiro: (motivo ?? 'OTRO') as any,
        retiroProgramado: null,
      },
      select: { id: true, nombre: true, apellido: true, activo: true, fechaRetiro: true, motivoRetiro: true },
    });
    await registrarEvento({
      colaboradorId: id, tipo: 'RETIRO', fecha: fechaRetiro,
      motivo: motivo ?? 'OTRO', usuarioId: request.usuarioId ?? null,
      documento, documentoNombre,
    });
    await cerrarContratoVigente(id);
    return colaborador;
  });

  // Se conserva el DELETE porque es lo que llama la interfaz vieja y lo que
  // puede haber en una pestaña abierta. Hace lo mismo que retirar, sin motivo.
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });

    const fechaRetiro = medianocheBogota(hoyEnBogota());
    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: { activo: false, fechaRetiro, retiroProgramado: null },
      select: COLABORADOR_SIN_DESCRIPTOR,
    });
    await registrarEvento({ colaboradorId: id, tipo: 'RETIRO', fecha: fechaRetiro,
      usuarioId: request.usuarioId ?? null });
    await cerrarContratoVigente(id);
    // `retiroInmediato` se mantiene por compatibilidad con el frontend actual.
    return { ...colaborador, retiroInmediato: true };
  });

  // La historia de vinculación: entró, salió, volvió.
  //
  // Sin los documentos, que pesan y casi nunca se abren todos a la vez: cada
  // evento dice si tiene soporte y se pide por su propia ruta.
  app.get('/:id/vinculacion', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const col = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!col) return reply.status(404).send({ error: 'No encontrado' });
    const eventos = await prisma.vinculacionEvento.findMany({
      where: { colaboradorId: id },
      select: {
        id: true, tipo: true, fecha: true, motivo: true, nota: true,
        documentoTipo: true, documentoNombre: true, creadoEn: true, usuarioId: true,
      },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    });

    // Quién registró cada movimiento. Se resuelve aquí y no con una relación en
    // el esquema para no atar el evento al usuario: si el usuario se borra, el
    // evento tiene que sobrevivir, que es justamente lo que se está auditando.
    const ids = [...new Set(eventos.map(e => e.usuarioId).filter((x): x is string => !!x))];
    const usuarios = ids.length
      ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } })
      : [];
    const nombre = new Map(usuarios.map(u => [u.id, u.nombre]));

    return eventos.map(({ usuarioId, ...e }) => ({
      ...e,
      usuarioNombre: usuarioId ? nombre.get(usuarioId) ?? null : null,
    }));
  });

  // El soporte de UN evento. Cuelga del evento y no de la persona porque la
  // carta de renuncia de un retiro no es la del siguiente.
  app.get('/vinculacion/:eventoId/documento', auth, async (request, reply) => {
    const { eventoId } = request.params as { eventoId: string };
    const ev = await prisma.vinculacionEvento.findFirst({
      where: { id: eventoId, colaborador: { empresaId: request.empresaId } },
      select: { documento: true, documentoTipo: true, documentoNombre: true },
    });
    if (!ev?.documento) return reply.status(404).send({ error: 'Sin documento' });
    return { documento: ev.documento, documentoTipo: ev.documentoTipo, documentoNombre: ev.documentoNombre };
  });

  // Los que ya no están. Van en su propia ruta y no en el listado principal
  // para que ninguna pantalla los cuente por accidente en un total de la
  // operación de hoy.
  app.get('/inactivos', auth, async (request) => {
    await aplicarRetiros(request.empresaId!);
    return prisma.colaborador.findMany({
      where: { empresaId: request.empresaId, activo: false },
      select: {
        id: true, nombre: true, apellido: true, cedula: true, cargo: true,
        salarioMensual: true, fechaRetiro: true, motivoRetiro: true, creadoEn: true,
        // Para la etiqueta del registro facial en la tabla, igual que en la lista de activos.
        rostroEnroladoEn: true, rostroRechazadoEn: true,
      },
      orderBy: [{ fechaRetiro: 'desc' }, { nombre: 'asc' }],
    });
  });

  // Reingreso: recupera la ficha completa, con su historial y su rostro.
  //
  // Existe porque sin esto la única salida era volver a crear a la persona, y
  // eso parte su historia en dos fichas: el kardex viejo queda huérfano, el
  // rostro hay que enrolarlo otra vez y la antigüedad para la liquidación se
  // pierde.
  app.post('/:id/reingresar', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true, activo: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    if (existente.activo) return reply.status(409).send({ error: 'Ese colaborador ya está activo.' });

    // Reingresar suma un activo, así que pasa por el mismo tope del plan.
    const cap = await capacidadesEmpresa(request.empresaId!);
    if (cap.limite !== Infinity) {
      const activos = await prisma.colaborador.count({ where: { empresaId: request.empresaId!, activo: true } });
      if (activos >= cap.limite) {
        return reply.status(403).send({
          error: `Tu plan ${cap.nombrePlan} permite hasta ${cap.limite} colaboradores.`,
          codigo: 'LIMITE_PLAN', limite: cap.limite, plan: cap.plan,
        });
      }
    }

    const colaborador = await prisma.colaborador.update({
      where: { id },
      // El estado vuelve a cero, pero la historia NO se toca: el retiro anterior
      // sigue en `vinculacion_eventos` con su fecha, su motivo y su soporte.
      data: { activo: true, fechaRetiro: null, motivoRetiro: null, retiroProgramado: null },
      select: COLABORADOR_SIN_DESCRIPTOR,
    });
    await registrarEvento({ colaboradorId: id, tipo: 'REINGRESO',
      fecha: medianocheBogota(hoyEnBogota()), usuarioId: request.usuarioId ?? null });
    // Sus días esperados quedaron congelados con el horario del día que se fue.
    try {
      await regenerarDiasDeColaborador(id);
    } catch (err) {
      request.log.error(err, 'No se pudieron regenerar los días del colaborador que reingresa');
    }
    return colaborador;
  });

  // Enrolamiento facial guiado: guarda VARIAS muestras (frente, perfiles,
  // con/sin gafas — 128 floats cada una) capturadas en el navegador.
  // rostroEnroladoEn queda como evidencia de que hubo consentimiento explícito
  // (dato biométrico, Ley 1581).
  //
  // Puede traer además la primera toma como foto de perfil. Solo se guarda si
  // la ficha todavía no tiene una: quien ya eligió una foto a mano no puede
  // perderla porque alguien vuelva a enrolar el rostro.
  app.post('/:id/rostro', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { descriptores, foto, fotoMini } = request.body as {
      descriptores: unknown; foto?: unknown; fotoMini?: unknown;
    };
    // La foto actual sí hace falta: la primera toma del escaneo solo se guarda si todavía no hay una.
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true, foto: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    if (!esListaDescriptoresValida(descriptores)) {
      return reply.status(400).send({ error: 'Muestras faciales inválidas' });
    }
    const primeraFoto = fotoParaEnrolar(existente.foto, foto);
    const primeraMini = primeraFoto && miniValida(fotoMini) ? fotoMini : null;
    // Queda constancia de que lo registró el administrador, con el texto que marcó
    // en la ficha (14 de septiembre de 2026). Si la persona había dicho que no
    // autorizaba, registrar ahora quita esa marca: rige la constancia nueva.
    const [colaborador] = await prisma.$transaction([
      prisma.colaborador.update({
        where: { id },
        data: {
          rostroDescriptor: descriptores,
          rostroEnroladoEn: new Date(),
          rostroRechazadoEn: null,
          ...(primeraFoto ? { foto: primeraFoto, fotoMini: primeraMini } : {}),
        },
        select: { rostroEnroladoEn: true, foto: true },
      }),
      prisma.constanciaBiometrica.create({
        data: {
          colaboradorId: id, decision: 'AUTORIZA', origen: 'ADMINISTRADOR',
          texto: TEXTO_AUTORIZACION_ADMINISTRADOR, usuarioId: request.usuarioId ?? null,
        },
      }),
    ]);
    return { ok: true, rostroEnroladoEn: colaborador.rostroEnroladoEn, foto: colaborador.foto };
  });

  // ENLACE PARA QUE LA PERSONA REGISTRE SU ROSTRO ELLA MISMA (14 de septiembre de 2026).
  //
  // Crear uno anula el que estuviera sin usar: queda uno solo que sirva. El token
  // se devuelve esta única vez; en la base queda su huella. A una persona retirada
  // no se le crea.
  app.post('/:id/enlace-rostro', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const col = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true, activo: true },
    });
    if (!col) return reply.status(404).send({ error: 'No encontrado' });
    if (!col.activo) return reply.status(409).send({ error: 'Está retirado: no se le puede enviar un enlace de registro.' });
    const { token, hash } = crearTokenDeEnlace();
    const ahora = new Date();
    const [, enlace] = await prisma.$transaction([
      prisma.enlaceRegistroFacial.updateMany({
        where: { colaboradorId: id, usadoEn: null, anuladoEn: null }, data: { anuladoEn: ahora },
      }),
      prisma.enlaceRegistroFacial.create({
        data: { colaboradorId: id, tokenHash: hash, venceEn: new Date(ahora.getTime() + DURACION_ENLACE_MS), usuarioId: request.usuarioId ?? null },
        select: { venceEn: true },
      }),
    ]);
    return reply.status(201).send({ token, venceEn: enlace.venceEn });
  });

  // La foto de perfil, puesta a mano.
  app.put('/:id/foto', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { foto, fotoMini } = request.body as { foto: unknown; fotoMini: unknown };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    if (!fotoPerfilValida(foto)) {
      return reply.status(400).send({ error: 'La foto debe ser JPG, PNG o WEBP y pesar menos de 500 KB.' });
    }
    // La miniatura es opcional: si no llega o no vale, la lista cae a las
    // iniciales, que es mejor que rechazar la foto entera por su versión chica.
    await prisma.colaborador.update({
      where: { id },
      data: { foto, fotoMini: miniValida(fotoMini) ? fotoMini : null },
    });
    return { ok: true };
  });

  // Quitarla. No toca el descriptor: son dos datos distintos y se borran por
  // separado, que es justamente para lo que están en columnas distintas.
  app.delete('/:id/foto', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    await prisma.colaborador.update({ where: { id }, data: { foto: null, fotoMini: null } });
    return { ok: true };
  });

  app.delete('/:id/rostro', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { id: true },
    });
    if (!existente) return reply.status(404).send({ error: 'No encontrado' });
    await prisma.colaborador.update({
      where: { id },
      data: { rostroDescriptor: Prisma.DbNull, rostroEnroladoEn: null },
    });
    return { ok: true };
  });

  app.get('/:id/valor-hora', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const colaborador = await prisma.colaborador.findFirst({
      where: { id, empresaId: request.empresaId }, select: { salarioMensual: true },
    });
    if (!colaborador) return reply.status(404).send({ error: 'No encontrado' });

    const jornadas = await prisma.jornadaVigencia.findMany();
    const jornada = jornadaVigente(new Date(), jornadas);
    const horasMes = horasMesDeJornada(jornada);
    return {
      salarioMensual: colaborador.salarioMensual,
      jornadaSemanal: jornada,
      horasMes,
      valorHora: calcularValorHora(colaborador.salarioMensual, horasMes),
    };
  });
}
