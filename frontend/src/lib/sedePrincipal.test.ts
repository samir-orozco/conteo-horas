import { describe, it, expect } from 'vitest';
import { principalTrasEliminar, avisoAlEliminarSede } from './sedePrincipal';

// Qué avisa el diálogo de eliminar una sede (decisión del dueño del 12 de septiembre
// de 2026). A quien quede sin sede no se le asigna otra: si trabaja presencial, se le
// cuenta al leer en la Sede principal. Y la principal no es una marca guardada: es
// la sede activa más antigua (backend/src/utils/sedePrincipal.ts), así que al
// eliminarla toma su lugar la activa más antigua que quede.

const sede = (id: string, nombre: string, creadoEn: string, principal = false) => ({ id, nombre, creadoEn, principal });
const PRINCIPAL = sede('p', 'Sede principal', '2026-01-10T15:00:00.000Z', true);
const NORTE = sede('n', 'Norte', '2026-03-01T15:00:00.000Z');
const SUR = sede('s', 'Sur', '2026-02-01T15:00:00.000Z');

describe('principalTrasEliminar', () => {
  it('es la activa más antigua de las que quedan, no la primera de la lista ni la primera por nombre', () => {
    expect(principalTrasEliminar([PRINCIPAL, NORTE, SUR], 'p')?.nombre).toBe('Sur');
  });

  it('si dos se crearon en el mismo instante desempata el id, como el servidor', () => {
    const b = sede('b', 'Ángeles', '2026-02-01T15:00:00.000Z');
    const a = sede('a', 'Zona', '2026-02-01T15:00:00.000Z');
    expect(principalTrasEliminar([PRINCIPAL, b, a], 'p')?.id).toBe('a');
  });

  it('sin otra sede no queda principal', () => {
    expect(principalTrasEliminar([PRINCIPAL], 'p')).toBeNull();
  });
});

// Revisión del 12 de septiembre de 2026. El aviso decía «Las marcaciones que ya se
// hicieron en esta sede conservan su registro histórico», y eso solo vale para las que
// probó la ubicación. Las marcaciones sin ubicación se cuentan al leer en la sede por
// defecto de HOY: al eliminar una sede, las de quienes la tenían pasan a contarse en
// otra, también en los reportes de fechas pasadas. La regla, en
// backend/src/utils/sedePrincipal.ts.
describe('avisoAlEliminarSede', () => {
  it('al eliminar otra sede dice qué sigue contando ahí y qué pasa a contarse en otra, nombrando la principal', () => {
    expect(avisoAlEliminarSede([PRINCIPAL, NORTE, SUR], NORTE)).toBe(
      'Las marcaciones hechas con ubicación en Norte siguen contando en Norte. '
      + 'Las marcaciones sin ubicación de quienes trabajan presencial y tenían Norte pasan a contarse en otra de sus sedes, '
      + 'o en Sede principal si no les queda ninguna, también en fechas pasadas. '
      + 'No cambian las de un día en que esa persona también marcó con ubicación.');
  });

  it('la sede donde pasan a contarse es la principal, la activa más antigua, y no la primera de la lista', () => {
    expect(avisoAlEliminarSede([NORTE, SUR, PRINCIPAL], SUR)).toContain('o en Sede principal si no les queda ninguna');
  });

  it('al eliminar la principal nombra la que quedará como principal, y ahí pasa a contarse también quien no tiene ninguna sede', () => {
    expect(avisoAlEliminarSede([PRINCIPAL, NORTE, SUR], PRINCIPAL)).toBe(
      'Es la sede principal: al eliminarla, la principal pasa a ser Sur. '
      + 'Las marcaciones hechas con ubicación en Sede principal siguen contando en Sede principal. '
      + 'Las marcaciones sin ubicación de quienes trabajan presencial y tenían Sede principal, o no tienen ninguna sede, '
      + 'pasan a contarse en otra de sus sedes, o en Sur si no les queda ninguna, también en fechas pasadas. '
      + 'No cambian las de un día en que esa persona también marcó con ubicación.');
  });

  it('si no quedara ninguna otra, no inventa una principal: dice que no se puede eliminar (la pantalla tampoco lo ofrece)', () => {
    expect(avisoAlEliminarSede([PRINCIPAL], PRINCIPAL)).toBe(
      'Es la única sede de la empresa: quien trabaja presencial siempre necesita una, así que no se puede eliminar.');
  });
});
