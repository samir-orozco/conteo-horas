import { describe, it, expect } from 'vitest';
import { columnasDeAsistencia, filasDeLlegadas, totalDeLlegadas } from './semana';
import type { Dash } from './types';

// LA SEMANA EN EL INICIO (15 de octubre de 2026): cómo se dicen las barras de la asistencia y de las
// llegadas tarde. Quién debía venir y quién llegó tarde lo decide el servidor; aquí, el texto y el
// largo de cada barra. Las fechas son medianoches de Bogotá y las pruebas corren en Los Ángeles a
// propósito (vite.config.ts): un formato sin la zona pintaría el día anterior.

type DiaAsistencia = NonNullable<Dash['asistenciaSemana']>['dias'][number];
const diaA = (dia: number, over: Partial<DiaAsistencia> = {}): DiaAsistencia => ({
  clave: `2026-10-${dia}`, fecha: `2026-10-${dia}T05:00:00.000Z`, esHoy: false, futuro: false, festivo: false,
  debian: 0, llegaron: 0, llegaronSinTurno: 0, conNovedad: 0, enTiempo: 0, conTurno: 0, ...over,
});

describe('columnasDeAsistencia', () => {
  it('un día con datos dice cuántos llegaron de los que debían, y la barra es esa proporción', () => {
    const [c] = columnasDeAsistencia([diaA(13, { debian: 4, llegaron: 3, conTurno: 4 })]);
    expect(c).toMatchObject({ etiqueta: 'mar 13', estado: 'DATOS', cifra: '3 de 4', alto: 75 });
    expect(c.nombreAccesible).toBe('martes 13 de octubre: llegaron 3 de 4');
  });

  it('hoy se llama «Hoy» y dice cuántos entran más tarde', () => {
    const [c] = columnasDeAsistencia([diaA(15, { esHoy: true, debian: 5, llegaron: 3, enTiempo: 2, conTurno: 7 })]);
    expect(c).toMatchObject({ etiqueta: 'Hoy', esHoy: true, cifra: '3 de 5', nota: '2 entran más tarde' });
  });

  it('un día que no ha llegado dice cuántos tienen turno, sin barra', () => {
    const [c] = columnasDeAsistencia([diaA(16, { futuro: true, conTurno: 6 })]);
    expect(c).toMatchObject({ estado: 'FUTURO', cifra: '6 con turno', alto: 0 });
  });

  it('el festivo lo dice con su palabra', () => {
    const [c] = columnasDeAsistencia([diaA(12, { festivo: true })]);
    expect(c).toMatchObject({ estado: 'FESTIVO', cifra: 'festivo', alto: 0 });
  });

  it('un día sin turnos lo dice, y no se confunde con un día en que nadie llegó', () => {
    expect(columnasDeAsistencia([diaA(11)])[0]).toMatchObject({ estado: 'SIN_TURNO', cifra: 'sin turnos' });
    expect(columnasDeAsistencia([diaA(13, { debian: 4, llegaron: 0 })])[0]).toMatchObject({ estado: 'DATOS', cifra: '0 de 4', alto: 0 });
  });

  it('quien llegó sin turno y quien tenía novedad van en la nota, no en la cifra', () => {
    const [c] = columnasDeAsistencia([diaA(13, { debian: 4, llegaron: 4, llegaronSinTurno: 2, conNovedad: 1 })]);
    expect(c).toMatchObject({ cifra: '4 de 4', nota: '+2 sin turno · 1 con novedad' });
  });
});

