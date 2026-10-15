import { describe, it, expect } from 'vitest';
import { chipsDePendientes, detalleDeContrato, fechasDeNovedad, tipoDeNovedad, type ContratoPendiente } from './pendientes';
import type { Dash } from './types';

// «PENDIENTES POR RESOLVER» EN EL INICIO (14 de octubre de 2026).
//
// Lo que espera a que alguien haga algo, decidido con el dueño: los turnos sin cerrar, las novedades por
// aprobar y los contratos por revisar. Lo demás (llegó tarde, no ha llegado, la pausa sin volver) se queda
// en la campana, porque son avisos del momento y no algo que siga abierto.
//
// Las fechas van a medianoche de Bogotá (05:00 UTC). Estas pruebas corren en Los Ángeles a propósito
// (vite.config.ts): una fecha formateada sin la zona de Bogotá saldría con el día anterior.

const novedad = (over: Partial<NonNullable<Dash['pendientes']>['novedades'][number]> = {}) => ({
  id: 'p1', colaboradorId: 'c1', colaborador: 'Ana Ruiz', tipo: 'MEDICO',
  fechaInicio: '2026-10-17T05:00:00.000Z', fechaFin: '2026-10-17T05:00:00.000Z', ...over,
});
const contrato = (over: Partial<ContratoPendiente> = {}): ContratoPendiente => ({
  colaboradorId: 'c1', colaborador: 'Ana Ruiz', estado: 'POR_VENCER',
  vence: '2026-12-10T05:00:00.000Z', limitePreaviso: '2026-11-10T05:00:00.000Z', ...over,
});
const pendientes = (n: number, c: number): Dash['pendientes'] => ({
  novedades: Array.from({ length: n }, (_, i) => novedad({ id: `p${i}` })),
  contratos: Array.from({ length: c }, (_, i) => contrato({ colaboradorId: `c${i}` })),
});

describe('chipsDePendientes', () => {
  it('uno por cada clase de pendiente, en este orden: lo que afecta la liquidación primero', () => {
    expect(chipsDePendientes(2, pendientes(3, 4))).toEqual([
      { clave: 'TURNOS', total: 2, texto: '2 turnos sin cerrar' },
      { clave: 'NOVEDADES', total: 3, texto: '3 novedades por aprobar' },
      { clave: 'CONTRATOS', total: 4, texto: '4 contratos por revisar' },
    ]);
  });

  it('en singular cuando es uno', () => {
    expect(chipsDePendientes(1, pendientes(1, 1)).map(c => c.texto))
      .toEqual(['1 turno sin cerrar', '1 novedad por aprobar', '1 contrato por revisar']);
  });

  it('lo que está en cero no aparece: el pendiente se apaga cuando se resuelve', () => {
    expect(chipsDePendientes(0, pendientes(2, 0)).map(c => c.clave)).toEqual(['NOVEDADES']);
    expect(chipsDePendientes(0, pendientes(0, 0))).toEqual([]);
  });

  // Durante un despliegue el navegador puede tener este código y el servidor el anterior, que no manda
  // `pendientes`. Los turnos sin cerrar sí los manda desde siempre.
  it('con un servidor anterior, que no manda pendientes, quedan los turnos sin cerrar', () => {
    expect(chipsDePendientes(3, undefined)).toEqual([{ clave: 'TURNOS', total: 3, texto: '3 turnos sin cerrar' }]);
  });
});

describe('detalleDeContrato', () => {
  it('por vencer: hasta cuándo se puede avisar', () => {
    expect(detalleDeContrato(contrato())).toBe('Preaviso hasta el 10 de nov');
  });

  it('con el preaviso vencido: cuándo vence y que se prorroga solo', () => {
    expect(detalleDeContrato(contrato({ estado: 'PREAVISO_VENCIDO', vence: '2026-11-01T05:00:00.000Z' })))
      .toBe('Vence el 1 de nov y se prorroga solo');
  });

  it('vencido: cuándo venció y qué falta registrar', () => {
    expect(detalleDeContrato(contrato({ estado: 'VENCIDO', vence: '2026-10-02T05:00:00.000Z' })))
      .toBe('Venció el 2 de oct: registra la prórroga o el retiro');
  });

  // Un caso por valor y un default explícito (CLAUDE.md §9.4): si el servidor suma un estado que esta
  // pantalla no conoce, se dice algo cierto en vez de pintar el texto de otro estado.
  it('un estado que esta pantalla no conoce no se disfraza de otro', () => {
    expect(detalleDeContrato(contrato({ estado: 'NUEVO' as never }))).toBe('Revisa el contrato');
  });
});

describe('fechasDeNovedad', () => {
  it('de un solo día: ese día', () => {
    expect(fechasDeNovedad(novedad())).toBe('17 de oct');
  });

  it('de varios días: desde y hasta', () => {
    expect(fechasDeNovedad(novedad({ fechaFin: '2026-10-21T05:00:00.000Z' }))).toBe('17 de oct al 21 de oct');
  });
});

describe('tipoDeNovedad', () => {
  it('con el nombre que lee una persona', () => {
    expect(tipoDeNovedad('MEDICO')).toBe('Cita médica');
  });

  it('un tipo que esta pantalla no conoce sale tal cual, no vacío', () => {
    expect(tipoDeNovedad('TIPO_NUEVO')).toBe('TIPO_NUEVO');
  });
});
