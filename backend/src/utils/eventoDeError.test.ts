import { describe, it, expect } from 'vitest';
import { eventoDeError, eventoDeNavegador } from './eventoDeError';

const peticion = {
  metodo: 'POST',
  url: '/api/colaboradores/ckv123abc456def789ghi012j/horario?desde=2026-09-01',
  ip: '190.24.1.1',
  navegador: 'Mozilla/5.0 (Macintosh)',
  usuario: { id: 'u1', email: 'ana@empresa.co', nombre: 'Ana Ruiz' },
  empresa: { id: 'e1', nombre: 'Ferretería La 30' },
};

describe('eventoDeError', () => {
  it('el título es la primera línea; el rastro completo va al detalle', () => {
    const err = new Error("Cannot read properties of null (reading 'salario')");
    err.stack = "TypeError: Cannot read properties of null\n    at liquidar (/srv/app/dist/utils/liquidar.js:12:5)";
    const e = eventoDeError(err, peticion);
    expect(e.mensaje).toBe("Cannot read properties of null (reading 'salario')");
    expect(e.detalle).toContain('at liquidar');
  });

  it('guarda quién lo sufrió y desde dónde, que es lo que permite reproducirlo', () => {
    const e = eventoDeError(new Error('x'), peticion);
    expect(e.ip).toBe('190.24.1.1');
    expect(e.usuarioEmail).toBe('ana@empresa.co');
    expect(e.empresaNombre).toBe('Ferretería La 30');
    expect(e.metodo).toBe('POST');
    expect(e.ruta).toBe('/api/colaboradores/ckv123abc456def789ghi012j/horario');
  });

  it('la consulta de Prisma se conserva entera: sin ella el error no se diagnostica', () => {
    const err = new Error('Invalid `prisma.registro.create()` invocation:\n\nUnique constraint failed on the fields: (`colaboradorId`,`fecha`)');
    const e = eventoDeError(err, peticion);
    expect(e.detalle).toContain('Unique constraint failed');
  });

  it('el mismo fallo con distinto colaborador es UNA sola fila', () => {
    const err = new Error("Cannot read properties of null (reading 'salario')");
    const a = eventoDeError(err, peticion);
    const b = eventoDeError(err, { ...peticion, url: '/api/colaboradores/cm4x8k2p90001abcdefghijkl/horario' });
    expect(a.huella).toBe(b.huella);
  });

  it('sin sesión, sin rastro y sin petición no revienta', () => {
    const e = eventoDeError(new Error('algo'), {});
    expect(e.mensaje).toBe('algo');
    expect(e.usuarioEmail).toBeNull();
    expect(e.empresaId).toBeNull();
    expect(e.huella).toHaveLength(32);
  });

  it('lo que no es un Error tampoco', () => {
    const e = eventoDeError('se cayó' as never, {});
    expect(e.mensaje).toContain('se cayó');
  });

  it('un mensaje desmedido cabe en la columna', () => {
    const e = eventoDeError(new Error('x'.repeat(2000)), peticion);
    expect(e.mensaje.length).toBeLessThanOrEqual(500);
  });
});

describe('eventoDeNavegador', () => {
  it('queda marcado como venido del navegador, con la pantalla donde pasó', () => {
    const e = eventoDeNavegador(
      { mensaje: "undefined is not an object (evaluating 'c.nombre')", rastro: 'at Marcador.tsx:88', pantalla: '/marcador/abc123def456ghi' },
      { ip: '190.24.1.1', navegador: 'Mozilla/5.0 (Android 13)' },
    );
    expect(e.origen).toBe('NAVEGADOR');
    expect(e.ruta).toBe('/marcador/abc123def456ghi');
    expect(e.detalle).toContain('at Marcador.tsx:88');
    expect(e.navegador).toContain('Android');
  });

  it('el mismo fallo en el kiosco de dos empresas distintas es UNA fila', () => {
    const uno = eventoDeNavegador({ mensaje: 'La cámara no respondió', pantalla: '/marcador/abc123def456ghi' }, {});
    const otro = eventoDeNavegador({ mensaje: 'La cámara no respondió', pantalla: '/marcador/zzz999yyy888www' }, {});
    expect(uno.huella).toBe(otro.huella);
  });

  it('lo que manda un navegador no es de fiar: todo entra recortado', () => {
    const e = eventoDeNavegador({ mensaje: 'y'.repeat(9000), rastro: 'z'.repeat(99000), pantalla: '/app' }, {});
    expect(e.mensaje.length).toBeLessThanOrEqual(500);
    expect(e.detalle.length).toBeLessThanOrEqual(20000);
  });

  it('un reporte sin mensaje no crea una fila en blanco', () => {
    expect(eventoDeNavegador({ mensaje: '   ', pantalla: '/app' }, {})).toBeNull();
    expect(eventoDeNavegador({ pantalla: '/app' } as never, {})).toBeNull();
  });
});
