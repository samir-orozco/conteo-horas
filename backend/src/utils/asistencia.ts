import { excusaLaTardanza, minutosDe, type NovedadParaDia } from './tardanzas';
import { claveDiaBogota, medianocheBogota } from './fechas';

// Quién debía venir y quién llegó (15 de octubre de 2026).
//
// Una sola regla para «Aún no han marcado entrada», la asistencia de la semana del Inicio y el aviso
// «no ha llegado» de Telegram. Decisión del dueño: la de los días esperados (lo que el horario o el
// planificador exigían ESE día, `diasParaMedir`), que ya era la de Telegram y la del reporte. El
// Inicio miraba el horario de hoy y no veía los turnos pintados ni los días libres de la
// programación. Qué novedades excusan lo decide quien llama: el Inicio pasa las aprobadas, y Telegram
// todas, porque avisar que alguien no llegó cuando ya dijo que tenía cita es ruido.

export type DiaDeAsistencia = { programado: boolean; horaEntrada: string | null; toleranciaMin: number } | null;

// Un caso por valor (CLAUDE.md §9.4): quien lea un estado nuevo tiene que decidir qué hacer con él.
export type EstadoDeAsistencia =
  | 'SIN_TURNO'   // ese día no tenía turno
  | 'FESTIVO'     // tenía turno, pero era festivo: nadie debía venir (igual que el reporte)
  | 'NO_EXISTIA'  // no estaba en el sistema cuando tenía que entrar
  | 'LLEGO'       // marcó su entrada en esa jornada
  | 'NOVEDAD'     // una novedad lo excusaba y no vino
  | 'EN_TIEMPO'   // todavía no se le pasa la hora de entrada más la tolerancia
  | 'FALTA';      // debía venir, ya pasó su hora y no ha marcado

const MIN = 60 * 1000;

export function estadoDeAsistencia(e: {
  dia: DiaDeAsistencia; inicioDia: Date; llego: boolean; creadoEn: Date; festivo: boolean;
  novedades: NovedadParaDia[]; ahora: Date;
  // Los tramos en que estuvo retirada (`huecosDelVinculo`): un turno dentro de uno no se le exigía.
  huecos?: Hueco[];
}): EstadoDeAsistencia {
  const { dia } = e;
  if (!dia || !dia.programado || !dia.horaEntrada) return 'SIN_TURNO';
  if (e.festivo) return 'FESTIVO';
  const horaEntrada = dia.horaEntrada;
  const entrada = e.inicioDia.getTime() + minutosDe(horaEntrada) * MIN;
  // Si marcó, llegó, aunque lo hayan creado después de su hora: así lo cuentan las llegadas tarde y el reporte.
  if (e.llego) return 'LLEGO';
  if (e.creadoEn.getTime() > entrada) return 'NO_EXISTIA';
  if ((e.huecos ?? []).some(([desde, hasta]) => entrada >= desde.getTime() && entrada < hasta.getTime())) return 'NO_EXISTIA';
  if (e.novedades.some(n => excusaLaTardanza(n, e.inicioDia, horaEntrada))) return 'NOVEDAD';
  if (e.ahora.getTime() <= entrada + dia.toleranciaMin * MIN) return 'EN_TIEMPO';
  return 'FALTA';
}

