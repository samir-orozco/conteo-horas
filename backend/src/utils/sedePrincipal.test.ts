import { describe, it, expect } from 'vitest';
import { sedePrincipal, sedesParaGuardar, sedeDeMarcaSinUbicacion, type SedeParaElegir } from './sedePrincipal';

// DECISIÓN DEL DUEÑO (11 de septiembre de 2026): un trabajador PRESENCIAL siempre
// tiene sede. «Sin sede» solo tiene sentido para híbridos y remotos. En producción
// había 10 empresas sin ninguna sede, 33 presenciales activos sin sede y 499 de
// 1.055 marcaciones de presenciales sin sede, porque nada lo aseguraba: ni al
// crear la empresa, ni al crear al trabajador, ni el kiosco cuando las sedes no
// tienen ubicación configurada.

const dia = (d: number) => new Date(Date.UTC(2026, 7, d, 17));
const sede = (id: string, d: number, activa = true): SedeParaElegir => ({ id, activa, creadoEn: dia(d) });

const PRINCIPAL = sede('principal', 1);
const NORTE = sede('norte', 10);
const SUR = sede('sur', 20);

describe('cuál es la Sede principal de una empresa', () => {
  it('es la sede activa más antigua', () => {
    expect(sedePrincipal([NORTE, PRINCIPAL, SUR])).toBe('principal');
  });

  it('una sede desactivada no es la principal aunque sea la más antigua', () => {
    expect(sedePrincipal([sede('vieja', 1, false), NORTE, SUR])).toBe('norte');
  });

  it('con dos creadas en el mismo instante, decide el id, para que no dependa del orden', () => {
    expect(sedePrincipal([sede('b', 5), sede('a', 5)])).toBe('a');
    expect(sedePrincipal([sede('a', 5), sede('b', 5)])).toBe('a');
  });

  it('sin sedes activas no hay principal', () => {
    expect(sedePrincipal([])).toBeNull();
    expect(sedePrincipal([sede('cerrada', 1, false)])).toBeNull();
  });
});

describe('las sedes que quedan guardadas al crear o editar a alguien', () => {
  it('un presencial sin sede queda en la principal', () => {
    expect(sedesParaGuardar('PRESENCIAL', [], 'principal')).toEqual(['principal']);
  });

  it('un presencial con sedes elegidas se queda con las suyas', () => {
    expect(sedesParaGuardar('PRESENCIAL', ['norte', 'sur'], 'principal')).toEqual(['norte', 'sur']);
  });

  it('un híbrido o un remoto sin sede siguen sin sede: ahí «Sin sede» es un dato', () => {
    expect(sedesParaGuardar('HIBRIDO', [], 'principal')).toEqual([]);
    expect(sedesParaGuardar('REMOTO', [], 'principal')).toEqual([]);
  });

  it('si la empresa no tiene ninguna sede activa no hay a dónde asignarlo', () => {
    expect(sedesParaGuardar('PRESENCIAL', [], null)).toEqual([]);
  });
});

describe('la sede de una marca cuando la ubicación no la identificó', () => {
  const base = { modalidad: 'PRESENCIAL', sedeIdentificada: null, asignadas: [] as SedeParaElegir[], principal: 'principal' };

  it('si la ubicación identificó una sede, manda esa, sea o no la principal', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, sedeIdentificada: 'norte', asignadas: [PRINCIPAL, NORTE] })).toBe('norte');
  });

  it('un presencial con una sola sede marca en esa', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [NORTE] })).toBe('norte');
  });

  it('con varias sedes y una es la principal, marca en la principal', () => {
    // Decisión del dueño: sin ubicación no se puede saber en cuál de las suyas está.
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [NORTE, PRINCIPAL] })).toBe('principal');
  });

  it('con varias sedes y ninguna es la principal, marca en la más antigua de las suyas', () => {
    // No en la principal de la empresa: ahí esta persona no trabaja.
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [SUR, NORTE] })).toBe('norte');
  });

  it('las sedes desactivadas no cuentan', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [sede('cerrada', 2, false), SUR] })).toBe('sur');
  });

  it('un presencial sin ninguna sede activa marca en la principal de la empresa', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [] })).toBe('principal');
    expect(sedeDeMarcaSinUbicacion({ ...base, asignadas: [sede('cerrada', 2, false)] })).toBe('principal');
  });

  it('si la empresa no tiene ninguna sede, la marca queda sin sede', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, principal: null })).toBeNull();
  });

  it('un híbrido o un remoto que no estaba en ninguna sede siguen sin sede', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, modalidad: 'HIBRIDO', asignadas: [NORTE] })).toBeNull();
    expect(sedeDeMarcaSinUbicacion({ ...base, modalidad: 'REMOTO', asignadas: [NORTE] })).toBeNull();
  });

  it('al completar una jornada a mano, el presencial sigue en la sede donde la abrió', () => {
    // El administrador agrega el regreso del almuerzo: la tarde no pasó por el
    // kiosco, pero la mañana sí, y dice dónde estaba.
    expect(sedeDeMarcaSinUbicacion({ ...base, sedeDeLaJornada: 'sur', asignadas: [NORTE, SUR] })).toBe('sur');
  });

  it('a un híbrido no se le supone la sede de la mañana para la tarde', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, modalidad: 'HIBRIDO', sedeDeLaJornada: 'norte', asignadas: [NORTE] })).toBeNull();
  });

  it('un híbrido que sí estaba en una de sus sedes conserva esa', () => {
    expect(sedeDeMarcaSinUbicacion({ ...base, modalidad: 'HIBRIDO', sedeIdentificada: 'norte', asignadas: [NORTE] })).toBe('norte');
  });
});
