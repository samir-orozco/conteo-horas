import { describe, it, expect } from 'vitest';
import {
  COLORES_DE_TURNO, COLOR_POR_DEFECTO, ETIQUETA_COLOR, CLASES_COLOR, PUNTO_COLOR, CELDA_COLOR,
  normalizarColor,
} from './coloresDeTurno';

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

  // EL PUNTO SÓLIDO (23 de septiembre de 2026). El dueño pidió elegir el color del turno con
  // «círculos del color y abajo su nombre», y para eso hace falta un relleno lleno.
  //
  // POR QUÉ NO SIRVE `CLASES_COLOR`: ese es un par fondo claro + texto oscuro, hecho para una
  // etiqueta que lleva el nombre del turno ENCIMA, y el contraste lo da el texto. Un círculo vacío
  // pintado con ese fondo claro se ve casi igual en los ocho colores, que es justo lo contrario de
  // para lo que sirve un selector de color.
  //
  // Las mismas dos guardas que el mapa de al lado, por la misma razón: Tailwind purga lo que no
  // encuentra escrito, y dos colores que pinten igual no son dos colores.
  it('cada color tiene su punto sólido, en una clase completa', () => {
    for (const color of COLORES_DE_TURNO) {
      expect(PUNTO_COLOR[color], `punto de ${color}`).toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
    }
  });

  it('no hay dos puntos que pinten igual', () => {
    const pintados = COLORES_DE_TURNO.map(c => PUNTO_COLOR[c]);
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

// EL TERCER MAPA: LA CELDA DE LA REJILLA (28 de septiembre de 2026).
//
// No es un capricho tener tres. Cada uno resuelve un problema de contraste distinto:
//
//   CLASES_COLOR  fondo medio + texto oscuro — una PASTILLA suelta, que se lee sobre blanco.
//   PUNTO_COLOR   relleno entero — un círculo VACÍO, que sin relleno se vería igual en los ocho.
//   CELDA_COLOR   fondo muy claro + borde del color — una celda pegada a otras treinta.
//
// POR QUÉ LA CELDA NO PUEDE USAR EL PRIMERO: la rejilla marca la selección con un anillo amarillo,
// y sobre un fondo `-200` ese anillo compite con el relleno en vez de destacar. Con el fondo claro
// el color sigue leyéndose —lo sostienen el borde y el punto— y el amarillo de lo marcado manda,
// que es lo que tiene que pasar cuando alguien está eligiendo a quién le va a escribir el turno.
describe('el color de una celda de la rejilla', () => {
  it('los ocho lo tienen, sin huecos', () => {
    for (const color of COLORES_DE_TURNO) {
      expect(CELDA_COLOR[color], `celda de ${color}`).toBeTruthy();
    }
  });

  it('trae fondo, texto Y BORDE, en clases completas que Tailwind pueda encontrar escritas', () => {
    for (const color of COLORES_DE_TURNO) {
      expect(CELDA_COLOR[color], `celda de ${color}`).toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
      expect(CELDA_COLOR[color], `celda de ${color}`).toMatch(/\btext-[a-z]+-\d{2,3}\b/);
      expect(CELDA_COLOR[color], `celda de ${color}`).toMatch(/\bborder-[a-z]+-\d{2,3}\b/);
    }
  });

  it('no hay dos que pinten igual', () => {
    const pintados = COLORES_DE_TURNO.map(c => CELDA_COLOR[c]);
    expect(new Set(pintados).size).toBe(COLORES_DE_TURNO.length);
  });

  it('EL FONDO ES MÁS CLARO QUE EL DE LA PASTILLA, que es la razón de que exista este mapa', () => {
    // Si alguien lo iguala a `CLASES_COLOR`, el anillo de selección vuelve a pelearse con el relleno
    // y no hay nada que lo delate mirando la pantalla de a una celda.
    for (const color of COLORES_DE_TURNO) {
      const nivel = (clases: string) => Number(clases.match(/\bbg-[a-z]+-(\d{2,3})\b/)![1]);
      expect(nivel(CELDA_COLOR[color]), `fondo de ${color}`).toBeLessThan(nivel(CLASES_COLOR[color]));
    }
  });
});
