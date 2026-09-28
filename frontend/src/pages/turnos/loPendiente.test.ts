import { describe, it, expect } from 'vitest';
import { accionDeLoPendiente } from './loPendiente';
import type { LoPendiente } from './loPendiente';

// QUÉ SE LE ESCRIBE A CADA DÍA CON LO QUE ESTÁ PENDIENTE (28 de septiembre de 2026).
//
// Lo pendiente son DOS COSAS DISTINTAS: una acción igual para todas las celdas (un turno, un descanso,
// quitar), o una ROTACIÓN, que reparte turnos y descansos a lo largo del ciclo. Esta función las
// resuelve a las dos, celda por celda.
//
// POR QUÉ VIVE EN SU PROPIO ARCHIVO Y NO DENTRO DE LA PANTALLA: decide qué se le escribe a un día, o
// sea lo que ese día va a exigir, y de ahí salen la tardanza y las horas extra. Estaba dentro del
// componente y sin una sola prueba propia —solo se ejercitaba de rebote—, y lo señaló el linter por
// otra razón (Fast Refresh). Tenía razón sobre el sitio aunque no sobre el motivo.
//
// LA UNIÓN ES LO QUE PERMITE UN SOLO CAMINO DE ESCRITURA: de aquí para abajo, la previa, el plan por
// bloques y la petición al servidor no se enteran de si vino de un turno suelto o de una rotación. Con
// una acción única haría falta un segundo camino solo para las rotaciones.

const TURNO_SUELTO: LoPendiente = { clase: 'IGUAL', accion: { tipo: 'TURNO', plantillaId: 'p1' } };
const DESCANSO_SUELTO: LoPendiente = { clase: 'IGUAL', accion: { tipo: 'DESCANSO' } };
const QUITAR_SUELTO: LoPendiente = { clase: 'IGUAL', accion: { tipo: 'QUITAR' } };

const rotacion = (extra: Partial<Extract<LoPendiente, { clase: 'ROTACION' }>> = {}): LoPendiente => ({
  clase: 'ROTACION', patron: '6x1', desfase: 0, plantillaId: 'p2', primerDia: '2026-09-28', ...extra,
});

describe('una acción igual para todas las celdas', () => {
  it('un turno se devuelve tal cual, sea cual sea la fecha', () => {
    expect(accionDeLoPendiente(TURNO_SUELTO, '2026-09-28')).toEqual({ tipo: 'TURNO', plantillaId: 'p1' });
    expect(accionDeLoPendiente(TURNO_SUELTO, '2026-10-15')).toEqual({ tipo: 'TURNO', plantillaId: 'p1' });
  });

  it('un descanso también', () => {
    expect(accionDeLoPendiente(DESCANSO_SUELTO, '2026-09-28')).toEqual({ tipo: 'DESCANSO' });
  });

  it('y quitar también', () => {
    expect(accionDeLoPendiente(QUITAR_SUELTO, '2026-09-28')).toEqual({ tipo: 'QUITAR' });
  });
});

describe('una rotación reparte turnos y descansos', () => {
  it('los días de trabajo del ciclo reciben el turno elegido', () => {
    // 6x1 anclado el 28: los seis primeros trabajan.
    expect(accionDeLoPendiente(rotacion(), '2026-09-28')).toEqual({ tipo: 'TURNO', plantillaId: 'p2' });
    expect(accionDeLoPendiente(rotacion(), '2026-10-03')).toEqual({ tipo: 'TURNO', plantillaId: 'p2' });
  });

  it('y el día de descanso del ciclo recibe DESCANSO, no el turno', () => {
    // El séptimo día del 6x1. Es lo que distingue una rotación de pintar el mismo turno treinta días.
    expect(accionDeLoPendiente(rotacion(), '2026-10-04')).toEqual({ tipo: 'DESCANSO' });
  });

  it('el ciclo se repite: el octavo día vuelve a trabajar', () => {
    expect(accionDeLoPendiente(rotacion(), '2026-10-05')).toEqual({ tipo: 'TURNO', plantillaId: 'p2' });
  });

  it('el desfase corre el ciclo', () => {
    // Con desfase 1, el descanso del 6x1 se adelanta un día.
    expect(accionDeLoPendiente(rotacion({ desfase: 1 }), '2026-10-03')).toEqual({ tipo: 'DESCANSO' });
  });

  it('un 2x2 alterna de dos en dos', () => {
    const dos = rotacion({ patron: '2x2' });
    expect(accionDeLoPendiente(dos, '2026-09-28').tipo).toBe('TURNO');
    expect(accionDeLoPendiente(dos, '2026-09-29').tipo).toBe('TURNO');
    expect(accionDeLoPendiente(dos, '2026-09-30').tipo).toBe('DESCANSO');
    expect(accionDeLoPendiente(dos, '2026-10-01').tipo).toBe('DESCANSO');
    expect(accionDeLoPendiente(dos, '2026-10-02').tipo).toBe('TURNO');
  });

  it('una fecha ANTERIOR al ancla no se sale del ciclo por abajo', () => {
    // En JavaScript `-1 % 7` es `-1`, así que sin normalizar el índice se saldría del ciclo y la
    // rotación devolvería cualquier cosa. La normalización vive en `accionDelDia`, y esto comprueba
    // que esta función se apoya en ella en vez de hacer su propia cuenta.
    const r = accionDeLoPendiente(rotacion(), '2026-09-27');
    expect(['TURNO', 'DESCANSO']).toContain(r.tipo);
  });

  it('el turno de la rotación es el que se eligió, no el primero del catálogo', () => {
    const otro = rotacion({ plantillaId: 'p9' });
    expect(accionDeLoPendiente(otro, '2026-09-28')).toEqual({ tipo: 'TURNO', plantillaId: 'p9' });
  });

  it('la posición se cuenta desde `primerDia`, no desde la fecha que se pregunta', () => {
    // Dos personas con el mismo desfase quedan alineadas entre sí solo si las dos cuentan desde el
    // mismo día. Anclando en otro día, el mismo 30 de septiembre cambia de sitio en el ciclo.
    const desde28 = accionDeLoPendiente(rotacion({ patron: '2x2', primerDia: '2026-09-28' }), '2026-09-30');
    const desde30 = accionDeLoPendiente(rotacion({ patron: '2x2', primerDia: '2026-09-30' }), '2026-09-30');
    expect(desde28.tipo).toBe('DESCANSO');
    expect(desde30.tipo).toBe('TURNO');
  });
});
