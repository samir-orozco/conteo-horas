import { describe, it, expect } from 'vitest';
import { reescrituraDeSemana } from './descansoObligatorio';
import type { FuenteDelDescanso } from './descansoDelHorario';

// QUÉ DÍAS DE LA SEMANA HAY QUE REESCRIBIR AL PINTAR UN TURNO (22 de septiembre de 2026).
//
// Es la pieza 2 del planificador rotativo, y la razón de que exista es esta: `esDescanso` se
// escribe DÍA POR DÍA, pero «cuál de estos siete lleva el descanso» es una pregunta de la SEMANA.
// Si alguien pinta el turno de descanso en miércoles, no basta con poner `true` en el miércoles:
// hay que poner `false` en el domingo de esa misma semana, que ya está escrito desde hace días.
//
// O sea que pintar un día tiene que reescribir OTRO día. Eso es lo que esta función decide.
//
// LO PELIGROSO, y por eso la decisión sale aquí en vez de quedarse dentro de la escritura: un día
// YA PASADO no se toca nunca. Reescribirlo cambiaría lo que ese día exigía, y de ahí salen la
// tardanza, el descuento de almuerzo y el saldo de un período ya liquidado. El día de HOY sí entra:
// la guarda de «ya empezó su jornada» es otra, vive en `diaTocable` y necesita la base.
//
// Y devuelve SOLO lo que cambia. No es una optimización: una fila reescrita con el mismo valor
// queda con `actualizadoEn` de hoy, y eso borra la única pista que permite fechar quién tocó qué,
// que es justo lo que hizo falta para entender un susto de ayer.

const bog = (iso: string) => new Date(`${iso}T05:00:00.000Z`);

// Semana del lunes 21 al domingo 27 de septiembre de 2026.
const LUNES = bog('2026-09-21');
const DIAS = [
  { fecha: bog('2026-09-21'), diaSemana: 'LUNES' },
  { fecha: bog('2026-09-22'), diaSemana: 'MARTES' },
  { fecha: bog('2026-09-23'), diaSemana: 'MIERCOLES' },
  { fecha: bog('2026-09-24'), diaSemana: 'JUEVES' },
  { fecha: bog('2026-09-25'), diaSemana: 'VIERNES' },
  { fecha: bog('2026-09-26'), diaSemana: 'SABADO' },
  { fecha: bog('2026-09-27'), diaSemana: 'DOMINGO' },
];

// La semana tal como quedó congelada ANTES de planificar: el domingo es el descanso, por presunción.
const comoEstaba = DIAS.map(d => ({ ...d, esDescanso: d.diaSemana === 'DOMINGO' }));

// SIN HORARIO: no tiene día fijo, lo pone la programación de cada semana. Es el único caso en el
// que reescribir la semana hace algo, y por eso es el que más pruebas tiene aquí.
const SIN_HORARIO: FuenteDelDescanso = { de: 'PROGRAMACION' };
// CON HORARIO de lunes a sábado: su día libre es el domingo y la programación no lo mueve.
const HORARIO_L_A_S: FuenteDelDescanso = {
  de: 'HORARIO',
  diasQueTrabaja: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
};

const clave = (r: { fecha: Date; esDescanso: boolean }) =>
  `${r.fecha.toISOString().slice(0, 10)}=${r.esDescanso}`;

