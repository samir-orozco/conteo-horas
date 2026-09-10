// ¿HAY UNA PANTALLA EN ESTA FOTO?
//
// Qué es y qué NO es. Esto NO decide si una marcación es fraude, y no debe
// llamarse "detector de fraude" en ninguna parte de la interfaz. Lo único que
// hace es responder «esta foto tiene rasgos de un aparato sostenido frente a la
// cámara», para que la pantalla de Revisión pueda decirle a una persona MIRÁ
// ESTA. La decisión sigue siendo del ojo humano, que es quien detecta el fraude
// hoy y quien lo va a seguir detectando.
//
// Las tres cosas que gobiernan el diseño:
//
//   1. NUNCA rechaza ni bloquea nada. Corre al pintar la foto en Revisión, no al
//      marcar. Un falso positivo no le impide a nadie registrar su entrada.
//   2. NO se guarda. No hay columna, no hay veredicto persistido, no hay
//      expediente. Si mañana el umbral resulta malo, se cambia el número y ya:
//      no queda una etiqueta vieja acusando a alguien en la base de datos.
//   3. NO reordena la cola. `revisionMarcaciones.ts` explica por qué el orden es
//      cronológico y esa decisión sigue en pie: un orden falso hace que el
//      supervisor deje de mirar lo de abajo. Esto pinta una marca al lado de la
//      foto que ya está en pantalla, nada más.
//
// LO QUE NO VE, dicho de una vez: una foto IMPRESA en papel mate no tiene brillo
// de pantalla ni bisel, así que este detector no la ve. Tampoco ve una tablet a
// pantalla completa que llene el cuadro. Detecta el ataque barato y torpe, que
// es el que tenemos documentado en video, y nada más.

export type Caja = { x: number; y: number; ancho: number; alto: number };
export type Gris = { lum: Float32Array; ancho: number; alto: number };

export type Rasgos = {
  /** Fracción del cuadro que ocupa el rostro, de 0 a 1. Una cara en la pantalla
   *  de un celular sostenido a un brazo sale chica. */
  tamanoCara: number;
  /** Fracción de píxeles casi quemados. El brillo de una pantalla emisora. */
  quemados: number;
  /** Fuerza de la recta más larga alrededor del rostro, normalizada por el ancho
   *  de la cara. El borde del aparato. */
  rectaMasLarga: number;
  /** Fuerza del mejor PAR de rectas paralelas separadas. Un bisel son dos. */
  paralelas: number;
  /** Salto de luminancia entre el anillo pegado al rostro y lo que hay más
   *  afuera. La pantalla es más clara que el cuarto. */
  saltoAnillo: number;
};

// UN GRADO POR CASILLA, NO TRES. Con casillas de 3° el mejor ángulo disponible
// puede estar 1.5° desviado del real, y sobre una recta de 130 px eso corre el ρ
// unos 3.4 px, o sea casi dos casillas: el voto de una misma recta se parte en
// dos picos y ninguno destaca. Medido: un rectángulo inclinado 20° daba 23 votos
// contra un piso de ruido de 31, o sea que el detector NO veía un celular
// torcido, que es justo como se sostiene. Con 1° el corrimiento baja a 1.1 px y
// además el ruido se reparte entre el triple de casillas, así que el piso cae.
const PASO_ANGULO = 1;                    // grados por casilla del acumulador
const N_ANGULOS = 180 / PASO_ANGULO;
const PASO_RO = 2;                        // píxeles por casilla
const UMBRAL_BORDE = 40;                  // magnitud Sobel mínima para votar
const QUEMADO = 245;

export function aGris(datos: Uint8ClampedArray, ancho: number, alto: number): Gris {
  const lum = new Float32Array(ancho * alto);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = 0.299 * datos[p] + 0.587 * datos[p + 1] + 0.114 * datos[p + 2];
  }
  return { lum, ancho, alto };
}

/** Dilata una caja alrededor de su centro, recortada al cuadro. */
export function dilatar(c: Caja, factor: number, ancho: number, alto: number): Caja {
  const cx = c.x + c.ancho / 2, cy = c.y + c.alto / 2;
  const w = c.ancho * factor, h = c.alto * factor;
  const x = Math.max(0, cx - w / 2), y = Math.max(0, cy - h / 2);
  return { x, y, ancho: Math.min(ancho - x, w), alto: Math.min(alto - y, h) };
}

const dentro = (c: Caja, x: number, y: number) =>
  x >= c.x && x < c.x + c.ancho && y >= c.y && y < c.y + c.alto;

/**
 * Acumulador de Hough sobre los bordes fuertes que caen dentro de `zona`.
 * Devuelve, por cada ángulo, el mejor pico y el mejor par de picos separados.
 *
 * Se busca DENTRO de una zona y no en todo el cuadro a propósito: el marco de
 * una puerta o el borde de una mesa también son rectas largas, y lo que
 * interesa es una recta que ENVUELVA al rostro.
 */
