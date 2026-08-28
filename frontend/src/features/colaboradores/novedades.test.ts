import { describe, it, expect } from 'vitest';
import { aspectoDeNovedad, rangoDeNovedad } from './novedades';
import { TIPO_PERMISO_LABEL } from '../../constants/permisos';

describe('cómo se ve cada novedad en la línea de tiempo', () => {
  it('cada tipo que existe tiene su ícono: ninguno cae al genérico por olvido', () => {
    for (const tipo of Object.keys(TIPO_PERMISO_LABEL)) {
      expect(aspectoDeNovedad(tipo, true).icono).toBeTruthy();
    }
  });

  it('un tipo que no conocemos no rompe la lista', () => {
    expect(aspectoDeNovedad('INVENTADO', true).icono).toBeTruthy();
  });

  it('el color dice si está resuelta, que es lo que hay que mirar', () => {
    // El tipo ya se lee en el título. Lo que se busca de un vistazo es qué
    // falta por aprobar.
    expect(aspectoDeNovedad('VACACIONES', true).tono).toBe('verde');
    expect(aspectoDeNovedad('VACACIONES', false).tono).toBe('ambar');
  });

  it('la insignia dice el estado con palabras, no solo con color', () => {
    expect(aspectoDeNovedad('VACACIONES', true).insignia.texto).toBe('APROBADA');
    expect(aspectoDeNovedad('VACACIONES', false).insignia.texto).toBe('PENDIENTE');
  });
});

describe('el rango de fechas de una novedad', () => {
  const f = (iso: string) => iso + 'T05:00:00.000Z';

  it('un solo día no se escribe como un rango', () => {
    // "5 de mayo → 5 de mayo" se lee como un error de quien lo registró.
    expect(rangoDeNovedad(f('2026-05-05'), f('2026-05-05'))).toBe('5 de mayo de 2026 · 1 día');
  });

  it('un rango dice de cuándo a cuándo y cuántos días', () => {
    expect(rangoDeNovedad(f('2026-05-05'), f('2026-05-09')))
      .toBe('5 de mayo de 2026 → 9 de mayo de 2026 · 5 días');
  });

  it('cuenta los dos extremos: del lunes al viernes son cinco días, no cuatro', () => {
    expect(rangoDeNovedad(f('2026-05-04'), f('2026-05-08'))).toMatch(/5 días/);
  });

  it('cruza el cambio de mes y de año sin equivocarse', () => {
    expect(rangoDeNovedad(f('2025-12-28'), f('2026-01-03'))).toMatch(/7 días/);
  });

  it('las fechas se leen en hora de Bogotá, no en la del navegador', () => {
    // Se guardan a medianoche de Bogotá. Sin anclar, desde el occidente se
    // pintaría el día anterior.
    expect(rangoDeNovedad(f('2026-05-05'), f('2026-05-05'))).toMatch(/5 de mayo/);
  });
});