// LOS HUECOS DEL VÍNCULO (15 de octubre de 2026, revisiones adversariales): los tramos [desde, hasta) en que la
// persona estuvo retirada. Mientras tanto no debía venir; antes de retirarse, sí. El retiro es su último día
// trabajado (se puede entrar y salir el mismo día, utils/vinculacion.ts), así que el hueco empieza la medianoche
// siguiente; y termina cuando se REGISTRÓ el reingreso, nunca antes de su fecha: reingresada a las 10, su turno de
// las 8 ya había pasado. El ingreso original no abre ni cierra nada: antes de crearla en el sistema ya responde
// `creadoEn`, y fechado hacia atrás la haría faltar en días en que todavía no estaba.
//
// En el orden en que se REGISTRARON, no por su fecha: un retiro programado para el lunes y deshecho el jueves anterior
// con un reingreso no deja hueco. Un reingreso sin retiro antes (la migración del historial solo sembró INGRESO, así
// que quien se retiró antes no tiene RETIRO) cierra un hueco abierto desde siempre. Y un retiro sin reingreso no deja
// hueco: quien llama solo pasa personas activas, así que es uno programado o datos incoherentes, y un hueco abierto
// escondería sus faltas para siempre, en silencio (verificación adversarial del 15 de octubre de 2026).
export type Hueco = [Date, Date];
export type EventoDeVinculo = { tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO'; fecha: Date; creadoEn: Date };
const DIA_MS = 24 * 60 * MIN;
const DESDE_SIEMPRE = new Date(0);

export function huecosDelVinculo(eventos: EventoDeVinculo[]): Hueco[] {
  const enOrden = eventos
    .filter(e => e.tipo !== 'INGRESO')
    .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime() || a.fecha.getTime() - b.fecha.getTime());
  const huecos: Hueco[] = [];
  let abierto: Date | null = null;
  enOrden.forEach((e, i) => {
    if (e.tipo === 'RETIRO') {
      if (!abierto) abierto = new Date(medianocheBogota(claveDiaBogota(e.fecha)).getTime() + DIA_MS);
      return;
    }
    // Un reingreso sin retiro abierto solo cierra algo si es el primer evento: el de antes del historial.
    const desde = abierto ?? (i === 0 ? DESDE_SIEMPRE : null);
    const fin = new Date(Math.max(e.fecha.getTime(), e.creadoEn.getTime()));
    if (desde && fin > desde) huecos.push([desde, fin]);
    abierto = null;
  });
  return huecos;
}

export type PersonaParaAsistencia = {
  id: string;
  creadoEn: Date;
  huecos?: Hueco[];
  // El día de cada clave 'YYYY-MM-DD', ya combinado (`diasParaMedir`). Sin la clave: sin turno.
  dias: Map<string, DiaDeAsistencia>;
  // Las claves de las jornadas en que marcó entrada (por `Registro.fecha`).
  llegoEn: Set<string>;
  novedades: NovedadParaDia[];
};

export type AsistenciaDelDia = {
  clave: string;
  fecha: Date;             // medianoche de Bogotá: nunca un 'YYYY-MM-DD' suelto, que el navegador pinta un día antes
  esHoy: boolean;
  futuro: boolean;
  festivo: boolean;
  debian: number;          // los que ya tenían que haber entrado: llegaron + faltan
  llegaron: number;        // de los que debían
  llegaronSinTurno: number;
  conNovedad: number;
  enTiempo: number;        // hoy: los que entran más tarde
  conTurno: number;        // con turno ese día (para pintar lo que viene)
};

export function asistenciaPorDia(claves: string[], ahora: Date, personas: PersonaParaAsistencia[], festivos: Set<string>): AsistenciaDelDia[] {
  const hoy = claveDiaBogota(ahora);
  return claves.map(clave => {
    const inicioDia = medianocheBogota(clave);
    const festivo = festivos.has(clave);
    const d: AsistenciaDelDia = {
      clave, fecha: inicioDia, esHoy: clave === hoy, futuro: clave > hoy, festivo,
      debian: 0, llegaron: 0, llegaronSinTurno: 0, conNovedad: 0, enTiempo: 0, conTurno: 0,
    };
    for (const p of personas) {
      const llego = p.llegoEn.has(clave);
      const estado = estadoDeAsistencia({ dia: p.dias.get(clave) ?? null, inicioDia, llego, creadoEn: p.creadoEn, festivo, novedades: p.novedades, ahora, huecos: p.huecos });
      switch (estado) {
        case 'LLEGO': d.debian++; d.llegaron++; d.conTurno++; break;
        case 'FALTA': d.debian++; d.conTurno++; break;
        case 'EN_TIEMPO': d.enTiempo++; d.conTurno++; break;
        case 'NOVEDAD': d.conNovedad++; break;
        case 'SIN_TURNO':
        case 'FESTIVO':
        case 'NO_EXISTIA': if (llego) d.llegaronSinTurno++; break;
        default: { const nunca: never = estado; throw new Error(`estado de asistencia sin manejar: ${nunca}`); }
      }
    }
    return d;
  });
}
