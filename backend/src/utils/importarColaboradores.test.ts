import { describe, it, expect } from 'vitest';
import { validarImportacion, COLUMNAS_FORMATO, type ContextoImportacion } from './importarColaboradores';

const ctx = (over: Partial<ContextoImportacion> = {}): ContextoImportacion => ({
  horariosValidos: new Set(['h1', 'h2']),
  cedulasActivas: new Set<string>(),
  cedulasRetiradas: new Set<string>(),
  cupoDisponible: 100,
  ...over,
});

const fila = (over: Record<string, unknown> = {}) => ({
  nombre: 'Ana', apellido: 'Gómez', cedula: '1020304050',
  cargo: 'Vigilante', salarioMensual: '1750905', email: '', telefono: '',
  fechaNacimiento: '', horarioId: '', ...over,
});

const errores = (r: ReturnType<typeof validarImportacion>) => r.errores.map(e => `${e.fila}:${e.campo}`);

describe('el formato que se descarga', () => {
  it('declara las columnas que el validador espera, para que no se desincronicen', () => {
    expect(COLUMNAS_FORMATO.map(c => c.clave)).toContain('cedula');
    expect(COLUMNAS_FORMATO.map(c => c.clave)).toContain('salarioMensual');
    for (const c of COLUMNAS_FORMATO) expect(c.titulo.length).toBeGreaterThan(0);
  });
});

