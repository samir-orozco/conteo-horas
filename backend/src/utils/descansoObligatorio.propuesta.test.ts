import { describe, it, expect } from 'vitest';
import { propuestaDeDescanso, descansoDeLaSemana } from './descansoObligatorio';
import type { EstadoDescanso } from './descansoObligatorio';

// QUÉ LE DICE LA PANTALLA A QUIEN PLANIFICA UNA SEMANA ROTATIVA (22 de septiembre de 2026).
//
// Decidido con el dueño: un día EN BLANCO no se asume como descanso. El olvido de planificarlo y la
// decisión de dejarlo libre producen exactamente el mismo dato, así que asumir sería dejar de pagar
// un recargo por deducción propia. Pero pedir un clic extra en cada semana es fricción real, con 35
// personas son 35 clics, así que el sistema PROPONE y una persona confirma.
//
// Es el mismo patrón que ya usa el modal del descanso (`RevisionDescanso.tsx:58`): el backend
// deduce, llega preseleccionado cuando pudo deducir, y queda vacío cuando no.
//
// SON CUATRO ESTADOS Y NO UN BOOLEANO (CLAUDE.md §9.4), porque cada uno le dice algo distinto a
// quien mira, y un `? :` volvería a suponer en cuanto aparezca el quinto:
//
//   RESUELTA      la semana ya tiene su descanso pintado. No hay nada que preguntar.
//   PROPUESTA     no lo tiene y sobra exactamente un día: se sugiere ese, con un clic.
//   SIN_DESCANSO  no se puede deducir. La semana se está tomando el DOMINGO, y hay que decirlo.
//   AMBIGUA       hay dos descansos pintados. Es un error de planificación, no una omisión, y se
//                 ve distinto: también cae al domingo, pero por otra razón.
//
// Y NO_APLICA para quien no es rotativo: sin acuerdo escrito pintar no mueve el descanso de nadie,
// así que proponerle algo sería ofrecerle una decisión que no puede tomar.

const dia = (d: string, pintado = false, descansoMarcado = false) =>
  ({ dia: d, pintado, descansoMarcado });

const SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

// Todos pintados de TRABAJO salvo los que se digan: `enBlanco` no lleva turno, `descanso` lleva uno
// de descanso.
const semana = (opciones: { enBlanco?: string[]; descanso?: string[] } = {}) =>
  SEMANA.map(d => {
    if (opciones.enBlanco?.includes(d)) return dia(d, false, false);
    // MARCADO Y SIN PLANTILLA, que es la forma real desde el 23 de septiembre de 2026: marcar un día
    // como descanso limpia `plantillaId` y enciende `descansoPintado`. Antes este helper lo
    // construía como un turno del catálogo con `esDescanso`, y por eso estas pruebas seguían verdes
    // mientras la pantalla decía lo contrario que el motor.
    if (opciones.descanso?.includes(d)) return dia(d, false, true);
    return dia(d, true, false);
  });

const ROTATIVO: EstadoDescanso = { tipo: 'ROTATIVO' };
const PRESUMIDO: EstadoDescanso = { tipo: 'PRESUMIDO' };
const FIJO: EstadoDescanso = { tipo: 'FIJO', dia: 'MARTES' };

describe('propuestaDeDescanso', () => {
  it('a quien es PRESUMIDO no se le propone nada', () => {
    // Su descanso lo fija la ley, no el calendario. Proponerle mover el descanso sería ofrecerle
    // una decisión que sin acuerdo escrito no puede tomar.
    expect(propuestaDeDescanso(semana({ enBlanco: ['JUEVES'] }), PRESUMIDO)).toEqual({ estado: 'NO_APLICA' });
  });

  it('a quien es FIJO tampoco: su día lo fijó un acuerdo', () => {
    expect(propuestaDeDescanso(semana({ enBlanco: ['JUEVES'] }), FIJO)).toEqual({ estado: 'NO_APLICA' });
  });

  it('con el descanso ya pintado, la semana está RESUELTA y dice cuál es', () => {
    expect(propuestaDeDescanso(semana({ descanso: ['MIERCOLES'] }), ROTATIVO))
      .toEqual({ estado: 'RESUELTA', dia: 'MIERCOLES' });
  });

  it('seis turnos y un día en blanco: se PROPONE ese día', () => {
    // El caso que evita los 35 clics. Es una sugerencia, no una declaración.
    expect(propuestaDeDescanso(semana({ enBlanco: ['JUEVES'] }), ROTATIVO))
      .toEqual({ estado: 'PROPUESTA', dia: 'JUEVES' });
  });

  it('una PROPUESTA no es una declaración: hasta que se pinte, el descanso sigue siendo el domingo', () => {
    // La prueba que amarra las dos funciones. Si esto dejara de ser cierto, proponer habría pasado
    // a decidir, que es exactamente lo que el dueño no quiso.
    const s = semana({ enBlanco: ['JUEVES'] });
    expect(propuestaDeDescanso(s, ROTATIVO)).toEqual({ estado: 'PROPUESTA', dia: 'JUEVES' });
    expect(descansoDeLaSemana(s.map(d => ({ dia: d.dia, esDescanso: d.descansoMarcado })))).toBeNull();
  });

  it('con DOS días en blanco no se propone: no se puede saber cuál', () => {
    expect(propuestaDeDescanso(semana({ enBlanco: ['JUEVES', 'SABADO'] }), ROTATIVO))
      .toEqual({ estado: 'SIN_DESCANSO' });
  });

  it('con los siete pintados de trabajo tampoco hay dónde proponer', () => {
    // El caso más común de una operación que cubre los siete días: no sobra ningún hueco.
    expect(propuestaDeDescanso(semana(), ROTATIVO)).toEqual({ estado: 'SIN_DESCANSO' });
  });

  it('con DOS descansos pintados es AMBIGUA, que no es lo mismo que sin descanso', () => {
    // Los dos caen al domingo, pero uno es una omisión y el otro un error ya cometido. Decirle a
    // quien planificó dos que «no hay descanso» le haría buscar lo que no falta.
    expect(propuestaDeDescanso(semana({ descanso: ['MIERCOLES', 'DOMINGO'] }), ROTATIVO))
      .toEqual({ estado: 'AMBIGUA' });
  });

  it('un descanso pintado y además un hueco: manda lo pintado', () => {
    // Lo que alguien ELIGIÓ vale más que lo que se puede deducir de un hueco.
    expect(propuestaDeDescanso(semana({ descanso: ['MIERCOLES'], enBlanco: ['SABADO'] }), ROTATIVO))
      .toEqual({ estado: 'RESUELTA', dia: 'MIERCOLES' });
  });

  it('una semana vacía no propone nada y no revienta', () => {
    expect(propuestaDeDescanso([], ROTATIVO)).toEqual({ estado: 'SIN_DESCANSO' });
  });

  it('un nombre de día que no existe no se puede proponer', () => {
    // Los nombres salen de columnas de texto libre. Proponer «DIA_RARO» pintaría un turno en un día
    // que no existe, y el backend lo rechazaría con un error que nadie sabría explicar.
    const rara = SEMANA.map(d => (d === 'JUEVES' ? dia('DIA_RARO', false) : dia(d, true)));
    expect(propuestaDeDescanso(rara, ROTATIVO)).toEqual({ estado: 'SIN_DESCANSO' });
  });
});

