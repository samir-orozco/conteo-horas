import { describe, it, expect } from 'vitest';
import { revisionPendiente } from './revisionPendiente';

// A QUIÉN SE LE BLOQUEA EL PANEL PARA REVISAR SALARIOS (17 de septiembre de 2026).
//
// La regla parece «a todas las empresas que ya existían», y esa fue la primera versión. Correrla
// contra la base real mostró el hueco: de 10 empresas bloqueadas, 4 no tenían NI UN colaborador
// activo. A esas el modal les salía con la tabla vacía y nada que corregir.
//
// No es que se les perdone la revisión: es que no existe. La sospecha que persigue todo esto es
// aritmética sobre un salario (básico menos auxilio igual al mínimo), y sin salarios no hay
// aritmética posible. Bloquear ahí es pedirle a alguien que revise un conjunto vacío.
//
// Sale a función pura porque es una DECISIÓN y no plomería (§8.2): la ruta que la usa no tiene
// pruebas de integración, así que si la condición vive dentro del `return` de la ruta, no la
// protege nada.

describe('revisionPendiente', () => {
  it('bloquea a la empresa que no ha revisado y tiene gente', () => {
    expect(revisionPendiente(null, 5)).toBe(true);
  });

  it('no bloquea a la que ya revisó', () => {
    expect(revisionPendiente(new Date('2026-09-17T05:00:00Z'), 5)).toBe(false);
  });

  it('no bloquea a la que no tiene ni un colaborador activo, aunque nunca haya revisado', () => {
    expect(revisionPendiente(null, 0)).toBe(false);
  });

  // Que ya haya revisado manda por encima de todo lo demás: si mañana se queda sin gente y pasado
  // vuelve a contratar, la marca sigue puesta y el modal no reaparece.
  it('la marca manda aunque se quede sin gente', () => {
    expect(revisionPendiente(new Date('2026-09-17T05:00:00Z'), 0)).toBe(false);
  });
});
