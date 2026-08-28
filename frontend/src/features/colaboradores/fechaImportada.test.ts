import { describe, it, expect } from 'vitest';
import { normalizarFecha } from './fechaImportada';

describe('la fecha de nacimiento que viene de un Excel', () => {
  it('una celda de fecha de verdad llega como Date y no hay nada que adivinar', () => {
    // Con cellDates, SheetJS entrega el valor real de la celda. Ahí no hay
    // ambigüedad de formato: el 11 de diciembre es el 11 de diciembre.
    expect(normalizarFecha(new Date(1985, 11, 11))).toBe('1985-12-11');
  });

  it('lo que ya viene bien se deja igual', () => {
    expect(normalizarFecha('1990-05-20')).toBe('1990-05-20');
  });

  it('cuando un número no puede ser mes, no hay duda de cuál es el día', () => {
    // 3/15/94: el 15 no es un mes, así que es mes/día. 15/3/94 al revés.
    expect(normalizarFecha('3/15/94')).toBe('1994-03-15');
    expect(normalizarFecha('15/3/94')).toBe('1994-03-15');
    expect(normalizarFecha('1/28/88')).toBe('1988-01-28');
  });

  it('cuando los dos podrían ser mes, manda la forma colombiana: día primero', () => {
    // 11/12/85 es el 11 de diciembre, no el 12 de noviembre. Se elige una
    // regla y se dice cuál; adivinar por archivo daría fechas distintas para
    // la misma celda.
    expect(normalizarFecha('11/12/85')).toBe('1985-12-11');
    expect(normalizarFecha('05/07/1990')).toBe('1990-07-05');
  });

  it('el año de dos cifras se completa mirando el presente', () => {
    // 85 no puede ser 2085. 05 sí puede ser 2005.
    expect(normalizarFecha('01/01/85')).toBe('1985-01-01');
    expect(normalizarFecha('01/01/05')).toBe('2005-01-01');
  });

  it('los guiones y los puntos también se aceptan', () => {
    expect(normalizarFecha('11-12-1985')).toBe('1985-12-11');
    expect(normalizarFecha('11.12.1985')).toBe('1985-12-11');
  });

  it('una fecha que no existe no se inventa', () => {
    expect(normalizarFecha('31/02/1990')).toBe('31/02/1990');
    expect(normalizarFecha('45/45/45')).toBe('45/45/45');
  });

  it('lo que no es una fecha se devuelve tal cual, para que se vea y se corrija', () => {
    // Borrarlo escondería que alguien escribió algo ahí.
    expect(normalizarFecha('ayer')).toBe('ayer');
    expect(normalizarFecha('N/A')).toBe('N/A');
  });

  it('lo vacío sigue vacío', () => {
    expect(normalizarFecha('')).toBe('');
    expect(normalizarFecha(null)).toBe('');
    expect(normalizarFecha(undefined)).toBe('');
  });

  it('recorta los espacios que arrastra Excel', () => {
    expect(normalizarFecha('  1990-05-20  ')).toBe('1990-05-20');
  });
});
