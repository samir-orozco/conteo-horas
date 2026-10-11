import { prisma } from '../prisma';
import { enviarTelegram } from './telegram';
import { rangoDiaBogota, claveDiaBogota } from './fechas';
import { combinarDiasEsperados } from './diasEsperados';
import { kioscoPausado } from './suscripcion';
import type { HorarioConFranjas } from './tardanzas';
import {
  quienesNoHanLlegado, mensajeNoHanLlegado, mensajeYaLlego, cuerpoYaLlego, horaLegible, CLAVE_NO_HA_LLEGADO, type PersonaDelDia,
} from './noHaLlegado';

// LA PLOMERÍA DE «NO HA LLEGADO» (11 de octubre de 2026).
//
// El barrido cada 5 minutos y el «ya llegó» que dispara el kiosco. La decisión de a quién se le
// avisa está en noHaLlegado.ts, probada. Esto se verifica contra la base local con
// prisma/probar-no-ha-llegado.ts (§8.6).

export const TIPO_NO_HA_LLEGADO = 'NO_HA_LLEGADO';
const DIA_MS = 24 * 60 * 60 * 1000;

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

// Las empresas con el aviso encendido y un chat a dónde mandarlo.
async function empresasConElAviso(): Promise<{ empresaId: string; chat: string }[]> {
  const cfgs = await prisma.configuracion.findMany({
    where: { clave: { in: [CLAVE_NO_HA_LLEGADO, 'TELEGRAM_CHAT_ID'] }, empresa: { activa: true } },
    select: { empresaId: true, clave: true, valor: true },
  });
  const porEmpresa = new Map<string, Record<string, string>>();
  for (const c of cfgs) porEmpresa.set(c.empresaId, { ...porEmpresa.get(c.empresaId), [c.clave]: c.valor });
  return [...porEmpresa.entries()]
    .filter(([, m]) => m[CLAVE_NO_HA_LLEGADO] === '1' && m.TELEGRAM_CHAT_ID?.trim())
    .map(([empresaId, m]) => ({ empresaId, chat: m.TELEGRAM_CHAT_ID.trim() }));
}

async function avisarEmpresa(empresaId: string, chat: string, ahora: Date, log?: Log): Promise<number> {
  const { inicioDia, finDia } = rangoDiaBogota(ahora);
  const hoy = claveDiaBogota(ahora);

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } },
  });
  // Con el kiosco pausado nadie puede marcar: todos serían falsas alarmas.
  if (!empresa || kioscoPausado(empresa, empresa.suscripcion, ahora)) return 0;

  // Las personas primero, y lo demás por su lista de ids: con `colaborador: { empresaId }` MySQL usaba
  // solo la primera parte del índice (colaboradorId, fecha) y leía TODO el historial de cada persona
  // para quedarse con hoy. Con la lista de ids salta directo al día. Esto corre cada 5 minutos, y el
  // historial crece un día por persona cada día: ver el EXPLAIN en el commit (§8.4).
  const colaboradores = await prisma.colaborador.findMany({
    where: { empresaId, activo: true },
    select: { id: true, nombre: true, apellido: true, creadoEn: true, horario: { include: { franjas: true } } },
  });
  if (!colaboradores.length) return 0;
  const ids = colaboradores.map(c => c.id);

  const [materializados, marcaron, novedades, festivos, avisados] = await Promise.all([
    prisma.diaEsperado.findMany({
      where: { colaboradorId: { in: ids }, fecha: { gte: inicioDia, lt: finDia } },
      select: {
        colaboradorId: true, fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true,
        almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true,
        almuerzoInicio: true, almuerzoFin: true, descansos: true,
      },
    }),
    // Cualquier marcación de hoy: la primera entrada es la que cuenta, y basta con que exista.
    prisma.registro.findMany({
      where: { colaboradorId: { in: ids }, fecha: { gte: inicioDia, lt: finDia }, entrada: { not: null } },
      select: { colaboradorId: true },
      distinct: ['colaboradorId'],
    }),
    // Aprobadas o no (ver ContextoDelDia en noHaLlegado.ts).
    prisma.permiso.findMany({
      where: { colaboradorId: { in: ids }, fechaInicio: { lt: finDia }, fechaFin: { gte: inicioDia } },
      select: { colaboradorId: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true },
    }),
    // Un día de margen a cada lado y se compara por el día de Bogotá, como en tardanzas.ts.
    prisma.diaFestivo.findMany({
      where: { OR: [{ empresaId: null }, { empresaId }], fecha: { gte: new Date(inicioDia.getTime() - DIA_MS), lt: new Date(finDia.getTime() + DIA_MS) } },
      select: { fecha: true },
    }),
    prisma.notificacion.findMany({
      where: { empresaId, tipo: TIPO_NO_HA_LLEGADO, creadoEn: { gte: inicioDia } },
      select: { entidadId: true },
    }),
  ]);

  const diaDe = new Map(materializados.map(d => [d.colaboradorId, d]));
  const personas: PersonaDelDia[] = colaboradores.map(c => {
    const [dia] = combinarDiasEsperados(inicioDia, finDia, diaDe.has(c.id) ? [diaDe.get(c.id)!] : [], c.horario as HorarioConFranjas | null);
    return { colaboradorId: c.id, nombre: c.nombre, apellido: c.apellido, creadoEn: c.creadoEn, dia: dia ?? null };
  });

  const lista = quienesNoHanLlegado(ahora, personas, {
    festivo: festivos.some(f => claveDiaBogota(f.fecha) === hoy),
    conEntrada: new Set(marcaron.map(r => r.colaboradorId)),
    novedades,
    yaAvisados: new Set(avisados.map(a => a.entidadId).filter((x): x is string => !!x)),
  });
  if (!lista.length) return 0;

  // La campana se escribe aunque Telegram falle: es la marca de «ya se avisó» y el otro canal. Si se
  // escribiera solo cuando Telegram responde bien, un chat mal configurado haría reintentar cada
  // 5 minutos para siempre.
  const r = await enviarTelegram(chat, mensajeNoHanLlegado(lista));
  if (!r.ok) log?.error(r.error, `No ha llegado: Telegram rechazó el aviso de la empresa ${empresaId}`);
  await prisma.notificacion.createMany({
    data: lista.map(p => ({
      empresaId, tipo: TIPO_NO_HA_LLEGADO,
      titulo: `${p.nombre} ${p.apellido} no ha marcado entrada`,
      cuerpo: `Entraba a las ${horaLegible(p.horaEntrada)}`,
      entidad: 'colaborador', entidadId: p.colaboradorId,
    })),
  });
  return lista.length;
}

