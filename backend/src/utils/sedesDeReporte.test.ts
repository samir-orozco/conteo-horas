import { describe, it, expect } from 'vitest';
import { lugaresDeTrabajo, apareceConFiltro, resumirPorSede, nombrarLugares, lugaresConAtribucion } from './sedesDeReporte';

// El orden alfabético de los ids NO coincide con el de los nombres de SEDES: así
// una prueba que exige orden por nombre no puede pasar ordenando por id.
const A = 'sede-a';
const B = 'sede-b';

// Una marcación del período, con su hora de entrada: para los lugares da igual
// cuál, lo que cuenta es que la tenga.
const ENTRADA = new Date(Date.UTC(2026, 8, 7, 13, 0, 0));
const turno = (sedeId: string | null, sedeSalidaId: string | null = sedeId) => ({ entrada: ENTRADA as Date | null, sedeId, sedeSalidaId });
// Una fila del período SIN hora de entrada: un permiso cargado sin horas, o una
// marcación a la que le borraron la entrada.
const sinEntrada = (sedeId: string | null = null, sedeSalidaId: string | null = null) => ({ entrada: null, sedeId, sedeSalidaId });

// Revisión del 11 de septiembre de 2026. Una fila sin hora de entrada no guarda
// sede, y sumaba «Sin sede»: un presencial con todas sus marcas en Bodega y un
// permiso cargado sin horas salía «Mixto · Bodega · Sin sede» en llegadas tarde.
// Antes del cambio de sedes no se notaba, porque todas sus filas iban sin sede.
describe('lugaresDeTrabajo · una fila sin hora de entrada no es un lugar de trabajo', () => {
  const BODEGA = 'sede-bodega';

  it('un presencial con todas sus marcas en Bodega y un permiso sin horas trabajó solo en Bodega', () => {
    expect(lugaresDeTrabajo([turno(BODEGA), sinEntrada(), turno(BODEGA)])).toEqual([BODEGA]);
  });

  it('y en el resumen suma a Bodega, no a los mixtos', () => {
    const TARDE = ['diasTarde', 'totalMinutos', 'montoTardanzas'] as const;
    const r = resumirPorSede(
      [{ lugares: lugaresDeTrabajo([turno(BODEGA), sinEntrada()]), diasTarde: 2, totalMinutos: 30, montoTardanzas: 5_000 }],
      TARDE,
      [{ id: BODEGA, nombre: 'Bodega', activa: true }],
    );
    expect(r.mixtos).toEqual({ diasTarde: 0, totalMinutos: 0, montoTardanzas: 0 });
    expect(r.porSede).toEqual([{ id: BODEGA, nombre: 'Bodega', diasTarde: 2, totalMinutos: 30, montoTardanzas: 5_000 }]);
  });

  it('tampoco suma la sede de salida de una fila sin entrada', () => {
    expect(lugaresDeTrabajo([turno(A), sinEntrada(null, B)])).toEqual([A]);
  });

  it('ni la sede que conserva una fila sin entrada: una marca del kiosco en Sur a la que le borraron la hora, entre marcas en Norte', () => {
    const NORTE = 'sede-norte';
    const SUR = 'sede-sur';
    expect(lugaresDeTrabajo([turno(NORTE), sinEntrada(SUR), turno(NORTE)])).toEqual([NORTE]);
  });

  it('quien no tiene NINGUNA fila con entrada en el período no desaparece: se usan todas, como hasta hoy', () => {
    expect(lugaresDeTrabajo([sinEntrada(), sinEntrada()])).toEqual([null]);
    expect(lugaresDeTrabajo([sinEntrada(A)])).toEqual([A]);
  });
});

