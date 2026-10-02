import { afterAll, beforeEach, vi } from 'vitest';

// UN MIÉRCOLES FIJO PARA LAS PRUEBAS QUE NECESITAN UNA SEMANA CON PASADO Y FUTURO (2 de octubre de 2026).
//
// Varias pruebas del calendario de turnos arman la semana EN CURSO con el reloj de verdad y luego
// tocan días concretos de ella: el jueves, el cuarto, el domingo, uno ya pasado. Eso es una suposición
// sobre el día en que se corre la suite, y se rompía sola. Medido corriendo la suite con el reloj fijo
// en cada día de una semana:
//
//   lunes          7 rojas    no hay ningún día ya pasado que tocar
//   martes-jueves  verdes
//   viernes        3 rojas    el jueves ya pasó y su tarjeta sale apagada
//   sábado        10 rojas
//   domingo       29 rojas    solo queda un día por delante
//
// Un miércoles deja dos días pasados y cinco por venir, que es lo que piden todas. 13:00 UTC son las
// 08:00 en Bogotá, lejos de la medianoche en las dos zonas: las pruebas corren en Los Ángeles a
// propósito (vite.config.ts) y el producto cuenta los días en Bogotá.
export const MIERCOLES_DE_PRUEBA = '2026-09-30T13:00:00Z';

// Se llama ARRIBA del archivo, antes de calcular `hoyEnBogota()`: esas constantes se evalúan al
// cargar el módulo, antes de cualquier `beforeAll`.
//
// Sin el reloj falso, `setSystemTime` solo congela `Date`, que es lo que hace falta: los
// temporizadores siguen siendo los de verdad y `findBy` y `userEvent` no se enteran. Se vuelve a
// fijar antes de cada prueba porque una que use el reloj falso y lo suelte con `useRealTimers`
// devuelve el `Date` de verdad a las siguientes.
export function fijarElRelojEnUnMiercoles(): void {
  const fijar = () => vi.setSystemTime(new Date(MIERCOLES_DE_PRUEBA));
  fijar();
  beforeEach(fijar);
  afterAll(() => { vi.useRealTimers(); });
}
