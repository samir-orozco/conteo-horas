import { describe, it, expect } from 'vitest';
import { lugaresDeTrabajo, apareceConFiltro, resumirPorSede, nombrarLugares } from './sedesDeReporte';

// El orden alfabético de los ids NO coincide con el de los nombres de SEDES: así
// una prueba que exige orden por nombre no puede pasar ordenando por id.
const A = 'sede-a';
const B = 'sede-b';

const turno = (sedeId: string | null, sedeSalidaId: string | null = sedeId) => ({ sedeId, sedeSalidaId });

describe('lugaresDeTrabajo', () => {
  it('quien trabajó todo el período en una sede tiene un solo lugar', () => {
    expect(lugaresDeTrabajo([turno(A), turno(A), turno(A)])).toEqual([A]);
  });

  it('la semana repartida entre dos sedes, en días distintos, son dos lugares', () => {
    // El caso reproducido contra la ruta: lunes a miércoles en A, jueves a sábado en B.
    expect(lugaresDeTrabajo([turno(A), turno(A), turno(A), turno(B), turno(B), turno(B)])).toEqual([A, B]);
  });

  it('el orden de los lugares no depende del orden de los turnos', () => {
    expect(lugaresDeTrabajo([turno(B), turno(A)])).toEqual([A, B]);
  });

  it('abrir en una sede y cerrar en otra también son dos lugares', () => {
    expect(lugaresDeTrabajo([turno(A, B)])).toEqual([A, B]);
  });

  it('una salida sin sede no suma lugar: es «no se sabe», no «cerró en otra parte»', () => {
    expect(lugaresDeTrabajo([turno(A, null)])).toEqual([A]);
  });

  it('un turno sin sede es un lugar propio, y va al final', () => {
    expect(lugaresDeTrabajo([turno(null), turno(A)])).toEqual([A, null]);
  });

  it('abrir sin sede y cerrar en una son dos lugares', () => {
    expect(lugaresDeTrabajo([turno(null, B)])).toEqual([B, null]);
  });

  it('sin turnos no hay lugares', () => {
    expect(lugaresDeTrabajo([])).toEqual([]);
  });
});

describe('apareceConFiltro', () => {
  it('sin filtro aparece todo el mundo, también quien no marcó en el período', () => {
    expect(apareceConFiltro([], undefined)).toBe(true);
    expect(apareceConFiltro([A, B], undefined)).toBe(true);
  });

  it('un filtro vacío es lo mismo que no filtrar', () => {
    expect(apareceConFiltro([], '')).toBe(true);
  });

  it('con filtro aparece quien trabajó en esa sede, aunque también haya trabajado en otra', () => {
    expect(apareceConFiltro([A], A)).toBe(true);
    expect(apareceConFiltro([A, B], A)).toBe(true);
    expect(apareceConFiltro([A, B], B)).toBe(true);
  });

  it('con filtro no aparece quien no trabajó en esa sede', () => {
    expect(apareceConFiltro([B], A)).toBe(false);
    expect(apareceConFiltro([], A)).toBe(false);
    expect(apareceConFiltro([null], A)).toBe(false);
  });

  it('una sede que no es de nadie de la empresa no devuelve a nadie', () => {
    expect(apareceConFiltro([A, B, null], 'sede-de-otra-empresa')).toBe(false);
  });
});

describe('nombrarLugares', () => {
  const SEDES = [
    { id: A, nombre: 'Laureles' },
    { id: B, nombre: 'El Poblado' },
  ];

  it('nombra cada sede, en orden de nombre', () => {
    expect(nombrarLugares([A, B], SEDES)).toEqual([{ id: B, nombre: 'El Poblado' }, { id: A, nombre: 'Laureles' }]);
  });

  it('lo que no tiene sede va sin nombre y al final', () => {
    expect(nombrarLugares([A, null], SEDES)).toEqual([{ id: A, nombre: 'Laureles' }, { id: null, nombre: null }]);
  });

  it('una sede que no está en la lista queda sin nombre, pero no se pierde', () => {
    expect(nombrarLugares(['sede-perdida', null, A], SEDES)).toEqual([
      { id: A, nombre: 'Laureles' },
      { id: 'sede-perdida', nombre: null },
      { id: null, nombre: null },
    ]);
  });
});

function linea<L extends { id: string | null }>(r: { porSede: L[] }, id: string | null): L | undefined {
  return r.porSede.find(l => l.id === id);
}

