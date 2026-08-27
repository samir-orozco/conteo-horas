import { describe, it, expect } from 'vitest';
import { fechaLarga, fechaCorta, mesYAnio, fechaYHora } from './fechas';

// Estas pruebas solo prueban de verdad cuando corren en una zona horaria que
// NO es la de Bogotá. En Bogotá pasan con o sin el arreglo, porque la hora
// local coincide. Por eso vite.config.ts fija TZ en las pruebas.
describe('el formato de fechas para la persona que mira la pantalla', () => {
  it('la medianoche de Bogotá es ese día, no el anterior', () => {
    // Así se guarda toda fecha de vinculación: 05:00 UTC.
    expect(fechaLarga('2025-09-01T05:00:00.000Z')).toBe('1 de septiembre de 2025');
    expect(fechaLarga('2026-08-24T05:00:00.000Z')).toBe('24 de agosto de 2026');
  });

  it('las 11 de la noche en Bogotá siguen siendo el mismo día, no el siguiente', () => {
    // 2026-08-25T04:00:00Z son las 11:00 p.m. del 24 en Bogotá. Una máquina en
    // UTC diría 25 sin el timeZone explícito.
    expect(fechaLarga('2026-08-25T04:00:00.000Z')).toBe('24 de agosto de 2026');
  });

  it('la fecha corta también se ancla, que es la que va en las tablas', () => {
    expect(fechaCorta('2025-09-01T05:00:00.000Z')).toMatch(/1 de sept/);
    expect(fechaCorta('2025-09-01T05:00:00.000Z')).toMatch(/2025/);
    // 04:00Z son las 11 p.m. del día anterior en Bogotá.
    expect(fechaCorta('2026-08-25T04:00:00.000Z')).toMatch(/24 de ago/);
  });

  it('el mes y el año también se anclan', () => {
    expect(mesYAnio('2021-03-01T05:00:00.000Z')).toBe('marzo de 2021');
    expect(mesYAnio('2021-03-01T04:00:00.000Z')).toBe('febrero de 2021');
  });

  it('la fecha con hora dice la hora de Bogotá', () => {
    // 14:30 UTC son las 9:30 a. m. en Bogotá.
    const t = fechaYHora('2026-08-24T14:30:00.000Z');
    expect(t).toMatch(/24 de ago/);
    expect(t).toMatch(/9:30/);
  });
});
