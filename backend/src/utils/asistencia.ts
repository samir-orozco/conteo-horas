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
}): EstadoDeAsistencia {
  const { dia } = e;
  if (!dia || !dia.programado || !dia.horaEntrada) return 'SIN_TURNO';
  if (e.festivo) return 'FESTIVO';
  const horaEntrada = dia.horaEntrada;
  const entrada = e.inicioDia.getTime() + minutosDe(horaEntrada) * MIN;
  if (e.creadoEn.getTime() > entrada) return 'NO_EXISTIA';
  if (e.llego) return 'LLEGO';
  if (e.novedades.some(n => excusaLaTardanza(n, e.inicioDia, horaEntrada))) return 'NOVEDAD';
  if (e.ahora.getTime() <= entrada + dia.toleranciaMin * MIN) return 'EN_TIEMPO';
  return 'FALTA';
}

export type PersonaParaAsistencia = {
  id: string;
  creadoEn: Date;
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
      const estado = estadoDeAsistencia({ dia: p.dias.get(clave) ?? null, inicioDia, llego, creadoEn: p.creadoEn, festivo, novedades: p.novedades, ahora });
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
