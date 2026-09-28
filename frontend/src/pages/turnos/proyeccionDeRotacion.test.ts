import { describe, it, expect } from 'vitest';
import { proyeccionDelMes, proyeccionDelBloque, minutosProyectados } from './proyeccionDeRotacion';

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

// LO MISMO PARA UN LOTE NORMAL (28 de septiembre de 2026).
//
// El aviso de «semanas que quedarían sin descanso» existía solo dentro de la ventana de rotación, y
// eso es media foto: marcar siete días seguidos con un turno cualquiera deja la semana entera
// trabajada igual que una rotación mal cuadrada, y nadie avisaba. La regla que juzga es la misma
// (`semanasSinDescanso`, ya probada) y la mezcla de las tres fuentes también; lo único que cambia es
// qué queda trabajado en un día tocado.
//
// POR ESO NO HAY UNA SEGUNDA FUNCIÓN DE MEZCLA. Las tres reglas de arriba —marcada y futura recibe lo
// nuevo, marcada y pasada conserva, no marcada conserva— valen igual para los dos casos, y tenerlas
// escritas dos veces es exactamente como se separan (CLAUDE.md §9.3).
//
// QUITAR NO ENTRA AQUÍ, Y ES A PROPÓSITO. Borrar lo pintado a mano deja el día como lo diga el
// horario, y eso el navegador no lo sabe: daría por hecho que el día queda igual, que es afirmar que
// no cambió nada cuando sí cambió. El tipo del parámetro solo admite turno o descanso, así que el
// compilador impide pedir un veredicto que no se puede dar. Con un borrado, la pantalla se calla.

