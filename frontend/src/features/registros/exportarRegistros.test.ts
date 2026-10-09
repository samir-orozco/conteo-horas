import { describe, it, expect } from 'vitest';
import { COLUMNAS_REGISTROS, filasDeRegistros, nombreDelArchivo } from './exportarRegistros';

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
