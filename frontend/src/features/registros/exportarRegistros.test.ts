import { describe, it, expect } from 'vitest';
import { COLUMNAS_REGISTROS, filasDeRegistros, matrizDeEntradas, nombreDelArchivo } from './exportarRegistros';

// EL EXCEL DE LOS REGISTROS (4 de octubre de 2026, peticiones 7, 19 y 32 del dueño).
//
// Lo que baja es lo que se está viendo: la pantalla le pasa la lista ya filtrada.
// Aquí solo se decide QUÉ columnas lleva y cómo se escribe cada celda.
//
// Los minutos van como NÚMERO y no como «8h 0m»: una columna de texto no se
// puede sumar, y el archivo existe para sumarlo en otra parte.

const NORTE = { id: 's1', nombre: 'Norte' };
const SUR = { id: 's2', nombre: 'Sur' };

// DOS COLUMNAS DE SEDE, y no se parecen (9 de octubre de 2026, petición del dueño):
//   «Sede»     = a cuál PERTENECE la persona. Es suya y fija: la misma para todas sus jornadas.
//   «Marcó en» = dónde marcó ESA jornada. Cambia de una jornada a otra.
// Antes había una sola, que decía dónde marcó y, cuando no se sabía, «cuenta en [la de la persona]»:
// las dos cosas mezcladas en una celda.

// Hora de Bogotá, que es UTC-5 todo el año. Las pruebas del frontend corren en
// America/Los_Angeles a propósito: una implementación que escriba la hora con el
// reloj de la máquina se cae aquí y no en producción.
const bog = (h: number, m = 0, d = 1) => new Date(Date.UTC(2026, 8, d, h + 5, m)).toISOString();

const jornada = (extra: Record<string, unknown> = {}) => ({
  id: 'j1', colaboradorId: 'c1',
  colaborador: { nombre: 'Ana María', apellido: 'Gómez' },
  fecha: bog(0), entrada: bog(8), salida: bog(17), tipo: 'NORMAL', observacion: null,
  sede: NORTE, sedeSalida: NORTE, sedeAtribuida: null,
  minutosTarde: 0, minutosContados: 480, minutosAlmuerzoAqui: 60, minutosDescansoAqui: 15,
  salidaEstimada: false,
  ...extra,
});

const CEDULAS = new Map([['c1', '1020304050']]);
const cedulaDe = (id: string) => CEDULAS.get(id) ?? '';
// Las sedes ASIGNADAS, ya escritas como las escribe la pantalla (nombres separados por coma).
const ASIGNADAS = new Map([['c1', 'Norte']]);
const sedesAsignadasDe = (id: string) => ASIGNADAS.get(id) ?? '';
const fila = (jornadas: ReturnType<typeof jornada>[]) => filasDeRegistros(jornadas, cedulaDe, sedesAsignadasDe)[0];
const celda = (nombre: string, jornadas: ReturnType<typeof jornada>[] = [jornada()]) =>
  fila(jornadas)[COLUMNAS_REGISTROS.indexOf(nombre)];

describe('las columnas del Excel de registros', () => {
  it('son las de la tabla, y los minutos dicen que son minutos', () => {
    expect(COLUMNAS_REGISTROS).toEqual([
      'Colaborador', 'Cédula', 'Fecha', 'Sede', 'Marcó en', 'Entrada', 'Salida', 'Salida estimada',
      'Almuerzo (min)', 'Descansos (min)', 'Duración (min)', 'Llegada tarde (min)',
      'Tipo', 'Jornada del día', 'Observación',
    ]);
  });

  // El título corto lo pidió el dueño: «Marcó en» y no «Sede donde marcó».
  it('«Marcó en» va justo a la derecha de «Sede»', () => {
    expect(COLUMNAS_REGISTROS.indexOf('Marcó en')).toBe(COLUMNAS_REGISTROS.indexOf('Sede') + 1);
  });

  it('no hay columnas repetidas ni vacías', () => {
    expect(new Set(COLUMNAS_REGISTROS).size).toBe(COLUMNAS_REGISTROS.length);
    expect(COLUMNAS_REGISTROS.every(c => c.trim() !== '')).toBe(true);
  });
});

