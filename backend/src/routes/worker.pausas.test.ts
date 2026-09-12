import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

// EL KIOSCO CON VARIOS DESCANSOS (12 de septiembre de 2026).
//
// Lo más delicado del producto: dejar a alguien sin poder marcar es un incidente. Por
// eso estas pruebas montan las rutas de verdad con un Prisma de mentira que SÍ
// responde filas, filtradas por el `where` que la ruta le pide: así una consulta
// equivocada (contar por 18 horas en vez de por el día) se ve como una respuesta
// distinta, no como un mock que dice amén a todo.
//
// La persona es REMOTA para que la ubicación no estorbe, y el horario tiene una
// tolerancia de un día para que la llegada tarde y la salida temprana no se
// atraviesen: aquí se miden las pausas. Las horas se dan en UTC explícito
// (CLAUDE.md §8.1).

const { bd } = vi.hoisted(() => {
  type Fila = Record<string, unknown>;
  const tablas: Record<string, Fila[]> = {};
  let secuencia = 0;
  const comparable = (v: unknown) => (v instanceof Date ? v.getTime() : v);

  function cumple(fila: Fila, where: Record<string, unknown> | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([campo, cond]) => {
      if (campo === 'OR') return (cond as Record<string, unknown>[]).some(w => cumple(fila, w));
      if (campo === 'AND') return (cond as Record<string, unknown>[]).every(w => cumple(fila, w));
      const v = fila[campo];
      if (cond === null) return v === null || v === undefined;
      if (cond instanceof Date || typeof cond !== 'object') return comparable(v) === comparable(cond);
      return Object.entries(cond as Record<string, unknown>).every(([op, x]) => {
        const a = comparable(v) as number;
        const b = comparable(x) as number;
        const hay = v !== null && v !== undefined;
        switch (op) {
          case 'gte': return hay && a >= b;
          case 'gt': return hay && a > b;
          case 'lte': return hay && a <= b;
          case 'lt': return hay && a < b;
          case 'not': return x === null ? hay : a !== b;
          case 'in': return (x as unknown[]).map(comparable).includes(a);
          default: throw new Error(`el Prisma de mentira no sabe responder "${op}"`);
        }
      });
    });
  }

  function ordenar(filas: Fila[], orderBy: Record<string, 'asc' | 'desc'> | undefined): Fila[] {
    if (!orderBy) return filas;
    const [[campo, dir]] = Object.entries(orderBy);
    return [...filas].sort((x, y) => {
      const a = comparable(x[campo]) as number;
      const b = comparable(y[campo]) as number;
      return dir === 'asc' ? a - b : b - a;
    });
  }

  const POR_DEFECTO: Record<string, Fila> = {
    registro: {
      salida: null, salidaAlmuerzo: false, salidaDescanso: false, descansoVentana: null,
      entradaEstimada: false, salidaEstimada: false, sedeId: null, sedeSalidaId: null, fotoEntrada: null, fotoSalida: null,
    },
  };

  const modelo = (nombre: string) => ({
    findFirst: async (args: { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }) =>
      ordenar((tablas[nombre] ?? []).filter(f => cumple(f, args?.where)), args?.orderBy)[0] ?? null,
    findUnique: async (args: { where: Record<string, unknown> }) => (tablas[nombre] ?? []).find(f => cumple(f, args.where)) ?? null,
    findMany: async (args: { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }) =>
      ordenar((tablas[nombre] ?? []).filter(f => cumple(f, args?.where)), args?.orderBy),
    count: async (args: { where?: Record<string, unknown> }) => (tablas[nombre] ?? []).filter(f => cumple(f, args?.where)).length,
    update: async (args: { where: Record<string, unknown>; data: Fila }) => {
      const fila = (tablas[nombre] ?? []).find(f => cumple(f, args.where));
      if (!fila) throw new Error(`no existe la fila de ${nombre} que se quiere actualizar`);
      return Object.assign(fila, args.data);
    },
    create: async (args: { data: Fila }) => {
      const fila = { id: `${nombre}-${++secuencia}`, creadoEn: new Date(), ...(POR_DEFECTO[nombre] ?? {}), ...args.data };
      (tablas[nombre] ??= []).push(fila);
      return fila;
    },
    // Materializar el día no es lo que se prueba aquí: `asegurarDiaSinFallar` no lanza.
    upsert: async () => { throw new Error('la prueba no materializa días'); },
  });

  const bd = {
    tablas,
    limpiar() { for (const k of Object.keys(tablas)) delete tablas[k]; secuencia = 0; },
    prisma: new Proxy({}, { get: (_t, nombre) => (typeof nombre !== 'string' || nombre === 'then' ? undefined : modelo(nombre)) }),
  };
  return { bd };
});
vi.mock('../prisma', () => ({ prisma: bd.prisma }));