// ────────── LAS DOS FUENTES TIENEN QUE LEER LA MISMA COLUMNA (29 de septiembre de 2026) ──────────
//
// El 23 de septiembre el descanso dejó de ser un turno del catálogo y pasó a ser `descansoPintado`,
// una columna del DÍA. `reescribirSemanaDe` se migró en su momento; el otro lado, el que alimenta
// esta propuesta desde la ruta, se quedó leyendo `plantilla.esDescanso`. Es exactamente el §9.3:
// parecía una sola regla y eran dos, y la que quedó atrás gobierna lo que se le muestra a quien
// programa.
//
// LO QUE COSTABA: a alguien ROTATIVO con su martes marcado como descanso, la pantalla le decía
// «esta semana no tiene ningún día de descanso». Si le hacía caso y marcaba también el domingo, el
// motor pasaba a ver DOS descansos, devolvía `null` y el descanso de esa persona se caía al
// domingo. Obedecer el aviso movía el descanso que el aviso decía que faltaba.
//
// ESTA PRUEBA ES LA GUARDA y por eso afirma las dos funciones a la vez: mientras las dos contesten
// lo mismo sobre la misma semana, da igual cuál se toque después.

describe('la propuesta y el motor leen la misma columna', () => {
  // La forma REAL con la que llega un día marcado con el botón «Descanso»: `descansoPintado` en
  // true y NINGUNA plantilla encima, porque marcar un día libre limpia `plantillaId`.
  const marcado = (d: string) => dia(d, false, true);
  const conTurno = (d: string) => dia(d, true, false);

  it('un día marcado como descanso deja la semana RESUELTA, no sin descanso', () => {
    const s = SEMANA.map(d => (d === 'MARTES' ? marcado(d) : conTurno(d)));
    expect(propuestaDeDescanso(s, ROTATIVO)).toEqual({ estado: 'RESUELTA', dia: 'MARTES' });
  });

  it('y dice EL MISMO día que liquida el motor', () => {
    // `descansoDeLaSemana` es lo que corre dentro de `reescribirSemanaDe`, alimentado con
    // `descansoPintado`. Si esta afirmación se cae, la pantalla y la nómina discrepan.
    const s = SEMANA.map(d => (d === 'MARTES' ? marcado(d) : conTurno(d)));
    const delMotor = descansoDeLaSemana(s.map(d => ({ dia: d.dia, esDescanso: d.descansoMarcado })));
    const deLaPantalla = propuestaDeDescanso(s, ROTATIVO);
    expect(deLaPantalla).toEqual({ estado: 'RESUELTA', dia: delMotor });
  });

  it('con un hueco además del día marcado, sigue mandando lo marcado', () => {
    // El caso que salía SIN_DESCANSO: cinco turnos, el martes marcado y el domingo en blanco.
    const s = SEMANA.map(d => {
      if (d === 'MARTES') return marcado(d);
      if (d === 'DOMINGO') return dia(d, false, false);
      return conTurno(d);
    });
    expect(propuestaDeDescanso(s, ROTATIVO)).toEqual({ estado: 'RESUELTA', dia: 'MARTES' });
  });

  it('DOS días marcados siguen siendo AMBIGUA, que es lo que el motor también ve', () => {
    const s = SEMANA.map(d => (d === 'MARTES' || d === 'DOMINGO' ? marcado(d) : conTurno(d)));
    expect(propuestaDeDescanso(s, ROTATIVO)).toEqual({ estado: 'AMBIGUA' });
    expect(descansoDeLaSemana(s.map(d => ({ dia: d.dia, esDescanso: d.descansoMarcado })))).toBeNull();
  });
});
