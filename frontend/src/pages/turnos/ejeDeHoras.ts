// LA VISTA DE DÍA, EN HORAS (22 de septiembre de 2026).
//
// Pedido del dueño: «en la parte de día que no vea arriba la M de martes 22, sino las horas, y que
// la barra vaya del color del turno desde la hora de inicio hasta la hora de fin, que muestre todo
// el rango de hora que está ocupando la persona».
//
// LA DECISIÓN QUE SE ROMPE SOLA SI SE ESCRIBE A OJO: EL TURNO NOCTURNO. Este producto tiene guardas
// de 22:00 a 06:00, y el catálogo trae el turno «Noche 22:00–06:00». Esa jornada CRUZA LA
// MEDIANOCHE, y hay dos formas de dibujarla:
//
//   - Partida en dos pedazos (22 a 24, y 00 a 06). Se lee como si la persona trabajara DOS veces
//     ese día, y el segundo pedazo aparece a la IZQUIERDA del primero, antes de haber entrado.
//   - Una sola barra continua, con el eje estirado más allá de la medianoche.
//
// Se eligió la segunda: es UN turno y se dibuja como UNA barra. El precio es que el eje pasa de las
// 24 horas, y las horas de después se rotulan 00, 01, 02 y no 24, 25, 26, porque nadie lee «26:00».
//
// TODO VA EN MINUTOS desde la medianoche del día que se mira, así que las 06:00 del día siguiente
// son 1800 y no 360. Es la única forma de que «después» sea de verdad un número mayor.

export type EjeDeHoras = { desde: number; hasta: number };
export type Tramo = { desdePct: number; anchoPct: number };
export type HoraDelEje = { minuto: number; etiqueta: string; pct: number };

const MINUTOS_POR_DIA = 1440;

// El respiro a cada lado, para que las barras no nazcan pegadas al borde del contenedor.
const MARGEN_MIN = 60;

// Seis horas. Sin esto, un turno de una hora daría un eje de tres y esa barra se llevaría un tercio
// de la pantalla para representar sesenta minutos.
const ANCHO_MINIMO = 360;

// Una barra de 0% de ancho es una barra invisible, y una persona sin barra se lee como una persona
// sin turno. Un turno mal cargado tiene que verse, no desaparecer.
const ANCHO_MINIMO_PCT = 1;

// Cuando no hay ninguna jornada válida. NO se devuelve un eje vacío: su ancho sería cero y todos
// los porcentajes saldrían de una división por cero.
export const EJE_POR_DEFECTO: EjeDeHoras = { desde: 360, hasta: 1320 }; // 06:00 a 22:00

export function minutosDeReloj(valor: string | null | undefined): number | null {
  if (typeof valor !== 'string') return null;
  const partes = /^(\d{2}):(\d{2})$/.exec(valor.trim());
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  // `null` y NO cero: cero es medianoche, que es una hora válida. Confundir «no hay dato» con
  // «medianoche» pintaría una barra al principio del día para alguien que no trabaja.
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

// Una jornada en minutos, con la salida corrida al día siguiente cuando cruza la medianoche.
//
// `<` y no `<=`: si entrada y salida son iguales, eso es una jornada de duración cero (un dato mal
// cargado), no una de veinticuatro horas. Pintar un día entero por un dato malo sería peor.
function tramoEnMinutos(entrada: number, salida: number): { inicio: number; fin: number } {
  return { inicio: entrada, fin: salida < entrada ? salida + MINUTOS_POR_DIA : salida };
}

export function ejeDelDia(
  jornadas: readonly { horaEntrada: string | null; horaSalida: string | null }[],
): EjeDeHoras {
  let masTemprano = Infinity;
  let masTarde = -Infinity;
  for (const j of jornadas) {
    const entrada = minutosDeReloj(j.horaEntrada);
    const salida = minutosDeReloj(j.horaSalida);
    if (entrada === null || salida === null) continue;
    const { inicio, fin } = tramoEnMinutos(entrada, salida);
    if (inicio < masTemprano) masTemprano = inicio;
    if (fin > masTarde) masTarde = fin;
  }
  if (masTemprano === Infinity) return EJE_POR_DEFECTO;

  const desde = Math.max(0, Math.floor(masTemprano / 60) * 60 - MARGEN_MIN);
  let hasta = Math.ceil(masTarde / 60) * 60 + MARGEN_MIN;
  if (hasta - desde < ANCHO_MINIMO) hasta = desde + ANCHO_MINIMO;
  return { desde, hasta };
}

export function tramoDeJornada(
  horaEntrada: string | null, horaSalida: string | null, eje: EjeDeHoras,
): Tramo | null {
  const entrada = minutosDeReloj(horaEntrada);
  const salida = minutosDeReloj(horaSalida);
  if (entrada === null || salida === null) return null;

  const total = eje.hasta - eje.desde;
  if (total <= 0) return null;

  const { inicio, fin } = tramoEnMinutos(entrada, salida);
  const enPorcentaje = (m: number) => Math.min(100, Math.max(0, ((m - eje.desde) / total) * 100));
  const desdePct = enPorcentaje(inicio);
  const anchoPct = Math.max(ANCHO_MINIMO_PCT, enPorcentaje(fin) - desdePct);
  // El mínimo de arriba puede empujar la barra fuera del eje si la jornada empieza al final: se
  // corre hacia atrás en vez de desbordar el contenedor.
  return { desdePct: Math.min(desdePct, 100 - anchoPct), anchoPct };
}

export function horasDelEje(eje: EjeDeHoras): HoraDelEje[] {
  const total = eje.hasta - eje.desde;
  const horas: HoraDelEje[] = [];
  const primera = Math.ceil(eje.desde / 60) * 60;
  for (let m = primera; m <= eje.hasta; m += 60) {
    horas.push({
      minuto: m,
      // `% 24` para que la hora 26 se rotule «02». Es la contrapartida de haber elegido una barra
      // continua: el eje pasa de la medianoche, pero el reloj no.
      etiqueta: String(Math.floor(m / 60) % 24).padStart(2, '0'),
      pct: total > 0 ? ((m - eje.desde) / total) * 100 : 0,
    });
  }
  return horas;
}
