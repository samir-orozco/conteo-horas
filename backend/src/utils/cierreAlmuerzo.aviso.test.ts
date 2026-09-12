import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// EL AVISO DIARIO DE LAS PAUSAS SIN REGRESO, corrido de verdad (12 de septiembre de 2026).
//
// Es plomería: habla con la base. Aquí corre contra un Prisma de mentira que responde
// filas filtradas por el `where` que se le pide, con la misma idea que el de
// routes/worker.pausas.test.ts: buscar el regreso donde no es se ve como un aviso de más
// o de menos, no como un mock que dice amén a todo. Lo que esto NO prueba es que las
// consultas usen el índice: eso lo mira la costura, prisma/verificar-aviso-pausas.ts.
//
// Las horas van en UTC explícito (CLAUDE.md §8.1).

const { bd } = vi.hoisted(() => {
  type Fila = Record<string, unknown>;
  const tablas: Record<'colaborador' | 'registro' | 'notificacion' | 'diaEsperado', Fila[]> = { colaborador: [], registro: [], notificacion: [], diaEsperado: [] };
  const comparable = (v: unknown) => (v instanceof Date ? v.getTime() : v);

  function cumple(fila: Fila, where: Fila = {}): boolean {
    return Object.entries(where).every(([campo, cond]) => {
      if (campo === 'OR') return (cond as Fila[]).some(w => cumple(fila, w));
      const v = fila[campo];
      if (cond === null || cond instanceof Date || typeof cond !== 'object') return comparable(v) === comparable(cond);
      return Object.entries(cond as Fila).every(([op, x]) => {
        if (op === 'in') return (x as unknown[]).includes(v);
        if (op === 'not') return x === null ? v !== null && v !== undefined : comparable(v) !== comparable(x);
        if (v === null || v === undefined) return false;
        const a = comparable(v) as number;
        const b = comparable(x) as number;
        switch (op) {
          case 'gte': return a >= b;
          case 'gt': return a > b;
          case 'lte': return a <= b;
          case 'lt': return a < b;
          default: throw new Error(`el Prisma de mentira no sabe responder "${op}"`);
        }
      });
    });
  }

  const bd = {
    tablas,
    limpiar() { tablas.colaborador = []; tablas.registro = []; tablas.notificacion = []; tablas.diaEsperado = []; },
    prisma: {
      colaborador: { findMany: async () => tablas.colaborador.map(c => ({ id: c.id })) },
      registro: {
        // La relación `colaborador` que pide el aviso, como la arma Prisma.
        findMany: async ({ where }: { where: Fila }) => tablas.registro
          .filter(f => cumple(f, where))
          .map(f => ({ ...f, colaborador: tablas.colaborador.find(c => c.id === f.colaboradorId) })),
        findFirst: async ({ where }: { where: Fila }) => tablas.registro.find(f => cumple(f, where)) ?? null,
      },
      notificacion: {
        findFirst: async ({ where }: { where: Fila }) => tablas.notificacion.find(f => cumple(f, where)) ?? null,
        create: async ({ data }: { data: Fila }) => { tablas.notificacion.push(data); return data; },
      },
      diaEsperado: {
        findFirst: async ({ where }: { where: Fila }) => tablas.diaEsperado.find(f => cumple(f, where)) ?? null,
      },
    },
  };
  return { bd };
});
vi.mock('../prisma', () => ({ prisma: bd.prisma }));

import { avisarPausasSinRegreso } from './cierreAlmuerzo';

type Fila = Record<string, unknown>;

// Septiembre de 2026 en hora de Bogotá. El aviso corre el jueves 10 a las 09:00 y mira
// la semana anterior, sin tocar el día de hoy.
const bog = (dia: number, h: number, m = 0) => new Date(Date.UTC(2026, 8, dia, h + 5, m, 0));

