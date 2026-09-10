// Pruebas del detector de pantalla con imágenes DIBUJADAS, de respuesta conocida.
//
// Existen porque la alternativa es mirar números sobre fotos reales sin tener
// idea de qué debería dar cada uno, que es como se acepta un detector roto: si
// no sé qué tiene que devolver ante un rectángulo perfecto, tampoco sé leer lo
// que devuelve ante una foto de verdad.
import { describe, it, expect } from 'vitest';
import { aGris, dilatar, rectasCerca, rasgosDe, type Caja } from './deteccionPantalla';

const ANCHO = 320, ALTO = 240;

/** Lienzo plano en gris medio. */
function lienzo(fondo = 110) {
  const d = new Uint8ClampedArray(ANCHO * ALTO * 4);
  for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = fondo; d[i + 3] = 255; }
  return d;
}

/**
 * Rectángulo relleno, opcionalmente girado, CON EL BORDE SUAVIZADO.
 *
 * El suavizado no es cosmético. La primera versión pintaba píxel a píxel con
 * Math.round, así que un borde inclinado quedaba en escalera y el gradiente
 * Sobel alternaba entre horizontal y vertical en vez de apuntar perpendicular
 * al borde. Con eso los votos se repartían entre ángulos y la prueba decía que
 * el detector no ve un aparato torcido, cuando lo que no servía era el dibujo:
 * una cámara real entrega ese borde con transición de un píxel.
 * Es la regla 9.2 del proyecto: un fixture que no es un ejemplo de verdad no
 * prueba nada de lo que dice.
 */
function rectangulo(d: Uint8ClampedArray, c: Caja, v: number, grados = 0) {
  const cx = c.x + c.ancho / 2, cy = c.y + c.alto / 2;
  const r = (grados * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  const radio = Math.ceil(Math.hypot(c.ancho, c.alto) / 2) + 2;
  const sat = (t: number) => Math.max(0, Math.min(1, t));
  for (let y = Math.max(0, Math.floor(cy - radio)); y <= Math.min(ALTO - 1, Math.ceil(cy + radio)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radio)); x <= Math.min(ANCHO - 1, Math.ceil(cx + radio)); x++) {
      const dx = x - cx, dy = y - cy;
      const u = dx * co + dy * si, w = -dx * si + dy * co;   // giro inverso
      const cob = sat(c.ancho / 2 - Math.abs(u) + 0.5) * sat(c.alto / 2 - Math.abs(w) + 0.5);
      if (cob <= 0) continue;
      const p = (y * ANCHO + x) * 4;
      const mezcla = d[p] * (1 - cob) + v * cob;
      d[p] = d[p + 1] = d[p + 2] = mezcla;
    }
  }
}

/** Ruido reproducible: nada de Math.random, para que la prueba no parpadee. */
function ruido(d: Uint8ClampedArray, amplitud: number, semilla = 1) {
  let s = semilla;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = d[i] + (s / 0x7fffffff - 0.5) * 2 * amplitud;
    d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
  }
}

const CARA: Caja = { x: 130, y: 90, ancho: 60, alto: 70 };

describe('las piezas sueltas', () => {
  it('aGris promedia con los pesos de luminancia', () => {
    const d = new Uint8ClampedArray(4 * 4);
    d[0] = 255; d[1] = 0; d[2] = 0;            // rojo puro
    d[4] = 0; d[5] = 255; d[6] = 0;            // verde puro
    const g = aGris(d, 2, 2);
    expect(g.lum[0]).toBeCloseTo(76.2, 1);
    expect(g.lum[1]).toBeCloseTo(149.7, 1);
  });

  it('dilatar crece sobre el centro y se recorta al cuadro', () => {
    const c = dilatar({ x: 100, y: 100, ancho: 40, alto: 40 }, 2, ANCHO, ALTO);
    expect(c.x).toBe(80); expect(c.y).toBe(80);
    expect(c.ancho).toBe(80); expect(c.alto).toBe(80);
    // pegado al borde: no se sale
    const b = dilatar({ x: 0, y: 0, ancho: 40, alto: 40 }, 4, ANCHO, ALTO);
    expect(b.x).toBe(0); expect(b.y).toBe(0);
    expect(b.x + b.ancho).toBeLessThanOrEqual(ANCHO);
  });
});

