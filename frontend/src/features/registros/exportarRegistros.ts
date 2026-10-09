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
  'Colaborador', 'Cédula', 'Fecha', 'Sede', 'Marcó en', 'Entrada', 'Salida', 'Salida estimada',
  'Almuerzo (min)', 'Descansos (min)', 'Duración (min)', 'Llegada tarde (min)',
  'Tipo', 'Jornada del día', 'Observación',
];

// La hora y la fecha de Bogotá, las mismas que pinta la pantalla. Van aquí y no
// prestadas de la tabla porque el vacío se escribe distinto: la tabla pone «-»
// para que no quede un hueco, y una celda de Excel vacía es una celda vacía.
const hora = (iso: string | null) => (iso ? format(toZonedTime(new Date(iso), TZ), 'HH:mm') : '');
const dia = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'yyyy-MM-dd');

// DOS COLUMNAS DE SEDE, que dicen cosas distintas (9 de octubre de 2026, petición del dueño):
//
//   «Sede»     a cuál PERTENECE la persona. Es suya y la misma en todas sus jornadas.
//   «Marcó en» dónde marcó ESA jornada, que puede ser otra distinta de la suya.
//
// Antes había una sola, y mezclaba las dos: decía dónde marcó y, cuando no se sabía, «cuenta en
// [la de la persona]».

// A cuál pertenece: la asignada, tal como la escribe la pantalla. Un presencial sin sede asignada cuenta,
// en los reportes, en la que el servidor le atribuye, y esa es la única que se le conoce: sin ella, el
// archivo la dejaría sin sede. Si no hay ninguna de las dos, queda vacía y no se inventa una.
function sedeDeLaPersona(j: JornadaExportable, sedesAsignadasDe: (colaboradorId: string) => string): string {
  return sedesAsignadasDe(j.colaboradorId) || j.sedeAtribuida?.nombre || '';
}

// Dónde marcó. La CLASE la decide `sedeDeLaJornada`, la misma que usa la tabla, para que el archivo y la
// pantalla no puedan contradecirse. Las palabras sí cambian: en una celda, el «—» de la pantalla no se
// entiende solo.
function dondeMarco(j: JornadaExportable): string {
  const s = sedeDeLaJornada(j);
  switch (s.clase) {
    case 'cruce': return `${s.abrio} → ${s.cerro}`;
    case 'probada': return s.nombre;
    case 'soloCierre': return `Cerró en ${s.nombre}`;
    // La atribuida NO es dónde marcó: es a cuál cuenta en los reportes, y eso lo dice «Sede». Una celda
    // vacía dice «no quedó registrada», que es lo único cierto.
    case 'atribuida': return '';
    default: return '';
  }
}

export function filasDeRegistros(
  jornadas: JornadaExportable[],
  cedulaDe: (colaboradorId: string) => string,
  sedesAsignadasDe: (colaboradorId: string) => string,
): Celda[][] {
  // El mismo número que la etiqueta de la tabla, con la misma función: así,
  // filtrando por «Jornada del día» mayor que 1 salen los ingresos dobles.
  const ingresos = ingresosDelDia(jornadas);

  return jornadas.map(j => [
    `${j.colaborador.nombre} ${j.colaborador.apellido}`,
    cedulaDe(j.colaboradorId),
    dia(j.fecha),
    sedeDeLaPersona(j, sedesAsignadasDe),
    dondeMarco(j),
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

// ===== LA HOJA «ENTRADAS POR DÍA» (9 de octubre de 2026, petición del dueño) =====
//
// Una fila por persona, una columna por día y, en la celda, la hora de la PRIMERA entrada de ese día. Es lo que
// se armaba a mano con una tabla dinámica sobre la hoja «Registros»; escrita aquí, además, trae lo que una
// tabla dinámica no puede traer: los días del rango en los que nadie marcó, y las personas sin ninguna marcación.
//
// La celda vacía es vacía: no dice si la persona descansó, tenía una novedad o faltó. Eso necesita los días
// esperados, que viven en el servidor, y sería otro reporte.

export const HOJA_ENTRADAS = 'Entradas por día';

export type PersonaSinMarcas = { id: string; nombre: string; apellido: string };

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Los días de `desde` a `hasta`, ambos incluidos, como «yyyy-MM-dd». Se cuentan con aritmética de UTC sobre las
// partes del texto y no con `new Date(texto)` leído en hora local: una fecha sin hora es medianoche UTC, y en una
// máquina al occidente de Colombia (las pruebas corren en Los Ángeles) saldría el día anterior.
function diasDelRango(desde: string, hasta: string): string[] {
  if (!FECHA_ISO.test(desde) || !FECHA_ISO.test(hasta)) return [];
  const [a, m, d] = desde.split('-').map(Number);
  const dias: string[] = [];
  for (let i = 0; ; i++) {
    const dia = new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10);
    if (dia > hasta) break;
    dias.push(dia);
  }
  return dias;
}

// `sinMarcas` son las personas que van aunque no tengan ninguna jornada en `jornadas`: quien llama decide si hay
// que sumarlas. La pantalla las suma solo cuando no hay filtros de jornada puestos; con uno puesto, una celda en
// blanco querría decir «la filtré» y no «faltó».
export function matrizDeEntradas(
  jornadas: JornadaExportable[],
  desde: string,
  hasta: string,
  sinMarcas: PersonaSinMarcas[],
): { columnas: string[]; filas: Celda[][] } {
  // Por identificador y no por nombre: dos personas pueden llamarse igual.
  const personas = new Map<string, { nombre: string; primera: Map<string, string> }>();

  for (const j of jornadas) {
    const p = personas.get(j.colaboradorId)
      ?? { nombre: `${j.colaborador.nombre} ${j.colaborador.apellido}`, primera: new Map<string, string>() };
    personas.set(j.colaboradorId, p);
    if (!j.entrada) continue;
    const d = dia(j.fecha);
    const antes = p.primera.get(d);
    if (!antes || new Date(j.entrada).getTime() < new Date(antes).getTime()) p.primera.set(d, j.entrada);
  }
  for (const p of sinMarcas) {
    if (!personas.has(p.id)) personas.set(p.id, { nombre: `${p.nombre} ${p.apellido}`, primera: new Map() });
  }

  // Los días del rango y, además, cualquier día que tenga una marcación: una marcación nunca se pierde por caer
  // fuera de las columnas. El servidor ya filtra por rango, así que en uso real son los mismos; si no lo fueran,
  // cortarla en silencio daría un archivo plausible y falso. «yyyy-MM-dd» se ordena como texto.
  const conMarcas = [...personas.values()].flatMap(p => [...p.primera.keys()]);
  const dias = [...new Set([...diasDelRango(desde, hasta), ...conMarcas])].sort();

  const filas = [...personas.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(p => [p.nombre, ...dias.map(d => { const entrada = p.primera.get(d); return entrada ? hora(entrada) : ''; })]);
  return { columnas: ['Colaborador', ...dias], filas };
}

// El rango va en el nombre: dos descargas del mismo mes distinto se distinguen
// en la carpeta de descargas sin abrirlas.
export const nombreDelArchivo = (desde: string, hasta: string) => `Registros_${desde}_a_${hasta}`;
