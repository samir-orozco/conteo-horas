import { diaCorto, diaDeLaSemana } from '../../lib/fechas';
import { fmtMin } from './helpers';
import type { Dash } from './types';

// La semana en el Inicio (15 de octubre de 2026): cómo se dicen las barras de la asistencia y de las
// llegadas tarde. Quién debía venir y quién llegó tarde lo decide el servidor (utils/asistencia.ts y
// calcularTardanzas, la regla del reporte); aquí, el texto y el largo de cada barra. Cada barra dice
// su número escrito: el largo solo no le dice nada a quien no ve bien los colores ni a un lector de
// pantalla.

type DiaAsistencia = NonNullable<Dash['asistenciaSemana']>['dias'][number];
type DiasLlegadas = NonNullable<Dash['llegadasTarde7d']>['dias'];
type Personas = NonNullable<Dash['llegadasTarde7d']>['personas'];

const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export type EstadoDeColumna = 'DATOS' | 'FUTURO' | 'FESTIVO' | 'SIN_TURNO';
export type ColumnaDeAsistencia = {
  clave: string; etiqueta: string; esHoy: boolean; estado: EstadoDeColumna;
  cifra: string; alto: number; nota: string | null; nombreAccesible: string;
};

function estadoDeColumna(d: DiaAsistencia): EstadoDeColumna {
  if (d.festivo) return 'FESTIVO';
  if (d.futuro) return 'FUTURO';
  if (d.debian === 0 && d.enTiempo === 0) return 'SIN_TURNO';
  return 'DATOS';
}

export function columnasDeAsistencia(dias: DiaAsistencia[]): ColumnaDeAsistencia[] {
  return dias.map(d => {
    const estado = estadoDeColumna(d);
    const notas = [
      d.esHoy && d.enTiempo ? `${cuantos(d.enTiempo, 'entra', 'entran')} más tarde` : null,
      d.llegaronSinTurno ? `+${d.llegaronSinTurno} sin turno` : null,
      d.conNovedad ? `${d.conNovedad} con novedad` : null,
    ].filter((x): x is string => !!x);
    let cifra: string;
    switch (estado) {
      case 'FESTIVO': cifra = 'festivo'; break;
      case 'FUTURO': cifra = d.conTurno ? `${d.conTurno} con turno` : 'sin turnos'; break;
      case 'SIN_TURNO': cifra = 'sin turnos'; break;
      case 'DATOS': cifra = `${d.llegaron} de ${d.debian}`; break;
      default: { const nunca: never = estado; cifra = nunca; }
    }
    const alto = estado === 'DATOS' && d.debian > 0 ? Math.round((d.llegaron / d.debian) * 100) : 0;
    const quien = `${d.esHoy ? 'Hoy, ' : ''}${diaDeLaSemana(d.fecha)}`;
    const lectura = estado === 'DATOS' ? `llegaron ${d.llegaron} de ${d.debian}` : cifra;
    return {
      clave: d.clave, etiqueta: d.esHoy ? 'Hoy' : diaCorto(d.fecha), esHoy: d.esHoy, estado, cifra, alto,
      nota: notas.length ? notas.join(' · ') : null,
      nombreAccesible: `${quien}: ${lectura}${notas.length ? `, ${notas.join(', ')}` : ''}`,
    };
  });
}

// Sin tardanzas no quiere decir que todos llegaron a tiempo (revisión del 15 de octubre de 2026): un día en que
// nadie vino decía «todos a tiempo», y a primera hora, con todos dentro de su hora, «sin turnos».
export type EstadoDeFila = 'TARDE' | 'A_TIEMPO' | 'SIN_TARDES' | 'NADIE' | 'AUN_NO' | 'CON_NOVEDAD' | 'SIN_TURNOS' | 'FESTIVO';
export type FilaDeLlegadas = {
  clave: string; etiqueta: string; esHoy: boolean; estado: EstadoDeFila; texto: string; ancho: number; minutos: string;
  caras: { id: string; nombre: string; foto: string | null }[]; mas: number;
  detalle: { id: string; nombre: string; texto: string }[];
  nombreAccesible: string;
};

