import { describe, it, expect } from 'vitest';
import { etiquetaDeDescansos, detalleDeDescansos, totalesDeDescansos, salioDentroDeSuVentana } from './resumenDeDescansos';
import type { ResumenDePausa } from './ModalJornada';

// Los descansos de una jornada llegan como LISTA desde el 12 de septiembre de 2026: un
// resumen por ventana, en su orden. La tabla tiene una sola celda para todos, con una
// sola etiqueta; el detalle de cada uno va en el `title` y en el modal.

// Un instante dado en hora de Bogotá (UTC-5 todo el año). Las pruebas corren en Los
// Ángeles a propósito.
const bog = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 7, h + 5, m)).toISOString();
const resumen = (p: Partial<ResumenDePausa>): ResumenDePausa => ({
  estado: 'NO_MARCADO', ventana: { inicio: '09:00', fin: '09:15' }, salida: null, regreso: null,
  minutos: null, minutosVentana: 15, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  ...p,
});
// Carla: salió a las 10:00 y el kiosco la anotó en el de 15:00 a 15:10, que dura 10; su
// salida de las 15:00 quedó en el de 09:00 a 09:15, que se le descontó entero.
const CARLA: ResumenDePausa[] = [
  resumen({ estado: 'MARCADO', salida: bog(15), regreso: bog(15, 10), minutos: 10, minutosDescontados: 15 }),
  resumen({
    estado: 'MARCADO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10,
    salida: bog(10), regreso: bog(10, 15), minutos: 15, seExcedio: true, minutosDeMas: 5,
  }),
];

describe('etiquetaDeDescansos', () => {
  it('sin descansos, o con un servidor que no manda la lista, no hay nada que pintar', () => {
    expect(etiquetaDeDescansos([])).toEqual({ tipo: 'NINGUNO' });
    expect(etiquetaDeDescansos(undefined)).toEqual({ tipo: 'NINGUNO' });
  });

  it('con uno solo devuelve ese descanso, para pintarlo como se pintaba', () => {
    const uno = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 15), minutos: 15 });
    expect(etiquetaDeDescansos([uno])).toEqual({ tipo: 'UNO', pausa: uno });
  });

  it('la prioridad: en curso, después no volvió, después sin marcar, y al final marcados', () => {
    const marcado = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 15), minutos: 15 });
    const enCurso = resumen({ estado: 'EN_CURSO', salida: bog(15) });
    const abierto = resumen({ estado: 'ABIERTO', salida: bog(15) });
    const sinMarcar = resumen({});
    expect(etiquetaDeDescansos([sinMarcar, abierto, enCurso])).toEqual({ tipo: 'EN_CURSO', pausa: enCurso });
    expect(etiquetaDeDescansos([marcado, sinMarcar, abierto])).toEqual({ tipo: 'NO_VOLVIO', pausa: abierto });
    expect(etiquetaDeDescansos([marcado, sinMarcar])).toEqual({ tipo: 'SIN_MARCAR', faltan: 1, de: 2 });
    expect(etiquetaDeDescansos([marcado, marcado])).toEqual({ tipo: 'MARCADOS', cuantos: 2, minutos: 30, seExcedio: false });
  });

  it('1 de 2 sin marcar', () => {
    const tarde = resumen({ ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10, minutosDescontados: 10 });
    expect(etiquetaDeDescansos([CARLA[0], tarde])).toEqual({ tipo: 'SIN_MARCAR', faltan: 1, de: 2 });
  });

  it('Carla: los dos marcados suman lo que se tomó, 25 min, y dicen que alguno se pasó', () => {
    expect(etiquetaDeDescansos(CARLA)).toEqual({ tipo: 'MARCADOS', cuantos: 2, minutos: 25, seExcedio: true });
  });

  // Con Carla da lo mismo sumar lo que se tomó o lo que duran sus descansos (10 + 15 y 15
  // + 10). Aquí no: se tomó 14 de un descanso de 15 y 12 de uno de 10.
  it('suma lo que se tomó de verdad, no lo que duran los descansos del horario', () => {
    const corto = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 14), minutos: 14 });
    const largo = resumen({
      estado: 'MARCADO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10,
      salida: bog(15), regreso: bog(15, 12), minutos: 12, seExcedio: true, minutosDeMas: 2,
    });
    expect(etiquetaDeDescansos([corto, largo])).toEqual({ tipo: 'MARCADOS', cuantos: 2, minutos: 26, seExcedio: true });
  });
});

