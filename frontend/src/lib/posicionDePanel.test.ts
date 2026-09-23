import { describe, it, expect } from 'vitest';
import { posicionDePanel, MARGEN_DE_PANTALLA } from './posicionDePanel';

// DÓNDE CABE UN PANEL FLOTANTE SIN SALIRSE DE LA PANTALLA (22 de septiembre de 2026).
//
// Pedido del dueño, y dicho para TODA esta clase de elementos, no solo para uno: «no deben de
// ocultarse con la pantalla, que se acomode al espacio».
//
// Por eso vive en `lib/` y no junto al calendario: nace para reutilizarse.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO CSS: un panel anclado a un botón se sale por abajo cuando el
// botón está en la última fila, y por la derecha cuando está en la última columna. Las dos cosas
// pasan SIEMPRE en una rejilla de siete días: el domingo es la última columna y la última persona
// es la última fila. Es un defecto que no se ve en el caso de en medio, que es el que uno prueba a
// mano, y por eso se prueba aquí.
//
// LA PREFERENCIA, y el orden importa: debajo del botón y alineado a su izquierda. Si no cabe
// debajo, encima. Si no cabe en ninguno de los dos, se queda pegado dentro de la ventana. Nunca
// sale, y nunca queda en negativo.

const ventana = { ancho: 1000, alto: 800 };
const panel = { ancho: 300, alto: 200 };

describe('posicionDePanel', () => {
  it('con espacio de sobra va DEBAJO del botón y alineado a su izquierda', () => {
    const ancla = { x: 100, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, ventana)).toEqual({ x: 100, y: 148 });
  });

  it('si no cabe debajo, va ENCIMA', () => {
    // El botón de la última fila de la rejilla: debajo solo quedan 60 px y el panel mide 200.
    const ancla = { x: 100, y: 700, ancho: 80, alto: 40 };
    // Encima: 700 - 200 - 8 = 492.
    expect(posicionDePanel(ancla, panel, ventana).y).toBe(492);
  });

  it('si se sale por la DERECHA se corre lo justo para caber', () => {
    // El domingo, que es la última columna. Alineado a la izquierda del botón se saldría.
    const ancla = { x: 900, y: 100, ancho: 80, alto: 40 };
    // 1000 - 300 - 8 = 692.
    expect(posicionDePanel(ancla, panel, ventana).x).toBe(692);
  });

  it('nunca se pasa del margen izquierdo', () => {
    const ancla = { x: 2, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, ventana).x).toBe(MARGEN_DE_PANTALLA);
  });

  it('si no cabe ni arriba ni abajo, se queda DENTRO de la ventana', () => {
    // Ventana baja (un portátil con el teclado virtual abierto, o una ventana a media pantalla).
    const chica = { ancho: 1000, alto: 260 };
    const ancla = { x: 100, y: 120, ancho: 80, alto: 40 };
    const p = posicionDePanel(ancla, panel, chica);
    expect(p.y).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.y + panel.alto).toBeLessThanOrEqual(chica.alto - MARGEN_DE_PANTALLA);
  });

  it('un panel MÁS ALTO que la ventana se ancla arriba, no en negativo', () => {
    // Un `y` negativo deja el panel cortado por arriba y sin forma de llegar a su primer control.
    // Más vale que sobre por abajo, que al menos se puede desplazar.
    const enana = { ancho: 1000, alto: 150 };
    const ancla = { x: 100, y: 50, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, enana).y).toBe(MARGEN_DE_PANTALLA);
  });

  it('un panel MÁS ANCHO que la ventana tampoco queda en negativo', () => {
    const angosta = { ancho: 200, alto: 800 };
    const ancla = { x: 100, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, angosta).x).toBe(MARGEN_DE_PANTALLA);
  });

  it('respeta el margen en los cuatro bordes en un caso cualquiera', () => {
    // La invariante que resume todo lo anterior, escrita una vez.
    const ancla = { x: 940, y: 740, ancho: 50, alto: 40 };
    const p = posicionDePanel(ancla, panel, ventana);
    expect(p.x).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.y).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.x + panel.ancho).toBeLessThanOrEqual(ventana.ancho - MARGEN_DE_PANTALLA);
    expect(p.y + panel.alto).toBeLessThanOrEqual(ventana.alto - MARGEN_DE_PANTALLA);
  });
});
