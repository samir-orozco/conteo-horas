import { describe, it, expect } from 'vitest';
import { enPalabras, diasDeVinculacion, type Hito } from './tiempoVinculado';

const f = (iso: string) => iso + 'T05:00:00.000Z';
const hito = (tipo: Hito['tipo'], fecha: string): Hito => ({ tipo, fecha: f(fecha) });
const hoy = new Date('2026-08-27T15:00:00.000Z');

describe('los días que estuvo vinculado', () => {
  it('sin movimientos no hay nada que contar', () => {
    expect(diasDeVinculacion([], hoy)).toBe(0);
  });

  it('entró y salió el mismo día: cuenta un día', () => {
    expect(diasDeVinculacion([
      hito('RETIRO', '2026-08-24'), hito('INGRESO', '2026-08-24'),
    ], hoy)).toBe(1);
  });

  it('un período cerrado cuenta los dos extremos', () => {
    expect(diasDeVinculacion([
      hito('RETIRO', '2026-08-10'), hito('INGRESO', '2026-08-01'),
    ], hoy)).toBe(10);
  });

  it('quien sigue trabajando cuenta hasta hoy', () => {
    expect(diasDeVinculacion([hito('INGRESO', '2026-08-01')], hoy)).toBe(27);
  });

  it('NO cuenta el tiempo que estuvo por fuera: esa es la razón de existir de esta función', () => {
    // Entró, se fue cuatro años, volvió. Contar de punta a punta diría más de
    // cuatro años de antigüedad para alguien que trabajó dos meses.
    const dias = diasDeVinculacion([
      hito('RETIRO', '2026-08-24'),
      hito('REINGRESO', '2026-08-20'),
      hito('RETIRO', '2022-03-10'),
      hito('INGRESO', '2022-01-10'),
    ], hoy);
    expect(dias).toBe(60 + 5); // 10 ene a 10 mar de 2022, y 20 a 24 de ago de 2026
  });

  it('suma todas las etapas, no solo la última', () => {
    expect(diasDeVinculacion([
      hito('RETIRO', '2026-01-10'), hito('REINGRESO', '2026-01-01'),
      hito('RETIRO', '2025-01-10'), hito('INGRESO', '2025-01-01'),
    ], hoy)).toBe(20);
  });

  it('un retiro sin ingreso abierto no resta ni rompe', () => {
    expect(diasDeVinculacion([hito('RETIRO', '2026-08-24')], hoy)).toBe(0);
  });

  it('dos aperturas seguidas no abren dos períodos', () => {
    // Un reingreso registrado por error sobre alguien que ya estaba activo no
    // puede hacer que su antigüedad se cuente dos veces.
    expect(diasDeVinculacion([
      hito('RETIRO', '2026-08-10'),
      hito('REINGRESO', '2026-08-05'),
      hito('INGRESO', '2026-08-01'),
    ], hoy)).toBe(10);
  });

  it('le da igual en qué orden lleguen del servidor', () => {
    const asc: Hito[] = [hito('INGRESO', '2026-08-01'), hito('RETIRO', '2026-08-10')];
    const desc: Hito[] = [hito('RETIRO', '2026-08-10'), hito('INGRESO', '2026-08-01')];
    expect(diasDeVinculacion(asc, hoy)).toBe(diasDeVinculacion(desc, hoy));
  });
});

describe('cómo se dicen esos días', () => {
  it('en cero no dice "0 días", dice que no se sabe', () => {
    expect(enPalabras(0)).toBe('—');
  });

  it('un día es un día', () => {
    expect(enPalabras(1)).toBe('1 día');
    expect(enPalabras(15)).toBe('15 días');
  });

  it('de un mes en adelante, en meses', () => {
    expect(enPalabras(31)).toBe('1 mes');
    expect(enPalabras(180)).toBe('6 meses');
  });

  it('del año en adelante, en años', () => {
    expect(enPalabras(365)).toBe('1 año');
    expect(enPalabras(1095)).toBe('3 años');
  });

  it('años y meses se dicen con todas las letras, no como un rango', () => {
    // "5 a 6 m" se lee como "de 5 a 6 meses", que es otra cosa.
    expect(enPalabras(2009)).toBe('5 años y 6 meses');
    expect(enPalabras(425)).toBe('1 año y 2 meses');
  });
});