describe('detalleDeDescansos', () => {
  it('cada descanso con su salida y su regreso en hora de Bogotá, en su orden', () => {
    const temprano = resumen({ estado: 'MARCADO', salida: bog(9), regreso: bog(9, 14), minutos: 14 });
    expect(detalleDeDescansos([temprano, CARLA[0]])).toBe('09:00 → 09:14 · 15:00 → 15:10');
  });

  it('el que no volvió va sin regreso, y el que no se marcó dice su horario', () => {
    expect(detalleDeDescansos([resumen({ estado: 'ABIERTO', salida: bog(15) }), resumen({})]))
      .toBe('15:00 → ··· · 09:00-09:15: no lo marcó');
  });
});

describe('totalesDeDescansos', () => {
  it('cuántos se marcaron de cuántos, y lo que se descontó entre todos', () => {
    expect(totalesDeDescansos(CARLA)).toEqual({ marcados: 2, de: 2, minutosDescontados: 15 });
    expect(totalesDeDescansos([CARLA[0], resumen({ minutosDescontados: 10 })]))
      .toEqual({ marcados: 1, de: 2, minutosDescontados: 25 });
    // Salió al de la tarde y no ha vuelto: también cuenta, porque salió a él.
    const sinVolver = resumen({ estado: 'ABIERTO', ventana: { inicio: '15:00', fin: '15:10' }, minutosVentana: 10, salida: bog(15) });
    expect(totalesDeDescansos([CARLA[0], sinVolver])).toEqual({ marcados: 2, de: 2, minutosDescontados: 15 });
  });

  it('una salida que no tuvo ventana donde anotarse no cuenta como un descanso más del día', () => {
    // El día tenía dos descansos y salió tres veces: la tercera no tuvo dónde anotarse, y
    // decir «3 de 3» inventa un descanso que el horario no tenía.
    const sinVentana = resumen({ estado: 'MARCADO', ventana: null, minutosVentana: null, salida: bog(16), regreso: bog(16, 5), minutos: 5 });
    expect(totalesDeDescansos([...CARLA, sinVentana])).toEqual({ marcados: 2, de: 2, minutosDescontados: 15 });
  });
});

// DENTRO O FUERA DE SU HORA (12 de septiembre de 2026). El kiosco anota cada salida en un
// descanso por la hora, así que una salida puede quedar en una ventana en la que no cayó:
// la de Carla a las 15:00 quedó en el de 09:00 a 09:15. El detalle no puede decir que se lo
// tomó «dentro de su hora» solo porque duró menos que la ventana.
describe('salioDentroDeSuVentana', () => {
  // Un instante con segundos, en hora de Bogotá.
  const conSegundos = (h: number, m: number, s: number) => new Date(Date.UTC(2026, 8, 7, h + 5, m, s)).toISOString();
  const deNueve = { ventana: { inicio: '09:00', fin: '09:15' } };

  it('Carla: la salida de las 15:00 no cayó en el de 09:00 a 09:15, ni la de las 10:00 en el de 15:00 a 15:10', () => {
    expect(salioDentroDeSuVentana(CARLA[0])).toBe(false);
    expect(salioDentroDeSuVentana(CARLA[1])).toBe(false);
  });

  it('cae dentro desde la hora de inicio y hasta antes de la de fin, en hora de Bogotá', () => {
    expect(salioDentroDeSuVentana({ ...deNueve, salida: bog(9) })).toBe(true);
    expect(salioDentroDeSuVentana({ ...deNueve, salida: conSegundos(9, 14, 59) })).toBe(true);
    expect(salioDentroDeSuVentana({ ...deNueve, salida: bog(9, 15) })).toBe(false);
    expect(salioDentroDeSuVentana({ ...deNueve, salida: conSegundos(8, 59, 59) })).toBe(false);
  });

  it('una ventana que cruza la medianoche, de 23:55 a 00:10', () => {
    const noche = { ventana: { inicio: '23:55', fin: '00:10' } };
    const madrugada = (m: number) => new Date(Date.UTC(2026, 8, 8, 5, m)).toISOString();
    expect(salioDentroDeSuVentana({ ...noche, salida: bog(23, 58) })).toBe(true);
    expect(salioDentroDeSuVentana({ ...noche, salida: madrugada(5) })).toBe(true);
    expect(salioDentroDeSuVentana({ ...noche, salida: madrugada(10) })).toBe(false);
    expect(salioDentroDeSuVentana({ ...noche, salida: bog(23, 50) })).toBe(false);
  });

  it('sin salida, o sin ventana, no se puede decir que cayó dentro', () => {
    // Una ventana que contiene las 19:00, que es la hora de Bogotá de `new Date(null)`: con
    // la de 09:00 a 09:15, una salida vacía quedaba fuera por casualidad y la prueba no
    // comprobaba la guarda.
    expect(salioDentroDeSuVentana({ ventana: { inicio: '18:55', fin: '19:10' }, salida: null })).toBe(false);
    expect(salioDentroDeSuVentana({ ventana: null, salida: bog(9, 5) })).toBe(false);
  });
});
