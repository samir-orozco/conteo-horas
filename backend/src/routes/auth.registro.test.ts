import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    plantillaTurno: { create: vi.fn(async () => ({ id: 'turno-descanso' })) },
    usuario: {
      create: vi.fn(async ({ data }: { data: { email: string; nombre: string; emailVerificado: boolean } }) => ({ id: 'u-nuevo', ...data })),
    },
  };
  const prisma = {
    usuario: { findUnique: vi.fn(async () => null) },
    empresa: { findUnique: vi.fn(async () => null) },
    afiliado: { findFirst: vi.fn(async () => null) },
    sede: { create: vi.fn(async () => ({ id: 'sede-fuera-de-la-transaccion' })) },
    plantillaTurno: { create: vi.fn(async () => ({ id: 'turno-fuera-de-la-transaccion' })) },
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
  // Los dobles son de MÓDULO (`vi.hoisted`), así que sus contadores se acumulan de una prueba a la
  // siguiente. Mientras hubo una sola prueba no se notaba; al agregar la segunda, `toHaveBeenCalledTimes(1)`
  // empezó a ver 2 llamadas —la de la prueba anterior y la suya— y el rojo parecía del código y era
  // contaminación entre pruebas. Se reinicia el historial, no se ajusta el número esperado.
  //
  // `clearAllMocks` y no `resetAllMocks`: el primero borra las llamadas y CONSERVA las
  // implementaciones de arriba; el segundo las borraría y los dobles devolverían `undefined`.
  beforeEach(() => { vi.clearAllMocks(); });

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

  // AQUÍ HUBO UNA PRUEBA de que la empresa naciera con un turno de «Descanso», escrita y borrada el
  // mismo día (23 de septiembre de 2026).
  //
  // Se sembraba porque ninguna empresa tenía uno y sin él no había con qué marcar un día libre. El
  // dueño miró el resultado y señaló lo que el sembrado no arreglaba: un turno de descanso solo
  // lleva nombre y color, y la celda del calendario no lee ninguno de los dos. Marcar un día libre
  // pasó a ser una ACCIÓN sobre el día (`dias_esperados.descansoPintado`) y dejó de ser un turno
  // del catálogo, así que ya no hay nada que sembrar.
  //
  // El `beforeEach` de arriba se queda: lo destapó esta prueba y sigue haciendo falta el día que
  // alguien agregue la segunda.
});
