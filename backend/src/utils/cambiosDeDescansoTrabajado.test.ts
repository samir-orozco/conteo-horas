import { describe, it, expect } from 'vitest';
import { diferenciasDeDecision, type EstadoDeDecision } from './cambiosDeDescansoTrabajado';

// EL RASTRO DE QUIÉN CAMBIÓ QUÉ EN UNA DECISIÓN DE DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// Calcado de `cambiosRegistro.ts`, que es el patrón de auditoría que este producto ya tiene: una
// tabla de campos con su formateador, solo se miran los que LLEGAN, y un campo que llega con el
// mismo valor no ensucia el historial.
//
// POR QUÉ ESTO EXISTE Y NO ES OPCIONAL: el dueño pidió que el modal se pueda editar libremente,
// para no obligar a su cliente a vivir con un error. Editar libremente sin dejar rastro convierte
// la constancia en nada, porque solo queda el estado final. Lo que protege a la empresa en un
// reclamo no es el estado: es poder mostrar quién decidió qué y cuándo.
//
// Se guarda en TEXTO y no en claves: esto se lee dentro de dos años, posiblemente por alguien que
// no trabaja aquí. «de dinero a compensatorio» se entiende; «DINERO→COMPENSATORIO» también, pero
// una fecha cruda en milisegundos no.

const antes: EstadoDeDecision = {
  decision: 'DINERO',
  fechaCompensatorio: null,
  claseAlDecidir: 'OCASIONAL',
  nota: null,
};

describe('diferenciasDeDecision', () => {
  it('sin cambios no hay nada que anotar', () => {
    expect(diferenciasDeDecision(antes, {})).toEqual([]);
  });

  it('un campo que llega con el MISMO valor no cuenta', () => {
    // Guardar sin tocar nada no puede ensuciar el historial: si lo hiciera, el rastro se llenaría
    // de ruido y el cambio de verdad quedaría escondido entre él.
    expect(diferenciasDeDecision(antes, { decision: 'DINERO', nota: null })).toEqual([]);
  });

  it('cambiar la decisión queda anotado con las dos palabras', () => {
    const d = diferenciasDeDecision(antes, { decision: 'COMPENSATORIO' });
    expect(d).toHaveLength(1);
    expect(d[0].campo).toBe('decision');
    expect(d[0].antes).toBe('DINERO');
    expect(d[0].despues).toBe('COMPENSATORIO');
  });

  it('asignar un día compensatorio donde no había', () => {
    const d = diferenciasDeDecision(antes, { fechaCompensatorio: new Date('2026-10-07T05:00:00.000Z') });
    expect(d).toHaveLength(1);
    expect(d[0].antes).toBe('sin día');
    expect(d[0].despues).toBe('2026-10-07');
  });

  it('la fecha se anota como día de BOGOTÁ, no como el instante crudo', () => {
    // La fila se guarda a las 05:00 UTC. Anotar `toISOString()` dejaría constancia de un día
    // distinto para cualquiera que la lea al occidente de Colombia (CLAUDE.md §8.1).
    const d = diferenciasDeDecision(antes, { fechaCompensatorio: new Date('2026-10-07T05:00:00.000Z') });
    expect(d[0].despues).toBe('2026-10-07');
  });

  it('quitar el día compensatorio también se anota', () => {
    const conDia: EstadoDeDecision = { ...antes, fechaCompensatorio: new Date('2026-10-07T05:00:00.000Z') };
    const d = diferenciasDeDecision(conDia, { fechaCompensatorio: null });
    expect(d).toHaveLength(1);
    expect(d[0].antes).toBe('2026-10-07');
    expect(d[0].despues).toBe('sin día');
  });

  it('cambiar la nota se anota, y una nota ausente se lee en palabras', () => {
    const d = diferenciasDeDecision(antes, { nota: 'lo pidió ella' });
    expect(d).toEqual([{ campo: 'nota', antes: 'sin nota', despues: 'lo pidió ella' }]);
  });

  it('el cambio de clase queda anotado: es el contexto que explica la decisión', () => {
    // Si alguien vuelve a decidir cuando el mes ya cruzó a habitual, esa es justamente la
    // información que hace falta para entender por qué cambió.
    const d = diferenciasDeDecision(antes, { claseAlDecidir: 'HABITUAL' });
    expect(d).toEqual([{ campo: 'claseAlDecidir', antes: 'OCASIONAL', despues: 'HABITUAL' }]);
  });

  it('solo se miran los campos que LLEGAN: la edición es parcial', () => {
    // El PUT admite cambios parciales, y lo que no llega no cambió. Si se miraran todos, un cuerpo
    // que solo trae la nota anotaría además que la decisión «cambió» a undefined.
    const d = diferenciasDeDecision(antes, { nota: 'algo' });
    expect(d.map(x => x.campo)).toEqual(['nota']);
  });

  it('varios cambios a la vez salen todos, en el orden de la tabla de campos', () => {
    const d = diferenciasDeDecision(antes, {
      decision: 'COMPENSATORIO',
      fechaCompensatorio: new Date('2026-10-07T05:00:00.000Z'),
      nota: 'acordado',
    });
    expect(d.map(x => x.campo)).toEqual(['decision', 'fechaCompensatorio', 'nota']);
  });
});
