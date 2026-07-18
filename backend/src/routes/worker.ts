import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import crypto from 'crypto';
import { prisma } from '../index';
import { esDescriptorValido, mejorCoincidencia } from '../utils/rostro';
import { enviarTelegram } from '../utils/telegram';

const TZ = 'America/Bogota';

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

// ¿La empresa exige dispositivos autorizados para el kiosco?
async function exigeDispositivo(empresaId: string): Promise<boolean> {
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
  });
  return cfg?.valor === '1';
}

// Geocerco: la empresa puede exigir que la marca se haga dentro de un radio
// de su ubicación (GPS del teléfono). Se guarda en Configuración → Marcación.
type GeoCfg = { lat: number; lng: number; radio: number };
async function geocercoConfig(empresaId: string): Promise<GeoCfg | null> {
  const cfgs = await prisma.configuracion.findMany({
    where: { empresaId, clave: { in: ['GEO_EXIGIR', 'GEO_LAT', 'GEO_LNG', 'GEO_RADIO'] } },
  });
  const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
  if (map.GEO_EXIGIR !== '1') return null;
  const lat = Number(map.GEO_LAT), lng = Number(map.GEO_LNG);
  const radio = Number(map.GEO_RADIO) || 150;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null; // activado pero sin ubicación fijada
  return { lat, lng, radio };
}

// Distancia en metros entre dos coordenadas (fórmula de Haversine).
function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ¿La empresa permite marcar con cédula? (por defecto sí; se desactiva en Configuración → Marcación)
async function permiteCedula(empresaId: string): Promise<boolean> {
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId, clave: 'KIOSCO_PERMITE_CEDULA' } },
  });
  return cfg?.valor !== '0';
}

// Foto de verificación facial: JPEG base64 pequeño tomado en el navegador al marcar
function fotoValida(foto: unknown): foto is string {
  return typeof foto === 'string' && foto.startsWith('data:image/jpeg;base64,') && foto.length < 300_000;
}

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const minutosDe = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// Motivos de novedad válidos (mismos de la vista interna del colaborador)
const TIPOS_NOVEDAD = new Set([
  'VACACIONES', 'INCAPACIDAD_EPS', 'INCAPACIDAD_ARL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD',
  'LICENCIA_LUTO', 'CALAMIDAD', 'MEDICO', 'PERSONAL', 'NO_REMUNERADO', 'OTRO',
]);

