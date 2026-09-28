import { describe, it, expect } from 'vitest';
import { proyeccionDelMes } from './proyeccionDeRotacion';

// QUÉ DÍAS QUEDARÍAN TRABAJADOS SI SE APLICA ESTA ROTACIÓN (28 de septiembre de 2026).
//
// Es la pieza que le falta al veredicto del mes, el que pidió el dueño con estas palabras: «que el
// sistema lea todo el mes y me diga que por norma no le estás dando el día de descanso». Ese veredicto
// lo calcula `semanasSinDescanso`, que ya está probada, y necesita de comer un mapa de «esta fecha se
// trabaja, sí o no» para el mes COMPLETO de una persona. Esto lo arma.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO DOS BUCLES DENTRO DEL MODAL: aquí se mezclan tres fuentes —lo que
// el mes ya tiene, lo que está marcado, y lo que la rotación mandaría— y equivocarse en la mezcla
// produce un veredicto plausible y falso. Un aviso que no salta cuando debe es peor que no tenerlo:
// enseña a confiar.
//
// LAS TRES REGLAS DE LA MEZCLA:
//
//   · una fecha MARCADA y futura recibe lo que diga la rotación;
//   · una fecha marcada pero YA PASADA conserva lo que tiene, porque no se va a escribir;
//   · una fecha NO marcada conserva lo que tiene, y esto es lo que hace ganar el sueldo al veredicto:
//     aplicar la rotación a media semana deja los otros días con su turno de antes, y entre los dos
//     pueden completar los siete sin que ninguna celda «pisada» lo delate.

const HOY = '2026-09-28';

// Un mes de septiembre donde todo se trabaja, que es el punto de partida más incómodo.
const mesTrabajado = (dias: number): { fecha: string; trabajado: boolean }[] =>
  Array.from({ length: dias }, (_, i) => ({
    fecha: `2026-09-${String(i + 1).padStart(2, '0')}`,
    trabajado: true,
  }));

describe('la mezcla de lo que hay con lo que la rotación mandaría', () => {
  it('una fecha marcada y futura recibe lo que diga la rotación', () => {
    // 6x1 arrancando el 28: seis de trabajo (28 al 3) y el séptimo descansa (4 de octubre). Dentro de
    // septiembre, del 28 al 30 se trabaja.
    const r = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-28', '2026-09-29', '2026-09-30'],
      rotacion: { patron: '6x1', desfase: 0, primerDia: '2026-09-28' },
      hoy: HOY,
    });
    expect(r['2026-09-28']).toBe(true);
    expect(r['2026-09-29']).toBe(true);
    expect(r['2026-09-30']).toBe(true);
  });

  it('y cuando la rotación manda descanso, la fecha queda SIN trabajar', () => {
    // 6x1 con el ciclo corrido para que el descanso caiga el 30.
    const r = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-28', '2026-09-29', '2026-09-30'],
      rotacion: { patron: '6x1', desfase: 4, primerDia: '2026-09-28' },
      hoy: HOY,
    });
    expect(r['2026-09-30']).toBe(false);
  });

  it('una fecha marcada pero YA PASADA conserva lo que tiene', () => {
    // No se va a escribir, así que proyectarle la rotación mentiría sobre el estado del mes y podría
    // apagar un aviso que sí corresponde.
    const r = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-01', '2026-09-02'],
      // Un desfase que mandaría descanso el 1 y el 2 si se les aplicara.
      rotacion: { patron: '2x2', desfase: 2, primerDia: '2026-09-01' },
      hoy: HOY,
    });
    expect(r['2026-09-01']).toBe(true);
    expect(r['2026-09-02']).toBe(true);
  });

  it('una fecha NO marcada conserva lo que tiene', () => {
    // LA REGLA QUE HACE GANAR EL SUELDO AL VEREDICTO: aplicar la rotación a media semana deja los
    // otros días con su turno de antes, y entre los dos pueden completar los siete.
    const r = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-30'],
      rotacion: { patron: '2x2', desfase: 0, primerDia: '2026-09-30' },
      hoy: HOY,
    });
    expect(r['2026-09-29']).toBe(true);
    expect(r['2026-09-28']).toBe(true);
  });

  it('un día que hoy NO se trabaja y no está marcado sigue sin trabajarse', () => {
    const r = proyeccionDelMes({
      diasDelMes: [
        { fecha: '2026-09-29', trabajado: true },
        { fecha: '2026-09-30', trabajado: false },
      ],
      marcadas: ['2026-09-29'],
      rotacion: { patron: '6x1', desfase: 0, primerDia: '2026-09-29' },
      hoy: HOY,
    });
    expect(r['2026-09-30']).toBe(false);
  });
});