// Decisión del dueño del 12 de septiembre de 2026, «mostrarla al leer»: a un
// presencial se le atribuye AL LEER la sede que ninguna marca probó. La regla, con
// todos sus casos, vive en utils/sedePrincipal.ts. Aquí se prueba lo que eso le
// hace a los reportes: dónde trabajó, si es mixto, qué lugar va «por defecto» y en
// qué línea del resumen cuenta.
describe('lugaresConAtribucion · la sede de un presencial se muestra y se cuenta al leer', () => {
  const PRINCIPAL = 'sede-principal';
  const NORTE = 'sede-norte';
  const SUR = 'sede-sur';
  // `fecha` a medianoche de Bogotá, y la hora de entrada en hora de Bogotá.
  const marca = (d: number, h: number | null, sedeId: string | null = null, sedeSalidaId: string | null = null) => ({
    fecha: new Date(Date.UTC(2026, 8, d, 5)),
    entrada: h === null ? null : new Date(Date.UTC(2026, 8, d, h + 5)),
    sedeId,
    sedeSalidaId,
  });
  const PRESENCIAL = { modalidad: 'PRESENCIAL', sedePorDefecto: PRINCIPAL };
  const HIBRIDO = { modalidad: 'HIBRIDO', sedePorDefecto: PRINCIPAL };

  it('un presencial sin ninguna sede probada trabajó en su sede por defecto, y ese lugar va por defecto', () => {
    expect(lugaresConAtribucion([marca(7, 8), marca(8, 8)], PRESENCIAL)).toEqual({ lugares: [PRINCIPAL], porDefecto: [PRINCIPAL] });
  });

  it('un híbrido sin sede sigue «Sin sede», que para él sí es un dato', () => {
    expect(lugaresConAtribucion([marca(7, 8), marca(8, 8)], HIBRIDO)).toEqual({ lugares: [null], porDefecto: [] });
  });

  it('la mañana probada en Sur y la tarde cargada a mano: solo Sur, no es mixto, y Sur no va por defecto', () => {
    expect(lugaresConAtribucion([marca(7, 8, SUR, SUR), marca(7, 13)], PRESENCIAL)).toEqual({ lugares: [SUR], porDefecto: [] });
  });

  it('la entrada sin sede con la salida probada en Norte: solo Norte, y no va por defecto, porque la salida lo probó', () => {
    expect(lugaresConAtribucion([marca(7, 8, null, NORTE)], PRESENCIAL)).toEqual({ lugares: [NORTE], porDefecto: [] });
  });

  it('probado en Norte un día y sin ninguna pista otro: es mixto, y solo la principal va por defecto', () => {
    expect(lugaresConAtribucion([marca(7, 8, NORTE, NORTE), marca(8, 8)], PRESENCIAL))
      .toEqual({ lugares: [NORTE, PRINCIPAL], porDefecto: [PRINCIPAL] });
  });

  it('una sede probada un día y atribuida otro no va por defecto', () => {
    expect(lugaresConAtribucion([marca(7, 8, NORTE), marca(8, 8)], { ...PRESENCIAL, sedePorDefecto: NORTE }))
      .toEqual({ lugares: [NORTE], porDefecto: [] });
  });

  it('las filas sin hora de entrada siguen sin aportar lugar ni pista', () => {
    expect(lugaresConAtribucion([marca(7, null, SUR), marca(7, 13)], PRESENCIAL)).toEqual({ lugares: [PRINCIPAL], porDefecto: [PRINCIPAL] });
  });

  it('si la empresa no tiene sedes activas, el presencial sin sede probada queda sin sede', () => {
    expect(lugaresConAtribucion([marca(7, 8)], { ...PRESENCIAL, sedePorDefecto: null })).toEqual({ lugares: [null], porDefecto: [] });
  });

  it('en el resumen cuenta en la línea de su sede, no en una aparte ni en los mixtos', () => {
    const EXTRAS = ['totalRecargos', 'totalExtra', 'totalAdicional'] as const;
    const r = resumirPorSede(
      [{ lugares: lugaresConAtribucion([marca(7, 8)], PRESENCIAL).lugares, totalRecargos: 0, totalExtra: 30_000, totalAdicional: 30_000 }],
      EXTRAS,
      [{ id: PRINCIPAL, nombre: 'Sede principal', activa: true }],
    );
    expect(r.porSede).toEqual([{ id: PRINCIPAL, nombre: 'Sede principal', totalRecargos: 0, totalExtra: 30_000, totalAdicional: 30_000 }]);
    expect(r.mixtos).toEqual({ totalRecargos: 0, totalExtra: 0, totalAdicional: 0 });
  });

  it('y el filtro por su sede lo incluye', () => {
    expect(apareceConFiltro(lugaresConAtribucion([marca(7, 8)], PRESENCIAL).lugares, PRINCIPAL)).toBe(true);
  });

  // Revisión del 12 de septiembre de 2026. Quien no tiene NINGUNA fila con hora de
  // entrada en el período (por ejemplo, solo un permiso cargado sin horas) no tiene
  // marcación a la cual atribuirle la sede, y salía «Sin sede», con su propia línea
  // «Sin sede» en el resumen, aunque trabajara presencial.
  describe('sin ninguna fila con hora de entrada en el período', () => {
    it('un presencial cuenta en su sede por defecto, y ese lugar va por defecto', () => {
      expect(lugaresConAtribucion([marca(7, null), marca(8, null)], { ...PRESENCIAL, sedePorDefecto: NORTE }))
        .toEqual({ lugares: [NORTE], porDefecto: [NORTE] });
    });

    it('aunque una de esas filas conserve una sede: sin hora de entrada no es una marcación', () => {
      expect(lugaresConAtribucion([marca(7, null, SUR, SUR)], PRESENCIAL)).toEqual({ lugares: [PRINCIPAL], porDefecto: [PRINCIPAL] });
    });

    it.each(['HIBRIDO', 'REMOTO'])('un %s sigue en «Sin sede»', modalidad => {
      expect(lugaresConAtribucion([marca(7, null)], { modalidad, sedePorDefecto: PRINCIPAL })).toEqual({ lugares: [null], porDefecto: [] });
    });

    it('si la empresa no tiene sedes activas, el presencial queda «Sin sede»', () => {
      expect(lugaresConAtribucion([marca(7, null)], { ...PRESENCIAL, sedePorDefecto: null })).toEqual({ lugares: [null], porDefecto: [] });
    });

    it('en el resumen cuenta en la línea de su sede, y no aparece la línea «Sin sede»', () => {
      const TARDE = ['diasTarde', 'totalMinutos', 'montoTardanzas'] as const;
      const r = resumirPorSede(
        [{ lugares: lugaresConAtribucion([marca(7, null)], PRESENCIAL).lugares, diasTarde: 0, totalMinutos: 0, montoTardanzas: 0 }],
        TARDE,
        [{ id: PRINCIPAL, nombre: 'Sede principal', activa: true }],
      );
      expect(r.porSede.map(l => l.id)).toEqual([PRINCIPAL]);
    });

    it('con una sola fila con entrada manda la regla de siempre, aunque las demás no tengan hora', () => {
      expect(lugaresConAtribucion([marca(7, null), marca(8, 8, NORTE, NORTE)], PRESENCIAL)).toEqual({ lugares: [NORTE], porDefecto: [] });
    });

    it('quien no tiene ninguna fila en el período no marcó: sigue sin lugares, y un filtro por sede no lo trae', () => {
      expect(lugaresConAtribucion([], PRESENCIAL)).toEqual({ lugares: [], porDefecto: [] });
    });
  });
});

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
    expect(nombrarLugares([A, B], SEDES, [])).toEqual([
      { id: B, nombre: 'El Poblado', porDefecto: false },
      { id: A, nombre: 'Laureles', porDefecto: false },
    ]);
  });

  it('lo que no tiene sede va sin nombre y al final', () => {
    expect(nombrarLugares([A, null], SEDES, [])).toEqual([
      { id: A, nombre: 'Laureles', porDefecto: false },
      { id: null, nombre: null, porDefecto: false },
    ]);
  });

  it('una sede que no está en la lista queda sin nombre, pero no se pierde', () => {
    expect(nombrarLugares(['sede-perdida', null, A], SEDES, [])).toEqual([
      { id: A, nombre: 'Laureles', porDefecto: false },
      { id: 'sede-perdida', nombre: null, porDefecto: false },
      { id: null, nombre: null, porDefecto: false },
    ]);
  });

  // Para que la pantalla escriba «por defecto» (decisión del dueño, 12 de septiembre de 2026).
  it('marca por defecto el lugar que solo existe por atribución, y a ningún otro', () => {
    expect(nombrarLugares([A, B, null], SEDES, [A])).toEqual([
      { id: B, nombre: 'El Poblado', porDefecto: false },
      { id: A, nombre: 'Laureles', porDefecto: true },
      { id: null, nombre: null, porDefecto: false },
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