type DiaLlegadas = NonNullable<Dash['llegadasTarde7d']>['dias'][number];
const diaL = (dia: number, over: Partial<DiaLlegadas> = {}): DiaLlegadas => ({
  clave: `2026-10-${dia}`, fecha: `2026-10-${dia}T05:00:00.000Z`, esHoy: false, festivo: false, debian: 0, totalMinutos: 0, personas: [], ...over,
});
const tarde = (id: string, minutosTarde: number, horaLlegada = '08:20') => ({ id, horaEsperada: '08:00', horaLlegada, minutosTarde });
const PERSONAS = {
  ana: { nombre: 'Ana Ruiz', fotoMini: null }, luis: { nombre: 'Luis Mora', fotoMini: 'data:image/jpeg;base64,xx' },
  caro: { nombre: 'Caro Díaz', fotoMini: null }, jorge: { nombre: 'Jorge Ríos', fotoMini: null },
};

describe('filasDeLlegadas', () => {
  const dias = [
    diaL(12, { festivo: true }),
    diaL(13, { debian: 5, totalMinutos: 22, personas: [tarde('ana', 22, '08:27')] }),
    diaL(14, { debian: 5 }),
    diaL(15, { esHoy: true, debian: 5, totalMinutos: 67, personas: [tarde('luis', 40), tarde('caro', 25), tarde('ana', 1), tarde('jorge', 1)] }),
  ];
  const filas = filasDeLlegadas(dias, PERSONAS);

  it('hoy va arriba, y de ahí hacia atrás', () => {
    expect(filas.map(f => f.etiqueta)).toEqual(['Hoy', 'mié 14', 'mar 13', 'lun 12']);
  });

  it('el día con más minutos llena la barra; los demás, en proporción y nunca invisibles', () => {
    expect(filas[0].ancho).toBe(100);
    expect(filas[2].ancho).toBe(Math.round((22 / 67) * 100));
    expect(filasDeLlegadas([diaL(13, { debian: 1, totalMinutos: 1, personas: [tarde('ana', 1)] }), diaL(14, { debian: 1, totalMinutos: 500, personas: [tarde('luis', 500)] })], PERSONAS)
      .find(f => f.etiqueta === 'mar 13')!.ancho).toBeGreaterThanOrEqual(4);
  });

  it('distingue llegó tarde, todos a tiempo, sin turnos y festivo', () => {
    expect(filas.map(f => f.estado)).toEqual(['TARDE', 'A_TIEMPO', 'TARDE', 'FESTIVO']);
    expect(filasDeLlegadas([diaL(11)], PERSONAS)[0].estado).toBe('SIN_TURNOS');
  });

  it('muestra hasta tres caras y cuenta el resto', () => {
    expect(filas[0].caras.map(c => c.nombre)).toEqual(['Luis Mora', 'Caro Díaz', 'Ana Ruiz']);
    expect(filas[0].mas).toBe(1);
    expect(filas[0].caras[0].foto).toBe('data:image/jpeg;base64,xx');
  });

  it('el detalle del día dice quién, a qué hora llegó y cuánto tarde', () => {
    expect(filas[2].detalle).toEqual([{ id: 'ana', nombre: 'Ana Ruiz', texto: 'Llegó a las 08:27 · 22 min tarde' }]);
  });

  it('cada fila se puede leer entera en voz alta', () => {
    expect(filas[0].nombreAccesible).toBe('Hoy, jueves 15 de octubre: 4 llegaron tarde, 1h 7min en total');
    expect(filas[1].nombreAccesible).toBe('miércoles 14 de octubre: todos a tiempo');
  });
});

describe('totalDeLlegadas', () => {
  it('suma los minutos y cuenta las llegadas tarde de los 7 días', () => {
    const dias = [diaL(13, { totalMinutos: 22, personas: [tarde('ana', 22)] }), diaL(15, { totalMinutos: 65, personas: [tarde('luis', 40), tarde('caro', 25)] })];
    expect(totalDeLlegadas(dias)).toBe('1h 27min · 3 llegadas tarde');
  });

  it('en singular cuando es una', () => {
    expect(totalDeLlegadas([diaL(13, { totalMinutos: 22, personas: [tarde('ana', 22)] })])).toBe('22 min · 1 llegada tarde');
  });
});
