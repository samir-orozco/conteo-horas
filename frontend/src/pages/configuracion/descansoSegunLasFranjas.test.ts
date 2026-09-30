import { describe, it, expect } from 'vitest';
import { descansoSegunLasFranjas } from './descansoSegunLasFranjas';

// EL DESCANSO SALE DE LAS FRANJAS (29 de septiembre de 2026, corrección del dueño).
//
// Con sus palabras: «a lo que me refería del día de descanso son las que se hacen en la franja de
// horario, no se asigna directamente». Tiene razón, y es lo que el backend ya hace: `preguntasDeDescanso`
// deduce de las franjas y solo pregunta por los horarios donde no puede. Medido contra la base el 29
// de septiembre: de 11 horarios activos, 10 se resuelven solos.
//
// LA PRIMERA VERSIÓN DE LA SECCIÓN LO PREGUNTABA SIEMPRE, y era pedir lo que ya está dicho. Esto le da
// la vuelta: se calcula EN VIVO mientras se editan las franjas, y solo se pregunta cuando de verdad
// no se puede saber.
//
// TRES CASOS Y UNO SOLO NECESITA CONTROL:
//
//   DEDUCIDO       sobra exactamente un día. ESE es el descanso, y no hay nada que elegir.
//   VARIOS_LIBRES  sobran dos o más. Solo UNO es el descanso obligatorio y la ley no dice cuál:
//                  hay que preguntarlo, pero solo entre los que sobran.
//   SIN_DIA_LIBRE  las franjas cubren los siete. No hay hueco del que deducir nada, y es el caso
//                  más común en vigilancia, que es la clientela de este producto.
//
// UN DÍA EN BLANCO SÍ SE ASUME AQUÍ, al revés que en la rejilla de turnos. No es una incoherencia: una
// franja se construye ELIGIENDO los días que se trabajan, así que un día fuera de todas las franjas es
// una decisión, no un olvido. En la rejilla, una celda vacía puede ser cualquiera de las dos.

const franja = (...dias: string[]) => ({ dias });

describe('qué dicen las franjas sobre el día de descanso', () => {
  it('lunes a sábado: sobra el domingo, y ese es', () => {
    const r = descansoSegunLasFranjas([franja('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO')]);
    expect(r).toEqual({ caso: 'DEDUCIDO', dia: 'DOMINGO', libres: ['DOMINGO'] });
  });

  it('lunes a viernes: sobran dos, y hay que preguntar CUÁL de los dos', () => {
    // Sábado y domingo son los dos libres, pero solo uno es el descanso obligatorio: el otro es un
    // día no laborable, que no es lo mismo y no paga recargo.
    const r = descansoSegunLasFranjas([franja('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES')]);
    expect(r).toEqual({ caso: 'VARIOS_LIBRES', dia: null, libres: ['SABADO', 'DOMINGO'] });
  });

  it('los siete cubiertos: no hay de dónde deducir', () => {
    const r = descansoSegunLasFranjas([franja('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')]);
    expect(r).toEqual({ caso: 'SIN_DIA_LIBRE', dia: null, libres: [] });
  });

  it('VARIAS FRANJAS SE JUNTAN: lo que trabaja es la unión', () => {
    // El caso de verdad: una franja de lunes a viernes y otra de sábado corto. Mirando solo la
    // primera sobrarían dos días y sobra uno.
    const r = descansoSegunLasFranjas([
      franja('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'),
      franja('SABADO'),
    ]);
    expect(r).toEqual({ caso: 'DEDUCIDO', dia: 'DOMINGO', libres: ['DOMINGO'] });
  });

  it('un día repetido en dos franjas no cuenta dos veces', () => {
    const r = descansoSegunLasFranjas([franja('LUNES', 'SABADO'), franja('SABADO', 'DOMINGO')]);
    expect(r.libres).toEqual(['MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);
  });

  it('LOS LIBRES SALEN EN ORDEN DE SEMANA, no en el que vinieran las franjas', () => {
    // De esta lista salen los botones que se ofrecen. En otro orden, el selector pondría el domingo
    // antes del martes y quien mira tendría que buscarlo.
    const r = descansoSegunLasFranjas([franja('MIERCOLES', 'LUNES')]);
    expect(r.libres).toEqual(['MARTES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);
  });

  it('sin franjas, los siete están libres', () => {
    // Un horario a medio crear. No se deduce nada porque sobran siete, que es el caso de preguntar.
    const r = descansoSegunLasFranjas([]);
    expect(r.caso).toBe('VARIOS_LIBRES');
    expect(r.libres).toHaveLength(7);
  });

  it('un día que no existe en una franja se ignora, no descuadra la cuenta', () => {
    const r = descansoSegunLasFranjas([franja('LUNES', 'DIA_RARO', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO')]);
    expect(r).toEqual({ caso: 'DEDUCIDO', dia: 'DOMINGO', libres: ['DOMINGO'] });
  });
});
