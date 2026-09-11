import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { Writable } from 'node:stream';

// Las dos rutas del borrado de empresas: el resumen que pinta el modal y el
// borrado mismo. DECISIÓN DEL DUEÑO (10 de septiembre de 2026): cualquier
// empresa se puede borrar; el modal advierte y se confirma con el NIT.
//
// Se montan sin levantar el servidor (`admin.ts` importa `prisma` de
// './prisma', CLAUDE.md 8.5). La cascada se reemplaza por un contador: lo que
// ella borra se verifica contra MySQL con prisma/verificar-eliminar-empresa.ts
// (8.6). Aquí se prueba lo que decide la ruta: qué responde, a quién deja pasar
// y qué deja escrito.

const { prisma, borrarEmpresaEnCascada, estado, TX } = vi.hoisted(() => {
  // La transacción que recibe la cascada. Identificable a propósito: si la ruta
  // le pasara el cliente global, cada borrado iría en autocommit y un fallo a
  // mitad dejaría la empresa borrada a medias.
  const TX = { soyLaTransaccion: true };
  const estado = {
    empresa: null as null | { id: string; nombre: string; nit: string },
    usuario: null as null | { rol: string; activo: boolean },
    colaboradores: 0,
    registros: 0,
    pagos: { n: 0, monto: 0 },
    comisiones: { n: 0, monto: 0 },
    transaccionFalla: null as null | Error,
  };
  const suma = (x: { n: number; monto: number }) => ({ _count: { _all: x.n }, _sum: { monto: x.n ? x.monto : null } });
  const prisma = {
    empresa: { findUnique: vi.fn(async () => estado.empresa) },
    usuario: { findUnique: vi.fn(async () => estado.usuario) },
    colaborador: { count: vi.fn(async () => estado.colaboradores) },
    registro: { count: vi.fn(async () => estado.registros) },
    pago: { aggregate: vi.fn(async () => suma(estado.pagos)) },
    comision: { aggregate: vi.fn(async () => suma(estado.comisiones)) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>, _opciones?: unknown) => {
      if (estado.transaccionFalla) throw estado.transaccionFalla;
      return fn(TX);
    }),
  };
  const borrarEmpresaEnCascada = vi.fn(async (): Promise<Record<string, number> | null> => ({ registros: 4830 }));
  return { prisma, borrarEmpresaEnCascada, estado, TX };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/borrarEmpresaEnCascada', () => ({ borrarEmpresaEnCascada }));

import adminRoutes from './admin';

type Linea = { level: number; [k: string]: unknown };
let quien: { id?: string; rol?: string; email?: string };

async function montar() {
  const lineas: Linea[] = [];
  const salida = new Writable({
    write(trozo, _codificacion, listo) {
      for (const l of String(trozo).split('\n')) if (l.trim()) lineas.push(JSON.parse(l));
      listo();
    },
  });
  const app = Fastify({ logger: { level: 'info', stream: salida } });
  app.decorate('requireSuperAdmin', async (request: { user?: unknown }) => { request.user = quien; });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.ready();
  return { app, lineas };
}

const NIT = '901555777-3';
const borrar = (app: Awaited<ReturnType<typeof montar>>['app'], payload?: unknown) =>
  app.inject({ method: 'POST', url: '/api/admin/empresas/emp1/eliminar', ...(payload === undefined ? {} : { payload: payload as object }) });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(estado, {
    empresa: { id: 'emp1', nombre: 'Panadería El Trigo', nit: NIT },
    usuario: { rol: 'SUPER_ADMIN', activo: true },
    colaboradores: 12,
    registros: 4830,
    pagos: { n: 0, monto: 0 },
    comisiones: { n: 0, monto: 0 },
    transaccionFalla: null,
  });
  quien = { id: 'sa1', rol: 'SUPER_ADMIN', email: 'dueno@horapro.co' };
});