const CARAS = 3;
// Una barra que no es cero nunca se dibuja invisible, aunque un día con un caso raro aplaste la escala.
const ANCHO_MINIMO = 4;

function estadoDeFila(d: DiasLlegadas[number]): EstadoDeFila {
  if (d.festivo) return 'FESTIVO';
  if (d.totalMinutos > 0) return 'TARDE';
  // «Todos a tiempo» solo cuando llegaron todos los que debían y no queda nadie dentro de su hora.
  if (d.debian > 0) return d.llegaron === 0 ? 'NADIE' : d.llegaron < d.debian || d.enTiempo > 0 ? 'SIN_TARDES' : 'A_TIEMPO';
  if (d.enTiempo > 0) return 'AUN_NO';
  if (d.conNovedad > 0) return 'CON_NOVEDAD';
  return 'SIN_TURNOS';
}

// Lo que dice la fila cuando no hay barra. Un caso por estado (CLAUDE.md §9.4).
function textoDeFila(estado: EstadoDeFila, d: DiasLlegadas[number]): string {
  switch (estado) {
    case 'TARDE': return `${cuantos(d.personas.length, 'llegó', 'llegaron')} tarde, ${fmtMin(d.totalMinutos)} en total`;
    case 'A_TIEMPO': return 'todos a tiempo';
    case 'SIN_TARDES': return d.esHoy ? 'sin llegadas tarde hasta ahora' : 'sin llegadas tarde';
    // «De turno»: quien vino sin turno ese día no entra en la cuenta.
    case 'NADIE': return d.esHoy ? 'no ha llegado nadie de turno' : 'no llegó nadie de turno';
    case 'AUN_NO': return 'todavía no es hora';
    case 'CON_NOVEDAD': return 'todos con novedad';
    case 'SIN_TURNOS': return 'sin turnos';
    case 'FESTIVO': return 'festivo';
    default: { const nunca: never = estado; return nunca; }
  }
}

export function filasDeLlegadas(dias: DiasLlegadas, personas: Personas): FilaDeLlegadas[] {
  const maximo = Math.max(0, ...dias.map(d => d.totalMinutos));
  const nombre = (id: string) => personas[id]?.nombre ?? 'Persona';
  return [...dias].reverse().map(d => {
    const estado = estadoDeFila(d);
    const ancho = d.totalMinutos > 0 && maximo > 0 ? Math.max(ANCHO_MINIMO, Math.round((d.totalMinutos / maximo) * 100)) : 0;
    const quien = `${d.esHoy ? 'Hoy, ' : ''}${diaDeLaSemana(d.fecha)}`;
    const lectura = textoDeFila(estado, d);
    return {
      clave: d.clave, etiqueta: d.esHoy ? 'Hoy' : diaCorto(d.fecha), esHoy: d.esHoy, estado, texto: lectura, ancho,
      minutos: d.totalMinutos > 0 ? fmtMin(d.totalMinutos) : '',
      caras: d.personas.slice(0, CARAS).map(p => ({ id: p.id, nombre: nombre(p.id), foto: personas[p.id]?.fotoMini ?? null })),
      mas: Math.max(0, d.personas.length - CARAS),
      detalle: d.personas.map(p => ({ id: p.id, nombre: nombre(p.id), texto: `Llegó a las ${p.horaLlegada} · ${p.minutosTarde} min tarde` })),
      nombreAccesible: `${quien}: ${lectura}`,
    };
  });
}

export function totalDeLlegadas(dias: DiasLlegadas): string {
  const minutos = dias.reduce((s, d) => s + d.totalMinutos, 0);
  const llegadas = dias.reduce((s, d) => s + d.personas.length, 0);
  return `${fmtMin(minutos)} · ${cuantos(llegadas, 'llegada tarde', 'llegadas tarde')}`;
}
