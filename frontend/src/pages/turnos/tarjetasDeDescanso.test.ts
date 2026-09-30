import { describe, it, expect } from 'vitest';
import { tarjetasDeDescanso } from './tarjetasDeDescanso';

// ELEGIR EL DÍA DE DESCANSO DE LA SEMANA, CON TARJETAS (29 de septiembre de 2026, pedido del dueño).
//
// Hasta hoy esto era una píldora con una sola pregunta: «¿Descansa el jueves?». Sí o nada. Si la
// propuesta se equivocaba —y se equivoca en cuanto sobran dos días libres, que es cuando dice
// SIN_DESCANSO y no propone nada— desde ahí no había forma de decir «no, es el martes»: había que ir
// a la celda, abrir su panel y marcarla. El dueño lo pidió así: «proponer un día de descanso y
// seleccionarlo, como las cards con los números y el día».
//
// SE OFRECEN LOS SIETE Y NO SOLO EL PROPUESTO. La propuesta pasa de ser la única respuesta posible a
// ser la que viene resaltada, que es lo que una propuesta debería haber sido siempre.
//
// CUATRO ESTADOS Y UN CASO POR VALOR (§9.4), porque cada uno se pinta distinto y dice algo distinto:
//
//   IDO         ese día ya pasó. No se puede escribir, y por tanto tampoco elegir.
//   PROPUESTO   el que el backend dedujo. Viene resaltado, no preseleccionado: sigue haciendo falta
//               un clic, porque marcar el descanso mueve un recargo.
//   CON_TURNO   tiene un turno pintado encima. Se puede elegir, pero elegirlo LO REEMPLAZA, y eso no
//               puede verse igual que elegir un día vacío.
//   ELEGIBLE    libre y sin proponer. El caso normal cuando sobran varios.
//
// LA PRECEDENCIA IMPORTA Y NO ES ALFABÉTICA: `IDO` gana a todo, incluido al propuesto. El backend
// propone mirando la semana entera y no sabe qué día es hoy; si propusiera el lunes de una semana que
// ya empezó, ofrecer ese botón sería ofrecer una escritura que el servidor rechaza.

describe('las tarjetas para elegir el descanso de la semana', () => {
  const SEM = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const HOY = '2026-09-29';
  const mapa = (fechas: readonly string[]) => Object.fromEntries(fechas.map(f => [f, true]));
  const estados = (t: { estado: string }[]) => t.map(x => x.estado);

  it('hay una tarjeta por día, en el orden de la semana', () => {
    const t = tarjetasDeDescanso(SEM, {}, null, HOY);
    expect(t.map(x => x.fecha)).toEqual(SEM);
  });

  it('el propuesto viene resaltado y los demás libres quedan elegibles', () => {
    const t = tarjetasDeDescanso(SEM, {}, '2026-10-01', HOY);
    expect(estados(t)).toEqual(['IDO', 'ELEGIBLE', 'ELEGIBLE', 'PROPUESTO', 'ELEGIBLE', 'ELEGIBLE', 'ELEGIBLE']);
  });

  it('un día con turno se distingue: elegirlo REEMPLAZA lo que tenía', () => {
    const t = tarjetasDeDescanso(SEM, mapa(['2026-09-30', '2026-10-02']), null, HOY);
    expect(estados(t)).toEqual(['IDO', 'ELEGIBLE', 'CON_TURNO', 'ELEGIBLE', 'CON_TURNO', 'ELEGIBLE', 'ELEGIBLE']);
  });

  it('EL DÍA QUE YA PASÓ GANA A TODO, incluso al propuesto', () => {
    // El backend propone mirando la semana entera y no sabe qué día es hoy. Ofrecer ese botón sería
    // ofrecer una escritura que el servidor rechaza con «no se puede cambiar un día que ya pasó».
    const t = tarjetasDeDescanso(SEM, {}, '2026-09-28', HOY);
    expect(t[0].estado).toBe('IDO');
    // Y entonces NINGUNA queda propuesta: la propuesta no se corre a otro día por su cuenta.
    expect(estados(t)).not.toContain('PROPUESTO');
  });

  it('y gana también sobre el turno pintado', () => {
    const t = tarjetasDeDescanso(SEM, mapa(['2026-09-28']), null, HOY);
    expect(t[0].estado).toBe('IDO');
  });

  it('HOY SÍ SE PUEDE ELEGIR: puede que esa persona todavía no haya marcado', () => {
    // La misma regla que la rejilla. Esconder hoy «por si acaso» quitaría un cambio legítimo.
    const t = tarjetasDeDescanso(SEM, {}, null, HOY);
    expect(t[1].estado).toBe('ELEGIBLE');
  });

  it('PROPUESTO GANA A CON_TURNO, y los dos se dan a la vez de verdad', () => {
    // Faltaba esta combinación y el orden de las dos ramas se podía invertir sin poner nada en rojo.
    // Y se da: el backend propone días sin TURNO PINTADO, mientras que `trabajado` aquí incluye lo
    // que el HORARIO exige. Un día sin turno pero con jornada del horario es las dos cosas.
    //
    // Gana el propuesto porque es la acción recomendada: marcarlo como descanso es justo lo que
    // arregla que el horario lo esté exigiendo. Al revés, la sugerencia se escondería detrás del
    // problema que viene a resolver.
    const t = tarjetasDeDescanso(SEM, mapa(['2026-10-01']), '2026-10-01', HOY);
    expect(t[3].estado).toBe('PROPUESTO');
  });

  it('sin propuesta, ninguna sale resaltada', () => {
    // Es el caso SIN_DESCANSO: sobran varios días y el backend no puede deducir cuál. Resaltar uno
    // al azar sería inventarse la deducción que él no hizo.
    const t = tarjetasDeDescanso(SEM, {}, null, HOY);
    expect(estados(t)).not.toContain('PROPUESTO');
  });

  it('una propuesta que no está en la semana no resalta nada', () => {
    // Pasa con una respuesta vieja en caché tras cambiar de período.
    const t = tarjetasDeDescanso(SEM, {}, '2026-11-15', HOY);
    expect(estados(t)).not.toContain('PROPUESTO');
  });

  it('una semana entera ya pasada no ofrece nada', () => {
    const idos = ['2026-09-01', '2026-09-02'];
    expect(estados(tarjetasDeDescanso(idos, {}, null, HOY))).toEqual(['IDO', 'IDO']);
  });

  it('sin días, sin tarjetas', () => {
    expect(tarjetasDeDescanso([], {}, null, HOY)).toEqual([]);
  });
});
