import { describe, it, expect } from 'vitest';
import { diaEnBogota } from './fechas.mjs';

// El día del calendario de Bogotá para un instante, como 'AAAA-MM-DD'.
//
// Las pruebas corren en America/Los_Angeles (vite.config.ts), así que hay dos formas
// de equivocarse y cada una tiene su caso: tomar el día en UTC, que es el defecto real
// (un build del 14 de septiembre de 2026 a las 21:20 escribió el 15 en el sitemap), y
// tomarlo en la zona de la máquina.

describe('diaEnBogota', () => {
  it('de noche en Bogotá sigue siendo el mismo día, aunque en UTC ya sea el siguiente', () => {
    // 21:20 del 14 en Bogotá son las 02:20 del 15 en UTC.
    expect(diaEnBogota(Date.UTC(2026, 8, 15, 2, 20))).toBe('2026-09-14');
  });

  it('pasada la medianoche de Bogotá es el día siguiente, aunque en la máquina todavía no', () => {
    // 00:30 del 15 en Bogotá son las 22:30 del 14 en Los Ángeles.
    expect(diaEnBogota(Date.UTC(2026, 8, 15, 5, 30))).toBe('2026-09-15');
  });

  it('cambia de día justo a la medianoche de Bogotá, las 05:00 UTC', () => {
    expect(diaEnBogota(Date.UTC(2026, 8, 15, 4, 59))).toBe('2026-09-14');
    expect(diaEnBogota(Date.UTC(2026, 8, 15, 5, 0))).toBe('2026-09-15');
  });

  it('el año también sale de Bogotá: la noche del 31 de diciembre no es 2027', () => {
    expect(diaEnBogota(Date.UTC(2027, 0, 1, 3, 0))).toBe('2026-12-31');
  });

  it('recibe un Date igual que un número, que es como lo llaman los scripts', () => {
    expect(diaEnBogota(new Date(Date.UTC(2026, 8, 15, 2, 20)))).toBe('2026-09-14');
  });
});
