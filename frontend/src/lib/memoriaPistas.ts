// LO QUE YA SE MIRÓ, PARA NO TENER QUE VOLVER A MIRARLO EN CADA RECARGA.
//
// POR QUÉ EN EL NAVEGADOR Y NO EN LA BASE. Guardar esto en `registros` sería un
// VEREDICTO PERSISTIDO: una etiqueta que se queda escrita al lado de una persona,
// puesta por un umbral que hoy sale de dos videos y quince fotogramas. Si mañana
// ese umbral resulta malo, la etiqueta vieja sigue ahí acusando. Aquí no: vive en
// el equipo de quien revisa, se puede borrar, y no viaja a ninguna parte.
//
// SE GUARDA LA MEDICIÓN, NO EL VEREDICTO. Lo que queda es el número de rectas
// paralelas; el «esta hay que mirarla» se vuelve a decidir al pintar, contra el
// umbral vigente. Así, el día que el umbral cambie, lo ya revisado se reclasifica
// solo en vez de quedar mintiendo con el criterio viejo.

const CLAVE = 'horapro.pistas.v1';

// Las fotos se borran a los 2 meses (`limpiarFotosAntiguas`). Una medición de una
// foto que ya no existe no le sirve a nadie y solo engorda el almacenamiento, así
// que se caduca con el mismo plazo.
export const DIAS_VIDA = 60;
const MS_VIDA = DIAS_VIDA * 24 * 60 * 60 * 1000;

// Tope duro: `localStorage` anda por los 5 MB y esto no debe ser lo que lo llene.
// Al pasarse se tiran las más viejas.
const MAX_ENTRADAS = 5000;

type Entrada = { p: number; t: number };
type Guardado = Record<string, Entrada>;

const esEntrada = (v: unknown): v is Entrada =>
  !!v && typeof v === 'object' &&
  typeof (v as Entrada).p === 'number' && Number.isFinite((v as Entrada).p) &&
  typeof (v as Entrada).t === 'number' && Number.isFinite((v as Entrada).t);

function crudo(): Guardado {
  try {
    const s = localStorage.getItem(CLAVE);
    if (!s) return {};
    const d = JSON.parse(s) as unknown;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
    // Se filtra entrada por entrada: si alguien tocó el almacenamiento a mano o
    // quedó basura de una versión anterior, se descarta lo que no sirve en vez de
    // reventar la pantalla entera.
    const limpio: Guardado = {};
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) if (esEntrada(v)) limpio[k] = v;
    return limpio;
  } catch {
    // Modo privado, cuota llena o JSON corrupto: se sigue sin memoria.
    return {};
  }
}

function podar(g: Guardado, ahora: number): Guardado {
  const vivas = Object.entries(g).filter(([, v]) => ahora - v.t < MS_VIDA);
  if (vivas.length <= MAX_ENTRADAS) return Object.fromEntries(vivas);
  vivas.sort((a, b) => b[1].t - a[1].t);
  return Object.fromEntries(vivas.slice(0, MAX_ENTRADAS));
}

/** Lo medido que sigue vigente, por clave de marcación. */
export function leerMemoria(ahora = Date.now()): Map<string, number> {
  const g = podar(crudo(), ahora);
  return new Map(Object.entries(g).map(([k, v]) => [k, v.p]));
}

/** Anota lo medido de varias marcaciones de una sola escritura. */
export function recordar(medidas: Map<string, number>, ahora = Date.now()): void {
  if (!medidas.size) return;
  try {
    const g = podar(crudo(), ahora);
    for (const [k, p] of medidas) g[k] = { p, t: ahora };
    localStorage.setItem(CLAVE, JSON.stringify(podar(g, ahora)));
  } catch {
    // Si no se puede escribir (cuota, modo privado), se pierde la memoria y ya.
    // Nunca debe tumbar la revisión: es una comodidad, no un dato del negocio.
  }
}

export function olvidarTodo(): void {
  try { localStorage.removeItem(CLAVE); } catch { /* nada que hacer */ }
}
