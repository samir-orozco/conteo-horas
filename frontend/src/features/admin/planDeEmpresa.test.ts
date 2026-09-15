import { describe, it, expect } from 'vitest';
import { funcionesDelPlan, funcionesExtra, cupoExtra, type CatalogoDePlanes } from './planDeEmpresa';

// Lo que la ficha de una empresa en el super admin guarda como «a la medida» (15 de septiembre de
// 2026). Antes se comparaba contra una copia de los planes escrita a mano en la pantalla: le faltaba
// «Varias sedes» y no se enteraba de lo que se cambiara en «Precios». Ahora se compara contra el
// catálogo que manda el servidor.

const CATALOGO: CatalogoDePlanes = {
  orden: ['ESENCIAL', 'PROFESIONAL'],
  funciones: [
    { key: 'gps', label: 'Marcación por GPS / geocerca' },
    { key: 'telegram', label: 'Alertas por Telegram' },
    { key: 'multiSede', label: 'Varias sedes' },
  ],
  planes: {
    ESENCIAL: { id: 'ESENCIAL', nombre: 'Esencial', limite: 10, precioMensual: 99900, precioAnual: 999000, features: { gps: false, telegram: false, multiSede: false } },
    PROFESIONAL: { id: 'PROFESIONAL', nombre: 'Profesional', limite: 40, precioMensual: 179900, precioAnual: 1799000, features: { gps: true, telegram: false } },
  },
};

describe('funcionesDelPlan', () => {
  it('trae cada función de la lista con lo que dice el plan, y en falso la que el plan no menciona', () => {
    expect(funcionesDelPlan(CATALOGO, 'PROFESIONAL')).toEqual({ gps: true, telegram: false, multiSede: false });
  });

  it('un plan que no está en el catálogo no trae ninguna función', () => {
    expect(funcionesDelPlan(CATALOGO, 'INVENTADO')).toEqual({ gps: false, telegram: false, multiSede: false });
  });
});

describe('funcionesExtra', () => {
  it('si todo es como el plan, no hay nada a la medida', () => {
    expect(funcionesExtra(CATALOGO, 'PROFESIONAL', { gps: true, telegram: false, multiSede: false })).toBeNull();
  });

  it('guarda solo lo que difiere del plan, prendido o apagado', () => {
    expect(funcionesExtra(CATALOGO, 'PROFESIONAL', { gps: false, telegram: false, multiSede: true }))
      .toEqual({ gps: false, multiSede: true });
  });

  it('ignora lo que no está en la lista de funciones', () => {
    expect(funcionesExtra(CATALOGO, 'PROFESIONAL', { gps: true, telegram: false, multiSede: false, vieja: true })).toBeNull();
  });
});

describe('cupoExtra', () => {
  it('el cupo del plan no es a la medida', () => {
    expect(cupoExtra(CATALOGO, 'PROFESIONAL', 40)).toBeNull();
  });

  it('otro cupo sí', () => {
    expect(cupoExtra(CATALOGO, 'PROFESIONAL', 55)).toBe(55);
  });
});