describe('el ciclo se cuenta en días, no por posición en la lista', () => {
  it('una selección CON HUECOS no desalinea la rotación', () => {
    // El defecto que esto evita: contando por índice, el 28 y el 30 quedarían en posiciones contiguas
    // del ciclo, y la rotación se correría un día sin que nadie lo note. Contando días desde el
    // primero, el 30 está en la posición 2 del ciclo aunque el 29 no esté marcado.
    const conHueco = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-28', '2026-09-30'],
      rotacion: { patron: '2x2', desfase: 0, primerDia: '2026-09-28' },
      hoy: HOY,
    });
    // 2x2 desde el 28: trabaja 28 y 29, descansa 30 y 1. El 30 descansa aunque el 29 no esté marcado.
    expect(conHueco['2026-09-28']).toBe(true);
    expect(conHueco['2026-09-30']).toBe(false);
  });

  it('el ciclo se ancla en `primerDia` y no en la primera fecha marcada', () => {
    // Dos personas con el mismo desfase tienen que quedar alineadas entre sí, y eso solo pasa si el
    // ancla es el primer día del PERÍODO y no el primero que cada una tenga marcado.
    const desdeElPeriodo = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-30'],
      rotacion: { patron: '2x2', desfase: 0, primerDia: '2026-09-28' },
      hoy: HOY,
    });
    // Anclado el 28: el 30 cae en la posición 2, que en 2x2 es descanso.
    expect(desdeElPeriodo['2026-09-30']).toBe(false);
  });
});

describe('la forma del resultado', () => {
  it('trae una entrada por cada día del mes que se le pasó, ni una más', () => {
    // `semanasSinDescanso` trata una fecha ausente como NO trabajada a propósito, así que devolver un
    // mapa incompleto encendería semanas enteras en rojo por los días que faltan.
    const r = proyeccionDelMes({
      diasDelMes: mesTrabajado(30),
      marcadas: [],
      rotacion: { patron: '6x1', desfase: 0, primerDia: '2026-09-01' },
      hoy: HOY,
    });
    expect(Object.keys(r)).toHaveLength(30);
    expect(r['2026-09-01']).toBe(true);
    expect(r['2026-09-30']).toBe(true);
  });

  it('sin nada marcado devuelve el mes tal como está', () => {
    // Es lo que permite pedir el veredicto de ANTES y el de DESPUÉS con la misma función, y comparar.
    const dias = [
      { fecha: '2026-09-29', trabajado: true },
      { fecha: '2026-09-30', trabajado: false },
    ];
    const r = proyeccionDelMes({
      diasDelMes: dias, marcadas: [],
      rotacion: { patron: '4x2', desfase: 0, primerDia: '2026-09-29' }, hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-29': true, '2026-09-30': false });
  });

  it('un mes vacío no produce ninguna entrada', () => {
    const r = proyeccionDelMes({
      diasDelMes: [], marcadas: ['2026-09-30'],
      rotacion: { patron: '6x1', desfase: 0, primerDia: '2026-09-28' }, hoy: HOY,
    });
    expect(r).toEqual({});
  });

  it('una fecha marcada que no está en el mes no se inventa', () => {
    // Puede pasar: la selección abarca el borde entre dos meses y el veredicto se pide de uno solo.
    const r = proyeccionDelMes({
      diasDelMes: [{ fecha: '2026-09-30', trabajado: true }],
      marcadas: ['2026-09-30', '2026-10-01'],
      rotacion: { patron: '6x1', desfase: 0, primerDia: '2026-09-30' },
      hoy: HOY,
    });
    expect(Object.keys(r)).toEqual(['2026-09-30']);
  });
});