describe('la misma mezcla, con un lote en vez de una rotación', () => {
  it('una fecha marcada y futura con TURNO queda trabajada', () => {
    const r = proyeccionDelBloque({
      diasDelMes: [
        { fecha: '2026-09-29', trabajado: false },
        { fecha: '2026-09-30', trabajado: false },
      ],
      marcadas: ['2026-09-29', '2026-09-30'],
      accion: { tipo: 'TURNO' },
      hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-29': true, '2026-09-30': true });
  });

  it('y con DESCANSO queda sin trabajar', () => {
    const r = proyeccionDelBloque({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-29', '2026-09-30'],
      accion: { tipo: 'DESCANSO' },
      hoy: HOY,
    });
    expect(r['2026-09-29']).toBe(false);
    expect(r['2026-09-30']).toBe(false);
  });

  it('una fecha marcada pero YA PASADA conserva lo que tiene', () => {
    // No se va a escribir. Proyectarle el turno mentiría sobre el estado del mes, y podría encender
    // un aviso por un día que nadie va a tocar.
    const r = proyeccionDelBloque({
      diasDelMes: [
        { fecha: '2026-09-01', trabajado: false },
        { fecha: '2026-09-30', trabajado: false },
      ],
      marcadas: ['2026-09-01', '2026-09-30'],
      accion: { tipo: 'TURNO' },
      hoy: HOY,
    });
    expect(r['2026-09-01']).toBe(false);
    expect(r['2026-09-30']).toBe(true);
  });

  it('una fecha NO marcada conserva lo que tiene, que es lo que hace ganar el sueldo al aviso', () => {
    // EL CASO QUE JUSTIFICA LEER EL MES ENTERO. Se marcan dos días de una semana que ya venía con los
    // otros cinco trabajados: ninguna celda «pisa» un descanso, y aun así la semana queda con los
    // siete. Un aviso que solo mirara lo pintado no lo vería nunca.
    const r = proyeccionDelBloque({
      diasDelMes: mesTrabajado(30),
      marcadas: ['2026-09-29', '2026-09-30'],
      accion: { tipo: 'TURNO' },
      hoy: HOY,
    });
    expect(r['2026-09-28']).toBe(true);
    expect(r['2026-09-27']).toBe(true);
  });

  it('trae una entrada por cada día del mes que se le pasó, ni una más', () => {
    const r = proyeccionDelBloque({
      diasDelMes: mesTrabajado(30), marcadas: [], accion: { tipo: 'TURNO' }, hoy: HOY,
    });
    expect(Object.keys(r)).toHaveLength(30);
  });

  it('una fecha marcada que no está en el mes no se inventa', () => {
    const r = proyeccionDelBloque({
      diasDelMes: [{ fecha: '2026-09-30', trabajado: true }],
      marcadas: ['2026-09-30', '2026-10-01'],
      accion: { tipo: 'DESCANSO' },
      hoy: HOY,
    });
    expect(Object.keys(r)).toEqual(['2026-09-30']);
  });

  it('sin nada marcado devuelve el mes tal como está', () => {
    // Es lo que permite pedir el veredicto de ANTES y el de DESPUÉS con la misma función y comparar:
    // así se puede distinguir una semana que este envío ROMPE de una que ya venía rota.
    const dias = [
      { fecha: '2026-09-29', trabajado: true },
      { fecha: '2026-09-30', trabajado: false },
    ];
    const r = proyeccionDelBloque({ diasDelMes: dias, marcadas: [], accion: { tipo: 'TURNO' }, hoy: HOY });
    expect(r).toEqual({ '2026-09-29': true, '2026-09-30': false });
  });
});

// LA MISMA MEZCLA, PERO EN MINUTOS (28 de septiembre de 2026).
//
// El aviso de las 42 horas necesita saber en cuántos minutos quedaría cada semana si se aplica lo
// que está marcado. Las tres reglas de la mezcla son LAS MISMAS —marcada y futura recibe lo nuevo,
// marcada y pasada conserva, no marcada conserva—; lo único que cambia es que el valor es un número
// en vez de un sí o un no. Por eso no hay una tercera copia del bucle.
//
// LOS MINUTOS DEL TURNO LOS DA EL SERVIDOR, no se calculan aquí: convertir una franja en minutos
// exigidos lleva dentro el cruce de medianoche, el almuerzo no pagado y los descansos no remunerados.
// Rehacerlo en el navegador pondría en dos sitios la regla de la que salen las horas extra (§9.3).

describe('los minutos en que quedaría cada día', () => {
  const mesDe = (dias: number, minutos: number) => Array.from({ length: dias }, (_, i) => ({
    fecha: `2026-09-${String(i + 1).padStart(2, '0')}`,
    minutos,
  }));

  it('una fecha marcada y futura pasa a los minutos del turno nuevo', () => {
    const r = minutosProyectados({
      diasDelMes: [{ fecha: '2026-09-29', minutos: 300 }, { fecha: '2026-09-30', minutos: 300 }],
      marcadas: ['2026-09-29', '2026-09-30'],
      minutosSiSePinta: () => 480,
      hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-29': 480, '2026-09-30': 480 });
  });

  it('CERO es un valor legítimo, no un vacío', () => {
    // Marcar descanso deja el día en cero minutos, y eso es lo que hace que el aviso de 42 h pueda
    // APAGARSE al marcar un descanso. Si el cero se tratara como «sin dato», el día conservaría sus
    // minutos de antes y la semana seguiría saliendo por encima del tope.
    const r = minutosProyectados({
      diasDelMes: [{ fecha: '2026-09-30', minutos: 480 }],
      marcadas: ['2026-09-30'],
      minutosSiSePinta: () => 0,
      hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-30': 0 });
  });

  it('una fecha marcada pero YA PASADA conserva sus minutos', () => {
    // No se va a escribir, así que proyectarle el turno nuevo mentiría sobre el estado del mes.
    const r = minutosProyectados({
      diasDelMes: [{ fecha: '2026-09-01', minutos: 300 }],
      marcadas: ['2026-09-01'],
      minutosSiSePinta: () => 480,
      hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-01': 300 });
  });

  it('una fecha NO marcada conserva sus minutos, que es lo que hace ganar el sueldo al aviso', () => {
    // Una semana llega a 56 h entre lo que ya estaba y los dos días que se marcan. Mirando solo lo
    // marcado, el aviso nunca saltaría.
    const r = minutosProyectados({
      diasDelMes: mesDe(30, 480), marcadas: ['2026-09-29', '2026-09-30'], minutosSiSePinta: () => 600, hoy: HOY,
    });
    expect(r['2026-09-28']).toBe(480);
    expect(r['2026-09-29']).toBe(600);
  });

  it('trae una entrada por cada día del mes que se le pasó, ni una más', () => {
    const r = minutosProyectados({ diasDelMes: mesDe(30, 480), marcadas: [], minutosSiSePinta: () => 600, hoy: HOY });
    expect(Object.keys(r)).toHaveLength(30);
  });

  it('una fecha marcada que no está en el mes no se inventa', () => {
    const r = minutosProyectados({
      diasDelMes: [{ fecha: '2026-09-30', minutos: 480 }],
      marcadas: ['2026-09-30', '2026-10-01'],
      minutosSiSePinta: () => 600,
      hoy: HOY,
    });
    expect(Object.keys(r)).toEqual(['2026-09-30']);
  });

  it('LOS MINUTOS PUEDEN SER DISTINTOS POR DÍA, que es lo que permite juzgar una rotación', () => {
    // Una rotación pone turno unos días y descanso otros: sus minutos NO son un número único. Con uno
    // solo, este aviso no podría juzgarlas, y son el caso más peligroso: un 6x1 de nueve horas son
    // 54 h semanales.
    //
    // Aquí el 29 recibe turno y el 30 descanso, con el mismo envío.
    const r = minutosProyectados({
      diasDelMes: [{ fecha: '2026-09-29', minutos: 300 }, { fecha: '2026-09-30', minutos: 300 }],
      marcadas: ['2026-09-29', '2026-09-30'],
      minutosSiSePinta: fecha => (fecha === '2026-09-30' ? 0 : 540),
      hoy: HOY,
    });
    expect(r).toEqual({ '2026-09-29': 540, '2026-09-30': 0 });
  });
});
