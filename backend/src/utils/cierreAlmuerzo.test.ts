import { describe, it, expect } from 'vitest';
import { almuerzoSinRegreso } from './cierreAlmuerzo';

// Quien sale a almorzar y no marca su regreso pierde la tarde entera: el sistema
// no la cuenta ni la paga, y hoy nadie se entera hasta que el trabajador
// reclama a fin de mes. Es el olvido más común de todos.
//
// Lo que este módulo NO hace, a propósito: inventar el regreso. La evidencia de
// quien volvió y no marcó es IDÉNTICA a la de quien se fue a la casa, así que
// darle la tarde por buena sería fabricar horas pagadas. Lo que hace es
// detectarlo y proponer una hora para que la confirme quien sí sabe: la propia
// persona en el kiosco, o el administrador.

const bog = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

describe('almuerzoSinRegreso', () => {
  it('acaba de salir: todavía está almorzando, no hay nada que reclamar', () => {
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 12, 30));
    expect(r.vencido).toBe(false);
    expect(r.finVentana).toEqual(bog(5, 13, 0));
  });

  it('se pasó unos minutos: sigue sin ser un olvido', () => {
    // Volver 13:20 y marcar es normal. Preguntarle a esta persona sobraría, y
    // peor, la empujaría a aceptar una hora que no es la suya.
    expect(almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 13, 20)).vencido).toBe(false);
  });

  it('una hora larga después del fin: eso ya es un olvido', () => {
    expect(almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 14, 10)).vencido).toBe(true);
  });

  it('a las cinco de la tarde, clarísimo', () => {
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 17, 0));
    expect(r.vencido).toBe(true);
    // La hora que se propone es el fin de SU ventana, no la de ahora.
    expect(r.finVentana).toEqual(bog(5, 13, 0));
  });

  it('sin ventana no hay nada que proponer', () => {
    // El día no tiene horario de almuerzo congelado: no se sabe cuándo debía
    // volver, así que no se inventa una hora.
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia({ almuerzoInicio: null, almuerzoFin: null }), bog(5, 17, 0));
    expect(r.vencido).toBe(false);
    expect(r.finVentana).toBeNull();
  });

  it('turno nocturno: la ventana de la madrugada es la del día siguiente', () => {
    // Turno 21:00 → 05:00, almuerzo de 01:00 a 01:30. Sale a la 01:00 del día 6.
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const r = almuerzoSinRegreso(bog(6, 1, 0), d, bog(6, 4, 0));
    expect(r.finVentana).toEqual(bog(6, 1, 30));
    expect(r.vencido).toBe(true);
  });
});