// La pasada. Una empresa que falla no deja sin aviso a las demás, y deja rastro siempre (§8.3).
export async function avisarNoHanLlegado(log?: Log, ahora = new Date()): Promise<number> {
  const empresas = await empresasConElAviso();
  let personas = 0, fallidas = 0;
  for (const { empresaId, chat } of empresas) {
    try {
      personas += await avisarEmpresa(empresaId, chat, ahora, log);
    } catch (err) {
      fallidas++;
      log?.error(err, `No ha llegado: falló la empresa ${empresaId}`);
    }
  }
  log?.info(`No ha llegado: ${personas} avisadas en ${empresas.length} empresas con el aviso · ${fallidas} fallidas`);
  return personas;
}

// Lo llama el kiosco al registrar una entrada que no es regreso de una pausa. Si a esa persona se le
// avisó hoy que no había llegado y esta es su primera entrada del día, se cierra el tema en el grupo
// y en la campana. No bloquea la marca: quien llama no espera el resultado.
export async function avisarSiYaLlego(empresaId: string, colaboradorId: string, nombreCompleto: string, marco: Date): Promise<void> {
  const { inicioDia, finDia } = rangoDiaBogota(marco);
  const [aviso, entradasDeHoy, dia, cfgs] = await Promise.all([
    prisma.notificacion.findFirst({
      where: { empresaId, tipo: TIPO_NO_HA_LLEGADO, entidadId: colaboradorId, creadoEn: { gte: inicioDia } },
      select: { id: true, cuerpo: true },
    }),
    prisma.registro.count({ where: { colaboradorId, fecha: { gte: inicioDia, lt: finDia }, entrada: { not: null } } }),
    prisma.diaEsperado.findFirst({ where: { colaboradorId, fecha: { gte: inicioDia, lt: finDia } }, select: { horaEntrada: true } }),
    prisma.configuracion.findMany({ where: { empresaId, clave: { in: [CLAVE_NO_HA_LLEGADO, 'TELEGRAM_CHAT_ID'] } } }),
  ]);
  // Solo la primera entrada: la segunda del día es alguien que volvió, no que llegó.
  if (!aviso || entradasDeHoy !== 1) return;

  const cfg = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
  const horaEntrada = dia?.horaEntrada;
  if (cfg[CLAVE_NO_HA_LLEGADO] === '1' && cfg.TELEGRAM_CHAT_ID && horaEntrada) {
    await enviarTelegram(cfg.TELEGRAM_CHAT_ID, mensajeYaLlego(nombreCompleto, marco, horaEntrada));
  }
  await prisma.notificacion.update({ where: { id: aviso.id }, data: { cuerpo: cuerpoYaLlego(marco, horaEntrada ?? null) } });
}
