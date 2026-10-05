import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TZ } from '../../lib/fechas';
import { sedeDeLaJornada, type ConSedes } from '../../lib/sedeDeJornada';
import { ingresosDelDia } from './ingresosDelDia';

// EL EXCEL DE LOS REGISTROS (4 de octubre de 2026, peticiones 7, 19 y 32 del dueño).
//
// Aquí se decide QUÉ columnas lleva el archivo y cómo se escribe cada celda. Lo
// que NO se decide aquí es qué jornadas entran: la pantalla pasa su lista ya
// filtrada, para que baje exactamente lo que se está viendo. Un botón que
// exporte todo ignorando los filtros es un defecto esperando.
//
// LOS MINUTOS VAN COMO NÚMERO, no como «8h 0m»: una columna de texto no se
// puede sumar, y el archivo existe para sumarlo en otra parte.

type Celda = string | number;

export type JornadaExportable = ConSedes & {
  id: string;
  colaboradorId: string;
  colaborador: { nombre: string; apellido: string };
  fecha: string;
  entrada: string | null;
  salida: string | null;
  tipo: string;
  observacion: string | null;
  minutosTarde: number | null;
  minutosContados: number;
  minutosAlmuerzoAqui: number;
  minutosDescansoAqui?: number;
  salidaEstimada?: boolean;
};

export const COLUMNAS_REGISTROS = [
  'Colaborador', 'Cédula', 'Fecha', 'Sede', 'Entrada', 'Salida', 'Salida estimada',
  'Almuerzo (min)', 'Descansos (min)', 'Duración (min)', 'Llegada tarde (min)',
  'Tipo', 'Jornada del día', 'Observación',
];

// La hora y la fecha de Bogotá, las mismas que pinta la pantalla. Van aquí y no
// prestadas de la tabla porque el vacío se escribe distinto: la tabla pone «-»
// para que no quede un hueco, y una celda de Excel vacía es una celda vacía.
const hora = (iso: string | null) => (iso ? format(toZonedTime(new Date(iso), TZ), 'HH:mm') : '');
const dia = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'yyyy-MM-dd');

// Qué dice la columna de sede. La CLASE la decide `sedeDeLaJornada`, la misma que
// usa la tabla, para que el archivo y la pantalla no puedan contradecirse. Las
// palabras sí cambian: en una celda, el «—» de la pantalla no se entiende solo.
function sede(j: JornadaExportable): string {
  const s = sedeDeLaJornada(j);
  switch (s.clase) {
    case 'cruce': return `${s.abrio} → ${s.cerro}`;
    case 'probada': return s.nombre;
    case 'soloCierre': return `Cerró en ${s.nombre}`;
    case 'atribuida': return `No marcó · cuenta en ${s.nombre}`;
    default: return '';
  }
}

export function filasDeRegistros(
  jornadas: JornadaExportable[],
  cedulaDe: (colaboradorId: string) => string,
): Celda[][] {
  // El mismo número que la etiqueta de la tabla, con la misma función: así,
  // filtrando por «Jornada del día» mayor que 1 salen los ingresos dobles.
  const ingresos = ingresosDelDia(jornadas);

  return jornadas.map(j => [
    `${j.colaborador.nombre} ${j.colaborador.apellido}`,
    cedulaDe(j.colaboradorId),
    dia(j.fecha),
    sede(j),
    hora(j.entrada),
    hora(j.salida),
    j.salidaEstimada ? 'Sí' : 'No',
    j.minutosAlmuerzoAqui,
    j.minutosDescansoAqui ?? 0,
    j.minutosContados,
    // 0 es «llegó a tiempo» y null es «no aplica», sin horario o día que no
    // cuenta. Escribir 0 en los dos casos diría que todo el mundo fue puntual.
    j.minutosTarde ?? '',
    j.tipo,
    ingresos.get(j.id)?.orden ?? 1,
    j.observacion ?? '',
  ]);
}

// El rango va en el nombre: dos descargas del mismo mes distinto se distinguen
// en la carpeta de descargas sin abrirlas.
export const nombreDelArchivo = (desde: string, hasta: string) => `Registros_${desde}_a_${hasta}`;
