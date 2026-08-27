import { describe, it, expect } from 'vitest';
import { estadoContrato, FILTROS_CONTRATO, cumpleFiltroContrato } from './estadoContrato';

describe('cómo se pinta el estado del contrato en la lista', () => {
  it('traduce cada estado que manda el servidor', () => {
    expect(estadoContrato('PREAVISO_VENCIDO').etiqueta).toBe('Se prorrogó solo');
    expect(estadoContrato('POR_VENCER').etiqueta).toBe('Por vencer');
    expect(estadoContrato('SIN_CONTRATO').etiqueta).toBe('Sin contrato');
  });

  it('lo urgente se ve urgente, y lo normal no grita', () => {
    expect(estadoContrato('PREAVISO_VENCIDO').tono).toBe('rojo');
    expect(estadoContrato('VENCIDO').tono).toBe('rojo');
    expect(estadoContrato('POR_VENCER').tono).toBe('ambar');
    expect(estadoContrato('VIGENTE').tono).toBe('verde');
    expect(estadoContrato('SIN_CONTRATO').tono).toBe('gris');
  });

  it('un estado que el frontend no conoce no rompe la tabla', () => {
    // El servidor puede agregar uno antes de que esta pantalla se actualice.
    // Mejor mostrarlo en gris que dejar la celda vacía o reventar la fila.
    const e = estadoContrato('ALGO_NUEVO');
    expect(e.etiqueta).toBe('ALGO_NUEVO');
    expect(e.tono).toBe('gris');
  });

  it('sin dato del servidor tampoco rompe', () => {
    expect(estadoContrato(undefined).etiqueta).toBe('—');
    expect(estadoContrato(null).etiqueta).toBe('—');
  });
});

describe('el filtro por estado de contrato', () => {
  it('"todos" no filtra nada', () => {
    expect(cumpleFiltroContrato('todos', 'VIGENTE')).toBe(true);
    expect(cumpleFiltroContrato('todos', 'SIN_CONTRATO')).toBe(true);
    expect(cumpleFiltroContrato('todos', undefined)).toBe(true);
  });

  it('un filtro puntual deja pasar solo lo suyo', () => {
    expect(cumpleFiltroContrato('POR_VENCER', 'POR_VENCER')).toBe(true);
    expect(cumpleFiltroContrato('POR_VENCER', 'VIGENTE')).toBe(false);
  });

  it('"requieren atención" junta lo que hay que resolver ya', () => {
    // Es el filtro que de verdad se usa: no interesa la taxonomía, interesa
    // sobre quién hay que actuar esta semana.
    expect(cumpleFiltroContrato('atencion', 'PREAVISO_VENCIDO')).toBe(true);
    expect(cumpleFiltroContrato('atencion', 'VENCIDO')).toBe(true);
    expect(cumpleFiltroContrato('atencion', 'POR_VENCER')).toBe(true);
    expect(cumpleFiltroContrato('atencion', 'SIN_CONTRATO')).toBe(true);
    expect(cumpleFiltroContrato('atencion', 'VIGENTE')).toBe(false);
    expect(cumpleFiltroContrato('atencion', 'INDEFINIDO')).toBe(false);
  });

  it('los filtros que se ofrecen tienen todos etiqueta', () => {
    expect(FILTROS_CONTRATO.length).toBeGreaterThan(2);
    for (const f of FILTROS_CONTRATO) {
      expect(f.etiqueta.length).toBeGreaterThan(0);
      expect(f.valor.length).toBeGreaterThan(0);
    }
  });
});
