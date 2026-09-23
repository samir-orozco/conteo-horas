import { duracionFranjaMin } from './tardanzas';
import {
  horaValida, minutosDesdeLaEntrada, leerDescansos, escribirDescansos, ventanasEnOrden,
  MAX_DESCANSOS_POR_FRANJA, type Ventana,
} from './descansos';

// `horaValida` vive en descansos.ts desde el 12 de septiembre de 2026; se reexporta
// porque la ruta y las pruebas la importan de aquí.
export { horaValida };

// Las ventanas de pausa que el administrador escribe en cada franja del horario
// (el almuerzo y, desde el 12 de septiembre de 2026, hasta tres descansos no
// remunerados) y si se pueden cumplir.
//
// Vive fuera de la ruta para poder probarlo. Una ventana imposible se congela en
// los días al materializarse y sale en la nómina como un número plausible.

// UN TRAMO: horas de entrada y salida con sus pausas. Es lo que de verdad miran
// todas las funciones de aquí, y por eso es su propio tipo desde el 19 de
// septiembre de 2026.
//
// Lo pide una segunda cosa que no es una franja: una PLANTILLA de turno del
// catálogo de turnos rotativos (utils/cuerpoDePlantilla.ts), que es exactamente
// esto SIN días, porque los días se los pone el planificador al pintar el
// calendario. Sin este tipo habría que escribir por segunda vez la revisión del
// almuerzo, la de los tres descansos y la de sus cruces, que es el fallo de la
// sección 9.3 del CLAUDE.md.
export type TramoConVentanas = {
  horaEntrada: string;
  horaSalida: string;
  tieneAlmuerzo?: boolean;
  almuerzoInicio?: string | null;
  almuerzoFin?: string | null;
  // La lista tal como la manda la pantalla: [{ inicio, fin }, ...]. Sin
  // compatibilidad con las claves de un solo descanso (ee7a0c7), que nunca salieron
  // a producción.
  descansos?: unknown;
};

// Una franja del horario: un tramo con los días de la semana en que se cumple.
export type FranjaConVentanas = TramoConVentanas & { dias: string[] };

// Las horas de un tramo son horas de verdad. La regla de la hora es UNA sola y vive
// en `horaValida`: aquí y en la ruta hubo regex propias que dejaban pasar «99:99»
// (12 de septiembre de 2026, CLAUDE.md §9.3).
export function horasDeTramoValidas(t: unknown): boolean {
  const tramo = (t && typeof t === 'object' ? t : {}) as { horaEntrada?: unknown; horaSalida?: unknown };
  return horaValida(tramo.horaEntrada) !== null && horaValida(tramo.horaSalida) !== null;
}

// Lo básico de una franja, antes de mirar sus pausas: al menos un día, y horas de
// entrada y salida que de verdad son horas.
export function franjaBasicaValida(f: unknown): boolean {
  const franja = (f && typeof f === 'object' ? f : {}) as { dias?: unknown };
  return Array.isArray(franja.dias) && franja.dias.length > 0 && horasDeTramoValidas(f);
}

// El mensaje con el que se le devuelve al administrador una ventana que no se puede
// cumplir. Vivía en routes/horarios.ts; se mudó aquí el 19 de septiembre de 2026 para
// que el catálogo de plantillas dé EL MISMO motivo ante la misma falla, en vez de una
// segunda redacción del mismo error.
export const mensajeVentanasImposibles = (imposibles: string[]) =>
  `El almuerzo o los descansos no caben dentro de la jornada: ${imposibles.join(', ')}. ` +
  'Revisa que cada hora de inicio sea anterior a la de fin, que ninguna pausa se cruce con otra y que no haya más de 3 descansos.';

// La ventana como tramo de la jornada, en minutos contados desde la entrada. Así
// se comparan igual una franja de día y una nocturna que cruza la medianoche.
function tramoDesdeLaEntrada(f: TramoConVentanas, ini: string, fin: string): [number, number] {
  const desde = minutosDesdeLaEntrada(f.horaEntrada, ini);
  return [desde, desde + duracionFranjaMin(ini, fin)];
}

// Tocarse en un extremo NO es cruzarse: un descanso de 10:00 a 10:15 y otro de 10:15
// a 10:30 no comparten ningún minuto.
const seCruzan = (a: [number, number], b: [number, number]) => Math.max(a[0], b[0]) < Math.min(a[1], b[1]);

