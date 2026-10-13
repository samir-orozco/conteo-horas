import { prisma } from '../prisma';
import { enviarTelegram } from './telegram';
import { rangoDiaBogota, claveDiaBogota } from './fechas';
import { combinarDiasEsperados } from './diasEsperados';
import { kioscoPausado } from './suscripcion';
import type { HorarioConFranjas } from './tardanzas';
import {
  pausasPorAvisar, mensajePausasSinVolver, mensajeYaVolvio, cuerpoDePausaSinVolver, cuerpoYaVolvio,
  CLAVE_PAUSAS, type DiaDeLaPausa, type Pausa,
} from './pausaSinVolver';

// LA PLOMERÍA DE «NO HA VUELTO DE SU PAUSA» (13 de octubre de 2026).
//
// El barrido cada 5 minutos y el «ya volvió» que dispara el kiosco. Mismo molde que
// avisoNoHaLlegado.ts. La decisión está en pausaSinVolver.ts, probada. Se verifica contra la base
// local con prisma/probar-pausa-sin-volver.ts (§8.6).

export const TIPO_PAUSA_SIN_VOLVER = 'PAUSA_SIN_VOLVER';
const DIA_MS = 24 * 60 * 60 * 1000;

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

async function empresasConElAviso(): Promise<{ empresaId: string; chat: string }[]> {
  const cfgs = await prisma.configuracion.findMany({
    where: { clave: { in: [CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] }, empresa: { activa: true } },
    select: { empresaId: true, clave: true, valor: true },
  });
  const porEmpresa = new Map<string, Record<string, string>>();
  for (const c of cfgs) porEmpresa.set(c.empresaId, { ...porEmpresa.get(c.empresaId), [c.clave]: c.valor });
  return [...porEmpresa.entries()]
    .filter(([, m]) => m[CLAVE_PAUSAS] === '1' && m.TELEGRAM_CHAT_ID?.trim())
    .map(([empresaId, m]) => ({ empresaId, chat: m.TELEGRAM_CHAT_ID.trim() }));
}

async function avisarEmpresa(empresaId: string, chat: string, ahora: Date, log?: Log): Promise<number> {
  const { finDia } = rangoDiaBogota(ahora);
  // Hoy y ayer: la pausa de un turno nocturno después de la medianoche tiene la fecha de ayer.
  const desde = new Date(finDia.getTime() - 2 * DIA_MS);

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } },
  });
  if (!empresa || kioscoPausado(empresa, empresa.suscripcion, ahora)) return 0;

  // Las personas primero y lo demás por su lista de ids, para que MySQL use el índice
  // (colaboradorId, fecha) entero: ver la nota de avisoNoHaLlegado.ts (§8.4).
  const colaboradores = await prisma.colaborador.findMany({
    where: { empresaId, activo: true },
    select: { id: true, nombre: true, apellido: true, horario: { include: { franjas: true } } },
  });
  if (!colaboradores.length) return 0;
  const ids = colaboradores.map(c => c.id);

  const [filas, materializados] = await Promise.all([
    prisma.registro.findMany({
      where: { colaboradorId: { in: ids }, fecha: { gte: desde, lt: finDia } },
      select: { id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
    }),
    prisma.diaEsperado.findMany({
      where: { colaboradorId: { in: ids }, fecha: { gte: desde, lt: finDia } },
      select: {
        colaboradorId: true, fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true,
        almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true,
        almuerzoInicio: true, almuerzoFin: true, descansos: true,
      },
    }),
  ]);
  const pausas = filas.filter(f => f.salida && (f.salidaAlmuerzo || f.salidaDescanso));
  if (!pausas.length) return 0;

  const avisados = await prisma.notificacion.findMany({
    // Acotado por fecha para ir por el índice (empresaId, creadoEn): el aviso de una pausa de la ventana
    // no puede ser anterior a ella. Sin esto se recorrían todos los avisos de la empresa (§8.4).
    where: { empresaId, creadoEn: { gte: desde }, tipo: TIPO_PAUSA_SIN_VOLVER, entidadId: { in: pausas.map(p => p.id) } },
    select: { entidadId: true },
  });

  // El día esperado de cada persona en cada fecha, materializado o del horario.
  const dias = new Map<string, DiaDeLaPausa>();
  for (const c of colaboradores) {
    const suyos = materializados.filter(d => d.colaboradorId === c.id);
    for (const d of combinarDiasEsperados(desde, finDia, suyos, c.horario as HorarioConFranjas | null)) {
      dias.set(`${c.id}|${claveDiaBogota(d.fecha)}`, d);
    }
  }

  const lista = pausasPorAvisar(
    ahora, filas,
    (id, fecha) => dias.get(`${id}|${claveDiaBogota(fecha)}`) ?? null,
    new Map(colaboradores.map(c => [c.id, { nombre: c.nombre, apellido: c.apellido }])),
    new Set(avisados.map(a => a.entidadId).filter((x): x is string => !!x)),
  );
  if (!lista.length) return 0;

  // La campana se escribe aunque Telegram falle, por lo mismo que en «no ha llegado»: es la marca de
  // «ya se avisó», y sin ella un chat mal puesto reintentaría cada 5 minutos para siempre.
  const r = await enviarTelegram(chat, mensajePausasSinVolver(lista));
  if (!r.ok) log?.error(r.error, `Pausa sin volver: Telegram rechazó el aviso de la empresa ${empresaId}`);
  await prisma.notificacion.createMany({
    data: lista.map(p => ({
      empresaId, tipo: TIPO_PAUSA_SIN_VOLVER,
      titulo: `${p.nombre} no ha vuelto ${p.pausa === 'almuerzo' ? 'del almuerzo' : 'de su descanso'}`,
      cuerpo: cuerpoDePausaSinVolver(p),
      entidad: 'registro', entidadId: p.registroId,
    })),
  });
  return lista.length;
}

