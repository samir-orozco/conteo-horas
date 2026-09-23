import { describe, it, expect } from 'vitest';
import { COLORES_DE_TURNO, COLOR_POR_DEFECTO, ETIQUETA_COLOR, CLASES_COLOR, normalizarColor } from './coloresDeTurno';

// La paleta de los turnos del catálogo (19 de septiembre de 2026).
//
// Es un ESPEJO de `COLORES_DE_PLANTILLA` en backend/src/utils/cuerpoDePlantilla.ts, con la misma
// convención que los demás espejos entre los dos lados (`modalidad.ts`, `sedesDeReporte.ts`): no hay
// guarda automática, porque el frontend no importa nada del backend. Esta prueba no puede comprobar
// que las dos listas coincidan; lo que sí hace es dejar la lista ESCRITA, de modo que quitar o
// agregar un color aquí sin querer se ve en rojo.

describe('la paleta de turnos', () => {
  it('es exactamente la del backend, escrita a la vista', () => {
    expect([...COLORES_DE_TURNO]).toEqual([
      'grafito', 'ambar', 'indigo', 'esmeralda', 'rubi', 'cobalto', 'violeta', 'ocre',
    ]);
  });

  it('el color por defecto es uno de la paleta', () => {
    expect(COLORES_DE_TURNO).toContain(COLOR_POR_DEFECTO);
  });

  it('los ocho tienen etiqueta y clases, sin huecos', () => {
    for (const color of COLORES_DE_TURNO) {
      expect(ETIQUETA_COLOR[color], `etiqueta de ${color}`).toBeTruthy();
      expect(CLASES_COLOR[color], `clases de ${color}`).toBeTruthy();
    }
  });

  // Tailwind purga lo que no encuentra escrito en el código: una clase armada como `bg-${c}-100` se
  // ve bien en desarrollo y sale SIN COLOR en el paquete de producción. Por eso el mapa lleva las
  // clases completas y literales, y esta prueba lo afirma.
  it('cada color trae fondo y texto, en clases completas', () => {
    for (const color of COLORES_DE_TURNO) {
      expect(CLASES_COLOR[color], `clases de ${color}`).toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
      expect(CLASES_COLOR[color], `clases de ${color}`).toMatch(/\btext-[a-z]+-\d{2,3}\b/);
    }
  });

  // Dos turnos con el mismo color en la rejilla serían indistinguibles de un vistazo, que es justo
  // lo que el color viene a resolver.
  it('no hay dos colores que pinten igual', () => {
    const pintados = COLORES_DE_TURNO.map(c => CLASES_COLOR[c]);
    expect(new Set(pintados).size).toBe(COLORES_DE_TURNO.length);
  });
});

describe('normalizarColor', () => {
  it('conserva cualquier color de la paleta', () => {
    for (const color of COLORES_DE_TURNO) expect(normalizarColor(color)).toBe(color);
  });

  // Lo que llegue del servidor puede ser de una versión anterior de la paleta, o de una empresa
  // cuyo color se retiró. Pintar «nada» dejaría una celda invisible en el calendario.
  it('cae al color por defecto con lo que no es de la paleta', () => {
    for (const raro of ['#ff0000', 'rojo', '', 'GRAFITO', 7, null, undefined, {}]) {
      expect(normalizarColor(raro)).toBe(COLOR_POR_DEFECTO);
    }
  });
});
