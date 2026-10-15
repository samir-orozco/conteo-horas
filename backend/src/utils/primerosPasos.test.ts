import { describe, it, expect } from 'vitest';
import { enArranque, primerosPasos, type Arranque } from './primerosPasos';

// «PRIMEROS PASOS» EN EL INICIO DE UNA EMPRESA NUEVA (14 de octubre de 2026).
//
// Lo decidió el dueño, en este orden: la sede, el horario, un trabajador, su registro biométrico y la
// primera marcación en el kiosco. Cada paso se cumple con UNO: un horario, un trabajador, un rostro, una
// marcación. La tarjeta se va cuando están los cinco o cuando la empresa cumple un mes.

const DIA = 24 * 60 * 60 * 1000;
const creada = new Date(Date.UTC(2026, 9, 1, 15, 0, 0));

const nada: Arranque = { horariosActivos: 0, colaboradoresActivos: 0, conRostro: 0, marcoEnElKiosco: false };

describe('enArranque', () => {
  it('una empresa de 29 días todavía está arrancando', () => {
    expect(enArranque(creada, new Date(creada.getTime() + 29 * DIA))).toBe(true);
  });

  it('al cumplir el mes ya no: a una empresa que lleva tiempo no se le pide configurar nada', () => {
    expect(enArranque(creada, new Date(creada.getTime() + 30 * DIA - 1))).toBe(true);
    expect(enArranque(creada, new Date(creada.getTime() + 30 * DIA))).toBe(false);
  });
});

describe('primerosPasos', () => {
  it('van en el orden que pidió el dueño', () => {
    expect(primerosPasos(nada)?.map(p => p.clave)).toEqual(['SEDE', 'HORARIO', 'TRABAJADOR', 'ROSTRO', 'MARCACION']);
  });

  // Toda empresa nace con su «Sede principal» (el registro la crea en la misma transacción) y la última
  // sede activa no se puede borrar. Por eso el paso sale hecho desde el primer día.
  it('la sede sale hecha desde el primer día', () => {
    expect(primerosPasos(nada)?.[0]).toEqual({ clave: 'SEDE', hecho: true });
  });

  it('una empresa recién creada tiene todo lo demás por hacer', () => {
    expect(primerosPasos(nada)?.filter(p => !p.hecho).map(p => p.clave)).toEqual(['HORARIO', 'TRABAJADOR', 'ROSTRO', 'MARCACION']);
  });

  it('cada paso se cumple con uno solo', () => {
    const pasos = primerosPasos({ horariosActivos: 1, colaboradoresActivos: 1, conRostro: 1, marcoEnElKiosco: false });
    expect(pasos?.filter(p => p.hecho).map(p => p.clave)).toEqual(['SEDE', 'HORARIO', 'TRABAJADOR', 'ROSTRO']);
  });

  it('cada conteo decide su propio paso y no el de al lado', () => {
    const hechos = (a: Partial<Arranque>) => primerosPasos({ ...nada, ...a })?.filter(p => p.hecho).map(p => p.clave);
    expect(hechos({ horariosActivos: 2 })).toEqual(['SEDE', 'HORARIO']);
    expect(hechos({ colaboradoresActivos: 3 })).toEqual(['SEDE', 'TRABAJADOR']);
    expect(hechos({ conRostro: 1 })).toEqual(['SEDE', 'ROSTRO']);
    expect(hechos({ marcoEnElKiosco: true })).toEqual(['SEDE', 'MARCACION']);
  });

  it('con los cinco hechos la tarjeta desaparece', () => {
    expect(primerosPasos({ horariosActivos: 1, colaboradoresActivos: 4, conRostro: 2, marcoEnElKiosco: true })).toBeNull();
  });
});
