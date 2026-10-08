import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';

// La gente de una empresa la gestiona su ADMIN con POST /usuarios y PUT /usuarios/:id (7 de octubre
// de 2026). El PUT escribía el rol que llegara en el cuerpo, y como busca el usuario solo por id y
// empresa, un ADMIN podía editarse a sí mismo con 'SUPER_ADMIN'. Al volver a entrar, el login firmaba
// el rol de la base y requireSuperAdmin solo mira el token: tenía todo /api/admin.
//
// La decisión vive en utils/rolDeEmpresa.ts y tiene su prueba allí. Aquí se prueba la costura: que
// las dos rutas la usen y que un rol rechazado no llegue a Prisma. `auth.ts` importa `prisma` de
// './prisma' (CLAUDE.md 8.5), así que se monta sin levantar el servidor.

const { prisma } = vi.hoisted(() => {
  const prisma = {
    usuario: {
      findFirst: vi.fn(async (): Promise<null | { id: string; empresaId: string; rol: string }> =>
        ({ id: 'u-admin', empresaId: 'emp-1', rol: 'ADMIN' })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'u-nuevo', ...data })),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ ...where, ...data })),
    },
  };
  return { prisma };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/correo', () => ({ enviarCorreo: vi.fn(), plantillaCorreo: vi.fn(() => ''), correoConfigurado: false }));

import authRoutes from './auth';

// El ADMIN de la empresa emp-1, como lo deja requireEmpresa después de verificar el token.
const ADMIN = { id: 'u-admin', rol: 'ADMIN', empresaId: 'emp-1', nombre: 'Ana' };

async function montar() {
  const app = Fastify();
  await app.register(jwt, { secret: 'prueba' });
  for (const guarda of ['authenticate', 'requireSuperAdmin', 'requireAfiliado']) {
    app.decorate(guarda, async () => {});
  }
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => {
    request.user = ADMIN;
    request.empresaId = ADMIN.empresaId;
  });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

// Lo que no es un rol de empresa. SUPER_ADMIN es el ataque; los demás dejaban cuentas que no sirven
// (AFILIADO sin afiliadoId) o reventaban en Prisma con un 500 (WORKER y null no caben en el enum).
const NO_PERMITIDOS: unknown[] = ['SUPER_ADMIN', 'AFILIADO', 'WORKER', 'super_admin', null, ''];

beforeEach(() => { vi.clearAllMocks(); });

describe('PUT /usuarios/:id', () => {
  it('un ADMIN no puede ponerse SUPER_ADMIN a sí mismo, y nada llega a la base', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/auth/usuarios/u-admin', payload: { rol: 'SUPER_ADMIN' } });
    expect(r.statusCode).toBe(403);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('ningún rol que no sea de empresa llega a la base', async () => {
    const app = await montar();
    for (const rol of NO_PERMITIDOS) {
      const r = await app.inject({ method: 'PUT', url: '/api/auth/usuarios/u-otro', payload: { nombre: 'Luis', rol } });
      expect(r.statusCode, String(rol)).toBe(403);
    }
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('control: pasar a alguien a SUPERVISOR se guarda', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/auth/usuarios/u-otro', payload: { rol: 'SUPERVISOR' } });
    expect(r.statusCode).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u-otro' }, data: expect.objectContaining({ rol: 'SUPERVISOR' }),
    }));
    await app.close();
  });

  it('control: sin rol en el cuerpo, el rol no se toca', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/auth/usuarios/u-otro', payload: { nombre: 'Luis', activo: false } });
    expect(r.statusCode).toBe(200);
    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data).toMatchObject({ nombre: 'Luis', activo: false });
    expect(data.rol).toBeUndefined();
    await app.close();
  });

  it('control: alguien de otra empresa sigue siendo 404', async () => {
    prisma.usuario.findFirst.mockResolvedValueOnce(null);
    const app = await montar();
    const r = await app.inject({ method: 'PUT', url: '/api/auth/usuarios/u-ajeno', payload: { rol: 'SUPERVISOR' } });
    expect(r.statusCode).toBe(404);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('POST /usuarios', () => {
  const NUEVO = { email: 'luis@prueba.local', password: 'secreta123', nombre: 'Luis' };

  it('ningún rol que no sea de empresa crea a nadie', async () => {
    const app = await montar();
    for (const rol of NO_PERMITIDOS) {
      const r = await app.inject({ method: 'POST', url: '/api/auth/usuarios', payload: { ...NUEVO, rol } });
      expect(r.statusCode, String(rol)).toBe(403);
    }
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('control: con rol ADMIN se crea ADMIN, en la empresa de quien lo crea', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/auth/usuarios', payload: { ...NUEVO, rol: 'ADMIN' } });
    expect(r.statusCode).toBe(201);
    expect(prisma.usuario.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ rol: 'ADMIN', empresaId: 'emp-1' }),
    }));
    await app.close();
  });

  it('control: sin rol se crea SUPERVISOR, como siempre', async () => {
    const app = await montar();
    const r = await app.inject({ method: 'POST', url: '/api/auth/usuarios', payload: NUEVO });
    expect(r.statusCode).toBe(201);
    expect(prisma.usuario.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ rol: 'SUPERVISOR' }),
    }));
    await app.close();
  });
});
