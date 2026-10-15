import { describe, it, expect } from 'vitest';
import { contraQueSeMide, referenciaDeLaMedicion } from './horarioDeLasTardanzas';

// CONTRA QUÉ SE MIDEN LAS LLEGADAS TARDE (15 de octubre de 2026). Desde que la regla es la de los días esperados,
// a alguien sin horario se le miden las llegadas contra los turnos que le pintó el planificador: el servidor manda
// `horario: null` (o uno inactivo) y la pantalla decía «(horario , min de tolerancia)».
describe('contraQueSeMide', () => {
  it('con un horario activo, su nombre y su tolerancia', () => {
    expect(contraQueSeMide({ nombre: 'Oficina', toleranciaMin: 5, activo: true })).toBe('horario Oficina, 5 min de tolerancia');
  });

  it('sin horario, o con uno inactivo, los turnos programados', () => {
    expect(contraQueSeMide(null)).toBe('turnos programados, con la tolerancia de cada día');
    expect(contraQueSeMide(undefined)).toBe('turnos programados, con la tolerancia de cada día');
    expect(contraQueSeMide({ nombre: 'Viejo', toleranciaMin: 10, activo: false })).toBe('turnos programados, con la tolerancia de cada día');
  });
});

// La cabecera del desglose del reporte de toda la empresa, que lleva la tolerancia aparte (la de cada día).
describe('referenciaDeLaMedicion', () => {
  it('el horario activo por su nombre; sin él, los turnos programados', () => {
    expect(referenciaDeLaMedicion({ nombre: 'Oficina', toleranciaMin: 5, activo: true })).toBe('Horario Oficina');
    expect(referenciaDeLaMedicion({ nombre: 'Viejo', toleranciaMin: 5, activo: false })).toBe('Turnos programados');
    expect(referenciaDeLaMedicion(null)).toBe('Turnos programados');
  });
});
