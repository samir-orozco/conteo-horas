import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient, Suscripcion } from '@prisma/client';

// Los correos al administrador cuando la suscripción vence (4 de octubre de 2026). El
// único aviso era el del panel, que no ve justo quien nunca entra: el que deja marcando
// el kiosco sin pagar. Decisión del dueño: un correo cuando vence y otro tres días antes
// de que el kiosco se pause.

const { enviarCorreo } = vi.hoisted(() => ({ enviarCorreo: vi.fn() }));
vi.mock('./correo', () => ({
  enviarCorreo: (...a: unknown[]) => enviarCorreo(...a),
  plantillaCorreo: (titulo: string, cuerpo: string) => `<h1>${titulo}</h1>${cuerpo}`,
}));

import { avisoDeSuscripcion, avisarSuscripcionesDeTodas } from './avisosDeSuscripcion';

const bog = (a: number, mes: number, d: number, h = 12, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));
const medianoche = (a: number, mes: number, d: number) => bog(a, mes, d, 0);
const susc = (c: { id?: string; finPrueba: Date; pagadoHasta?: Date | null; estado?: string }) =>
  ({ id: 's1', estado: 'PRUEBA', pagadoHasta: null, ...c }) as unknown as Suscripcion;

describe('qué aviso le toca hoy a una suscripción', () => {
  // Prueba hasta el 8 a las 11:59 p. m.: el kiosco se pausa el 24.
  const S = susc({ finPrueba: bog(2026, 10, 8, 23, 59) });

  it('en prueba, ninguno', () => {
    expect(avisoDeSuscripcion(S, bog(2026, 10, 5))).toBeNull();
  });

  it('al día siguiente de vencer, el de vencida, con la fecha de la pausa', () => {
    const a = avisoDeSuscripcion(S, bog(2026, 10, 9, 7));
    expect(a?.tipo).toBe('SUSCRIPCION_VENCIDA');
    expect(a?.pausa).toEqual(medianoche(2026, 10, 24));
    expect(a?.eraPrueba).toBe(true);
  });

  it('suspendida y a más de tres días de la pausa, ninguno', () => {
    expect(avisoDeSuscripcion(S, bog(2026, 10, 18, 7))).toBeNull();
  });

  it('desde tres días antes de la pausa, el de kiosco por pausarse', () => {
    expect(avisoDeSuscripcion(S, bog(2026, 10, 20, 23))).toBeNull();
    expect(avisoDeSuscripcion(S, bog(2026, 10, 21, 7))?.tipo).toBe('KIOSCO_POR_PAUSARSE');
  });

  it('con el kiosco ya pausado, ninguno', () => {
    expect(avisoDeSuscripcion(S, bog(2026, 10, 24, 7))).toBeNull();
  });

  it('la clave cambia con cada vencimiento, para volver a avisar el mes siguiente', () => {
    const octubre = avisoDeSuscripcion(susc({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 11, 1) }), bog(2026, 11, 2));
    const noviembre = avisoDeSuscripcion(susc({ finPrueba: bog(2026, 3, 8), pagadoHasta: medianoche(2026, 12, 1) }), bog(2026, 12, 2));
    expect(octubre?.eraPrueba).toBe(false);
    expect(octubre?.clave).not.toBe(noviembre?.clave);
  });

  it('una suscripción cancelada no recibe avisos de pago', () => {
    expect(avisoDeSuscripcion(susc({ finPrueba: bog(2026, 10, 8), estado: 'CANCELADA' }), bog(2026, 10, 9, 7))).toBeNull();
  });
});

