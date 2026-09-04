import { describe, it, expect } from 'vitest';
import { resumenDeContrato, CLAVES_ESTADO_CONTRATO, type ContratoParaResumen } from './estadoContratoResumen';

const f = (iso: string) => new Date(iso + 'T05:00:00.000Z');
const hoy = f('2026-08-27');

const contrato = (over: Partial<ContratoParaResumen> = {}): ContratoParaResumen => ({
  tipo: 'FIJO', fechaInicio: f('2026-01-01'), fechaFin: f('2026-12-31'),
  fechaInicioPractica: null, prorrogas: [], ...over,
});

describe('el estado de contrato que se ve en la lista', () => {
  it('sin contrato vigente lo dice: es lo que hay que arreglar primero', () => {
    expect(resumenDeContrato(null, hoy)).toBe('SIN_CONTRATO');
  });

  it('un indefinido no vence, y no puede pintarse como si le faltara algo', () => {
    expect(resumenDeContrato(contrato({ tipo: 'INDEFINIDO', fechaFin: null }), hoy)).toBe('INDEFINIDO');
  });

  it('un fijo con plazo largo está simplemente vigente', () => {
    expect(resumenDeContrato(contrato({ fechaFin: f('2027-06-30') }), hoy)).toBe('VIGENTE');
  });

  it('dentro de la ventana del preaviso avisa que hay que decidir', () => {
    // El preaviso son 30 días antes del fin. Con fin el 11 de octubre, el
    // límite cae el 11 de septiembre: quedan 15 días para decidir.
    expect(resumenDeContrato(contrato({ fechaFin: f('2026-10-11') }), hoy)).toBe('POR_VENCER');
  });

  it('pasado el límite del preaviso es lo más urgente: ya se prorrogó solo', () => {
    // Fin el 15 de septiembre: el límite del preaviso fue el 16 de agosto.
    // Por ley el contrato ya se prorrogó, y eso cuesta plata.
    expect(resumenDeContrato(contrato({ fechaFin: f('2026-09-15') }), hoy)).toBe('PREAVISO_VENCIDO');
  });

  it('un contrato cuya fecha de fin ya pasó está vencido, no vigente', () => {
    expect(resumenDeContrato(contrato({ fechaFin: f('2026-06-30') }), hoy)).toBe('VENCIDO');
  });

  it('el último día todavía cuenta como vigente, no como vencido', () => {
    expect(resumenDeContrato(contrato({ fechaFin: hoy }), hoy)).not.toBe('VENCIDO');
  });

  it('las prórrogas mueven el fin, y el estado va con ellas', () => {
    // El contrato original vencía en junio, pero se prorrogó hasta diciembre:
    // no está vencido.
    const c = contrato({
      fechaFin: f('2026-06-30'),
      prorrogas: [{ desde: f('2026-07-01'), hasta: f('2026-12-31') }],
    });
    expect(resumenDeContrato(c, hoy)).toBe('VIGENTE');
  });

  it('todo lo que devuelve está declarado, para que la pantalla pueda traducirlo', () => {
    // Si alguien agrega un estado y olvida declararlo, la lista pintaría una
    // clave cruda. Esta prueba se rompe antes.
    const devueltos = [
      resumenDeContrato(null, hoy),
      resumenDeContrato(contrato({ tipo: 'INDEFINIDO', fechaFin: null }), hoy),
      resumenDeContrato(contrato({ fechaFin: f('2027-06-30') }), hoy),
      resumenDeContrato(contrato({ fechaFin: f('2026-10-11') }), hoy),
      resumenDeContrato(contrato({ fechaFin: f('2026-09-15') }), hoy),
      resumenDeContrato(contrato({ fechaFin: f('2026-06-30') }), hoy),
    ];
    for (const d of devueltos) expect(CLAVES_ESTADO_CONTRATO).toContain(d);
  });
});