describe('resumirPorSede', () => {
  const SEDES = [
    { id: A, nombre: 'Laureles', activa: true },
    { id: B, nombre: 'El Poblado', activa: true },
  ];
  const EXTRAS = ['totalRecargos', 'totalExtra', 'totalAdicional'] as const;
  const fila = (lugares: (string | null)[], totalExtra: number, totalRecargos = 0) =>
    ({ lugares, totalRecargos, totalExtra, totalAdicional: totalExtra + totalRecargos });

  // El ejemplo que se acordó con el dueño el 10 de septiembre de 2026.
  const FILAS = [
    fila([A], 75_000), // Fija: todo el período en Laureles
    fila([B], 40_000), // Luis: solo en El Poblado
    fila([A, B], 75_000), // RotaSemana: la semana repartida entre las dos
    fila([A, B], 0, 12_500), // RotaDia: sin extras, con recargos
    fila([], 0), // activo, pero no marcó en el período
  ];

  it('cada sede suma solo a quien trabajó únicamente en ella', () => {
    const r = resumirPorSede(FILAS, EXTRAS, SEDES);
    expect(linea(r, A)).toEqual({ id: A, nombre: 'Laureles', totalRecargos: 0, totalExtra: 75_000, totalAdicional: 75_000 });
    expect(linea(r, B)).toEqual({ id: B, nombre: 'El Poblado', totalRecargos: 0, totalExtra: 40_000, totalAdicional: 40_000 });
  });

  it('los mixtos van en su propia línea y no se repiten en ninguna sede', () => {
    const r = resumirPorSede(FILAS, EXTRAS, SEDES);
    expect(r.mixtos).toEqual({ totalRecargos: 12_500, totalExtra: 75_000, totalAdicional: 87_500 });
  });

  it('«Todas» es el total de la empresa, y es exactamente las sedes más los mixtos', () => {
    const r = resumirPorSede(FILAS, EXTRAS, SEDES);
    expect(r.todas).toEqual({ totalRecargos: 12_500, totalExtra: 190_000, totalAdicional: 202_500 });
    for (const k of EXTRAS) {
      expect(r.porSede.reduce((s, l) => s + l[k], 0) + r.mixtos[k]).toBe(r.todas[k]);
    }
  });

  it('las sedes van por nombre, no por id', () => {
    const r = resumirPorSede(FILAS, EXTRAS, SEDES);
    expect(r.porSede.map(l => l.nombre)).toEqual(['El Poblado', 'Laureles']);
  });

  it('una sede activa sin nadie sale en cero, y una desactivada sin nadie no sale', () => {
    const sedes = [...SEDES, { id: 'sede-c', nombre: 'Centro', activa: true }, { id: 'sede-d', nombre: 'Belén', activa: false }];
    const r = resumirPorSede(FILAS, EXTRAS, sedes);
    expect(linea(r, 'sede-c')).toEqual({ id: 'sede-c', nombre: 'Centro', totalRecargos: 0, totalExtra: 0, totalAdicional: 0 });
    expect(linea(r, 'sede-d')).toBeUndefined();
  });

  it('una sede desactivada con gente sí sale: desactivarla no borra lo que se trabajó ahí', () => {
    const sedes = [...SEDES, { id: 'sede-d', nombre: 'Belén', activa: false }];
    const r = resumirPorSede([...FILAS, fila(['sede-d'], 30_000)], EXTRAS, sedes);
    expect(linea(r, 'sede-d')?.totalExtra).toBe(30_000);
  });

  it('quien trabajó solo sin sede tiene su propia línea, al final', () => {
    const r = resumirPorSede([...FILAS, fila([null], 20_000)], EXTRAS, SEDES);
    expect(r.porSede[r.porSede.length - 1]).toEqual({ id: null, nombre: null, totalRecargos: 0, totalExtra: 20_000, totalAdicional: 20_000 });
  });

  it('si nadie trabajó solo sin sede, no hay línea de sin sede', () => {
    expect(linea(resumirPorSede(FILAS, EXTRAS, SEDES), null)).toBeUndefined();
  });

  it('una sede que no está en la lista igual suma, sin nombre, para que el total cuadre', () => {
    const r = resumirPorSede([...FILAS, fila(['sede-perdida'], 10_000)], EXTRAS, SEDES);
    expect(linea(r, 'sede-perdida')).toEqual({ id: 'sede-perdida', nombre: null, totalRecargos: 0, totalExtra: 10_000, totalAdicional: 10_000 });
    expect(r.todas.totalExtra).toBe(200_000);
  });

  it('sirve igual para llegadas tarde', () => {
    const TARDE = ['diasTarde', 'totalMinutos', 'montoTardanzas'] as const;
    const t = (lugares: (string | null)[], diasTarde: number, totalMinutos: number, montoTardanzas: number) =>
      ({ lugares, diasTarde, totalMinutos, montoTardanzas });
    const r = resumirPorSede([t([A], 1, 22, 3_666.67), t([A, B], 0, 0, 0), t([B], 2, 40, 6_666.67)], TARDE, SEDES);
    expect(linea(r, A)).toEqual({ id: A, nombre: 'Laureles', diasTarde: 1, totalMinutos: 22, montoTardanzas: 3_666.67 });
    expect(r.todas).toEqual({ diasTarde: 3, totalMinutos: 62, montoTardanzas: 10_333.34 });
  });

  it('las sumas quedan en centavos, sin colas de coma flotante', () => {
    const r = resumirPorSede([fila([A], 0.1), fila([A], 0.2)], EXTRAS, SEDES);
    expect(linea(r, A)?.totalExtra).toBe(0.3);
    expect(r.todas.totalExtra).toBe(0.3);
  });
});