describe('rectasCerca distingue una recta de una textura', () => {
  const zona = dilatar(CARA, 2.4, ANCHO, ALTO);

  it('un fondo plano con ruido no produce rectas', () => {
    const d = lienzo(); ruido(d, 25, 7);
    const { mejor } = rectasCerca(aGris(d, ANCHO, ALTO), zona);
    expect(mejor).toBeLessThan(30);
  });

  it('un rectángulo grande deja una recta fuerte y un PAR de paralelas', () => {
    const d = lienzo(60);
    rectangulo(d, { x: 105, y: 60, ancho: 110, alto: 130 }, 200);
    const g = aGris(d, ANCHO, ALTO);
    const { mejor, mejorPar } = rectasCerca(g, zona);
    expect(mejor).toBeGreaterThan(60);
    expect(mejorPar).toBeGreaterThan(50);   // los dos lados del bisel
  });

  it('sigue viéndolo con el aparato inclinado, que es como se sostiene', () => {
    for (const grados of [10, 20, 30]) {
      const d = lienzo(60);
      rectangulo(d, { x: 105, y: 60, ancho: 110, alto: 130 }, 200, grados);
      const { mejorPar } = rectasCerca(aGris(d, ANCHO, ALTO), zona);
      expect(mejorPar).toBeGreaterThan(40);
    }
  });

  it('UNA sola recta no cuenta como par: una mesa o un marco de puerta no es un bisel', () => {
    const d = lienzo(60);
    // una franja delgadísima: dos bordes pegados, no separados como un aparato
    rectangulo(d, { x: 100, y: 118, ancho: 120, alto: 3 }, 210);
    const g = aGris(d, ANCHO, ALTO);
    const { mejor, mejorPar } = rectasCerca(g, zona);
    expect(mejor).toBeGreaterThan(40);      // la recta sí está
    expect(mejorPar).toBeLessThan(mejor / 2); // pero no hay un par SEPARADO
  });
});

describe('rasgosDe sobre escenas armadas', () => {
  it('una escena sin aparato deja todos los rasgos bajos', () => {
    const d = lienzo(120); ruido(d, 20, 3);
    const r = rasgosDe(d, ANCHO, ALTO, CARA);
    expect(r.quemados).toBe(0);
    expect(r.paralelas).toBeLessThan(0.6);
    expect(Math.abs(r.saltoAnillo)).toBeLessThan(0.1);
  });

  it('un aparato brillante alrededor del rostro sube paralelas, quemados y salto', () => {
    const d = lienzo(50);
    rectangulo(d, { x: 100, y: 55, ancho: 120, alto: 140 }, 252); // la pantalla, quemada
    rectangulo(d, CARA, 150);                                      // la cara dentro
    ruido(d, 6, 11);
    const r = rasgosDe(d, ANCHO, ALTO, CARA);
    expect(r.quemados).toBeGreaterThan(0.05);
    expect(r.paralelas).toBeGreaterThan(0.8);
    expect(r.saltoAnillo).toBeGreaterThan(0.15);  // el anillo pegado es más claro
  });

  it('tamanoCara es la fracción del ancho del cuadro', () => {
    const d = lienzo();
    expect(rasgosDe(d, ANCHO, ALTO, CARA).tamanoCara).toBeCloseTo(60 / 320, 6);
  });

  it('no revienta con la cara pegada al borde del cuadro', () => {
    const d = lienzo(); ruido(d, 15, 5);
    for (const c of [{ x: 0, y: 0, ancho: 50, alto: 60 }, { x: 280, y: 190, ancho: 40, alto: 50 }]) {
      const r = rasgosDe(d, ANCHO, ALTO, c);
      for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