import workerRoutes from './worker';

// Lunes 7 de septiembre de 2026, en hora de Bogotá.
const bog = (h: number, m = 0, dia = 7) => new Date(Date.UTC(2026, 8, dia, h + 5, m, 0));
const DIA = bog(0);
const DOS = JSON.stringify([{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }]);
const TODOS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// `toleranciaMin` en 0 deja ver la llegada tarde, la franja se puede mover para el
// nocturno, y `fechas` congela la misma franja en varios días para poder mirar la
// mañana siguiente (12 de septiembre de 2026).
type Siembra = { descansos?: string | null; conDia?: boolean; toleranciaMin?: number; horaEntrada?: string; horaSalida?: string; fechas?: Date[] };
function sembrar({ descansos = DOS, conDia = true, toleranciaMin = 1440, horaEntrada = '07:00', horaSalida = '16:00', fechas = [DIA] }: Siembra = {}) {
  bd.limpiar();
  bd.tablas.colaborador = [{
    id: 'col-1', empresaId: 'emp-1', nombre: 'Carla', apellido: 'Prueba', modalidad: 'REMOTO', puedeCerrarEnOtraSede: false,
    horario: {
      activo: true, toleranciaMin, fotoEnDescanso: true,
      franjas: [{ dias: TODOS, horaEntrada, horaSalida, tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos }],
    },
  }];
  bd.tablas.diaEsperado = conDia ? fechas.map(fecha => ({
    colaboradorId: 'col-1', fecha, programado: true, horaEntrada, horaSalida,
    almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos,
  })) : [];
  bd.tablas.diaFestivo = [];
  bd.tablas.registro = [];
}

let secuencia = 0;
const marcacion = (entrada: Date, salida: Date | null, extra: Record<string, unknown> = {}) => {
  const fila = {
    id: `reg-${++secuencia}`, colaboradorId: 'col-1', fecha: DIA, entrada, salida,
    salidaAlmuerzo: false, salidaDescanso: false, descansoVentana: null, entradaEstimada: false, salidaEstimada: false,
    sedeId: null, sedeSalidaId: null, creadoEn: entrada, ...extra,
  };
  bd.tablas.registro.push(fila);
  return fila;
};

async function montar() {
  const app = Fastify();
  app.decorate('authenticate', async (request: { user?: unknown }) => {
    request.user = { id: 'col-1', rol: 'WORKER', empresaId: 'emp-1', metodo: 'CEDULA' };
  });
  await app.register(workerRoutes, { prefix: '/api/worker' });
  await app.ready();
  return app;
}
const ahora = (d: Date) => vi.setSystemTime(d);
async function estado() {
  const app = await montar();
  const r = await app.inject({ method: 'GET', url: '/api/worker/estado' });
  await app.close();
  return { status: r.statusCode, cuerpo: r.json() };
}
async function marcar(payload: object) {
  const app = await montar();
  const r = await app.inject({ method: 'POST', url: '/api/worker/marcar', payload });
  await app.close();
  return { status: r.statusCode, cuerpo: r.json() };
}
const abierta = () => bd.tablas.registro.filter(f => f.salida === null);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  secuencia = 0;
});
afterEach(() => { vi.useRealTimers(); });

describe('/estado con descansos: nunca se cae', () => {
  it('responde 200 y no ofrece descanso con la lista rota', async () => {
    sembrar({ descansos: '[{"inicio":"09:00",' });
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    const r = await estado();
    expect(r.status).toBe(200);
    expect(r.cuerpo.descanso).toBeNull();
    expect(r.cuerpo.dentroAhora).toBe(true);
  });

  it('responde 200 sin día materializado', async () => {
    sembrar({ conDia: false });
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    const r = await estado();
    expect([r.status, r.cuerpo.descanso, r.cuerpo.almuerzo]).toEqual([200, null, null]);
  });
});

