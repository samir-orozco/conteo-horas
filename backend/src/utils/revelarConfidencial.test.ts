import { describe, it, expect } from 'vitest';
import { leerOrden, MOTIVO_MINIMO } from './revelarConfidencial';

// El comando del super admin para saber quién escribió una observación confidencial (4 de octubre de
// 2026). Solo se usa con orden de una autoridad: lo que se prueba aquí es que no se pueda correr sin
// decir por qué ni quién.

describe('leerOrden', () => {
  it('buscar: por NIT de la empresa y un pedazo del texto', () => {
    expect(leerOrden(['buscar', '--nit', '900123', '--texto', 'microondas']))
      .toEqual({ ok: true, accion: 'buscar', nit: '900123', texto: 'microondas' });
  });

  it('buscar sin NIT o sin texto no se acepta', () => {
    expect(leerOrden(['buscar', '--texto', 'microondas']).ok).toBe(false);
    expect(leerOrden(['buscar', '--nit', '900123']).ok).toBe(false);
  });

  it('revelar: la nota, el motivo y quién lo pide', () => {
    const motivo = 'Orden de la Fiscalía, radicado 2026-00123';
    expect(leerOrden(['revelar', '--nota', 'abc', '--motivo', motivo, '--quien', 'Samir Orozco']))
      .toEqual({ ok: true, accion: 'revelar', nota: 'abc', motivo, quien: 'Samir Orozco' });
  });

  it('revelar sin motivo, con un motivo corto, o sin quién, no se acepta', () => {
    expect(MOTIVO_MINIMO).toBe(20);
    expect(leerOrden(['revelar', '--nota', 'abc', '--quien', 'Samir']).ok).toBe(false);
    expect(leerOrden(['revelar', '--nota', 'abc', '--motivo', 'porque sí', '--quien', 'Samir']).ok).toBe(false);
    expect(leerOrden(['revelar', '--nota', 'abc', '--motivo', 'x'.repeat(20)]).ok).toBe(false);
  });

  it('un motivo con espacios de relleno no alcanza el mínimo', () => {
    expect(leerOrden(['revelar', '--nota', 'abc', '--motivo', `ab${' '.repeat(30)}`, '--quien', 'Samir']).ok).toBe(false);
  });

  it('una acción desconocida, o ninguna, explica cómo se usa', () => {
    const r = leerOrden(['borrar']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/buscar|revelar/);
    expect(leerOrden([]).ok).toBe(false);
  });

  it('una bandera sin valor no se toma como el valor de la siguiente', () => {
    expect(leerOrden(['buscar', '--nit', '--texto', 'microondas']).ok).toBe(false);
  });
});
