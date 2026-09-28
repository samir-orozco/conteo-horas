import { describe, it, expect } from 'vitest';
import { conteoDePrevia, descansosPisados, cruzanAHabitual } from './previaDeBloque';
import type { CeldaParaPrevia } from './previaDeBloque';

// LO QUE SE DICE ANTES DE ESCRIBIR (28 de septiembre de 2026).
//
// Marcar cien celdas y darle a un turno escribe cien jornadas de las que alguien es responsable. Esta
// es la decisión de qué se le cuenta ANTES: cuántas se escriben de verdad, cuántas ya tenían eso
// mismo, cuántas no se tocan, y los dos avisos que cuestan dinero.
//
// POR QUÉ ES PURA Y NO UN PUÑADO DE CUENTAS DENTRO DEL MODAL: de esto depende que alguien apruebe o
// cancele. Un conteo que se equivoque hacia abajo hace aprobar a ciegas, y uno que se equivoque hacia
// arriba enseña a ignorar el aviso. Se prueba sin montar pantalla ni servidor.
//
// EL AVISO DE LAS 42 HORAS NO ESTÁ AQUÍ, A PROPÓSITO. Para decir «quedaría en 56 h» hay que convertir
// un turno en minutos exigidos (entrada, salida, cruce de medianoche, menos el almuerzo no pagado,
// menos los descansos no remunerados), y eso lo resuelve el backend al pintar. Rehacerlo en la
// pantalla pondría en dos sitios la regla de la que salen las horas extra (CLAUDE.md §9.3). Y además
// el total que la fila trae es del rango completo, no por semana, que es la unidad del tope. Entra
// cuando el backend exponga los minutos de cada turno, calculados por el mismo código.

const celda = (extra: Partial<CeldaParaPrevia> = {}): CeldaParaPrevia => ({
  colaboradorId: 'c1',
  fecha: '2026-09-30',
  esDescansoObligatorio: false,
  plantillaIdActual: null,
  esDescansoHoy: false,
  pintadoAMano: false,
  ...extra,
});

const HOY = '2026-09-28';
const TURNO = { tipo: 'TURNO', plantillaId: 'p1' } as const;
const DESCANSO = { tipo: 'DESCANSO' } as const;
const QUITAR = { tipo: 'QUITAR' } as const;

describe('cuántas se escriben y cuántas no', () => {
  it('una celda vacía que recibe un turno se escribe', () => {
    const r = conteoDePrevia([celda()], () => TURNO, HOY);
    expect(r).toEqual({ escribe: 1, iguales: 0, bloqueadas: 0 });
  });

  it('una que YA tiene ese mismo turno no se escribe: se cuenta como igual', () => {
    // Importa de verdad: sin esto, repasar una semana ya programada diría «se escriben 140
    // jornadas» y quien lo lea no podría distinguir un cambio real de un repaso inofensivo.
    const r = conteoDePrevia([celda({ plantillaIdActual: 'p1' })], () => TURNO, HOY);
    expect(r).toEqual({ escribe: 0, iguales: 1, bloqueadas: 0 });
  });

  it('una que tiene OTRO turno sí se escribe', () => {
    const r = conteoDePrevia([celda({ plantillaIdActual: 'p9' })], () => TURNO, HOY);
    expect(r.escribe).toBe(1);
    expect(r.iguales).toBe(0);
  });

  it('un día ya pasado no se toca, y se cuenta aparte de los iguales', () => {
    // Bloqueada e igual son cosas distintas: una no se pudo, la otra no hacía falta. Juntarlas
    // escondería que parte de lo marcado quedó fuera.
    const r = conteoDePrevia([celda({ fecha: '2026-09-01' })], () => TURNO, HOY);
    expect(r).toEqual({ escribe: 0, iguales: 0, bloqueadas: 1 });
  });

  it('HOY no está bloqueado', () => {
    // La misma regla que la rejilla: puede que la persona todavía no haya marcado.
    const r = conteoDePrevia([celda({ fecha: HOY })], () => TURNO, HOY);
    expect(r.escribe).toBe(1);
    expect(r.bloqueadas).toBe(0);
  });

  it('marcar descanso un día que YA es descanso no escribe nada', () => {
    const r = conteoDePrevia([celda({ esDescansoHoy: true })], () => DESCANSO, HOY);
    expect(r).toEqual({ escribe: 0, iguales: 1, bloqueadas: 0 });
  });

  it('pero marcar descanso un día que tiene turno sí escribe', () => {
    const r = conteoDePrevia([celda({ plantillaIdActual: 'p1' })], () => DESCANSO, HOY);
    expect(r.escribe).toBe(1);
  });

  it('quitar el turno de un día que no tiene nada pintado no escribe nada', () => {
    // El backend contestaría «ese día no tiene ningún turno pintado», así que anunciarlo como una
    // escritura sería prometer algo que va a salir con error.
    const r = conteoDePrevia([celda()], () => QUITAR, HOY);
    expect(r).toEqual({ escribe: 0, iguales: 1, bloqueadas: 0 });
  });

  it('quitar el turno de un día pintado sí escribe', () => {
    const r = conteoDePrevia([celda({ plantillaIdActual: 'p1' })], () => QUITAR, HOY);
    expect(r.escribe).toBe(1);
  });

  it('quitar un día marcado A MANO como descanso también escribe', () => {
    // El borrado quita lo que alguien pintó a mano, y una marca de descanso es algo pintado a mano
    // aunque no lleve ningún turno del catálogo encima. Contarlo como «no hay nada que quitar» diría
    // que no pasa nada y el día sí cambia: vuelve a lo que el horario exija.
    const r = conteoDePrevia([celda({ esDescansoHoy: true, pintadoAMano: true })], () => QUITAR, HOY);
    expect(r.escribe).toBe(1);
  });

  it('pero un día que el horario resuelve solo no tiene nada que quitar', () => {
    // Sin nada pintado a mano, el backend contesta «ese día no tiene ningún turno pintado».
    const r = conteoDePrevia([celda({ esDescansoHoy: true, pintadoAMano: false })], () => QUITAR, HOY);
    expect(r).toEqual({ escribe: 0, iguales: 1, bloqueadas: 0 });
  });

  it('la acción la decide quien llama, celda por celda', () => {
    // Es lo que permite que una ROTACIÓN pase por esta misma previa: unos días reciben turno y otros
    // descanso, y si la acción fuera única para todo el envío haría falta una segunda previa.
    const celdas = [celda({ fecha: '2026-09-30' }), celda({ fecha: '2026-10-01', esDescansoHoy: true })];
    const r = conteoDePrevia(celdas, c => (c.esDescansoHoy ? DESCANSO : TURNO), HOY);
    expect(r).toEqual({ escribe: 1, iguales: 1, bloqueadas: 0 });
  });

  it('sin celdas todo es cero', () => {
    expect(conteoDePrevia([], () => TURNO, HOY)).toEqual({ escribe: 0, iguales: 0, bloqueadas: 0 });
  });
});

