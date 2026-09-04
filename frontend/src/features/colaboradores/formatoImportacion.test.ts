import { describe, it, expect } from 'vitest';
import { mapearHoja, type Columna } from './formatoImportacion';

const COLUMNAS: Columna[] = [
  { clave: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana' },
  { clave: 'apellido', titulo: 'Apellido', obligatoria: true, ejemplo: 'Gómez' },
  { clave: 'cedula', titulo: 'Cédula', obligatoria: true, ejemplo: '123' },
  { clave: 'salarioMensual', titulo: 'Salario mensual', obligatoria: true, ejemplo: '1' },
  { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', obligatoria: false, ejemplo: '1990-05-20', tipo: 'fecha' },
];

describe('leer la hoja que subieron', () => {
  it('usa el encabezado para saber qué es cada columna', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual'],
      ['Ana', 'Gómez', '123', '1750905'],
    ], COLUMNAS);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ nombre: 'Ana', apellido: 'Gómez', cedula: '123', salarioMensual: '1750905' });
  });

  it('aguanta que muevan las columnas de lugar', () => {
    // La gente reordena. Casar por posición sería casar por suerte.
    const filas = mapearHoja([
      ['Cédula', 'Salario mensual', 'Nombre', 'Apellido'],
      ['123', '1750905', 'Ana', 'Gómez'],
    ], COLUMNAS);
    expect(filas[0]).toMatchObject({ cedula: '123', salarioMensual: '1750905', nombre: 'Ana', apellido: 'Gómez' });
  });

  it('no se rompe por tildes ni por mayúsculas', () => {
    // "CEDULA" sin tilde y en mayúsculas es lo que sale de la mitad de los
    // Excel que andan dando vueltas.
    const filas = mapearHoja([
      ['NOMBRE', 'apellido', 'CEDULA', 'Salario Mensual'],
      ['Ana', 'Gómez', '123', '1750905'],
    ], COLUMNAS);
    expect(filas[0].cedula).toBe('123');
    expect(filas[0].salarioMensual).toBe('1750905');
  });

  it('ignora columnas de más que alguien haya agregado', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual', 'Notas internas'],
      ['Ana', 'Gómez', '123', '1750905', 'lo que sea'],
    ], COLUMNAS);
    expect(filas[0]).not.toHaveProperty('Notas internas');
    // Solo las columnas declaradas, ni una más.
    expect(Object.keys(filas[0]).sort()).toEqual(COLUMNAS.map(c => c.clave).sort());
  });

  it('una columna que falta queda vacía, no rompe la lectura', () => {
    // El validador del servidor dirá que falta el salario. Aquí solo se lee.
    const filas = mapearHoja([['Nombre', 'Apellido', 'Cédula'], ['Ana', 'Gómez', '123']], COLUMNAS);
    expect(filas[0].salarioMensual).toBe('');
  });

  it('encuentra el encabezado aunque le hayan puesto un título arriba', () => {
    // Pasa siempre: alguien escribe "Colaboradores 2026" en la fila 1.
    const filas = mapearHoja([
      ['Colaboradores 2026', '', '', ''],
      [],
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual'],
      ['Ana', 'Gómez', '123', '1750905'],
    ], COLUMNAS);
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe('Ana');
  });

  it('los números que Excel guardó como números llegan como texto, sin notación rara', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual'],
      ['Ana', 'Gómez', 1020304050, 1750905],
    ], COLUMNAS);
    expect(filas[0].cedula).toBe('1020304050');
    expect(filas[0].salarioMensual).toBe('1750905');
  });

  it('descarta las filas vacías del final, que Excel arrastra siempre', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual'],
      ['Ana', 'Gómez', '123', '1750905'],
      [], ['', '', '', ''], [null, undefined, '', ''],
    ], COLUMNAS);
    expect(filas).toHaveLength(1);
  });

  it('sin encabezado reconocible no adivina: devuelve nada', () => {
    // Adivinar por posición crearía gente con el cargo en el nombre.
    expect(mapearHoja([['a', 'b', 'c'], ['1', '2', '3']], COLUMNAS)).toEqual([]);
  });

  it('una hoja vacía no revienta', () => {
    expect(mapearHoja([], COLUMNAS)).toEqual([]);
    expect(mapearHoja([[]], COLUMNAS)).toEqual([]);
  });

  it('las columnas de fecha se normalizan al leerlas, no al validarlas', () => {
    // Así la tabla muestra de una la fecha que se va a guardar, y quien mira
    // puede comprobar que "11/12/85" quedó como esperaba.
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual', 'Fecha de nacimiento'],
      ['Ana', 'Gómez', '123', '1750905', '11/12/85'],
      ['Luis', 'Paz', '456', '1750905', new Date(1994, 2, 15)],
    ], COLUMNAS);
    expect(filas[0].fechaNacimiento).toBe('1985-12-11');
    expect(filas[1].fechaNacimiento).toBe('1994-03-15');
  });

  it('lo que no es fecha se deja como vino, para que se vea y se corrija', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual', 'Fecha de nacimiento'],
      ['Ana', 'Gómez', '123', '1750905', 'no sé'],
    ], COLUMNAS);
    expect(filas[0].fechaNacimiento).toBe('no sé');
  });

  it('las columnas que no son fecha no se tocan', () => {
    const filas = mapearHoja([
      ['Nombre', 'Apellido', 'Cédula', 'Salario mensual'],
      ['11/12/85', 'Gómez', '123', '1750905'],
    ], COLUMNAS);
    expect(filas[0].nombre).toBe('11/12/85');
  });
});
