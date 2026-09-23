import { describe, it, expect } from 'vitest';
import { DIAS_SEMANA, diaSemanaDeFechaBogota, diaValido } from './diasDeLaSemana';

// PRUEBAS DE LA LISTA DE DÍAS Y DE SU VALIDACIÓN (21 de septiembre de 2026).
//
// `diaValido` llega aquí desde `descansoObligatorio.ts`, donde era privada, porque apareció una
// TERCERA necesidad (el descanso de la semana rotativa) y al buscarla resultó que ya estaban
// escritas DOS: la de `descansoObligatorio` y otra dentro de `cuerpoDeRespuestaDescanso`. Se
// comprobó antes de fundirlas que hacían exactamente lo mismo; no habían derivado todavía.
//
// Que estuviera sin pruebas propias es precisamente como empiezan las copias que derivan
// (CLAUDE.md §9.3), y por eso el traslado viene con ellas.
//
// POR QUÉ IMPORTA QUE SEA TOLERANTE Y NO ESTRICTA: los nombres de día viven en columnas de TEXTO
// LIBRE de producción (`FranjaHorario.dias`, que es Json, y `Colaborador.descansoDia`). Un valor
// raro no puede cambiar quién descansa cuándo, así que lo que no se reconoce se descarta en
// silencio en vez de reventar. Y lo que sí se reconoce vuelve NORMALIZADO, porque el resultado se
// compara contra `DIAS_SEMANA` en otros sitios.

describe('DIAS_SEMANA', () => {
  it('el índice 0 es DOMINGO, que es lo que exige getDay/getUTCDay', () => {
    // El orden no es decorativo: medio backend traduce una fecha con `DIAS_SEMANA[fecha.getDay()]`.
    expect(DIAS_SEMANA[0]).toBe('DOMINGO');
    expect(DIAS_SEMANA).toHaveLength(7);
  });

  it('los nombres van sin tildes, como están guardados en producción', () => {
    expect(DIAS_SEMANA).toContain('MIERCOLES');
    expect(DIAS_SEMANA).not.toContain('MIÉRCOLES');
  });
});

describe('diaSemanaDeFechaBogota', () => {
  it('lee la fecha anclada a Bogotá sin correrla un día', () => {
    // 05:00 UTC es medianoche de Bogotá. Con `getDay()` en una máquina al occidente de Colombia
    // —y la suite corre fijada en América/Los Ángeles— esto daría el día anterior.
    expect(diaSemanaDeFechaBogota(new Date('2026-09-21T05:00:00.000Z'))).toBe('LUNES');
    expect(diaSemanaDeFechaBogota(new Date('2026-09-27T05:00:00.000Z'))).toBe('DOMINGO');
  });
});

describe('diaValido', () => {
  it('un nombre correcto vuelve tal cual', () => {
    expect(diaValido('MIERCOLES')).toBe('MIERCOLES');
  });

  it('normaliza mayúsculas y espacios', () => {
    // Llega de columnas de texto libre, así que no se puede exigir la forma exacta.
    expect(diaValido('  miercoles  ')).toBe('MIERCOLES');
    expect(diaValido('Domingo')).toBe('DOMINGO');
  });

  it('un nombre que no existe es null, no una excepción', () => {
    expect(diaValido('MIÉRCOLES')).toBeNull(); // con tilde: no es el que guarda producción
    expect(diaValido('LUNESS')).toBeNull();
    expect(diaValido('')).toBeNull();
    expect(diaValido('   ')).toBeNull();
  });

  it('lo que no es una cadena también es null', () => {
    // El valor sale de una columna Json: puede llegar un número, un objeto o nada.
    expect(diaValido(null)).toBeNull();
    expect(diaValido(undefined)).toBeNull();
    expect(diaValido(3)).toBeNull();
    expect(diaValido({ dia: 'LUNES' })).toBeNull();
    expect(diaValido(['LUNES'])).toBeNull();
  });
});