describe('filasDeRegistros', () => {
  it('una jornada normal se escribe entera', () => {
    expect(fila([jornada()])).toEqual([
      'Ana María Gómez', '1020304050', '2026-09-01', 'Norte', 'Norte', '08:00', '17:00', 'No',
      60, 15, 480, 0, 'NORMAL', 1, '',
    ]);
  });

  // La hora y la fecha son las de Bogotá, las mismas que pinta la pantalla.
  it('las horas y la fecha van en hora de Bogotá', () => {
    expect(celda('Entrada')).toBe('08:00');
    expect(celda('Fecha')).toBe('2026-09-01');
  });

  it('los minutos son números, para poder sumarlos', () => {
    expect(typeof celda('Duración (min)')).toBe('number');
    expect(typeof celda('Almuerzo (min)')).toBe('number');
  });

  // 0 es «llegó a tiempo» y null es «no aplica» (sin horario o día que no cuenta).
  // Escribir 0 en los dos casos diría que todo el mundo llegó puntual.
  it('sin horario, la llegada tarde queda vacía y no en cero', () => {
    expect(celda('Llegada tarde (min)', [jornada({ minutosTarde: null })])).toBe('');
    expect(celda('Llegada tarde (min)', [jornada({ minutosTarde: 0 })])).toBe(0);
    expect(celda('Llegada tarde (min)', [jornada({ minutosTarde: 17 })])).toBe(17);
  });

  it('un turno sin cerrar deja la salida vacía', () => {
    expect(celda('Salida', [jornada({ salida: null })])).toBe('');
  });

  // Una hora que puso el auto-cierre no es una hora marcada, y en una hoja de
  // cálculo se ve idéntica si nada lo dice.
  it('la salida que puso el sistema queda señalada en su columna', () => {
    expect(celda('Salida estimada', [jornada({ salidaEstimada: true })])).toBe('Sí');
    expect(celda('Salida estimada')).toBe('No');
  });

  describe('«Sede»: a cuál pertenece la persona', () => {
    it('es la sede asignada, y no depende de dónde marcó', () => {
      // Marcó en Sur, pero la persona es de Norte: la columna dice Norte.
      expect(celda('Sede', [jornada({ sede: SUR, sedeSalida: SUR })])).toBe('Norte');
      expect(celda('Sede', [jornada({ sede: null, sedeSalida: null })])).toBe('Norte');
      expect(celda('Sede', [jornada({ sede: NORTE, sedeSalida: SUR })])).toBe('Norte');
    });

    it('con varias sedes asignadas dice todas, como la pantalla', () => {
      const dos = (id: string) => (id === 'c1' ? 'Norte, Sur' : '');
      expect(filasDeRegistros([jornada()], cedulaDe, dos)[0][COLUMNAS_REGISTROS.indexOf('Sede')]).toBe('Norte, Sur');
    });

    it('quien no tiene sede asignada queda vacío, y no se inventa una', () => {
      expect(celda('Sede', [jornada({ colaboradorId: 'otro' })])).toBe('');
    });

    // Un presencial sin sede asignada cuenta, en los reportes, en la que el servidor le atribuye. Sin
    // esto, esa persona perdería en el archivo la única sede que se le conoce.
    it('sin sede asignada pero con una atribuida, dice la atribuida', () => {
      expect(celda('Sede', [jornada({ colaboradorId: 'otro', sede: null, sedeSalida: null, sedeAtribuida: SUR })])).toBe('Sur');
    });

    it('la asignada manda sobre la atribuida', () => {
      expect(celda('Sede', [jornada({ sede: null, sedeSalida: null, sedeAtribuida: SUR })])).toBe('Norte');
    });
  });

  describe('«Marcó en»: dónde marcó esa jornada', () => {
    it('una sola sede, su nombre', () => {
      expect(celda('Marcó en', [jornada({ sede: SUR, sedeSalida: SUR })])).toBe('Sur');
      expect(celda('Marcó en', [jornada({ sede: SUR, sedeSalida: null })])).toBe('Sur');
    });

    // Lo que pidió el dueño: si marcó en dos sedes distintas, que se vean las dos.
    it('si abrió en una sede y cerró en otra, dice las dos', () => {
      expect(celda('Marcó en', [jornada({ sede: NORTE, sedeSalida: SUR })])).toBe('Norte → Sur');
    });

    it('si solo se conoce el cierre, lo dice como cierre', () => {
      expect(celda('Marcó en', [jornada({ sede: null, sedeSalida: SUR })])).toBe('Cerró en Sur');
    });

    // Sin sede de marcación NO se escribe la de la persona: eso es lo que contesta «Sede». Una celda
    // vacía dice «no quedó registrada», y es lo único cierto.
    it('si no quedó registrada, queda vacía y no repite la sede de la persona', () => {
      expect(celda('Marcó en', [jornada({ sede: null, sedeSalida: null })])).toBe('');
      expect(celda('Marcó en', [jornada({ sede: null, sedeSalida: null, sedeAtribuida: NORTE })])).toBe('');
    });

    it('dos sedes que se llaman igual pero son distintas se siguen viendo como cruce', () => {
      const otraNorte = { id: 's9', nombre: 'Norte' };
      expect(celda('Marcó en', [jornada({ sede: NORTE, sedeSalida: otraNorte })])).toBe('Norte → Norte');
    });
  });

  // El mismo número que la etiqueta de la tabla, calculado con la misma función:
  // filtrando por «Jornada del día» mayor que 1 salen los ingresos dobles.
  it('la segunda jornada del día lleva su número', () => {
    const filas = filasDeRegistros([
      jornada({ id: 'tarde', entrada: bog(14), salida: bog(18) }),
      jornada({ id: 'manana', entrada: bog(8), salida: bog(12) }),
    ], cedulaDe, sedesAsignadasDe);
    const i = COLUMNAS_REGISTROS.indexOf('Jornada del día');
    expect(filas.map(f => f[i])).toEqual([2, 1]);
  });

  // Quien está retirado no viene en GET /colaboradores, así que no hay cédula
  // que poner. Se deja vacía antes que inventarla.
  it('sin cédula conocida, la celda queda vacía', () => {
    expect(celda('Cédula', [jornada({ colaboradorId: 'otro' })])).toBe('');
  });

  it('respeta el orden en que llegan las jornadas, que es el de la tabla', () => {
    const filas = filasDeRegistros([
      jornada({ id: 'b', fecha: bog(0, 0, 2), entrada: bog(8, 0, 2), salida: bog(12, 0, 2) }),
      jornada({ id: 'a' }),
    ], cedulaDe, sedesAsignadasDe);
    const i = COLUMNAS_REGISTROS.indexOf('Fecha');
    expect(filas.map(f => f[i])).toEqual(['2026-09-02', '2026-09-01']);
  });
});

