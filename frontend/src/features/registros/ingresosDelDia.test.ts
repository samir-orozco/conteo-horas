import { describe, it, expect } from 'vitest';
import { ingresosDelDia } from './ingresosDelDia';

// QUÉ NÚMERO DE INGRESO ES CADA JORNADA DENTRO DE SU DÍA (4 de octubre de 2026).
//
// Con esto la tabla de registros puede decir «2.º ingreso» en la segunda
// jornada de una persona el mismo día, que es lo que permite ver de un golpe la
// diferencia entre un turno partido legítimo y una marcación duplicada.
//
// El número NO dice cuál de las dos está mal: eso lo decide quien mira. Decir
// «duplicado» sería afirmar un error que a veces no existe.

const jornada = (id: string, colaboradorId: string, fecha: string, entrada: string | null) =>
  ({ id, colaboradorId, fecha, entrada });

// Una jornada se guarda con su fecha anclada a medianoche de Bogotá, que es
// 05:00 UTC. Las pruebas del frontend corren en America/Los_Angeles a propósito
// (vite.config.ts), así que una implementación que lea el día con el reloj de
// la máquina se cae aquí y no en producción.
const DIA_3 = '2026-10-03T05:00:00.000Z';
const DIA_4 = '2026-10-04T05:00:00.000Z';

describe('ingresosDelDia', () => {
  it('una sola jornada en el día no lleva número', () => {
    expect(ingresosDelDia([jornada('a', 'c1', DIA_3, '2026-10-03T13:00:00.000Z')]).size).toBe(0);
  });

  it('dos jornadas de la misma persona el mismo día quedan numeradas 1 y 2', () => {
    const r = ingresosDelDia([
      jornada('a', 'c1', DIA_3, '2026-10-03T13:00:00.000Z'),
      jornada('b', 'c1', DIA_3, '2026-10-03T19:00:00.000Z'),
    ]);
    expect(r.get('a')).toEqual({ orden: 1, total: 2 });
    expect(r.get('b')).toEqual({ orden: 2, total: 2 });
  });

  // El servidor devuelve lo más reciente primero, así que el orden del arreglo
  // no es el del día.
  it('el número va por la hora de entrada, no por el orden en que vienen', () => {
    const r = ingresosDelDia([
      jornada('tarde', 'c1', DIA_3, '2026-10-03T19:00:00.000Z'),
      jornada('manana', 'c1', DIA_3, '2026-10-03T13:00:00.000Z'),
    ]);
    expect(r.get('manana')?.orden).toBe(1);
    expect(r.get('tarde')?.orden).toBe(2);
  });

  it('tres el mismo día se numeran 1, 2 y 3', () => {
    const r = ingresosDelDia([
      jornada('a', 'c1', DIA_3, '2026-10-03T12:00:00.000Z'),
      jornada('b', 'c1', DIA_3, '2026-10-03T16:00:00.000Z'),
      jornada('c', 'c1', DIA_3, '2026-10-03T22:00:00.000Z'),
    ]);
    expect([r.get('a')?.orden, r.get('b')?.orden, r.get('c')?.orden]).toEqual([1, 2, 3]);
    expect(r.get('c')?.total).toBe(3);
  });

  it('dos personas distintas el mismo día no se numeran', () => {
    expect(ingresosDelDia([
      jornada('a', 'c1', DIA_3, '2026-10-03T13:00:00.000Z'),
      jornada('b', 'c2', DIA_3, '2026-10-03T13:00:00.000Z'),
    ]).size).toBe(0);
  });

  it('la misma persona en dos días distintos no se numera', () => {
    expect(ingresosDelDia([
      jornada('a', 'c1', DIA_3, '2026-10-03T13:00:00.000Z'),
      jornada('b', 'c1', DIA_4, '2026-10-04T13:00:00.000Z'),
    ]).size).toBe(0);
  });

  // El día es el de BOGOTÁ, el mismo que la fila pinta en su columna de fecha.
  // 04:00 UTC es el 2 de octubre a las 11 p. m. en Bogotá, así que esa jornada
  // se ve como del día 2 y no puede contarse como el primer ingreso del día 3.
  // Una implementación que recorte los diez primeros caracteres del ISO las
  // junta, y la etiqueta contradiría lo que dice la fila.
  it('agrupa por el día de Bogotá, no por los caracteres del ISO', () => {
    expect(ingresosDelDia([
      jornada('dia2', 'c1', '2026-10-03T04:00:00.000Z', '2026-10-03T04:30:00.000Z'),
      jornada('dia3', 'c1', DIA_3, '2026-10-03T13:00:00.000Z'),
    ]).size).toBe(0);
  });

  // Una jornada sin entrada existe: la crea un administrador a mano, o queda el
  // turno abierto. Va al final para que el número no baile según llegue.
  it('una jornada sin hora de entrada va al final', () => {
    const r = ingresosDelDia([
      jornada('sinhora', 'c1', DIA_3, null),
      jornada('conhora', 'c1', DIA_3, '2026-10-03T19:00:00.000Z'),
    ]);
    expect(r.get('conhora')?.orden).toBe(1);
    expect(r.get('sinhora')?.orden).toBe(2);
  });
});
