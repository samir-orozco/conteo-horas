import { describe, it, expect } from 'vitest';
import { contratosPorRevisar, type PersonaConContrato } from './contratosPorRevisar';
import type { ContratoParaResumen } from './estadoContratoResumen';

// LOS CONTRATOS QUE VAN EN «PENDIENTES POR RESOLVER» DEL INICIO (14 de octubre de 2026).
//
// Decisión del dueño: los que piden una decisión, que es lo mismo que el filtro «Requieren atención» de
// Colaboradores sin «Sin contrato». O sea: por vencer (todavía se puede dar el preaviso), los que ya no
// alcanzan el preaviso y se prorrogan solos, y los vencidos que nadie registró. Si el Inicio contara con
// otra regla, su número no coincidiría con el de la lista y parecería un error.
//
// Las fechas van a medianoche de Bogotá (05:00 UTC), como se guardan.

const f = (iso: string) => new Date(iso + 'T05:00:00.000Z');
// Martes 14 de octubre de 2026, 10:00 a. m. en Bogotá.
const hoy = new Date(Date.UTC(2026, 9, 14, 15, 0, 0));

const contrato = (over: Partial<ContratoParaResumen> = {}): ContratoParaResumen => ({
  tipo: 'FIJO', fechaInicio: f('2026-01-01'), fechaFin: f('2027-06-30'),
  fechaInicioPractica: null, prorrogas: [], ...over,
});
const persona = (id: string, c: ContratoParaResumen | null): PersonaConContrato => ({ id, nombre: `Persona ${id}`, contrato: c });

describe('contratosPorRevisar', () => {
  it('trae el que está dentro del plazo de preaviso, con la fecha límite para avisar', () => {
    // Vence el 10 de diciembre: el preaviso se puede dar hasta el 10 de noviembre.
    const [c] = contratosPorRevisar([persona('a', contrato({ fechaFin: f('2026-12-10') }))], hoy);
    expect(c).toEqual({
      colaboradorId: 'a', colaborador: 'Persona a', estado: 'POR_VENCER',
      vence: f('2026-12-10'), limitePreaviso: f('2026-11-10'),
    });
  });

  it('trae el que ya no alcanza el preaviso y se va a prorrogar solo', () => {
    // Vence el 1 de noviembre: el preaviso se podía dar hasta el 2 de octubre, que ya pasó.
    const [c] = contratosPorRevisar([persona('a', contrato({ fechaFin: f('2026-11-01') }))], hoy);
    expect(c.estado).toBe('PREAVISO_VENCIDO');
    expect(c.vence).toEqual(f('2026-11-01'));
  });

  it('trae el vencido que nadie registró', () => {
    const [c] = contratosPorRevisar([persona('a', contrato({ fechaFin: f('2026-10-02') }))], hoy);
    expect(c.estado).toBe('VENCIDO');
    expect(c.vence).toEqual(f('2026-10-02'));
  });

  it('deja fuera a quien no tiene contrato, al indefinido y al vigente con plazo largo', () => {
    // «Sin contrato» se quedó fuera a propósito: en una empresa que no usa el módulo de contratos
    // serían todos, y el pendiente no bajaría a cero nunca.
    const lista = contratosPorRevisar([
      persona('sin', null),
      persona('indefinido', contrato({ tipo: 'INDEFINIDO', fechaFin: null })),
      persona('vigente', contrato({ fechaFin: f('2027-06-30') })),
    ], hoy);
    expect(lista).toEqual([]);
  });

  // La tarde del último día para avisar todavía se puede decidir: no puede salir como «se prorroga solo».
  it('el último día del preaviso, por la tarde, sigue por vencer', () => {
    // Vence el 13 de noviembre: el preaviso se puede dar hasta hoy, 14 de octubre. Son las 3 p. m.
    const tarde = new Date(Date.UTC(2026, 9, 14, 20, 0, 0));
    const [c] = contratosPorRevisar([persona('a', contrato({ fechaFin: f('2026-11-13') }))], tarde);
    expect(c.estado).toBe('POR_VENCER');
    expect(c.limitePreaviso).toEqual(f('2026-10-14'));
  });

  it('mira la última prórroga y no la fecha de fin original', () => {
    // La fecha de fin original ya pasó, pero una prórroga lo lleva hasta 2027: no hay nada que revisar.
    const prorrogado = contrato({ fechaFin: f('2026-10-02'), prorrogas: [{ desde: f('2026-10-03'), hasta: f('2027-10-02') }] });
    expect(contratosPorRevisar([persona('a', prorrogado)], hoy)).toEqual([]);

    // Y si es la prórroga la que está por vencer, la fecha que se informa es la suya.
    const prorrogaCorta = contrato({ fechaFin: f('2026-06-30'), prorrogas: [{ desde: f('2026-07-01'), hasta: f('2026-12-10') }] });
    const [c] = contratosPorRevisar([persona('b', prorrogaCorta)], hoy);
    expect(c.vence).toEqual(f('2026-12-10'));
    expect(c.limitePreaviso).toEqual(f('2026-11-10'));
  });

  // Por fecha de vencimiento, que deja lo más urgente primero: un vencido venció antes de hoy, uno que se
  // prorroga solo vence en menos de 30 días y uno por vencer, después.
  it('ordena por fecha de vencimiento: vencidos, después los que se prorrogan solos, después los que aún se deciden', () => {
    const lista = contratosPorRevisar([
      persona('por-vencer-tarde', contrato({ fechaFin: f('2026-12-12') })),
      persona('por-vencer-pronto', contrato({ fechaFin: f('2026-12-05') })),
      persona('se-prorroga', contrato({ fechaFin: f('2026-11-01') })),
      persona('vencido', contrato({ fechaFin: f('2026-10-02') })),
    ], hoy);
    expect(lista.map(c => c.colaboradorId)).toEqual(['vencido', 'se-prorroga', 'por-vencer-pronto', 'por-vencer-tarde']);
  });
});
