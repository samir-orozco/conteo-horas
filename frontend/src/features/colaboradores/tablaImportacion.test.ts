import { describe, it, expect } from 'vitest';
import { filaVacia, mapaDeErrores, conValorGlobal, hayDatos, erroresSinFila, CLAVE_HORARIO, CLAVE_SEDE } from './tablaImportacion';
import type { Columna } from './formatoImportacion';

const COLUMNAS: Columna[] = [
  { clave: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana' },
  { clave: 'cedula', titulo: 'Cédula', obligatoria: true, ejemplo: '123' },
];

describe('una fila nueva de la tabla', () => {
  it('trae todas las columnas vacías, y el horario también', () => {
    expect(filaVacia(COLUMNAS)).toEqual({ nombre: '', cedula: '', [CLAVE_HORARIO]: '', [CLAVE_SEDE]: '' });
  });

  it('no comparte objeto con otra fila nueva', () => {
    // Si compartieran, escribir en una escribiría en todas.
    const a = filaVacia(COLUMNAS);
    a.nombre = 'Ana';
    expect(filaVacia(COLUMNAS).nombre).toBe('');
  });
});

describe('saber si una fila tiene algo escrito', () => {
  it('una fila en blanco no cuenta', () => {
    expect(hayDatos(filaVacia(COLUMNAS))).toBe(false);
  });

  it('con solo espacios tampoco', () => {
    expect(hayDatos({ nombre: '   ', cedula: '' })).toBe(false);
  });

  it('elegir horario o sede sin escribir nada más NO convierte la fila en real', () => {
    // Los selectores globales llenan esos campos en todas las filas, incluidas
    // las vacías del final. Si eso las volviera reales, el servidor las
    // reportaría como personas sin nombre y sin cédula.
    expect(hayDatos({ nombre: '', cedula: '', [CLAVE_HORARIO]: 'h1' })).toBe(false);
    expect(hayDatos({ nombre: '', cedula: '', [CLAVE_SEDE]: 's1' })).toBe(false);
  });

  it('con cualquier dato real sí cuenta', () => {
    expect(hayDatos({ nombre: 'Ana', cedula: '' })).toBe(true);
  });
});

describe('los errores, puestos en su celda', () => {
  it('se buscan por fila y campo', () => {
    const m = mapaDeErrores([
      { fila: 2, campo: 'cedula', mensaje: 'Falta la cédula.' },
      { fila: 5, campo: 'nombre', mensaje: 'Falta el nombre.' },
    ]);
    expect(m.get('0:cedula')).toBe('Falta la cédula.');
    expect(m.get('3:nombre')).toBe('Falta el nombre.');
  });

  it('la fila 2 de la hoja es la primera de la tabla', () => {
    // El servidor numera como Excel, contando el encabezado. La tabla numera
    // desde cero. Traducir mal corre todos los errores una fila.
    const m = mapaDeErrores([{ fila: 2, campo: 'nombre', mensaje: 'x' }]);
    expect(m.has('0:nombre')).toBe(true);
    expect(m.has('1:nombre')).toBe(false);
  });

  it('dos errores en la misma fila conviven', () => {
    const m = mapaDeErrores([
      { fila: 2, campo: 'nombre', mensaje: 'Falta el nombre.' },
      { fila: 2, campo: 'cedula', mensaje: 'Falta la cédula.' },
    ]);
    expect(m.size).toBe(2);
  });

  it('sin errores el mapa queda vacío', () => {
    expect(mapaDeErrores([]).size).toBe(0);
  });
});

describe('lo que se aplica a todos de un golpe', () => {
  const filas = [
    { nombre: 'Ana', cedula: '1', [CLAVE_HORARIO]: '' },
    { nombre: 'Luis', cedula: '2', [CLAVE_HORARIO]: 'h2' },
    { nombre: '', cedula: '', [CLAVE_HORARIO]: '' },
  ];

  it('se lo pone a todas las filas con datos', () => {
    const r = conValorGlobal(filas, CLAVE_HORARIO, 'h1');
    expect(r[0][CLAVE_HORARIO]).toBe('h1');
    expect(r[1][CLAVE_HORARIO]).toBe('h1');
  });

  it('pisa el que ya tenían: para eso se aplica a todos', () => {
    expect(conValorGlobal(filas, CLAVE_HORARIO, 'h1')[1][CLAVE_HORARIO]).toBe('h1');
  });

  it('no toca las filas vacías', () => {
    // Llenarlas las convertiría en filas a medio escribir.
    expect(conValorGlobal(filas, CLAVE_HORARIO, 'h1')[2][CLAVE_HORARIO]).toBe('');
  });

  it('elegir "sin horario" lo quita de todas', () => {
    const conAlgo = [{ nombre: 'Ana', cedula: '1', [CLAVE_HORARIO]: 'h2' }];
    expect(conValorGlobal(conAlgo, CLAVE_HORARIO, '')[0][CLAVE_HORARIO]).toBe('');
  });

  it('devuelve filas nuevas, no muta las que le dieron', () => {
    const original = [{ nombre: 'Ana', cedula: '1', [CLAVE_HORARIO]: '' }];
    conValorGlobal(original, CLAVE_HORARIO, 'h1');
    expect(original[0][CLAVE_HORARIO]).toBe('');
  });

  it('sirve igual para la sede', () => {
    const r = conValorGlobal(filas, CLAVE_SEDE, 's1');
    expect(r[0][CLAVE_SEDE]).toBe('s1');
    expect(r[2][CLAVE_SEDE]).toBeUndefined();
  });

  it('poner la sede no borra el horario que ya estaba', () => {
    const r = conValorGlobal(filas, CLAVE_SEDE, 's1');
    expect(r[1][CLAVE_HORARIO]).toBe('h2');
  });
});

describe('los errores cuando se borra una fila', () => {
  // Los errores se guardan por NÚMERO de fila. Al borrar la 1, la que era 2
  // pasa a ser 1: si no se corren, hereda un error que no es suyo y la persona
  // equivocada aparece marcada en rojo.
  const errores = () => new Map([
    ['0:cedula', 'La cédula de Ana ya existe.'],
    ['2:nombre', 'Falta el nombre de Luis.'],
    ['2:salarioMensual', 'Falta el salario de Luis.'],
  ]);

  it('el error de la fila borrada se va con ella', () => {
    const r = erroresSinFila(errores(), 0);
    expect(r.has('0:cedula')).toBe(false);
  });

  it('los de las filas de abajo se corren, no se quedan donde estaban', () => {
    const r = erroresSinFila(errores(), 0);
    expect(r.get('1:nombre')).toBe('Falta el nombre de Luis.');
    expect(r.get('1:salarioMensual')).toBe('Falta el salario de Luis.');
    expect(r.has('2:nombre')).toBe(false);
  });

  it('borrar una fila de abajo no toca las de arriba', () => {
    const r = erroresSinFila(errores(), 2);
    expect(r.get('0:cedula')).toBe('La cédula de Ana ya existe.');
    expect(r.size).toBe(1);
  });

  it('borrar una fila sin errores deja todo como estaba, solo corrido', () => {
    const r = erroresSinFila(errores(), 1);
    expect(r.get('0:cedula')).toBe('La cédula de Ana ya existe.');
    expect(r.get('1:nombre')).toBe('Falta el nombre de Luis.');
  });

  it('sin errores no hay nada que correr', () => {
    expect(erroresSinFila(new Map(), 0).size).toBe(0);
  });

  it('no muta el mapa que le dieron', () => {
    const original = errores();
    erroresSinFila(original, 0);
    expect(original.has('0:cedula')).toBe(true);
  });
});