async function dispositivoValido(empresaId: string, deviceToken?: string): Promise<boolean> {
  if (!deviceToken) return false;
  const disp = await prisma.dispositivoKiosco.findUnique({ where: { token: deviceToken } });
  if (!disp || disp.empresaId !== empresaId) return false;
  await prisma.dispositivoKiosco.update({ where: { id: disp.id }, data: { ultimoUso: new Date() } });
  return true;
}

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
      exigeUbicacion: (await geocercoConfig(empresa.id)) !== null,
    };
  });

  // Vincula este dispositivo al kiosco con el código de 6 dígitos que genera el admin
  app.post('/vincular', async (request, reply) => {
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
  app.post('/login', async (request, reply) => {
    const { cedula, marcadorToken, deviceToken } = request.body as { cedula: string; marcadorToken: string; deviceToken?: string };
    if (!marcadorToken) return reply.code(400).send({ error: 'Link de marcación inválido' });

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

    const token = app.jwt.sign(
      { id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId },
      { expiresIn: '12h' }
    );
    return { token, colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo } };
  });

  // Login del kiosco con reconocimiento facial: el navegador ya calculó el
  // descriptor (128 floats) con face-api.js y ya pasó la prueba de vida
  // (parpadeo). El servidor solo compara contra los enrolados de esa empresa.
  app.post('/login-rostro', async (request, reply) => {
    const { descriptor, marcadorToken, deviceToken } = request.body as {
      descriptor: unknown; marcadorToken: string; deviceToken?: string;
    };
    if (!marcadorToken) return reply.code(400).send({ error: 'Link de marcación inválido' });
    if (!esDescriptorValido(descriptor)) return reply.code(400).send({ error: 'Rostro no capturado correctamente' });

    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken } });
    if (!empresa || !empresa.activa) return reply.code(404).send({ error: 'Link de marcación inválido' });

    if (await exigeDispositivo(empresa.id)) {
      if (!(await dispositivoValido(empresa.id, deviceToken))) {
        return reply.code(401).send({ error: 'Este dispositivo no está autorizado para marcar', codigo: 'DISPOSITIVO_REQUERIDO' });
      }
    }

    const enrolados = await prisma.colaborador.findMany({
      where: { empresaId: empresa.id, activo: true, rostroDescriptor: { not: Prisma.DbNull } },
      select: { id: true, nombre: true, apellido: true, cargo: true, cedula: true, empresaId: true, rostroDescriptor: true },
    });
    const match = mejorCoincidencia(descriptor, enrolados);
    if (!match) return reply.code(401).send({ error: 'Rostro no reconocido. Intenta de nuevo o marca con tu cédula.' });

    const col = match.colaborador;
    const token = app.jwt.sign(
      { id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido, rol: 'WORKER', empresaId: col.empresaId },
      { expiresIn: '12h' }
    );
    return { token, colaborador: { id: col.id, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo } };
  });

  // Estado del día: retorna si hay entrada abierta (sin salida)
  app.get('/estado', { preHandler: [app.authenticate] }, async (request) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return { error: 'No autorizado' };

    const ahoraBog = toZonedTime(new Date(), TZ);
    const inicioDia = new Date(Date.UTC(
      ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0
    )); // 00:00 Bogotá = 05:00 UTC
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const registrosHoy = await prisma.registro.findMany({
      where: {
        colaboradorId: payload.id,
        fecha: { gte: inicioDia, lt: finDia },
      },
      orderBy: { creadoEn: 'asc' },
    });

    const abierto = registrosHoy.find(r => r.entrada && !r.salida) ?? null;
    return {
      registrosHoy,
      entradaAbierta: abierto,
      dentroAhora: !!abierto,
    };
  });

  // Registrar entrada o salida. Si el login fue con rostro, llega la foto de
  // verificación (se conserva 2 meses y luego se borra automáticamente).
  app.post('/marcar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = (request as any).user as { id: string; rol: string; empresaId: string };
    if (payload.rol !== 'WORKER') return reply.code(403).send({ error: 'No autorizado' });
    const { foto, lat, lng } = (request.body ?? {}) as { foto?: unknown; lat?: unknown; lng?: unknown };
    const fotoGuardar = fotoValida(foto) ? foto : null;

    // Geocerco: si la empresa lo exige, la marca debe venir dentro del radio.
    const geo = await geocercoConfig(payload.empresaId);
    if (geo) {
      const latN = Number(lat), lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        return reply.code(400).send({ error: 'Necesitamos tu ubicación para marcar. Activa el GPS y permite el acceso.', codigo: 'UBICACION_REQUERIDA' });
      }
      const dist = Math.round(distanciaMetros(latN, lngN, geo.lat, geo.lng));
      if (dist > geo.radio) {
        return reply.code(403).send({
          error: `Estás fuera de la ubicación de la empresa (a ${dist} m). Debes marcar desde el sitio de trabajo.`,
          codigo: 'FUERA_DE_UBICACION', distancia: dist, radio: geo.radio,
        });
      }
    }

    const ahora = new Date();
    const ahoraBog = toZonedTime(ahora, TZ);
    const inicioDia = new Date(Date.UTC(
      ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0
    ));
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const abierto = await prisma.registro.findFirst({
      where: {
        colaboradorId: payload.id,
        fecha: { gte: inicioDia, lt: finDia },
        entrada: { not: null },
        salida: null,
      },
      orderBy: { creadoEn: 'asc' },
    });

    // Festivo legal (global) o propio de la empresa del colaborador
    const col = await prisma.colaborador.findUnique({
      where: { id: payload.id },
      include: { horario: { include: { franjas: true } } },
    });
    const festHoy = await prisma.diaFestivo.findFirst({
      where: {
        fecha: { gte: inicioDia, lt: finDia },
        OR: [{ empresaId: null }, { empresaId: col?.empresaId }],
      },
    });
    const tipo = festHoy ? 'FESTIVO' : 'NORMAL';

    if (abierto) {
      const updated = await prisma.registro.update({
        where: { id: abierto.id },
        data: { salida: ahora, ...(fotoGuardar ? { fotoSalida: fotoGuardar } : {}) },
      });
      // ¿Salió antes de la hora de fin de su franja de hoy? (para pedir motivo)
      let salidaTemprana = false;
      const horario = col?.horario;
      if (horario && horario.activo && !festHoy) {
        const franja = horario.franjas.find(f => ((f.dias as string[]) ?? []).includes(DIAS_SEMANA[ahoraBog.getDay()]));
        if (franja) {
          const finMin = minutosDe(franja.horaSalida);
          const iniMin = minutosDe(franja.horaEntrada);
          // Solo turnos que no cruzan medianoche (caso común de salida temprana)
          if (finMin > iniMin) {
            const salidaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
            if (salidaMin < finMin - (horario.toleranciaMin ?? 0)) salidaTemprana = true;
          }
        }
      }
      return { accion: 'SALIDA', registro: updated, hora: ahora, salidaTemprana };
    } else {
      // ¿Ya había marcado entrada hoy? (para alertar tardanza solo en la 1a entrada)
      const entradasPrevias = await prisma.registro.count({
        where: { colaboradorId: payload.id, fecha: { gte: inicioDia, lt: finDia }, entrada: { not: null } },
      });
      const nuevo = await prisma.registro.create({
        data: {
          colaboradorId: payload.id,
          fecha: inicioDia,
          entrada: ahora,
          tipo: tipo as any,
          ...(fotoGuardar ? { fotoEntrada: fotoGuardar } : {}),
        },
      });

      // Alerta de llegada tarde por Telegram (primera entrada del día, día laboral)
      const horarioE = col?.horario;
      if (entradasPrevias === 0 && col && !festHoy && horarioE?.activo) {
        const franja = horarioE.franjas.find(f => ((f.dias as string[]) ?? []).includes(DIAS_SEMANA[ahoraBog.getDay()]));
        if (franja) {
          const entradaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
          const tarde = entradaMin - (minutosDe(franja.horaEntrada) + (horarioE.toleranciaMin ?? 0));
          if (tarde > 0) {
            alertarTardanzaTelegram(col.empresaId, `${col.nombre} ${col.apellido}`, ahoraBog, tarde).catch(() => {});
          }
        }
      }
      return { accion: 'ENTRADA', registro: nuevo, hora: ahora };
    }
  });

  // El colaborador reporta el motivo de una salida temprana desde el kiosco.
  // Crea una novedad del día, pendiente de aprobación por el administrador.
  app.post('/novedad', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = (request as any).user as { id: string; rol: string };
    if (payload.rol !== 'WORKER') return reply.code(403).send({ error: 'No autorizado' });
    const { tipo, descripcion } = (request.body ?? {}) as { tipo?: string; descripcion?: string };
    if (!tipo || !TIPOS_NOVEDAD.has(tipo)) return reply.code(400).send({ error: 'Motivo inválido' });

    const ahoraBog = toZonedTime(new Date(), TZ);
    const fechaDia = new Date(Date.UTC(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 5, 0, 0));
    const permiso = await prisma.permiso.create({
      data: {
        colaboradorId: payload.id,
        tipo: tipo as any,
        descripcion: (descripcion || '').trim() || null,
        fechaInicio: fechaDia,
        fechaFin: fechaDia,
        aprobado: false,
      },
    });
    return reply.code(201).send({ ok: true, id: permiso.id });
  });
}