// La ventana tiene que caber DENTRO de la franja de ese día. Sin esta
// comprobación, una ventana invertida por un dedazo ("de 13:00 a 12:00", o
// "de 12 a 1" tecleado como 12:00-01:00) se guarda como una pausa de 23 horas:
// la jornada esperada del día queda en 0, se descuentan horas que nadie tomó, y
// como el día se congela al materializarse, corregir el horario después ya no
// arregla lo que se guardó mal.
function cabeEnLaFranja(f: TramoConVentanas, ini: string, fin: string): boolean {
  const jornada = duracionFranjaMin(f.horaEntrada, f.horaSalida);
  const [desde, hasta] = tramoDesdeLaEntrada(f, ini, fin);
  return hasta - desde < jornada && hasta <= jornada;
}

const escrito = (v: unknown) => typeof v === 'string' && v.trim() !== '';

// Una ventana de la franja: completa y cumplible, `mal` si no, o `null` cuando la
// fila no trae ninguna de las dos horas, que es una configuración legítima.
// Escribir algo que no es una hora, o solo media ventana, antes se descartaba en
// silencio: el admin creía haber configurado la pausa y el kiosco no le preguntaba
// nada a nadie.
function revisar(f: TramoConVentanas, ini: unknown, fin: unknown): { ok: [string, string] } | { mal: true } | null {
  if (!escrito(ini) && !escrito(fin)) return null;
  const i = horaValida(ini);
  const fi = horaValida(fin);
  if (!i || !fi || i === fi || !cabeEnLaFranja(f, i, fi)) return { mal: true };
  return { ok: [i, fi] };
}

const franjaEnTexto = (f: TramoConVentanas) => `${f.horaEntrada}-${f.horaSalida}`;
const horaEnTexto = (v: unknown) => (escrito(v) ? String(v) : '?');

type DescansoRevisado = { n: number; ventana: Ventana; tramo: [number, number] };

// Cuántas FILAS se aceptan siquiera mirar, que NO es la regla de negocio: el máximo de descansos
// sigue siendo `MAX_DESCANSOS_POR_FRANJA` y se cuenta sobre las filas que traen horas, porque la
// pantalla manda filas vacías a propósito y no deben gastar el cupo.
//
// Esto es solo un freno al abuso, puesto el 19 de septiembre de 2026: con 500 filas la revisión
// compara todas las parejas (124.751 avisos) y esparcirlas como argumentos de `push` revienta la
// pila, así que la ruta devolvía un 500 en vez de un 400 con su motivo. La pantalla nunca manda más
// de tres filas; 50 está muy por encima de cualquier cuerpo legítimo y muy por debajo del punto
// donde esto duele.
const FILAS_MAXIMAS_DE_DESCANSOS = 50;

// Los descansos de UNA franja: la lista completa y cumplible, o los rótulos de por
// qué no. `n` es la posición en que el administrador ve la fila, contando las que
// dejó vacías.
//
// Se rechaza, con un mensaje cada uno:
//  - que `descansos` venga pero no sea una lista;
//  - un elemento que no es un descanso, o uno a medias, invertido o fuera de la
//    franja (la misma regla que el almuerzo);
//  - más de tres descansos con horas;
//  - dos descansos que se cruzan, o uno que se cruza con el almuerzo: la misma hora
//    se descontaría dos veces.
export function revisarDescansos(f: TramoConVentanas): { ok: Ventana[] } | { mal: string[] } {
  if (f.descansos === undefined) return { ok: [] };
  const franja = franjaEnTexto(f);
  if (!Array.isArray(f.descansos)) return { mal: [`${franja} (los descansos no tienen el formato esperado)`] };

  // El freno al abuso va ANTES de recorrer nada: una lista descomunal no se revisa fila por fila,
  // se rechaza de una. No confundir con el máximo de descansos, que se cuenta más abajo sobre las
  // filas que traen horas. Un primer intento puso esta guarda en el máximo de negocio y rompió la
  // regla de que una fila vacía no gasta cupo: lo cazó una prueba que ya existía.
  if (f.descansos.length > FILAS_MAXIMAS_DE_DESCANSOS) {
    return { mal: [`${franja} (tiene ${f.descansos.length} descansos; el máximo es ${MAX_DESCANSOS_POR_FRANJA})`] };
  }

  const mal: string[] = [];
  const validos: DescansoRevisado[] = [];
  let conHoras = 0;
  f.descansos.forEach((d: unknown, i: number) => {
    const n = i + 1;
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      mal.push(`${franja} (descanso ${n}: no tiene el formato esperado)`);
      return;
    }
    const { inicio, fin } = d as { inicio?: unknown; fin?: unknown };
    const r = revisar(f, inicio, fin);
    if (r === null) return;
    conHoras++;
    if ('mal' in r) {
      mal.push(`${franja} (descanso ${n}: ${horaEnTexto(inicio)}-${horaEnTexto(fin)})`);
      return;
    }
    validos.push({ n, ventana: { inicio: r.ok[0], fin: r.ok[1] }, tramo: tramoDesdeLaEntrada(f, ...r.ok) });
  });

  if (conHoras > MAX_DESCANSOS_POR_FRANJA) {
    mal.push(`${franja} (tiene ${conHoras} descansos; el máximo es ${MAX_DESCANSOS_POR_FRANJA})`);
  }
  for (let a = 0; a < validos.length; a++) {
    for (let b = a + 1; b < validos.length; b++) {
      if (seCruzan(validos[a].tramo, validos[b].tramo)) mal.push(`${franja} (descansos ${validos[a].n} y ${validos[b].n} se cruzan)`);
    }
  }
  const almuerzo = revisar(f, f.almuerzoInicio, f.almuerzoFin);
  if (almuerzo && 'ok' in almuerzo) {
    const tramoAlmuerzo = tramoDesdeLaEntrada(f, ...almuerzo.ok);
    for (const d of validos) {
      if (seCruzan(tramoAlmuerzo, d.tramo)) {
        mal.push(`${franja} (descanso ${d.n}: ${d.ventana.inicio}-${d.ventana.fin} se cruza con el almuerzo)`);
      }
    }
  }
  return mal.length > 0 ? { mal } : { ok: validos.map(d => d.ventana) };
}

