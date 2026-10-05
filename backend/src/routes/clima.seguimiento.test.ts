import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// EL SEGUIMIENTO DE «NECESITAN ATENCIÓN» (4 de octubre de 2026). Lo que se prueba aquí es quién puede
// tocar qué: los casos y los comentarios se buscan siempre dentro de la empresa de quien pregunta, y el
// autor de un comentario sale de la sesión, nunca del cuerpo de la petición. Cuándo se abre un caso lo
// prueba `casosPorAbrir` en utils/clima.test.ts, y la costura con la base, prisma/verificar-clima.ts.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    seguimientoClima: { findFirst: vi.fn(), update: vi.fn() },
    comentarioSeguimientoClima: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    usuario: { findMany: vi.fn() },
  },
}));
vi.mock('../prisma', () => ({ prisma }));
vi.mock('../utils/capacidades', () => ({ exigeFuncion: () => async () => undefined, tieneFuncion: vi.fn() }));
vi.mock('../utils/sedesDeEmpresa', () => ({ sedesPorDefecto: async () => () => null }));
import climaRoutes from './clima';

async function pedir(method: 'PATCH' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown) {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string; usuarioId?: string; usuarioNombre?: string }) => {
    request.user = { rol: 'ADMIN', empresaId: 'emp-1' };
    request.empresaId = 'emp-1';
    request.usuarioId = 'u-1';
    request.usuarioNombre = 'Admin Uno';
  });
  await app.register(climaRoutes, { prefix: '/api/clima' });
  await app.ready();
  const r = await app.inject({ method, url, payload: payload as Record<string, unknown> | undefined });
  await app.close();
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.seguimientoClima.findFirst.mockResolvedValue({ id: 's1' });
  prisma.seguimientoClima.update.mockResolvedValue({ id: 's1' });
  prisma.usuario.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
  prisma.comentarioSeguimientoClima.findFirst.mockResolvedValue({ id: 'k1' });
  prisma.comentarioSeguimientoClima.create.mockResolvedValue({ id: 'k1' });
  prisma.comentarioSeguimientoClima.update.mockResolvedValue({ id: 'k1' });
  prisma.comentarioSeguimientoClima.delete.mockResolvedValue({ id: 'k1' });
});

describe('PATCH /api/clima/seguimientos/:id', () => {
  it('busca el caso dentro de la empresa de quien pregunta; el de otra no existe', async () => {
    prisma.seguimientoClima.findFirst.mockResolvedValue(null);
    const r = await pedir('PATCH', '/api/clima/seguimientos/ajeno', { estado: 'CERRADO' });
    expect(r.statusCode).toBe(404);
    expect(prisma.seguimientoClima.findFirst.mock.calls[0][0].where).toEqual({ id: 'ajeno', empresaId: 'emp-1' });
    expect(prisma.seguimientoClima.update).not.toHaveBeenCalled();
  });

  it('al cerrar anota cuándo; al reabrir lo borra', async () => {
    await pedir('PATCH', '/api/clima/seguimientos/s1', { estado: 'CERRADO' });
    expect(prisma.seguimientoClima.update.mock.calls[0][0].data.cerradoEn).toBeInstanceOf(Date);
    await pedir('PATCH', '/api/clima/seguimientos/s1', { estado: 'EN_SEGUIMIENTO' });
    expect(prisma.seguimientoClima.update.mock.calls[1][0].data).toEqual({ estado: 'EN_SEGUIMIENTO', cerradoEn: null });
  });

  it('el responsable tiene que ser un usuario de la empresa', async () => {
    const malo = await pedir('PATCH', '/api/clima/seguimientos/s1', { responsableId: 'de-otra' });
    expect(malo.statusCode).toBe(400);
    expect(prisma.usuario.findMany.mock.calls[0][0].where).toEqual({ empresaId: 'emp-1', activo: true });
    const bueno = await pedir('PATCH', '/api/clima/seguimientos/s1', { responsableId: 'u-2' });
    expect(bueno.statusCode).toBe(200);
    expect(prisma.seguimientoClima.update.mock.calls[0][0].data).toEqual({ responsableId: 'u-2' });
  });

  it('un estado inventado no se guarda', async () => {
    expect((await pedir('PATCH', '/api/clima/seguimientos/s1', { estado: 'ARCHIVADO' })).statusCode).toBe(400);
    expect(prisma.seguimientoClima.update).not.toHaveBeenCalled();
  });
});

describe('los comentarios', () => {
  it('el autor sale de la sesión, aunque el cuerpo diga otro', async () => {
    const r = await pedir('POST', '/api/clima/seguimientos/s1/comentarios', { texto: ' Hablé con él ', autorId: 'falso', autorNombre: 'Falso' });
    expect(r.statusCode).toBe(201);
    expect(prisma.comentarioSeguimientoClima.create.mock.calls[0][0].data).toEqual({
      seguimientoId: 's1', autorId: 'u-1', autorNombre: 'Admin Uno', texto: 'Hablé con él',
    });
  });

  it('en un caso de otra empresa no se puede comentar', async () => {
    prisma.seguimientoClima.findFirst.mockResolvedValue(null);
    expect((await pedir('POST', '/api/clima/seguimientos/ajeno/comentarios', { texto: 'x' })).statusCode).toBe(404);
    expect(prisma.comentarioSeguimientoClima.create).not.toHaveBeenCalled();
  });

  it('editar y borrar buscan el comentario dentro de SU caso y de la empresa', async () => {
    await pedir('PUT', '/api/clima/seguimientos/s1/comentarios/k1', { texto: 'Corregido' });
    expect(prisma.comentarioSeguimientoClima.findFirst.mock.calls[0][0].where)
      .toEqual({ id: 'k1', seguimientoId: 's1', seguimiento: { empresaId: 'emp-1' } });
    expect(prisma.comentarioSeguimientoClima.update.mock.calls[0][0].data.texto).toBe('Corregido');
    expect(prisma.comentarioSeguimientoClima.update.mock.calls[0][0].data.editadoEn).toBeInstanceOf(Date);
    await pedir('DELETE', '/api/clima/seguimientos/s1/comentarios/k1');
    expect(prisma.comentarioSeguimientoClima.findFirst.mock.calls[1][0].where)
      .toEqual({ id: 'k1', seguimientoId: 's1', seguimiento: { empresaId: 'emp-1' } });
    expect(prisma.comentarioSeguimientoClima.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });

  it('un comentario ajeno no se edita ni se borra', async () => {
    prisma.comentarioSeguimientoClima.findFirst.mockResolvedValue(null);
    expect((await pedir('PUT', '/api/clima/seguimientos/s1/comentarios/ajeno', { texto: 'x' })).statusCode).toBe(404);
    expect((await pedir('DELETE', '/api/clima/seguimientos/s1/comentarios/ajeno')).statusCode).toBe(404);
    expect(prisma.comentarioSeguimientoClima.update).not.toHaveBeenCalled();
    expect(prisma.comentarioSeguimientoClima.delete).not.toHaveBeenCalled();
  });

  it('un comentario vacío no se guarda', async () => {
    expect((await pedir('POST', '/api/clima/seguimientos/s1/comentarios', { texto: '   ' })).statusCode).toBe(400);
  });
});
