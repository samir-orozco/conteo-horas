import { describe, it, expect } from 'vitest';
import { filtrosDeEventos, rangoDeBorrado, csvDeEventos, BORRADO_SIN_ALCANCE } from './consultaDeEventos';

// La suite corre fijada en América/Los Ángeles (CLAUDE.md §8.1), así que un rango mal anclado se
// nota aquí y no en producción. Las fechas esperadas se escriben en UTC explícito.

describe('filtrosDeEventos', () => {
  it('sin filtros no impone ninguna condición', () => {
    expect(filtrosDeEventos({}).where).toEqual({});
  });

  it('filtra por pestaña', () => {
    expect(filtrosDeEventos({ tipo: 'ERROR' }).where).toEqual({ tipo: 'ERROR' });
  });

  it('un tipo inventado no se pasa a la consulta', () => {
    expect(filtrosDeEventos({ tipo: 'CUALQUIER_COSA' }).where).toEqual({});
  });

  it('filtra por empresa', () => {
    expect(filtrosDeEventos({ empresaId: 'ckv123abc456def789ghi012j' }).where)
      .toEqual({ empresaId: 'ckv123abc456def789ghi012j' });
  });

  it('el buscador mira mensaje, ruta, IP y quién lo hizo', () => {
    const { where } = filtrosDeEventos({ buscar: '45.153.160.8' });
    expect(where.OR).toEqual([
      { mensaje: { contains: '45.153.160.8' } },
      { ruta: { contains: '45.153.160.8' } },
      { ip: { contains: '45.153.160.8' } },
      { usuarioEmail: { contains: '45.153.160.8' } },
      { empresaNombre: { contains: '45.153.160.8' } },
    ]);
  });

  it('el rango de fechas se ancla a medianoche de BOGOTÁ e incluye el último día completo', () => {
    const { where } = filtrosDeEventos({ desde: '2026-09-01', hasta: '2026-09-15' });
    expect(where.ultimaVez).toEqual({
      gte: new Date(Date.UTC(2026, 8, 1, 5, 0, 0)),
      lt: new Date(Date.UTC(2026, 8, 16, 5, 0, 0)),
    });
  });

  it('un evento de las 8 de la noche del último día del rango entra', () => {
    const { where } = filtrosDeEventos({ desde: '2026-09-15', hasta: '2026-09-15' });
    const alas8DeLaNocheEnBogota = new Date(Date.UTC(2026, 8, 16, 1, 0, 0));
    expect(alas8DeLaNocheEnBogota >= (where.ultimaVez as { gte: Date }).gte).toBe(true);
    expect(alas8DeLaNocheEnBogota < (where.ultimaVez as { lt: Date }).lt).toBe(true);
  });

  it('pagina con un tope, para que una página no se traiga la tabla entera', () => {
    expect(filtrosDeEventos({}).take).toBe(50);
    expect(filtrosDeEventos({ limite: '20' }).take).toBe(20);
    expect(filtrosDeEventos({ limite: '99999' }).take).toBe(200);
    expect(filtrosDeEventos({ limite: 'melón' }).take).toBe(50);
    expect(filtrosDeEventos({ pagina: '3' }).skip).toBe(100);
    expect(filtrosDeEventos({ pagina: '0' }).skip).toBe(0);
  });
});

describe('rangoDeBorrado', () => {
  it('sin alcance NO borra: un botón mal pulsado no puede vaciar el registro', () => {
    expect(rangoDeBorrado({})).toBe(BORRADO_SIN_ALCANCE);
    expect(rangoDeBorrado({ tipo: 'ERROR' })).toBe(BORRADO_SIN_ALCANCE);
  });

  it('borrar todo hay que pedirlo con esas palabras', () => {
    expect(rangoDeBorrado({ todo: true })).toEqual({ where: {} });
  });

  it('borra un período, anclado a Bogotá como el filtro', () => {
    expect(rangoDeBorrado({ desde: '2026-01-01', hasta: '2026-06-30' })).toEqual({
      where: { ultimaVez: { gte: new Date(Date.UTC(2026, 0, 1, 5, 0, 0)), lt: new Date(Date.UTC(2026, 6, 1, 5, 0, 0)) } },
    });
  });

  it('un período puede limitarse a una pestaña', () => {
    const r = rangoDeBorrado({ desde: '2026-01-01', hasta: '2026-01-31', tipo: 'ACCESO' });
    expect(r).not.toBe(BORRADO_SIN_ALCANCE);
    expect((r as { where: Record<string, unknown> }).where.tipo).toBe('ACCESO');
  });

  it('borra filas sueltas por su id', () => {
    expect(rangoDeBorrado({ ids: ['a1', 'b2'] })).toEqual({ where: { id: { in: ['a1', 'b2'] } } });
    expect(rangoDeBorrado({ ids: [] })).toBe(BORRADO_SIN_ALCANCE);
  });

  it('una fecha que no es una fecha no borra nada', () => {
    expect(rangoDeBorrado({ desde: 'ayer', hasta: 'hoy' })).toBe(BORRADO_SIN_ALCANCE);
    expect(rangoDeBorrado({ desde: '2026-01-01' })).toBe(BORRADO_SIN_ALCANCE);
  });

  it('un rango al revés no borra nada', () => {
    expect(rangoDeBorrado({ desde: '2026-06-30', hasta: '2026-01-01' })).toBe(BORRADO_SIN_ALCANCE);
  });
});

describe('csvDeEventos', () => {
  const evento = {
    tipo: 'ERROR', origen: 'SERVIDOR', veces: 3,
    primeraVez: new Date(Date.UTC(2026, 8, 23, 17, 22, 0)),
    ultimaVez: new Date(Date.UTC(2026, 8, 23, 19, 5, 0)),
    metodo: 'POST', ruta: '/api/registros', estado: 500,
    mensaje: 'Unique constraint failed', ip: '190.24.1.1',
    usuarioEmail: 'ana@empresa.co', empresaNombre: 'Ferretería La 30', navegador: 'Mozilla/5.0',
  };

  it('lleva encabezado y una línea por evento', () => {
    const csv = csvDeEventos([evento, evento]);
    expect(csv.split('\n')).toHaveLength(3);
    expect(csv.split('\n')[0]).toContain('Veces');
  });

  it('las fechas se escriben en hora de BOGOTÁ, que es la que reconoce quien lee', () => {
    // 19:05 UTC = 2:05 p.m. en Bogotá. La suite corre en Los Ángeles: sin zona explícita saldrían
    // las 12:05 y nadie lo notaría desde Colombia (CLAUDE.md §8.1).
    expect(csvDeEventos([evento])).toContain('2026-09-23 14:05');
  });

  it('una coma o una comilla dentro de un mensaje no parte la columna', () => {
    const csv = csvDeEventos([{ ...evento, mensaje: 'Falló al leer "salario", del colaborador' }]);
    expect(csv).toContain('"Falló al leer ""salario"", del colaborador"');
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('un salto de línea dentro de un mensaje tampoco', () => {
    const csv = csvDeEventos([{ ...evento, mensaje: 'primera\nsegunda' }]);
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('un campo vacío sale vacío, no como "null"', () => {
    const csv = csvDeEventos([{ ...evento, ip: null, usuarioEmail: null, empresaNombre: null }]);
    expect(csv).not.toContain('null');
  });
});