describe('/estado ofrece el descanso que toca por la hora', () => {
  it('a las 09:05 ofrece el de 09:00 con ahora:true', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    expect((await estado()).cuerpo.descanso).toEqual({ inicio: '09:00', fin: '09:15', ahora: true });
  });

  it('tomado el de la mañana, ofrece el de la tarde con ahora:false', async () => {
    sembrar();
    marcacion(bog(7), bog(9), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    marcacion(bog(9, 15), null);
    ahora(bog(10));
    expect((await estado()).cuerpo.descanso).toEqual({ inicio: '15:00', fin: '15:10', ahora: false });
  });

  it('un descanso del turno de ayer, hace 15 horas, no gasta el de hoy', async () => {
    sembrar();
    const AYER = bog(0, 0, 6);
    marcacion(bog(17, 0, 6), bog(18, 5, 6), { fecha: AYER, salidaDescanso: true, descansoVentana: '09:00-09:15' });
    marcacion(bog(18, 20, 6), bog(18, 30, 6), { fecha: AYER });
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    expect((await estado()).cuerpo.descanso).toEqual({ inicio: '09:00', fin: '09:15', ahora: true });
  });

  it('en su descanso: enDescanso, la hora de su salida, y todavía nada que proponer', async () => {
    sembrar();
    marcacion(bog(7), bog(9, 2), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    ahora(bog(9, 20));
    const r = await estado();
    expect([r.cuerpo.enDescanso, r.cuerpo.salidaDescanso, r.cuerpo.enAlmuerzo, r.cuerpo.regresoSugerido])
      .toEqual([true, bog(9, 2).toISOString(), false, null]);
  });

  it('olvidó el regreso de un descanso tomado fuera de su ventana: le propone la salida más lo que dura ese descanso', async () => {
    sembrar();
    // Carla sale a las 10:00 y el kiosco la anotó en el de 15:00 a 15:10.
    marcacion(bog(7), bog(10), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    ahora(bog(11, 5));
    expect((await estado()).cuerpo.regresoSugerido).toBeNull();
    ahora(bog(11, 30));
    expect((await estado()).cuerpo.regresoSugerido).toBe(bog(10, 10).toISOString());
  });

  it('con la jornada abierta no está en ningún descanso, aunque su última salida cerrada fuera a uno', async () => {
    sembrar();
    marcacion(bog(7), bog(9, 2), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    marcacion(bog(9, 14), null);
    ahora(bog(9, 20));
    const r = await estado();
    expect([r.cuerpo.enDescanso, r.cuerpo.salidaDescanso]).toEqual([false, null]);
  });

  it('una salida normal dentro de la ventana no gasta ese descanso: al volver se lo sigue ofreciendo', async () => {
    sembrar();
    marcacion(bog(7), bog(9, 1));
    marcacion(bog(9, 3), null);
    ahora(bog(9, 5));
    expect((await estado()).cuerpo.descanso).toEqual({ inicio: '09:00', fin: '09:15', ahora: true });
  });

  it('salió a su descanso a las 17:30, después de su turno: a las 18:35 sigue en él, porque ese descanso dura diez minutos más la gracia', async () => {
    sembrar();
    marcacion(bog(7), bog(17, 30), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    ahora(bog(18, 35));
    expect((await estado()).cuerpo.enDescanso).toBe(true);
  });
});

describe('/marcar: la tableta de producción (67d6fe6) sigue marcando igual', () => {
  // Su cuerpo solo trae foto, lat, lng, almuerzo, regresoA y la novedad. Nunca `descanso`.
  it('sin opciones sale normal', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(12, 5));
    const r = await marcar({ lat: undefined, lng: undefined });
    expect([r.status, r.cuerpo.accion, r.cuerpo.salidaAlmuerzo, r.cuerpo.salidaDescanso, r.cuerpo.descanso]).toEqual([200, 'SALIDA', false, false, null]);
    expect(bd.tablas.registro[0].descansoVentana).toBeNull();
  });

  it('con { almuerzo: true } dentro de la ventana del almuerzo sale a almorzar, sin ventana de descanso', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(12, 5));
    const r = await marcar({ almuerzo: true });
    expect([r.status, r.cuerpo.accion, r.cuerpo.salidaAlmuerzo, r.cuerpo.salidaDescanso]).toEqual([200, 'SALIDA', true, false]);
    expect([bd.tablas.registro[0].salidaAlmuerzo, bd.tablas.registro[0].descansoVentana]).toEqual([true, null]);
  });

  it('{ almuerzo: true } a las 09:05, dentro de un descanso y fuera del almuerzo, se anota como almuerzo', async () => {
    // Por esto hay que recargar las tabletas ANTES de configurar descansos: la de
    // producción no conoce el descanso, y su botón de pausa es el del almuerzo.
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    const r = await marcar({ almuerzo: true });
    expect([r.status, r.cuerpo.salidaAlmuerzo, bd.tablas.registro[0].salidaDescanso, bd.tablas.registro[0].descansoVentana]).toEqual([200, true, false, null]);
  });

  it('vuelve del almuerzo con {} en la misma fecha', async () => {
    sembrar();
    marcacion(bog(7), bog(12, 5), { salidaAlmuerzo: true });
    ahora(bog(12, 50));
    const r = await marcar({});
    expect([r.status, r.cuerpo.accion]).toEqual([200, 'ENTRADA']);
    expect(abierta()[0].fecha).toEqual(DIA);
  });
});