let secuencia = 0;
const persona = (id: string, nombre: string) => bd.tablas.colaborador.push({ id, nombre, apellido: 'Prueba', empresaId: 'emp-1' });
function marcacion(colaboradorId: string, dia: number, entrada: Date, salida: Date | null, extra: Fila = {}) {
  const fila = {
    id: `reg-${++secuencia}`, colaboradorId, fecha: bog(dia, 0), entrada, salida,
    salidaAlmuerzo: false, salidaDescanso: false, descansoVentana: null, ...extra,
  };
  bd.tablas.registro.push(fila);
  return fila;
}

// La franja congelada de ese día: el aviso la lee para saber hasta cuándo un descanso
// sigue esperando su regreso.
const franjaDelDia = (colaboradorId: string, dia: number, horaEntrada: string, horaSalida: string) =>
  bd.tablas.diaEsperado.push({ colaboradorId, fecha: bog(dia, 0), horaEntrada, horaSalida });

async function avisar() {
  const lineas: string[] = [];
  const avisados = await avisarPausasSinRegreso({
    info: m => { lineas.push(m); },
    error: (_err, m) => { lineas.push(`ERROR ${m}`); },
  });
  return { avisados, lineas, titulos: bd.tablas.notificacion.map(n => n.titulo) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(bog(10, 9));
  bd.limpiar();
  secuencia = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('avisarPausasSinRegreso: a quién le avisa', () => {
  it('el nocturno que vuelve de su descanso después de medianoche no recibe aviso', async () => {
    // Entró el lunes 7 a las 22:00, salió a su descanso a las 02:00 del martes y volvió a
    // las 02:15. El regreso hereda la fecha de su salida, la del lunes, pero entra
    // después del fin del lunes: buscarlo antes de esa medianoche no lo encontraba.
    persona('noche', 'Nocturno');
    marcacion('noche', 7, bog(7, 22), bog(8, 2), { salidaDescanso: true, descansoVentana: '02:00-02:15' });
    marcacion('noche', 7, bog(8, 2, 15), bog(8, 6));
    const r = await avisar();
    expect([r.avisados, r.titulos]).toEqual([0, []]);
  });

  it('el de día que volvió de su descanso no recibe aviso, y el que no volvió sí, aunque al día siguiente haya marcado su jornada', async () => {
    persona('volvio', 'Ana');
    persona('no-volvio', 'Beto');
    marcacion('volvio', 7, bog(7, 7), bog(7, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    marcacion('volvio', 7, bog(7, 15, 10), bog(7, 16));
    const salida = marcacion('no-volvio', 7, bog(7, 7), bog(7, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    // La entrada del martes no es el regreso del lunes.
    marcacion('no-volvio', 8, bog(8, 7), bog(8, 16));
    const r = await avisar();
    expect([r.avisados, r.titulos]).toEqual([1, ['Beto Prueba no marcó su regreso del descanso']]);
    expect(bd.tablas.notificacion[0]).toMatchObject({ empresaId: 'emp-1', tipo: 'NO_MARCO_SALIDA', entidad: 'registro', entidadId: salida.id });
    expect(bd.tablas.notificacion[0].cuerpo).toContain('Salió a su descanso de 15:00 a 15:10 a las 15:00 del 7 de');
  });

  it('el almuerzo sin regreso se avisa con sus palabras', async () => {
    persona('almuerzo', 'Carla');
    marcacion('almuerzo', 8, bog(8, 7), bog(8, 12, 5), { salidaAlmuerzo: true });
    const r = await avisar();
    expect(r.titulos).toEqual(['Carla Prueba no marcó su regreso del almuerzo']);
    expect(bd.tablas.notificacion[0].cuerpo).toContain('Salió a almorzar a las 12:05 del 8 de');
  });

  it('la pausa de hoy todavía no se avisa: la persona aún puede arreglarla en el kiosco', async () => {
    persona('hoy', 'Dora');
    marcacion('hoy', 10, bog(10, 7), bog(10, 8), { salidaDescanso: true, descansoVentana: '08:00-08:15' });
    expect((await avisar()).avisados).toBe(0);
  });

  it('el almuerzo cuyo regreso se marcó a la mañana siguiente se avisa, como en producción', async () => {
    // Salió a almorzar el lunes a las 14:00 y volvió a marcar el martes a las 07:00, dentro
    // de las 18 horas: el kiosco lo tomó como su regreso y la fila heredó la fecha del
    // lunes. La tarde del lunes no se contó, y eso es justo lo que el aviso tiene que decir.
    persona('almuerzo', 'Eva');
    marcacion('almuerzo', 7, bog(7, 7), bog(7, 14), { salidaAlmuerzo: true });
    marcacion('almuerzo', 7, bog(8, 7), bog(8, 16));
    expect((await avisar()).titulos).toEqual(['Eva Prueba no marcó su regreso del almuerzo']);
  });

  it('el descanso sin regreso se avisa aunque ese mismo día haya vuelto a entrar después de su turno', async () => {
    // Turno de 07:00 a 16:00. Salió al descanso de las 15:00 y no volvió; a las 19:00 entró a
    // otro turno. Pasado el fin de su turno más la gracia el kiosco ya no la tomó como su
    // regreso, así que esa tarde no se le contó.
    persona('turno', 'Fabio');
    franjaDelDia('turno', 7, '07:00', '16:00');
    marcacion('turno', 7, bog(7, 7), bog(7, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    marcacion('turno', 7, bog(7, 19), bog(7, 22));
    expect((await avisar()).titulos).toEqual(['Fabio Prueba no marcó su regreso del descanso']);
  });

  it('el nocturno que todavía está en su descanso no recibe aviso hasta que se le acabe el turno', async () => {
    // Entró el miércoles 9 a las 22:00 y salió a su descanso a las 02:30 del jueves. A las
    // 03:00 la fila ya es de ayer, pero el kiosco todavía tomaría su entrada como el regreso.
    vi.setSystemTime(bog(10, 3));
    persona('noche', 'Gilma');
    franjaDelDia('noche', 9, '22:00', '06:00');
    marcacion('noche', 9, bog(9, 22), bog(10, 2, 30), { salidaDescanso: true, descansoVentana: '02:30-02:45' });
    expect((await avisar()).avisados).toBe(0);
    // Pasado el fin de su turno más la gracia, sí.
    vi.setSystemTime(bog(10, 7, 1));
    expect((await avisar()).titulos).toEqual(['Gilma Prueba no marcó su regreso del descanso']);
  });
});

describe('avisarPausasSinRegreso: la huella de cada pasada (CLAUDE.md §8.3)', () => {
  it('no avisa dos veces la misma pausa, y cada pasada deja su línea, también la que no avisó nada', async () => {
    persona('no-volvio', 'Beto');
    marcacion('no-volvio', 7, bog(7, 7), bog(7, 15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    const primera = await avisar();
    const segunda = await avisar();
    expect([primera.avisados, segunda.avisados, bd.tablas.notificacion.length]).toEqual([1, 0, 1]);
    expect([...primera.lineas, ...segunda.lineas]).toEqual([
      'Pausas sin regreso: 1 salidas revisadas, 1 avisadas',
      'Pausas sin regreso: 1 salidas revisadas, 0 avisadas',
    ]);
  });

  it('una semana sin pausas también deja su línea', async () => {
    const r = await avisar();
    expect([r.avisados, r.lineas]).toEqual([0, ['Pausas sin regreso: 0 salidas revisadas, 0 avisadas']]);
  });

  it('si la base falla, lo dice con otra línea y devuelve 0', async () => {
    vi.spyOn(bd.prisma.colaborador, 'findMany').mockRejectedValueOnce(new Error('la base no responde'));
    const r = await avisar();
    expect([r.avisados, r.lineas]).toEqual([0, ['ERROR Error avisando pausas sin regreso']]);
  });
});