// Tramos con alguna ventana que no se puede cumplir. Se devuelven para que la
// ruta responda 400 con un mensaje concreto en vez de guardar algo imposible.
export function franjasConVentanaImposible(franjas: TramoConVentanas[]): string[] {
  const malas: string[] = [];
  for (const f of franjas) {
    const almuerzo = revisar(f, f.almuerzoInicio, f.almuerzoFin);
    if (almuerzo && 'mal' in almuerzo) {
      malas.push(`${franjaEnTexto(f)} (almuerzo ${f.almuerzoInicio ?? '—'}-${f.almuerzoFin ?? '—'})`);
    }
    const descansos = revisarDescansos(f);
    if ('mal' in descansos) malas.push(...descansos.mal);
  }
  return malas;
}

// Lo que se guarda de las PAUSAS de un tramo: el almuerzo completo o vacío, nunca a
// medias, y la lista de descansos en su forma canónica, ordenada desde la entrada
// (NULL si no hay ninguno). Quien llama ya rechazó lo imposible antes de llegar aquí.
//
// Está separado de `franjaParaGuardar` para que la plantilla de turno, que no tiene
// días, guarde sus pausas con este mismo código y no con una copia.
export function ventanasParaGuardar(f: TramoConVentanas) {
  const i = horaValida(f.almuerzoInicio);
  const fi = horaValida(f.almuerzoFin);
  const conAlmuerzo = i !== null && fi !== null && i !== fi;
  const descansos = revisarDescansos(f);
  return {
    tieneAlmuerzo: f.tieneAlmuerzo !== false, // por defecto sí descuenta almuerzo
    almuerzoInicio: conAlmuerzo ? i : null,
    almuerzoFin: conAlmuerzo ? fi : null,
    descansos: escribirDescansos(ventanasEnOrden(f.horaEntrada, 'ok' in descansos ? descansos.ok : [])),
  };
}

// Lo que se guarda de una franja: sus días, sus horas y sus pausas.
export function franjaParaGuardar(f: FranjaConVentanas) {
  return {
    dias: f.dias,
    horaEntrada: f.horaEntrada,
    horaSalida: f.horaSalida,
    ...ventanasParaGuardar(f),
  };
}

// La franja como viaja al navegador: los descansos como arreglo, nunca el texto que
// se guarda. Un texto roto llega como lista vacía en vez de tumbar la pantalla.
export function franjaParaResponder<F extends { descansos?: string | null }>(f: F): Omit<F, 'descansos'> & { descansos: Ventana[] } {
  return { ...f, descansos: leerDescansos(f.descansos) };
}

// ¿Este guardado viene de una pantalla de horarios de ANTES de los descansos y
// borraría los que otro ya configuró? La ruta reemplaza las franjas enteras, así que
// un cuerpo sin la clave `descansos` los dejaría en NULL sin que nadie lo decida, y
// subiría lo exigido desde hoy. Sin descansos guardados, la pantalla de antes guarda
// como siempre. La pantalla nueva manda siempre la clave, también vacía.
export function pantallaViejaBorraDescansos(
  guardadas: readonly { descansos: string | null }[],
  delCuerpo: readonly unknown[],
): boolean {
  const mandaDescansos = delCuerpo.some(f => f !== null && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'descansos'));
  if (mandaDescansos) return false;
  return guardadas.some(g => leerDescansos(g.descansos).length > 0);
}