export async function avisarPausasSinVolver(log?: Log, ahora = new Date()): Promise<number> {
  const empresas = await empresasConElAviso();
  let personas = 0, fallidas = 0;
  for (const { empresaId, chat } of empresas) {
    try {
      personas += await avisarEmpresa(empresaId, chat, ahora, log);
    } catch (err) {
      fallidas++;
      log?.error(err, `Pausa sin volver: falló la empresa ${empresaId}`);
    }
  }
  log?.info(`Pausa sin volver: ${personas} avisadas en ${empresas.length} empresas con el aviso · ${fallidas} fallidas`);
  return personas;
}

// Lo llama el kiosco al registrar el regreso de una pausa. Si se avisó que esa pausa estaba sin volver,
// se cierra el tema en el grupo y en la campana. No bloquea la marca.
export async function avisarSiYaVolvio(empresaId: string, registroDeLaPausa: string, nombre: string, pausa: Pausa, marco: Date): Promise<void> {
  const aviso = await prisma.notificacion.findFirst({
    // Corre en cada regreso de pausa del kiosco: acotado por fecha, por el índice (empresaId, creadoEn).
    // El aviso de una pausa que todavía espera regreso no tiene más de 18 horas (VENTANA_TURNO_MS).
    where: { empresaId, creadoEn: { gte: new Date(marco.getTime() - DIA_MS) }, tipo: TIPO_PAUSA_SIN_VOLVER, entidad: 'registro', entidadId: registroDeLaPausa },
    select: { id: true, cuerpo: true },
  });
  // Sin aviso no hay nada que cerrar; con el aviso ya cerrado, tampoco.
  if (!aviso || aviso.cuerpo?.startsWith('Volvió')) return;
  const cfgs = await prisma.configuracion.findMany({ where: { empresaId, clave: { in: [CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] } } });
  const cfg = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
  if (cfg[CLAVE_PAUSAS] === '1' && cfg.TELEGRAM_CHAT_ID) {
    await enviarTelegram(cfg.TELEGRAM_CHAT_ID, mensajeYaVolvio(nombre, pausa, marco));
  }
  await prisma.notificacion.update({ where: { id: aviso.id }, data: { cuerpo: cuerpoYaVolvio(marco, aviso.cuerpo) } });
}
