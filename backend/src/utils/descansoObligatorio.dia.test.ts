import { describe, it, expect } from 'vitest';
import { esDescansoObligatorio, type EstadoDescanso } from './descansoObligatorio';

// ¿ESTE DÍA ES EL DESCANSO OBLIGATORIO DE ESTA PERSONA? (20 de septiembre de 2026)
//
// Es la pregunta que hoy responde `esDomingo = diaSemana === 'DOMINGO'` escrito a mano
// (horasColombiana.ts:136), y la que decide si una hora lleva el recargo del 90%.
//
// El estado de cada persona tiene tres valores, decididos con el dueño:
//
//   PRESUMIDO  el domingo, por presunción legal. Es el valor por defecto de todo el mundo.
//   FIJO       otro día de la semana, y solo vale si hay acuerdo escrito.
//   ROTATIVO   lo define el turno planificado de esa semana. También exige acuerdo.
//
// LA REGLA QUE GOBIERNA TODO ESTO: un turno pintado puede AGREGAR un recargo, nunca quitarlo. De
// ahí sale la decisión que más se nota abajo: si alguien es rotativo y su semana no está
// planificada, NO se queda sin descanso obligatorio. Cae al domingo. Quedarse sin día porque nadie
// pintó el calendario sería dejar de pagar un recargo por omisión de un tercero.

const PRESUMIDO: EstadoDescanso = { tipo: 'PRESUMIDO' };

describe('presumido: el domingo, como hasta hoy', () => {
  it('el domingo es su descanso', () => {
    expect(esDescansoObligatorio('DOMINGO', PRESUMIDO, null)).toBe(true);
  });

  it('cualquier otro día no lo es', () => {
    expect(esDescansoObligatorio('MARTES', PRESUMIDO, null)).toBe(false);
    expect(esDescansoObligatorio('SABADO', PRESUMIDO, null)).toBe(false);
  });

  // Aunque el turno de esa semana diga otra cosa: sin acuerdo escrito, el calendario no puede
  // mover el descanso. Esta es la guarda que impide que pintar un turno quite un recargo.
  it('un turno planificado NO le mueve el descanso', () => {
    expect(esDescansoObligatorio('DOMINGO', PRESUMIDO, 'MARTES')).toBe(true);
    expect(esDescansoObligatorio('MARTES', PRESUMIDO, 'MARTES')).toBe(false);
  });
});

describe('fijo en otro día, con acuerdo', () => {
  const MIERCOLES: EstadoDescanso = { tipo: 'FIJO', dia: 'MIERCOLES' };

  it('su día pactado es el descanso', () => {
    expect(esDescansoObligatorio('MIERCOLES', MIERCOLES, null)).toBe(true);
  });

  // ESTE es el caso que hoy se cobra mal: para esta persona el domingo es un día ordinario.
  it('el domingo deja de ser descanso: es un día ordinario', () => {
    expect(esDescansoObligatorio('DOMINGO', MIERCOLES, null)).toBe(false);
  });

  // Un día guardado que no es un día de la semana (dato viejo, error de escritura) no puede dejar
  // a alguien sin descanso obligatorio. Cae al domingo, que es la dirección segura.
  it('un día inválido cae al domingo en vez de dejarla sin descanso', () => {
    const roto: EstadoDescanso = { tipo: 'FIJO', dia: 'FERIADO' };
    expect(esDescansoObligatorio('DOMINGO', roto, null)).toBe(true);
    expect(esDescansoObligatorio('MIERCOLES', roto, null)).toBe(false);
  });

  it('acepta el día guardado en minúsculas o con espacios', () => {
    const suelto: EstadoDescanso = { tipo: 'FIJO', dia: ' miercoles ' };
    expect(esDescansoObligatorio('MIERCOLES', suelto, null)).toBe(true);
    expect(esDescansoObligatorio('DOMINGO', suelto, null)).toBe(false);
  });
});

describe('rotativo: lo dice el turno de esa semana', () => {
  const ROTATIVO: EstadoDescanso = { tipo: 'ROTATIVO' };

  it('el día que el turno marcó como descanso lo es', () => {
    expect(esDescansoObligatorio('MARTES', ROTATIVO, 'MARTES')).toBe(true);
  });

  it('y el domingo de esa semana es ordinario', () => {
    expect(esDescansoObligatorio('DOMINGO', ROTATIVO, 'MARTES')).toBe(false);
  });

  // LA GUARDA. Nadie pintó esa semana, o la pintó sin ningún descanso. La persona no puede quedarse
  // sin descanso obligatorio por una omisión del administrador: vuelve la presunción.
  it('sin semana planificada vuelve el domingo', () => {
    expect(esDescansoObligatorio('DOMINGO', ROTATIVO, null)).toBe(true);
    expect(esDescansoObligatorio('MARTES', ROTATIVO, null)).toBe(false);
  });

  it('con un día planificado que no es válido, también vuelve el domingo', () => {
    expect(esDescansoObligatorio('DOMINGO', ROTATIVO, 'XYZ')).toBe(true);
    expect(esDescansoObligatorio('MARTES', ROTATIVO, 'XYZ')).toBe(false);
  });
});