describe('la validación de una carga masiva', () => {
  it('una fila completa y correcta pasa', () => {
    const r = validarImportacion([fila()], ctx());
    expect(r.errores).toEqual([]);
    expect(r.validas).toHaveLength(1);
    expect(r.validas[0].salarioMensual).toBe(1750905);
  });

  it('exige lo que de verdad hace falta para pagarle a alguien', () => {
    const r = validarImportacion([fila({ nombre: '', apellido: '  ', cedula: '', salarioMensual: '' })], ctx());
    expect(errores(r)).toEqual(
      expect.arrayContaining(['2:nombre', '2:apellido', '2:cedula', '2:salarioMensual']));
  });

  it('numera las filas como las ve la persona en Excel, contando el encabezado', () => {
    // La primera fila de datos es la 2 en la hoja. Decir "error en la fila 1"
    // manda a corregir el encabezado.
    const r = validarImportacion([fila(), fila({ cedula: '' })], ctx());
    expect(r.errores[0].fila).toBe(3);
  });

  it('la cédula tiene que ser un número, no un texto cualquiera', () => {
    expect(errores(validarImportacion([fila({ cedula: 'AB-123' })], ctx()))).toContain('2:cedula');
    expect(validarImportacion([fila({ cedula: ' 1020304050 ' })], ctx()).errores).toEqual([]);
  });

  it('una cédula repetida DENTRO del archivo se caza antes de crear nada', () => {
    // Si no, se crearía la primera y la segunda fallaría a mitad de camino.
    const r = validarImportacion([fila(), fila({ cedula: '1020304050', nombre: 'Otro' })], ctx());
    expect(errores(r)).toContain('3:cedula');
    expect(r.errores[0].mensaje).toMatch(/repetida/i);
  });

  it('una cédula que ya trabaja en la empresa no se vuelve a crear', () => {
    const r = validarImportacion([fila()], ctx({ cedulasActivas: new Set(['1020304050']) }));
    expect(errores(r)).toContain('2:cedula');
    expect(r.errores[0].mensaje).toMatch(/ya está/i);
  });

  it('el salario acepta lo que la gente escribe de verdad', () => {
    // En Excel el salario suele venir con puntos, con signo, o como número.
    for (const v of ['1.750.905', '$ 1.750.905', 1750905, '1750905']) {
      const r = validarImportacion([fila({ salarioMensual: v })], ctx());
      expect(r.errores).toEqual([]);
      expect(r.validas[0].salarioMensual).toBe(1750905);
    }
  });

  it('un salario que no es un número, o es cero, no pasa', () => {
    expect(errores(validarImportacion([fila({ salarioMensual: 'mínimo' })], ctx()))).toContain('2:salarioMensual');
    expect(errores(validarImportacion([fila({ salarioMensual: '0' })], ctx()))).toContain('2:salarioMensual');
    expect(errores(validarImportacion([fila({ salarioMensual: '-100' })], ctx()))).toContain('2:salarioMensual');
  });

  it('el correo, si viene, tiene que parecer un correo', () => {
    expect(errores(validarImportacion([fila({ email: 'no-es-correo' })], ctx()))).toContain('2:email');
    expect(validarImportacion([fila({ email: 'ana@empresa.co' })], ctx()).errores).toEqual([]);
    expect(validarImportacion([fila({ email: '' })], ctx()).errores).toEqual([]);
  });

  it('el horario llega elegido desde la pantalla, no escrito en el Excel', () => {
    // Escribirlo a mano en una celda obligaba a copiar el nombre exacto. Se
    // elige de una lista, así que llega como id.
    const r = validarImportacion([fila({ horarioId: 'h1' })], ctx());
    expect(r.errores).toEqual([]);
    expect(r.validas[0].horarioId).toBe('h1');
  });

  it('un horario de otra empresa no pasa, aunque venga en la petición', () => {
    // El id viaja desde el navegador. Que la lista solo ofrezca los propios no
    // impide que alguien mande otro a mano.
    const r = validarImportacion([fila({ horarioId: 'de-otra-empresa' })], ctx());
    expect(errores(r)).toContain('2:horarioId');
  });

  it('sin horario se crea igual: se puede asignar después', () => {
    const r = validarImportacion([fila({ horarioId: '' })], ctx());
    expect(r.errores).toEqual([]);
    expect(r.validas[0].horarioId).toBeNull();
  });

  it('el formato que se descarga ya no trae columna de horario', () => {
    expect(COLUMNAS_FORMATO.map(c => c.clave)).not.toContain('horario');
  });

  it('la fecha de nacimiento, si viene, tiene que ser una fecha real', () => {
    expect(errores(validarImportacion([fila({ fechaNacimiento: '1990-13-45' })], ctx()))).toContain('2:fechaNacimiento');
    expect(errores(validarImportacion([fila({ fechaNacimiento: 'ayer' })], ctx()))).toContain('2:fechaNacimiento');
    expect(validarImportacion([fila({ fechaNacimiento: '1990-05-20' })], ctx()).errores).toEqual([]);
  });

  it('una fila completamente vacía se ignora, no se reporta como error', () => {
    // Excel arrastra filas vacías al final todo el tiempo.
    const vacia = { nombre: '', apellido: '', cedula: '', cargo: '', salarioMensual: '', email: '', telefono: '', fechaNacimiento: '', horarioId: '' };
    const r = validarImportacion([fila(), vacia, vacia], ctx());
    expect(r.errores).toEqual([]);
    expect(r.validas).toHaveLength(1);
  });

  it('si no caben en el plan lo dice con números, y no crea a medias', () => {
    const r = validarImportacion([fila(), fila({ cedula: '2' }), fila({ cedula: '3' })], ctx({ cupoDisponible: 2 }));
    expect(r.excedeCupo).toBe(true);
    expect(r.cupoDisponible).toBe(2);
    expect(r.validas).toHaveLength(3);
  });

  it('con cupo de sobra no se queja', () => {
    expect(validarImportacion([fila()], ctx({ cupoDisponible: 5 })).excedeCupo).toBe(false);
  });

  it('un archivo sin ninguna fila con datos se dice claro', () => {
    const r = validarImportacion([], ctx());
    expect(r.validas).toEqual([]);
    expect(r.vacio).toBe(true);
  });

  it('recorta los espacios y no guarda basura', () => {
    const r = validarImportacion([fila({ nombre: '  Ana  ', cargo: '  Vigilante  ' })], ctx());
    expect(r.validas[0].nombre).toBe('Ana');
    expect(r.validas[0].cargo).toBe('Vigilante');
  });

  it('una fila con errores NO cuenta como válida', () => {
    // "validas" es lo que el endpoint va a crear. Si una fila rota entra ahí,
    // se crea un colaborador sin salario o con una cédula que no lo es.
    const r = validarImportacion([fila(), fila({ cedula: 'AB-123', nombre: 'Rota' })], ctx());
    expect(r.errores).toHaveLength(1);
    expect(r.validas).toHaveLength(1);
    expect(r.validas[0].nombre).toBe('Ana');
  });

  it('el cupo se mide contra las filas con datos, no contra las que sirven', () => {
    // Si el archivo trae 5 filas y 2 están rotas, no caben 5: hay que arreglar
    // las 2 y volver a subir las 5. Decir "caben 3" invita a subir a medias.
    const rotas = [fila({ cedula: 'X' }), fila({ cedula: 'Y' })];
    const r = validarImportacion([fila(), ...rotas], ctx({ cupoDisponible: 2 }));
    expect(r.excedeCupo).toBe(true);
  });

  it('una cédula de alguien retirado no se crea de nuevo: se reingresa', () => {
    // Sin esto la fila pasa la validación y revienta contra la restricción de
    // cédula única a mitad de la creación. Y crear una ficha nueva le borraría
    // el historial a alguien que ya trabajó ahí.
    const r = validarImportacion([fila()], ctx({ cedulasRetiradas: new Set(['1020304050']) }));
    expect(errores(r)).toContain('2:cedula');
    expect(r.errores[0].mensaje).toMatch(/retirad/i);
    expect(r.errores[0].mensaje).toMatch(/reingres/i);
  });

  it('dice cuántas filas con datos trae el archivo, no cuántas sirven', () => {
    // El mensaje de cupo habla del archivo: "trae 5 y te caben 2". Contar solo
    // las buenas diría "trae 3" y no cuadraría con lo que la persona ve.
    const r = validarImportacion([fila(), fila({ cedula: 'X' }), fila({ cedula: '9' })], ctx());
    expect(r.conDatos).toBe(3);
    expect(r.validas).toHaveLength(2);
  });
});