describe('/marcar: la pantalla nueva sale al descanso que toca', () => {
  it('con { descanso: true } sale al que toca y guarda cuál', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    const r = await marcar({ descanso: true });
    expect([r.status, r.cuerpo.accion, r.cuerpo.salidaDescanso, r.cuerpo.descanso]).toEqual([200, 'SALIDA', true, { inicio: '09:00', fin: '09:15' }]);
    expect([bd.tablas.registro[0].salidaDescanso, bd.tablas.registro[0].descansoVentana]).toEqual([true, '09:00-09:15']);
  });

  it('a las 10:00 sin haber tomado ninguno, se anota en el de las 15:00 (Carla)', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(10));
    const r = await marcar({ descanso: true });
    expect(r.cuerpo.descanso).toEqual({ inicio: '15:00', fin: '15:10' });
    expect(bd.tablas.registro[0].descansoVentana).toBe('15:00-15:10');
  });

  it('descanso:true sin pendientes es una salida normal, nunca un 4xx', async () => {
    sembrar();
    marcacion(bog(7), bog(9), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    marcacion(bog(9, 15), bog(15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    marcacion(bog(15, 10), null);
    ahora(bog(15, 30));
    const r = await marcar({ descanso: true });
    expect([r.status, r.cuerpo.accion, r.cuerpo.salidaDescanso, r.cuerpo.descanso]).toEqual([200, 'SALIDA', false, null]);
    expect(bd.tablas.registro[2].descansoVentana).toBeNull();
  });

  it('almuerzo y descanso a la vez: manda el almuerzo, sin ventana de descanso', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(12, 5));
    const r = await marcar({ almuerzo: true, descanso: true });
    expect([r.cuerpo.salidaAlmuerzo, r.cuerpo.salidaDescanso, bd.tablas.registro[0].descansoVentana]).toEqual([true, false, null]);
  });

  it('una salida normal borra la ventana que conservaba un turno reabierto', async () => {
    // Un administrador reabrió una salida al descanso: la fila quedó abierta con su
    // ventana vieja. La salida de ahora no es a ningún descanso.
    sembrar();
    marcacion(bog(7), null, { descansoVentana: '09:00-09:15' });
    ahora(bog(16, 5));
    const r = await marcar({});
    expect([r.status, bd.tablas.registro[0].descansoVentana]).toEqual([200, null]);
  });

  it('descanso:"true" en texto no se cree', async () => {
    sembrar();
    marcacion(bog(7), null);
    ahora(bog(9, 5));
    const r = await marcar({ descanso: 'true' });
    expect([r.status, r.cuerpo.salidaDescanso, bd.tablas.registro[0].descansoVentana]).toEqual([200, false, null]);
  });
});