describe('pintar sobre el descanso obligatorio', () => {
  it('un turno encima de su descanso obligatorio se avisa', () => {
    // El caso que cuesta dinero: ese día pasa a ser DESCANSO_TRABAJADO, paga recargo y, a partir del
    // tercero del mes, obliga a compensar con tiempo.
    const c = celda({ esDescansoObligatorio: true });
    expect(descansosPisados([c], () => TURNO, HOY)).toEqual([c]);
  });

  it('marcar DESCANSO sobre su descanso obligatorio no lo pisa', () => {
    // Marcar descanso ES el descanso. Avisarlo aquí convertiría el aviso en ruido justo en la acción
    // que hace lo correcto.
    expect(descansosPisados([celda({ esDescansoObligatorio: true })], () => DESCANSO, HOY)).toEqual([]);
  });

  it('QUITAR sobre su descanso obligatorio tampoco lo pisa', () => {
    // Quitar deja el día en blanco, y un día en blanco no es un día trabajado.
    expect(descansosPisados([celda({ esDescansoObligatorio: true })], () => QUITAR, HOY)).toEqual([]);
  });

  it('un día que NO es su descanso obligatorio no se avisa', () => {
    expect(descansosPisados([celda({ esDescansoObligatorio: false })], () => TURNO, HOY)).toEqual([]);
  });

  it('un día ya pasado no se avisa, porque no se va a escribir', () => {
    // Avisar de algo que no se va a tocar manda a buscar un problema que no existe.
    const c = celda({ esDescansoObligatorio: true, fecha: '2026-09-01' });
    expect(descansosPisados([c], () => TURNO, HOY)).toEqual([]);
  });

  it('un día que ya tiene ese mismo turno encima tampoco se avisa', () => {
    // Ya estaba pisado antes de esto: el aviso es de lo que ESTE envío provoca. Repetirlo haría que
    // repasar una semana ya programada pareciera un cambio.
    const c = celda({ esDescansoObligatorio: true, plantillaIdActual: 'p1' });
    expect(descansosPisados([c], () => TURNO, HOY)).toEqual([]);
  });

  it('devuelve las celdas en el orden en que venían', () => {
    const a = celda({ esDescansoObligatorio: true, fecha: '2026-09-30' });
    const b = celda({ esDescansoObligatorio: true, fecha: '2026-10-04', colaboradorId: 'c2' });
    expect(descansosPisados([a, b], () => TURNO, HOY).map(c => c.fecha))
      .toEqual(['2026-09-30', '2026-10-04']);
  });
});