export function rectasCerca(g: Gris, zona: Caja): { mejor: number; mejorPar: number } {
  const acum = new Int32Array(N_ANGULOS * 2 * Math.ceil(Math.hypot(g.ancho, g.alto) / PASO_RO));
  const nRo = acum.length / N_ANGULOS;
  const centroRo = nRo / 2;
  const cos = new Float32Array(N_ANGULOS), sin = new Float32Array(N_ANGULOS);
  for (let a = 0; a < N_ANGULOS; a++) {
    const r = (a * PASO_ANGULO * Math.PI) / 180;
    cos[a] = Math.cos(r); sin[a] = Math.sin(r);
  }

  const x0 = Math.max(1, Math.floor(zona.x)), x1 = Math.min(g.ancho - 1, Math.ceil(zona.x + zona.ancho));
  const y0 = Math.max(1, Math.floor(zona.y)), y1 = Math.min(g.alto - 1, Math.ceil(zona.y + zona.alto));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * g.ancho + x;
      const gx =
        -g.lum[i - g.ancho - 1] + g.lum[i - g.ancho + 1] +
        -2 * g.lum[i - 1] + 2 * g.lum[i + 1] +
        -g.lum[i + g.ancho - 1] + g.lum[i + g.ancho + 1];
      const gy =
        -g.lum[i - g.ancho - 1] - 2 * g.lum[i - g.ancho] - g.lum[i - g.ancho + 1] +
        g.lum[i + g.ancho - 1] + 2 * g.lum[i + g.ancho] + g.lum[i + g.ancho + 1];
      if (Math.abs(gx) + Math.abs(gy) < UMBRAL_BORDE) continue;
      // Solo se vota en el ángulo perpendicular al gradiente, y en sus vecinos:
      // votar en los 60 ángulos convierte cualquier textura en una recta.
      const aBase = Math.round(((Math.atan2(gy, gx) * 180) / Math.PI + 180) / PASO_ANGULO);
      for (let d = -1; d <= 1; d++) {
        const a = ((aBase + d) % N_ANGULOS + N_ANGULOS) % N_ANGULOS;
        const ro = Math.round((x * cos[a] + y * sin[a]) / PASO_RO + centroRo);
        if (ro >= 0 && ro < nRo) acum[a * nRo + ro]++;
      }
    }
  }

  let mejor = 0, mejorPar = 0;
  const sepMin = Math.max(4, Math.round((zona.ancho * 0.35) / PASO_RO));
  for (let a = 0; a < N_ANGULOS; a++) {
    let p1 = 0, r1 = -1;
    for (let r = 0; r < nRo; r++) {
      const v = acum[a * nRo + r];
      if (v > p1) { p1 = v; r1 = r; }
    }
    if (p1 > mejor) mejor = p1;
    let p2 = 0;
    for (let r = 0; r < nRo; r++) {
      if (Math.abs(r - r1) < sepMin) continue;
      const v = acum[a * nRo + r];
      if (v > p2) p2 = v;
    }
    const par = Math.min(p1, p2);
    if (par > mejorPar) mejorPar = par;
  }
  return { mejor, mejorPar };
}

/** Media de luminancia de los píxeles que están en `fuera` y no en `dentroDe`. */
function mediaAnillo(g: Gris, fuera: Caja, dentroDe: Caja): number {
  let suma = 0, n = 0;
  const x0 = Math.max(0, Math.floor(fuera.x)), x1 = Math.min(g.ancho, Math.ceil(fuera.x + fuera.ancho));
  const y0 = Math.max(0, Math.floor(fuera.y)), y1 = Math.min(g.alto, Math.ceil(fuera.y + fuera.alto));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (dentro(dentroDe, x, y)) continue;
      suma += g.lum[y * g.ancho + x]; n++;
    }
  }
  return n ? suma / n : 0;
}

export function rasgosDe(datos: Uint8ClampedArray, ancho: number, alto: number, cara: Caja): Rasgos {
  const g = aGris(datos, ancho, alto);

  let quemados = 0;
  for (let i = 0; i < g.lum.length; i++) if (g.lum[i] >= QUEMADO) quemados++;

  // El aparato es más grande que la cara que muestra: se busca en una zona
  // holgada alrededor del rostro, no pegada a él.
  const zona = dilatar(cara, 2.4, ancho, alto);
  const { mejor, mejorPar } = rectasCerca(g, zona);
  const normal = Math.max(1, cara.ancho);

  const anilloCerca = dilatar(cara, 1.6, ancho, alto);
  const anilloLejos = dilatar(cara, 2.8, ancho, alto);
  const medias = mediaAnillo(g, anilloCerca, cara) - mediaAnillo(g, anilloLejos, anilloCerca);

  return {
    tamanoCara: cara.ancho / ancho,
    quemados: quemados / g.lum.length,
    rectaMasLarga: mejor / normal,
    paralelas: mejorPar / normal,
    saltoAnillo: medias / 255,
  };
}
