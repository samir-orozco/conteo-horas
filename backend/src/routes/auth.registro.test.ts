import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';

// El registro self-service es por donde llegan casi todas las empresas nuevas.
// Quien trabaja presencial siempre tiene sede (decisión del dueño, 11 de
// septiembre de 2026), así que la empresa tiene que nacer con su Sede principal,
// y DENTRO de la misma transacción: creada aparte, un fallo dejaría una empresa
// sin ninguna.
//
// `auth.ts` importa `prisma` de './prisma' (CLAUDE.md 8.5), así que se monta sin
// levantar el servidor. Lo que escribe `crearSedePrincipal` en MySQL se verifica
// con prisma/verificar-sede-principal.ts (8.6). El correo va de mentira: aquí no
// sale nada a nadie.

const { prisma, TX } = vi.hoisted(() => {
  const TX = {
    empresa: { create: vi.fn(async ({ data }: { data: { nombre: string } }) => ({ id: 'emp-nueva', nombre: data.nombre })) },
    suscripcion: { create: vi.fn(async () => ({})) },
    sede: { create: vi.fn(async () => ({ id: 'sede-principal' })) },
    usuario: {
      create: vi.fn(async ({ data }: { data: { email: string; nombre: string; emailVerificado: boolean } }) => ({ id: 'u-nuevo', ...data })),
    },
  };
  const prisma = {
    usuario: { findUnique: vi.fn(async () => null) },
    empresa: { findUnique: vi.fn(async () => null) },
    afiliado: { findFirst: vi.fn(async () => null) },
    sede: { create: vi.fn(async () => ({ id: 'sede-fuera-de-la-transaccion' })) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(TX)),
  };
  return { prisma, TX };
});
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/correo', () => ({ enviarCorreo: vi.fn(), plantillaCorreo: vi.fn(() => ''), correoConfigurado: false }));

import authRoutes from './auth';

async function montar() {
  const app = Fastify();
  await app.register(jwt, { secret: 'prueba' });
  for (const guarda of ['authenticate', 'requireEmpresa', 'requireSuperAdmin', 'requireAfiliado']) {
    app.decorate(guarda, async () => {});
  }
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

describe('una empresa que se registra sola', () => {
  it('nace con su Sede principal, dentro de la misma transacción', async () => {
    const app = await montar();
    const r = await app.inject({
      method: 'POST', url: '/api/auth/registro',
      payload: { empresa: 'Panadería La Espiga', nit: '900123456-1', nombre: 'Ana', email: 'ana@prueba.local', password: 'secreta123' },
    });
    expect(r.statusCode).toBe(201);
    expect(TX.sede.create).toHaveBeenCalledTimes(1);
    expect(TX.sede.create).toHaveBeenCalledWith(expect.objectContaining({ data: { empresaId: 'emp-nueva', nombre: 'Sede principal' } }));
    expect(prisma.sede.create).not.toHaveBeenCalled();
    await app.close();
  });
});