describe('quién cruza a descanso habitual con esto', () => {
  // EL AVISO QUE CAMBIA UNA OBLIGACIÓN, y no una cifra de plata: el recargo se paga igual con uno que
  // con cinco. Lo que cambia al llegar al tercero del mes es que compensar con TIEMPO deja de ser
  // opcional (art. 181). Por eso se avisa el CRUCE y no el número.
  //
  // EL UMBRAL ENTRA COMO PARÁMETRO Y NO ESCRITO AQUÍ. Es una regla legal y vive en el backend
  // (`MINIMO_HABITUAL`); escribir un 3 en la pantalla sería la segunda copia. Viaja en la respuesta
  // igual que ya viaja el tope de horas semanales, que es el mismo caso y el precedente.

  it('avisa a quien pasa de dos a tres', () => {
    const r = cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 2, pisaEsteEnvio: 1, descansoRotativo: false }], 3);
    expect(r).toEqual([{ colaboradorId: 'c1', antes: 2, despues: 3 }]);
  });

  it('no avisa a quien se queda en dos', () => {
    expect(cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 1, pisaEsteEnvio: 1, descansoRotativo: false }], 3))
      .toEqual([]);
  });

  it('no avisa a quien YA era habitual: no cruza nada, ya estaba', () => {
    // Si avisara, el aviso saldría en cada envío del resto del mes y dejaría de leerse.
    expect(cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 3, pisaEsteEnvio: 2, descansoRotativo: false }], 3))
      .toEqual([]);
  });

  it('no avisa a quien no pisa ningún descanso en este envío', () => {
    // ESTE COMPORTAMIENTO SALE DE LA CONDICIÓN DEL CRUCE, NO DE UNA GUARDA, y conviene saberlo para
    // no volver a agregar una creyendo que falta: sin nada pisado, `despues` es igual a `antes`, y
    // «antes por debajo del mínimo y después por encima» no puede cumplirse. Hubo una guarda aquí y
    // al mutarla no se puso roja ninguna prueba, que es como se supo que era código muerto.
    expect(cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 2, pisaEsteEnvio: 0, descansoRotativo: false }], 3))
      .toEqual([]);
  });

  it('avisa a quien salta el umbral de una sola vez', () => {
    // Marcar un mes entero puede pisar cuatro descansos de golpe: el aviso tiene que salir igual,
    // aunque no pase por el tres exacto.
    expect(cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 0, pisaEsteEnvio: 4, descansoRotativo: false }], 3))
      .toEqual([{ colaboradorId: 'c1', antes: 0, despues: 4 }]);
  });

  it('avisa a varias personas, en el orden en que venían', () => {
    const r = cruzanAHabitual([
      { colaboradorId: 'c1', trabajadosEnElMes: 2, pisaEsteEnvio: 1, descansoRotativo: false },
      { colaboradorId: 'c2', trabajadosEnElMes: 0, pisaEsteEnvio: 1, descansoRotativo: false },
      { colaboradorId: 'c3', trabajadosEnElMes: 2, pisaEsteEnvio: 5, descansoRotativo: false },
    ], 3);
    expect(r.map(x => x.colaboradorId)).toEqual(['c1', 'c3']);
  });

  it('un umbral distinto cambia el resultado, que es la prueba de que NO está escrito dentro', () => {
    // Si la ley cambiara el mínimo, esto tiene que seguirla sin tocar la pantalla.
    expect(cruzanAHabitual([{ colaboradorId: 'c1', trabajadosEnElMes: 1, pisaEsteEnvio: 1, descansoRotativo: false }], 2))
      .toEqual([{ colaboradorId: 'c1', antes: 1, despues: 2 }]);
  });

  it('sin nadie no avisa nada', () => {
    expect(cruzanAHabitual([], 3)).toEqual([]);
  });

  it('a un ROTATIVO no se le avisa, aunque los números crucen igual', () => {
    // EL MOTIVO ES DEL DUEÑO Y ES CONDICIONAL, así que va entero: el compensatorio es cosa de los
    // turnos fijos. No es que la norma no exista para un rotativo, es que no se dispara mientras su
    // rotación sí le dé descanso cada semana. Si deja una semana sin ninguno, eso sale por el OTRO
    // aviso —«semanas que quedarían sin ningún descanso»—, que es el que de verdad le corresponde.
    //
    // POR ESO ESTA EXCLUSIÓN NO SE PODÍA ESCRIBIR ANTES DE HOY: ese otro aviso acaba de existir. Sin
    // él, callar aquí habría quitado una advertencia y dejado el caso sin nadie que lo recogiera.
    //
    // Los números son los mismos del primer caso de este bloque —dos trabajados más uno que pisa son
    // tres—, para que lo único que cambie sea el tipo de descanso.
    expect(cruzanAHabitual(
      [{ colaboradorId: 'c1', trabajadosEnElMes: 2, pisaEsteEnvio: 1, descansoRotativo: true }], 3,
    )).toEqual([]);
  });

  it('y el campo es OBLIGATORIO: a un fijo con los mismos números sí se le avisa', () => {
    // El contraste, y la razón de que `descansoRotativo` no sea opcional: con un valor por defecto,
    // quien llame desde una pantalla nueva y se olvide del campo recibiría el aviso sin haber dicho
    // de qué tipo es el descanso. Siendo obligatorio, el compilador obliga a decirlo.
    expect(cruzanAHabitual(
      [{ colaboradorId: 'c1', trabajadosEnElMes: 2, pisaEsteEnvio: 1, descansoRotativo: false }], 3,
    )).toEqual([{ colaboradorId: 'c1', antes: 2, despues: 3 }]);
  });
});