describe('reescrituraDeSemana', () => {
  it('mover el descanso al miércoles apaga el domingo y enciende el miércoles', () => {
    // El caso central. Sin el `false` del domingo, esa semana tendría dos descansos.
    const cambios = reescrituraDeSemana(comoEstaba, SIN_HORARIO, 'MIERCOLES', LUNES);
    expect(cambios.map(clave).sort()).toEqual(['2026-09-23=true', '2026-09-27=false']);
  });

  it('solo devuelve lo que CAMBIA, no la semana entera', () => {
    // Los otros cinco días ya valían `false` y valen `false`. Reescribirlos les movería el
    // `actualizadoEn` sin que nada haya cambiado, y con eso se pierde la pista de quién tocó qué.
    const cambios = reescrituraDeSemana(comoEstaba, SIN_HORARIO, 'MIERCOLES', LUNES);
    expect(cambios).toHaveLength(2);
  });

  it('si ya está como debe quedar, no hay nada que escribir', () => {
    const cambios = reescrituraDeSemana(comoEstaba, SIN_HORARIO, 'DOMINGO', LUNES);
    expect(cambios).toEqual([]);
  });

  it('UN DÍA YA PASADO NO SE TOCA, aunque su valor sea el equivocado', () => {
    // Lo más importante de esta función. Si hoy es jueves y se planifica el descanso del miércoles,
    // el miércoles ya pasó: su fila se queda con lo que se congeló. Reescribirla cambiaría lo que
    // ese día exigía en un período que puede estar liquidado.
    const cambios = reescrituraDeSemana(comoEstaba, SIN_HORARIO, 'MIERCOLES', bog('2026-09-24'));
    expect(cambios.map(clave)).toEqual(['2026-09-27=false']);
  });

  it('el día de HOY sí se puede reescribir', () => {
    // No es pasado. Que la persona ya haya marcado lo decide `diaTocable`, que es otra guarda y
    // necesita la base; aquí solo se separa pasado de no-pasado.
    const cambios = reescrituraDeSemana(comoEstaba, SIN_HORARIO, 'MIERCOLES', bog('2026-09-23'));
    expect(cambios.map(clave).sort()).toEqual(['2026-09-23=true', '2026-09-27=false']);
  });

  it('SIN HORARIO Y SIN PROGRAMAR, esa semana no tiene descanso: ni el domingo', () => {
    // CAMBIO DE COMPORTAMIENTO del 30 de septiembre de 2026, y es una decisión del dueño con su
    // precio dicho antes de tomarla: «alguien sin horario no tiene día de descanso fijo, solo cuando
    // se programa se pone el día de descanso». Antes esto caía al DOMINGO, con el argumento de que
    // un turno pintado puede agregar un recargo y nunca quitarlo. Ahora no: una semana sin programar
    // no tiene descanso obligatorio, así que su domingo trabajado no paga el 90%.
    const conMiercoles = comoEstaba.map(d =>
      ({ ...d, esDescanso: d.diaSemana === 'MIERCOLES' }));
    const cambios = reescrituraDeSemana(conMiercoles, SIN_HORARIO, null, LUNES);
    expect(cambios.map(clave)).toEqual(['2026-09-23=false']);
  });

  it('CON HORARIO manda el horario, y la programación NO lo mueve', () => {
    // La otra mitad de la regla, con sus palabras: «solo sabemos el día de descanso de un trabajador
    // a través del horario fijo». Alguien de lunes a sábado descansa el domingo, y marcar el
    // miércoles en la rejilla no puede contradecirlo. La semana ya está como debe quedar.
    expect(reescrituraDeSemana(comoEstaba, HORARIO_L_A_S, 'MIERCOLES', LUNES)).toEqual([]);
  });

  it('con un horario que cubre los SIETE días, el descanso sigue siendo el domingo', () => {
    // Es la forma que toma una operación rotativa metida en una herramienta de horarios fijos:
    // medido en producción, 10 horarios de 22 cubren los siete días. No sobra ningún día libre, así
    // que manda la presunción legal.
    const siete: FuenteDelDescanso = {
      de: 'HORARIO',
      diasQueTrabaja: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
    };
    expect(reescrituraDeSemana(comoEstaba, siete, 'MIERCOLES', LUNES)).toEqual([]);
  });

  it('un horario cuyo día libre es el martes descansa el martes, no el domingo', () => {
    const libreMartes: FuenteDelDescanso = {
      de: 'HORARIO',
      diasQueTrabaja: ['LUNES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
    };
    const cambios = reescrituraDeSemana(comoEstaba, libreMartes, 'MIERCOLES', LUNES);
    expect(cambios.map(clave).sort()).toEqual(['2026-09-22=true', '2026-09-27=false']);
  });

  it('una semana en null se escribe ENTERA, no solo el día del descanso', () => {
    // Las filas anteriores a la columna valen `null`, que es la AUSENCIA de un dato y no un `false`.
    // El motor las deja fuera de `porFecha` (que solo recoge las booleanas) y las resuelve con el
    // respaldo, y el respaldo manda a DOMINGO. O sea que escribir solo el miércoles dejaría seis
    // días resolviéndose contra el domingo justo cuando el plan dice miércoles: la semana tendría
    // dos descansos y ninguna prueba se quejaría.
    //
    // Esta prueba afirmaba lo contrario cuando se escribió, y se corrigió al derivar el principio.
    const sinCalcular = DIAS.map(d => ({ ...d, esDescanso: null }));
    const cambios = reescrituraDeSemana(sinCalcular, SIN_HORARIO, 'MIERCOLES', LUNES);
    expect(cambios.map(clave)).toEqual([
      '2026-09-21=false', '2026-09-22=false', '2026-09-23=true', '2026-09-24=false',
      '2026-09-25=false', '2026-09-26=false', '2026-09-27=false',
    ]);
  });

  it('una semana vacía no escribe nada y no revienta', () => {
    expect(reescrituraDeSemana([], SIN_HORARIO, 'MIERCOLES', LUNES)).toEqual([]);
  });
});
