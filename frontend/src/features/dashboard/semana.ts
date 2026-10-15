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

export type EstadoDeFila = 'TARDE' | 'A_TIEMPO' | 'SIN_TURNOS' | 'FESTIVO';
export type FilaDeLlegadas = {
  clave: string; etiqueta: string; esHoy: boolean; estado: EstadoDeFila; ancho: number; minutos: string;
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
  if (d.debian > 0) return 'A_TIEMPO';
  return 'SIN_TURNOS';
}

export function filasDeLlegadas(dias: DiasLlegadas, personas: Personas): FilaDeLlegadas[] {
  const maximo = Math.max(0, ...dias.map(d => d.totalMinutos));
  const nombre = (id: string) => personas[id]?.nombre ?? 'Persona';
  return [...dias].reverse().map(d => {
    const estado = estadoDeFila(d);
    const ancho = d.totalMinutos > 0 && maximo > 0 ? Math.max(ANCHO_MINIMO, Math.round((d.totalMinutos / maximo) * 100)) : 0;
    const quien = `${d.esHoy ? 'Hoy, ' : ''}${diaDeLaSemana(d.fecha)}`;
    let lectura: string;
    switch (estado) {
      case 'TARDE': lectura = `${cuantos(d.personas.length, 'llegó', 'llegaron')} tarde, ${fmtMin(d.totalMinutos)} en total`; break;
      case 'A_TIEMPO': lectura = 'todos a tiempo'; break;
      case 'SIN_TURNOS': lectura = 'sin turnos'; break;
      case 'FESTIVO': lectura = 'festivo'; break;
      default: { const nunca: never = estado; lectura = nunca; }
    }
    return {
      clave: d.clave, etiqueta: d.esHoy ? 'Hoy' : diaCorto(d.fecha), esHoy: d.esHoy, estado, ancho,
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
