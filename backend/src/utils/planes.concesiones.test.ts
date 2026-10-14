import { describe, it, expect } from 'vitest';
import { capacidadesDe, PLANES } from './planes';

// LAS CONCESIONES CON FECHA EN LAS CAPACIDADES (14 de octubre de 2026, PENDIENTES nº 39, fase 2). Quien llama
// pasa ya resueltas las funciones que encienden las concesiones VIGENTES (utils/concesiones.ts). Aquí se prueba
// que se suman al plan: encienden lo que el plan no trae y nunca apagan lo que trae.
describe('capacidadesDe con funciones concedidas', () => {
  it('una concesión enciende una función que el plan no trae', () => {
    const cap = capacidadesDe({ plan: 'PROFESIONAL' }, false, PLANES, { clima: true, multiSede: true });
    expect(cap.features.clima).toBe(true);
    expect(cap.features.multiSede).toBe(true);
    expect(cap.plan).toBe('PROFESIONAL');
  });

  it('sin concesiones, el plan queda como era', () => {
    expect(capacidadesDe({ plan: 'PROFESIONAL' }, false, PLANES).features.clima).toBe(false);
    expect(capacidadesDe({ plan: 'PROFESIONAL' }, false, PLANES, {}).features.clima).toBe(false);
  });

  it('no apaga lo que el plan trae ni lo que se dio a la medida', () => {
    const cap = capacidadesDe({ plan: 'PROFESIONAL', funcionesOverride: { turnos: true } }, false, PLANES, { clima: true });
    expect(cap.features.gps).toBe(true);
    expect(cap.features.turnos).toBe(true);
    expect(cap.features.clima).toBe(true);
  });

  it('con acceso ilimitado sigue teniéndolo todo', () => {
    expect(capacidadesDe({ plan: 'ESENCIAL' }, true, PLANES, {}).features.clima).toBe(true);
  });
});