describe('nombreDelArchivo', () => {
  it('lleva el rango que se exportó, para no confundir dos descargas', () => {
    expect(nombreDelArchivo('2026-09-01', '2026-09-30')).toBe('Registros_2026-09-01_a_2026-09-30');
  });
});

// LA HOJA «ENTRADAS POR DÍA» (9 de octubre de 2026, petición del dueño): una fila por persona, una columna
// por día y, en cada celda, la hora de la PRIMERA entrada de ese día. Es la tabla dinámica que se armaba a
// mano con el Excel de Registros, escrita directamente.
describe('matrizDeEntradas', () => {
  const persona = (id: string, nombre: string, apellido: string) => ({ id, nombre, apellido });
  const dia = (d: number) => bog(0, 0, d);
  const j = (extra: Record<string, unknown>) => jornada({ fecha: dia(1), ...extra });
  const matriz = (jornadas: ReturnType<typeof jornada>[], desde = '2026-09-01', hasta = '2026-09-03', sinMarcas: ReturnType<typeof persona>[] = []) =>
    matrizDeEntradas(jornadas, desde, hasta, sinMarcas);

  describe('las columnas', () => {
    it('son la persona y TODOS los días del rango, también los que nadie marcó', () => {
      expect(matriz([j({})]).columnas).toEqual(['Colaborador', '2026-09-01', '2026-09-02', '2026-09-03']);
    });

    // Los días se cuentan sin pasar por la zona horaria de la máquina: las pruebas corren en Los Ángeles.
    it('cruzan el cambio de mes sin comerse ni repetir un día', () => {
      expect(matriz([], '2026-09-29', '2026-10-02').columnas)
        .toEqual(['Colaborador', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    });

    it('un rango de un solo día tiene una sola columna de día', () => {
      expect(matriz([], '2026-09-05', '2026-09-05').columnas).toEqual(['Colaborador', '2026-09-05']);
    });

    it('un rango al revés no cuelga ni inventa días', () => {
      expect(matriz([], '2026-09-05', '2026-09-01').columnas).toEqual(['Colaborador']);
    });

    // Una marcación NUNCA se pierde por caer fuera de las columnas. El servidor ya filtra por rango, así que en
    // uso real no pasa; pero si pasara, cortarla en silencio daría un archivo plausible y falso.
    it('un día con marcaciones fuera del rango se agrega, en su lugar, y no se pierde', () => {
      const m = matriz([j({ fecha: bog(0, 0, 10), entrada: bog(8, 0, 10) })], '2026-09-01', '2026-09-03');
      expect(m.columnas).toEqual(['Colaborador', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']);
      expect(m.filas).toEqual([['Ana María Gómez', '', '', '', '08:00']]);
    });

    it('un día fuera del rango por antes queda de primero', () => {
      const m = matriz([j({ fecha: bog(0, 0, 28, ), entrada: bog(8, 0, 28) })], '2026-09-29', '2026-09-30');
      expect(m.columnas[1]).toBe('2026-09-28');
    });

    // Un campo de fecha vaciado a medias llega como texto vacío: no puede reventar el botón de exportar.
    it('un rango vacío o ilegible no revienta ni inventa días', () => {
      expect(matriz([], '', '2026-09-03').columnas).toEqual(['Colaborador']);
      expect(matriz([], '2026-09-01', '').columnas).toEqual(['Colaborador']);
      expect(matriz([], 'ayer', 'hoy').columnas).toEqual(['Colaborador']);
    });
  });

  describe('las celdas', () => {
    it('dicen la hora de la entrada, en hora de Bogotá', () => {
      expect(matriz([j({ entrada: bog(8, 30) })]).filas).toEqual([['Ana María Gómez', '08:30', '', '']]);
    });

    it('un día sin marcación queda vacío, como en la tabla dinámica', () => {
      const [fila] = matriz([j({ fecha: dia(2), entrada: bog(9, 5, 2) })]).filas;
      expect(fila).toEqual(['Ana María Gómez', '', '09:05', '']);
    });

    // Con dos jornadas el mismo día, la matriz dice a qué hora EMPEZÓ a trabajar.
    it('con dos jornadas el mismo día, la hora es la de la primera entrada', () => {
      const filas = matriz([
        j({ id: 'tarde', entrada: bog(14), salida: bog(18) }),
        j({ id: 'manana', entrada: bog(8, 15), salida: bog(12) }),
      ]).filas;
      expect(filas).toEqual([['Ana María Gómez', '08:15', '', '']]);
    });

    // La jornada pertenece al día de su `fecha`, aunque la entrada caiga tarde en la noche: en UTC ya es
    // el día siguiente, y en Bogotá no.
    it('una entrada a las 23:30 de Bogotá cuenta en su día y no en el siguiente', () => {
      expect(matriz([j({ entrada: bog(23, 30) })]).filas).toEqual([['Ana María Gómez', '23:30', '', '']]);
    });

    it('una jornada sin entrada deja la celda vacía', () => {
      expect(matriz([j({ entrada: null })]).filas).toEqual([['Ana María Gómez', '', '', '']]);
    });
  });

  describe('las filas', () => {
    it('van en orden alfabético, con la tilde donde corresponde', () => {
      const filas = matriz([
        j({ colaboradorId: 'c3', colaborador: { nombre: 'Zoila', apellido: 'Rojas' } }),
        j({ colaboradorId: 'c2', colaborador: { nombre: 'Álvaro', apellido: 'Díaz' } }),
        j({ colaboradorId: 'c1', colaborador: { nombre: 'Beatriz', apellido: 'Gil' } }),
      ]).filas.map(f => f[0]);
      expect(filas).toEqual(['Álvaro Díaz', 'Beatriz Gil', 'Zoila Rojas']);
    });

    it('una persona con varias jornadas sale en UNA sola fila', () => {
      const filas = matriz([
        j({ id: 'a', entrada: bog(8) }),
        j({ id: 'b', fecha: dia(2), entrada: bog(9, 0, 2) }),
      ]).filas;
      expect(filas).toEqual([['Ana María Gómez', '08:00', '09:00', '']]);
    });

    // Dos personas pueden llamarse igual: se separan por identificador, no por nombre.
    it('dos personas con el mismo nombre no se mezclan', () => {
      const filas = matriz([
        j({ colaboradorId: 'c1', entrada: bog(8) }),
        j({ colaboradorId: 'c9', entrada: bog(10) }),
      ]).filas;
      expect(filas).toEqual([['Ana María Gómez', '08:00', '', ''], ['Ana María Gómez', '10:00', '', '']]);
    });

    // Quien no marcó NADA en el rango es justo a quien más se busca en una matriz de asistencia, y una
    // tabla dinámica hecha desde el Excel de Registros no lo trae.
    it('las personas sin ninguna marcación salen con la fila en blanco', () => {
      const filas = matriz([j({})], '2026-09-01', '2026-09-03', [persona('c7', 'Carlos', 'Peña')]).filas;
      expect(filas).toEqual([['Ana María Gómez', '08:00', '', ''], ['Carlos Peña', '', '', '']]);
    });

    it('quien ya sale por sus jornadas no se repite aunque venga en la lista de personas', () => {
      const filas = matriz([j({})], '2026-09-01', '2026-09-03', [persona('c1', 'Ana María', 'Gómez')]).filas;
      expect(filas).toHaveLength(1);
    });
  });

  it('sin jornadas ni personas, solo trae los encabezados', () => {
    expect(matriz([])).toEqual({ columnas: ['Colaborador', '2026-09-01', '2026-09-02', '2026-09-03'], filas: [] });
  });
});
