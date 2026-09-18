import { describe, it, expect } from 'vitest';
import { normalizarVigencia, VIGENCIA_INVALIDA } from './vigenciaDelAuxilio';

// LO QUE EL SUPER ADMIN PUEDE GUARDAR COMO VIGENCIA DEL AUXILIO (17 de septiembre de 2026).
//
// Cada enero el gobierno fija por decreto el salario mínimo y el auxilio de transporte. Hasta hoy
// esos números vivían en el `seed`, así que actualizarlos exigía un despliegue. Pasan a una pantalla
// del super admin, y esto valida lo que llega de ella.
//
// La trampa de la fecha es real y ya mordió a este proyecto: `new Date('2027-01-01')` es medianoche
// UTC, que en Bogotá son las 7 de la tarde del 31 de diciembre. Guardado así, el decreto de 2027
// empezaría a regir un día antes y el reporte del 31 de diciembre saldría con los valores del año
// siguiente. Por eso la fecha se ancla a medianoche de BOGOTÁ, como hace el `seed`.

describe('normalizarVigencia: lo que se guarda', () => {
  it('ancla la fecha a medianoche de Bogotá, no a UTC', () => {
    const v = normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 270_000, tope: 3_800_000 });
    expect(v).not.toBe(VIGENCIA_INVALIDA);
    // Medianoche de Bogotá son las 05:00 UTC del mismo día.
    expect((v as { vigenteDesde: Date }).vigenteDesde.toISOString()).toBe('2027-01-01T05:00:00.000Z');
  });

  it('acepta los números tal como llegan del formulario, vengan como texto', () => {
    const v = normalizarVigencia({ vigenteDesde: '2027-01-01', valor: '270000', tope: '3800000' });
    expect(v).toMatchObject({ valor: 270_000, tope: 3_800_000 });
  });

  it('un auxilio en cero es válido: un gobierno podría no decretarlo', () => {
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 0, tope: 3_800_000 })).toMatchObject({ valor: 0 });
  });
});

describe('normalizarVigencia: lo que NO puede entrar', () => {
  it('sin fecha no hay vigencia', () => {
    expect(normalizarVigencia({ valor: 270_000, tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
  });

  it('una fecha que no se entiende se rechaza, en vez de guardar un Invalid Date', () => {
    expect(normalizarVigencia({ vigenteDesde: 'el año que viene', valor: 270_000, tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
  });

  it('un auxilio negativo se rechaza', () => {
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: -1, tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
  });

  it('un tope en cero o negativo se rechaza: nadie tendría derecho', () => {
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 270_000, tope: 0 })).toBe(VIGENCIA_INVALIDA);
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 270_000, tope: -1 })).toBe(VIGENCIA_INVALIDA);
    // Con el auxilio también en cero, la guarda de «el tope no puede ser menor que el auxilio» no
    // salta, así que este es el único caso que vigila de verdad la del tope en cero. Sin él, una
    // mutación que cambiara `tope <= 0` por `tope < 0` pasaba sin que nadie se enterara, y una
    // vigencia así dejaría a toda la plataforma sin derecho al auxilio.
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 0, tope: 0 })).toBe(VIGENCIA_INVALIDA);
  });

  it('un tope por debajo del propio auxilio se rechaza: no tiene sentido', () => {
    // El tope son dos salarios mínimos; el auxilio es una fracción de uno. Si llega al revés, es un
    // error de digitación y guardarlo dejaría a todo el mundo sin auxilio.
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 3_800_000, tope: 270_000 })).toBe(VIGENCIA_INVALIDA);
  });

  it('una fecha que no existe se rechaza, aunque tenga la forma correcta', () => {
    // `Date.UTC(2027, 1, 31)` no falla: se desborda al 3 de marzo. Sin comprobarlo, una vigencia
    // escrita mal quedaría guardada con una fecha distinta de la que se digitó.
    expect(normalizarVigencia({ vigenteDesde: '2027-02-31', valor: 270_000, tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
    expect(normalizarVigencia({ vigenteDesde: '2027-13-01', valor: 270_000, tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
  });

  it('un texto donde va un número se rechaza', () => {
    expect(normalizarVigencia({ vigenteDesde: '2027-01-01', valor: 'doscientos mil', tope: 3_800_000 })).toBe(VIGENCIA_INVALIDA);
  });
});