describe('el resumen que pinta el modal', () => {
  it('cuenta lo que se pierde, incluida la plata, y ya no trae bloqueo', async () => {
    estado.pagos = { n: 3, monto: 899_700 };
    estado.comisiones = { n: 2, monto: 59_980 };
    const { app } = await montar();
    const r = await app.inject({ method: 'GET', url: '/api/admin/empresas/emp1/eliminacion' });
    expect(r.statusCode).toBe(200);
    const cuerpo = r.json();
    expect(cuerpo).toMatchObject({
      id: 'emp1', nit: NIT, colaboradores: 12, registros: 4830,
      pagosAprobados: 3, montoPagosAprobados: 899_700, comisiones: 2, montoComisiones: 59_980,
    });
    expect(cuerpo).not.toHaveProperty('bloqueo');
    await app.close();
  });

  it('sin pagos ni comisiones los montos son cero, no null', async () => {
    const { app } = await montar();
    const cuerpo = (await app.inject({ method: 'GET', url: '/api/admin/empresas/emp1/eliminacion' })).json();
    expect(cuerpo).toMatchObject({ pagosAprobados: 0, montoPagosAprobados: 0, comisiones: 0, montoComisiones: 0 });
    await app.close();
  });

  it('una empresa que no existe es 404', async () => {
    estado.empresa = null;
    const { app } = await montar();
    const r = await app.inject({ method: 'GET', url: '/api/admin/empresas/emp1/eliminacion' });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});

describe('el borrado', () => {
  it('con el NIT bien escrito borra, aunque la empresa tenga pagos aprobados y comisiones', async () => {
    estado.pagos = { n: 3, monto: 899_700 };
    estado.comisiones = { n: 2, monto: 59_980 };
    const { app } = await montar();
    const r = await borrar(app, { confirmacion: NIT });
    expect(r.statusCode).toBe(204);
    expect(borrarEmpresaEnCascada).toHaveBeenCalledWith(TX, 'emp1');
    // La cuenta que se comprueba es la del token, no otra.
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sa1' } }));
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ timeout: 60_000 }));
    await app.close();
  });

  it('con el NIT equivocado responde 400 y no borra', async () => {
    const { app } = await montar();
    const r = await borrar(app, { confirmacion: '901555777' });
    expect(r.statusCode).toBe(400);
    expect(borrarEmpresaEnCascada).not.toHaveBeenCalled();
    await app.close();
  });

  it('sin cuerpo, o con una confirmación que no es texto, responde 400 y no revienta', async () => {
    // Antes: sin cuerpo, 500 al desestructurar; con un número, 500 en `.trim()`.
    const { app } = await montar();
    for (const cuerpo of [undefined, {}, { confirmacion: 901555777 }, { confirmacion: null }]) {
      const r = await borrar(app, cuerpo);
      expect(r.statusCode, JSON.stringify(cuerpo)).toBe(400);
    }
    expect(borrarEmpresaEnCascada).not.toHaveBeenCalled();
    await app.close();
  });

  it('a una empresa que no existe responde 404, aunque venga sin cuerpo', async () => {
    estado.empresa = null;
    const { app } = await montar();
    expect((await borrar(app)).statusCode).toBe(404);
    expect((await borrar(app, { confirmacion: NIT })).statusCode).toBe(404);
    await app.close();
  });

  it('un token de super admin cuyo usuario ya no existe, está inactivo o ya no es super admin no borra', async () => {
    // El token dura 7 días y solo se verifica su firma: sin esto, una cuenta
    // desactivada seguiría pudiendo borrar empresas hasta que venciera.
    const { app } = await montar();
    for (const usuario of [null, { rol: 'SUPER_ADMIN', activo: false }, { rol: 'ADMIN', activo: true }]) {
      estado.usuario = usuario;
      const r = await borrar(app, { confirmacion: NIT });
      expect(r.statusCode, JSON.stringify(usuario)).toBe(403);
    }
    expect(borrarEmpresaEnCascada).not.toHaveBeenCalled();
    await app.close();
  });

  it('si la empresa ya no existe al empezar el borrado, responde 404 y no deja constancia', async () => {
    // Dos pestañas confirman a la vez: la segunda llega cuando la primera ya
    // borró. Antes respondía 500 diciendo «no se borró nada», o 204 duplicando
    // la constancia con la plata. La cascada lo detecta al pedir el candado.
    borrarEmpresaEnCascada.mockResolvedValueOnce(null);
    const { app, lineas } = await montar();
    const r = await borrar(app, { confirmacion: NIT });
    expect(r.statusCode).toBe(404);
    expect(lineas.some(l => l.level >= 40 && l.empresaId === 'emp1')).toBe(false);
    await app.close();
  });

  it('si la transacción falla responde 500 diciendo que no se borró nada, y deja el error en el log', async () => {
    estado.transaccionFalla = new Error('Lock wait timeout exceeded; try restarting transaction');
    const { app, lineas } = await montar();
    const r = await borrar(app, { confirmacion: NIT });
    expect(r.statusCode).toBe(500);
    expect(r.json().error).toMatch(/no se (borró|eliminó) nada/i);
    expect(lineas.some(l => l.level >= 50 && l.empresaId === 'emp1')).toBe(true);
    await app.close();
  });

  it('deja constancia de lo que se llevó, incluida la plata, y de quién lo hizo', async () => {
    estado.pagos = { n: 3, monto: 899_700 };
    estado.comisiones = { n: 2, monto: 59_980 };
    const { app, lineas } = await montar();
    expect((await borrar(app, { confirmacion: NIT })).statusCode).toBe(204);
    expect(lineas.find(l => l.level === 40 && l.empresaId === 'emp1')).toMatchObject({
      nit: NIT, nombre: 'Panadería El Trigo', colaboradores: 12, registros: 4830,
      pagosAprobados: 3, montoPagosAprobados: 899_700, comisiones: 2, montoComisiones: 59_980,
      porEmail: 'dueno@horapro.co',
      filasBorradas: { registros: 4830 },
    });
    await app.close();
  });
});
