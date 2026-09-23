import { describe, it, expect } from 'vitest';
import { rotuloDeCelda } from './rotuloDeCelda';

// QUÉ NOMBRE LLEVA LA CELDA DE UN DÍA (21 de septiembre de 2026).
//
// Sale de un defecto real y de su arreglo a medias. Antes la celda deducía «Mañana», «Tarde» o
// «Noche» de las horas del día: era cierto como descripción, pero se leía como un turno que alguien
// había asignado. Se quitó, y la celda pasó a decir «Sin asignar» para TODO lo que no estuviera
// pintado con el catálogo. Eso tapó la mentira con otra: un día que el horario programa SÍ está
// asignado, y decir lo contrario deja al dueño viendo a todo su equipo «sin asignar».
//
// Son TRES orígenes y no un booleano, por CLAUDE.md §9.4: la pregunta «de dónde salió este nombre»
// se responde con un caso por valor. Con un ternario, el día que aparezca un cuarto origen (una
// excepción marcada, que ya está en el plan) el `else` volvería a suponer.
//
// La precedencia importa y por eso tiene su propia prueba: lo que una persona eligió manda sobre
// lo que el horario impone. Si se invirtiera, pintar un turno no se vería.

describe('rotuloDeCelda', () => {
  const MANANA = { nombre: 'Portería A', color: 'esmeralda' };

  it('un turno del catálogo manda: es lo que alguien eligió', () => {
    expect(rotuloDeCelda(MANANA, 'Jornada demo')).toEqual({
      texto: 'Portería A', origen: 'CATALOGO',
    });
  });

  it('sin turno pintado, el nombre lo pone el horario', () => {
    // El caso que motiva todo esto: el día está programado por el horario, así que está asignado.
    expect(rotuloDeCelda(null, 'Jornada demo')).toEqual({
      texto: 'Jornada demo', origen: 'HORARIO',
    });
  });

  it('sin turno y sin horario sí es «sin asignar», y solo entonces', () => {
    // Pasa de verdad: un día congelado como programado cuya persona ya no tiene horario.
    expect(rotuloDeCelda(null, null)).toEqual({
      texto: 'Sin asignar', origen: 'NINGUNO',
    });
  });

  it('un nombre de horario en blanco no deja la celda muda', () => {
    // `Horario.nombre` es texto libre. Si llegara vacío o con solo espacios, mostrarlo dejaría una
    // celda sin rótulo que se leería como un error de la pantalla.
    expect(rotuloDeCelda(null, '   ')).toEqual({ texto: 'Sin asignar', origen: 'NINGUNO' });
    expect(rotuloDeCelda(null, '')).toEqual({ texto: 'Sin asignar', origen: 'NINGUNO' });
  });

  it('un turno sin nombre tampoco', () => {
    // Misma razón, del otro lado: el catálogo también guarda el nombre como texto.
    expect(rotuloDeCelda({ nombre: '  ', color: 'rubi' }, 'Jornada demo')).toEqual({
      texto: 'Jornada demo', origen: 'HORARIO',
    });
  });

  it('el nombre se muestra tal cual vino, sin recortarlo ni adornarlo', () => {
    // La celda es angosta y la tentación es abreviar aquí. No: abreviar es cosa del CSS, y hacerlo
    // en el dato haría que la prueba de la pantalla afirmara un nombre que no existe.
    expect(rotuloDeCelda(null, 'Turno de noche en planta 3').texto).toBe('Turno de noche en planta 3');
  });

  it('undefined se comporta como ausente, no como un nombre', () => {
    // La ruta manda `null`, pero el día sin fila puede llegar sin la clave.
    expect(rotuloDeCelda(null, undefined)).toEqual({ texto: 'Sin asignar', origen: 'NINGUNO' });
  });
});