describe('/marcar: el regreso de un descanso con la hora que la persona declara', () => {
  it('fuera de su ventana, la hora corregida se acepta hasta la salida más lo que dura ese descanso, y no un minuto más', async () => {
    sembrar();
    marcacion(bog(7), bog(10), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    ahora(bog(11, 30));
    const aTiempo = await marcar({ regresoA: bog(10, 10).toISOString() });
    expect([aTiempo.status, aTiempo.cuerpo.accion, aTiempo.cuerpo.regresoEstimado, aTiempo.cuerpo.hora]).toEqual([200, 'ENTRADA', true, bog(10, 10).toISOString()]);

    sembrar();
    marcacion(bog(7), bog(10), { salidaDescanso: true, descansoVentana: '15:00-15:10' });
    const tarde = await marcar({ regresoA: bog(10, 11).toISOString() });
    expect([tarde.status, tarde.cuerpo.regresoEstimado, tarde.cuerpo.hora]).toEqual([200, false, bog(11, 30).toISOString()]);
  });

  it('dentro de su ventana, hasta el fin de la ventana', async () => {
    sembrar();
    marcacion(bog(7), bog(9, 2), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    ahora(bog(10, 30));
    const r = await marcar({ regresoA: bog(9, 15).toISOString() });
    expect([r.cuerpo.regresoEstimado, r.cuerpo.hora]).toEqual([true, bog(9, 15).toISOString()]);
  });

  it('sin ventana guardada no se inventa hora: entra a la hora de ahora', async () => {
    sembrar();
    marcacion(bog(7), bog(10), { salidaDescanso: true, descansoVentana: null });
    ahora(bog(11, 30));
    const r = await marcar({ regresoA: bog(10, 5).toISOString() });
    expect([r.status, r.cuerpo.regresoEstimado, r.cuerpo.hora]).toEqual([200, false, bog(11, 30).toISOString()]);
  });

  it('el regreso queda en la misma fecha de la jornada', async () => {
    sembrar();
    marcacion(bog(7), bog(9), { salidaDescanso: true, descansoVentana: '09:00-09:15' });
    ahora(bog(9, 14));
    const r = await marcar({});
    expect([r.status, r.cuerpo.accion]).toEqual([200, 'ENTRADA']);
    expect(abierta()[0].fecha).toEqual(DIA);
  });
});

// HASTA CUÁNDO UN DESCANSO ESPERA SU REGRESO (12 de septiembre de 2026).
//
// Con un descanso por la tarde sin regreso marcado, la entrada normal de la mañana
// siguiente quedaba como su regreso: con la fecha de ayer, sin medirle la llegada tarde,
// y aceptando la hora propuesta abría un tramo desde la tarde anterior. Un descanso
// espera su regreso hasta el fin del turno de su día más la gracia, y nunca más de 18
// horas. El almuerzo sigue con las 18 horas de producción.
describe('un descanso sin regreso no se come la entrada del día siguiente', () => {
  const MARTES = bog(0, 0, 8);
  const salioAlDeLaTarde = () => marcacion(bog(7), bog(15), { salidaDescanso: true, descansoVentana: '15:00-15:10' });

  it('el caso del verificador: salió al descanso de las 15:00 y no volvió; a las 07:30 del día siguiente /estado no lo da en descanso ni le propone regreso', async () => {
    sembrar({ toleranciaMin: 0, fechas: [DIA, MARTES] });
    salioAlDeLaTarde();
    ahora(bog(7, 30, 8));
    const r = await estado();
    expect([r.status, r.cuerpo.enDescanso, r.cuerpo.salidaDescanso, r.cuerpo.regresoSugerido]).toEqual([200, false, null, null]);
  });

  it('y /marcar le pide el motivo de la tardanza, igual que a quien cerró su jornada con una salida normal', async () => {
    sembrar({ toleranciaMin: 0, fechas: [DIA, MARTES] });
    marcacion(bog(7), bog(15)); // el control
    ahora(bog(7, 30, 8));
    const control = await marcar({});
    sembrar({ toleranciaMin: 0, fechas: [DIA, MARTES] });
    salioAlDeLaTarde();
    const caso = await marcar({});
    expect([control.status, control.cuerpo.codigo]).toEqual([409, 'REQUIERE_MOTIVO_TARDANZA']);
    expect([caso.status, caso.cuerpo.codigo]).toEqual([409, 'REQUIERE_MOTIVO_TARDANZA']);
    expect(abierta()).toHaveLength(0);
  });

  it('con el motivo entra como la entrada de hoy: con la fecha de hoy y a la hora de ahora, aunque mande la hora que antes se le proponía', async () => {
    sembrar({ toleranciaMin: 0, fechas: [DIA, MARTES] });
    salioAlDeLaTarde();
    ahora(bog(7, 30, 8));
    const r = await marcar({ novedadTipo: 'PERSONAL', regresoA: bog(15, 10).toISOString() });
    expect([r.status, r.cuerpo.accion, r.cuerpo.regresoEstimado, r.cuerpo.hora]).toEqual([200, 'ENTRADA', false, bog(7, 30, 8).toISOString()]);
    expect(abierta()[0].fecha).toEqual(MARTES);
  });

  it('hasta el fin de su turno más la gracia sigue en su descanso: a las 17:00 le propone volver a las 15:10, a las 17:01 ya no', async () => {
    sembrar({ toleranciaMin: 0, fechas: [DIA, MARTES] });
    salioAlDeLaTarde();
    ahora(bog(17));
    const a17 = await estado();
    expect([a17.cuerpo.enDescanso, a17.cuerpo.regresoSugerido]).toEqual([true, bog(15, 10).toISOString()]);
    ahora(bog(17, 1));
    const a1701 = await estado();
    expect([a1701.cuerpo.enDescanso, a1701.cuerpo.regresoSugerido]).toEqual([false, null]);
  });

  it('el almuerzo NO cambia: salió a almorzar a las 12:30 y no volvió; a las 06:00 del día siguiente, 17 h 30 después, sigue en su almuerzo', async () => {
    sembrar({ fechas: [DIA, MARTES] });
    marcacion(bog(7), bog(12, 30), { salidaAlmuerzo: true });
    ahora(bog(6, 0, 8));
    expect((await estado()).cuerpo.enAlmuerzo).toBe(true);
    const r = await marcar({});
    expect([r.status, r.cuerpo.accion, abierta()[0].fecha]).toEqual([200, 'ENTRADA', DIA]);
  });

  it('si ese día no tiene franja, se queda la regla de 18 horas: a las 07:30 del día siguiente sigue en su descanso', async () => {
    sembrar({ conDia: false });
    salioAlDeLaTarde();
    ahora(bog(7, 30, 8));
    expect((await estado()).cuerpo.enDescanso).toBe(true);
  });
});

describe('un nocturno de 22:00 a 06:00 con un descanso de madrugada', () => {
  const MARTES = bog(0, 0, 8);
  const nocturno = () => sembrar({ horaEntrada: '22:00', horaSalida: '06:00', descansos: JSON.stringify([{ inicio: '02:00', fin: '02:15' }]), fechas: [DIA, MARTES] });
  // Entró el lunes a las 22:00: la fila es del lunes aunque la salida sea del martes.
  const salioALas2 = () => marcacion(bog(22), bog(2, 0, 8), { salidaDescanso: true, descansoVentana: '02:00-02:15' });

  it('sí espera su regreso: a las 02:20 sigue en su descanso, y el regreso queda en la fecha en que entró', async () => {
    nocturno();
    salioALas2();
    ahora(bog(2, 20, 8));
    expect((await estado()).cuerpo.enDescanso).toBe(true);
    const r = await marcar({});
    expect([r.status, r.cuerpo.accion, abierta()[0].fecha]).toEqual([200, 'ENTRADA', DIA]);
  });

  it('su turno acaba en la madrugada del martes: a las 07:00 todavía espera, y a las 07:30 ya entra como una entrada del martes', async () => {
    nocturno();
    salioALas2();
    ahora(bog(7, 0, 8));
    expect((await estado()).cuerpo.enDescanso).toBe(true);
    ahora(bog(7, 30, 8));
    expect((await estado()).cuerpo.enDescanso).toBe(false);
    const r = await marcar({});
    expect([r.status, r.cuerpo.accion, abierta()[0].fecha]).toEqual([200, 'ENTRADA', MARTES]);
  });
});
