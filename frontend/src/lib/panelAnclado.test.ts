import { describe, it, expect } from 'vitest';
import { posicionDelPanel, MARGEN, SEPARACION } from './panelAnclado';

// Una ventana de portátil bajo, que es donde apareció el defecto: el botón de
// Reportes es de los últimos del menú lateral, así que en una pantalla baja cae
// cerca del borde de abajo.
const pedir = (over: Partial<Parameters<typeof posicionDelPanel>[0]> = {}) =>
  posicionDelPanel({ anclaTop: 120, anclaRight: 240, altoPanel: 354, altoVentana: 900, ...over });

describe('dónde cae un panel anclado al menú lateral', () => {
  it('a la derecha del botón y a su misma altura, cuando cabe', () => {
    const p = pedir();
    expect(p.top).toBe(120);
    expect(p.left).toBe(240 + SEPARACION);
  });

  it('si no cabe hacia abajo, sube lo justo para entrar entero', () => {
    // El caso medido el 4 de octubre de 2026: ventana de 620, botón en 504 y un
    // panel de 354, que terminaba 238 px por debajo del borde. Y como es
    // position:fixed, no hay scroll que lo alcance: las tres últimas opciones
    // eran inalcanzables.
    const p = pedir({ anclaTop: 504, altoVentana: 620 });
    expect(p.top).toBe(620 - MARGEN - 354);
    expect(p.top + 354).toBe(620 - MARGEN);
  });

  it('no se pasa por arriba al subir', () => {
    // Un panel casi tan alto como la ventana no puede acabar con el top en
    // negativo: se le vería cortado el encabezado y no habría cómo subirlo.
    const p = pedir({ anclaTop: 500, altoPanel: 880, altoVentana: 900 });
    expect(p.top).toBe(MARGEN);
  });

  it('un botón más arriba del margen tampoco lo saca por arriba', () => {
    expect(pedir({ anclaTop: 2 }).top).toBe(MARGEN);
  });

  it('si no cabe ni subiendo, queda pegado arriba y se desplaza por dentro', () => {
    const p = pedir({ anclaTop: 300, altoPanel: 2000, altoVentana: 620 });
    expect(p.top).toBe(MARGEN);
    expect(p.maxHeight).toBe(620 - MARGEN * 2);
  });

  it('el alto máximo es siempre la ventana menos sus dos márgenes', () => {
    expect(pedir({ altoVentana: 900 }).maxHeight).toBe(900 - MARGEN * 2);
    expect(pedir({ altoVentana: 620 }).maxHeight).toBe(620 - MARGEN * 2);
  });

  it('una ventana absurdamente baja no devuelve números negativos', () => {
    // Pasa de verdad un instante al rotar el teléfono o al abrir el teclado.
    // Un maxHeight negativo colapsa el panel y un top negativo lo saca de la
    // pantalla; mejor un panel apretado que uno invisible.
    const p = pedir({ altoVentana: 20 });
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.maxHeight).toBeGreaterThanOrEqual(0);
  });

  it('el alto del panel no cambia su columna: siempre a la derecha del botón', () => {
    expect(pedir({ altoPanel: 2000, altoVentana: 620 }).left).toBe(240 + SEPARACION);
  });
});