describe('la pasada diaria de los avisos', () => {
  type Empresa = { id: string; nombre: string; email: string; usuarios: { email: string }[] };
  const fila = (id: string, empresa: Partial<Empresa> = {}) => ({
    ...susc({ id, finPrueba: bog(2026, 10, 8, 23, 59) }),
    empresa: { id: `e-${id}`, nombre: 'Tuercas & Pernos', email: 'contacto@tuercas.co', usuarios: [{ email: 'gerencia@tuercas.co' }], ...empresa },
  });
  const falso = (filas: ReturnType<typeof fila>[], yaAvisadas: string[] = []) => {
    const create = vi.fn(async (args: { data: Record<string, unknown> }) => args.data);
    const db = {
      suscripcion: { findMany: async () => filas },
      notificacion: {
        findFirst: async ({ where }: { where: { entidadId: string } }) => (yaAvisadas.some(c => where.entidadId.startsWith(c)) ? { id: 'n1' } : null),
        create,
      },
    } as unknown as PrismaClient;
    return { db, create };
  };
  const log = { info: vi.fn(), error: vi.fn() };
  const DIA_9 = bog(2026, 10, 9, 7);

  beforeEach(() => { enviarCorreo.mockReset(); log.info.mockReset(); log.error.mockReset(); });

  it('le escribe a cada administrador y lo deja en la campana', async () => {
    const { db, create } = falso([fila('s1', { usuarios: [{ email: 'gerencia@tuercas.co' }, { email: 'pagos@tuercas.co' }] })]);
    await avisarSuscripcionesDeTodas(log, DIA_9, db);
    expect(enviarCorreo.mock.calls.map(c => (c[0] as { para: string }).para)).toEqual(['gerencia@tuercas.co', 'pagos@tuercas.co']);
    expect(create.mock.calls[0][0].data).toMatchObject({ empresaId: 'e-s1', tipo: 'SUSCRIPCION_VENCIDA', entidad: 'suscripcion' });
  });

  it('el correo dice hasta cuándo se marca y desde cuándo se pausa, en hora de Bogotá', async () => {
    const { db } = falso([fila('s1')]);
    await avisarSuscripcionesDeTodas(log, DIA_9, db);
    const { html } = enviarCorreo.mock.calls[0][0] as { html: string };
    expect(html).toContain('hasta el <b>23 de octubre de 2026</b>');
    expect(html).toContain('Desde el 24 de octubre de 2026');
    expect(html).toContain('Tuercas &amp; Pernos');
  });

  it('el de la pausa dice la fecha y no «en 3 días», que es falso si sale más tarde', async () => {
    // Al desplegar, una empresa a dos días de la pausa recibe este aviso ese mismo día.
    const { db } = falso([fila('s1')]);
    await avisarSuscripcionesDeTodas(log, bog(2026, 10, 22, 7), db);
    const { html, asunto } = enviarCorreo.mock.calls[0][0] as { html: string; asunto: string };
    expect(html).toContain('<h1>El kiosco se pausa el 24 de octubre de 2026</h1>');
    expect(html).not.toMatch(/en \d+ días/);
    expect(asunto).toBe('El kiosco se pausa el 24 de octubre de 2026 · Tuercas & Pernos');
  });

  it('no repite un aviso que ya mandó', async () => {
    const { db, create } = falso([fila('s1')], ['s1:']);
    await avisarSuscripcionesDeTodas(log, DIA_9, db);
    expect(enviarCorreo).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('sin administradores activos, le escribe al correo de la empresa', async () => {
    const { db } = falso([fila('s1', { usuarios: [] })]);
    await avisarSuscripcionesDeTodas(log, DIA_9, db);
    expect((enviarCorreo.mock.calls[0][0] as { para: string }).para).toBe('contacto@tuercas.co');
  });

  it('si el correo falla, no lo da por enviado y sigue con las demás', async () => {
    enviarCorreo.mockRejectedValueOnce(new Error('SMTP caído'));
    const { db, create } = falso([fila('s1'), fila('s2', { id: 'e-s2' })]);
    await avisarSuscripcionesDeTodas(log, DIA_9, db);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.empresaId).toBe('e-s2');
    expect(log.error).toHaveBeenCalled();
  });

  it('deja huella en el log aunque no haya nada que avisar', async () => {
    const { db } = falso([fila('s1')]);
    await avisarSuscripcionesDeTodas(log, bog(2026, 10, 5), db);
    expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/0 enviados de 1 revisadas/));
  });
});
