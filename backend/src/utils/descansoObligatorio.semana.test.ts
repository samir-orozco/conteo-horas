import { describe, it, expect } from 'vitest';
import { descansoDeLaSemana } from './descansoObligatorio';

// CUÁL DE LOS SIETE DÍAS LLEVA EL DESCANSO, EN UNA SEMANA PLANIFICADA (21 de septiembre de 2026).
//
// Es la pieza que faltaba para que ROTATIVO signifique algo. Hasta hoy `esDescansoObligatorio`
// recibía `null` como día planificado desde sus CINCO llamadores, así que un rotativo caía siempre
// al domingo y la rama existía sin que nada la alimentara.
//
// La fuente de verdad es el propio calendario: el día que lleva pintado un turno cuyo
// `PlantillaTurno.esDescanso` es true ES el descanso de esa semana. No hace falta ninguna entidad
// nueva ni ninguna columna nueva; lo que faltaba era preguntárselo a la semana en vez de al día.
//
// LA REGLA QUE GOBIERNA TODOS LOS CASOS RAROS: un turno pintado puede AGREGAR un recargo, nunca
// quitarlo. Por eso todo lo que no sea «exactamente uno» devuelve `null`, que hace caer al domingo:
//
//   ninguno   la semana no está planificada todavía. Es una omisión del administrador, y no puede
//             dejar a nadie sin descanso obligatorio.
//   dos o más alguien se equivocó al planificar. Elegir uno convertiría al otro en día ordinario, y
//             si ese otro era el domingo le quitaría el recargo del 90% sin que nadie lo decida.
//
// Decidido con el dueño el 21 de septiembre de 2026: el día en blanco NO se asume como descanso.
// El olvido y la decisión producen el mismo dato, así que asumir dejaría de pagar un recargo por
// deducción propia. El planificador lo PROPONE y una persona lo confirma; esta función solo lee lo
// que quedó confirmado.

const dia = (d: string, esDescanso = false) => ({ dia: d, esDescanso });

// Una semana normal de alguien que trabaja los siete días, con el descanso donde se diga.
const semanaCon = (descanso: string | null) =>
  ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']
    .map(d => dia(d, d === descanso));

describe('descansoDeLaSemana', () => {
  it('el día con turno de descanso es el descanso de la semana', () => {
    expect(descansoDeLaSemana(semanaCon('MIERCOLES'))).toBe('MIERCOLES');
  });

  it('el domingo no tiene nada de especial aquí: si lo lleva, lo lleva', () => {
    // La presunción legal la aplica `esDescansoObligatorio`, no esta función. Aquí el domingo es un
    // día más, y confundir las dos cosas metería la regla legal en dos sitios.
    expect(descansoDeLaSemana(semanaCon('DOMINGO'))).toBe('DOMINGO');
  });

  it('sin ningún turno de descanso no hay plan: null', () => {
    // El llamador cae entonces al domingo. Que nadie haya planificado la semana es una omisión, y
    // la omisión no puede dejar a una persona sin descanso obligatorio.
    expect(descansoDeLaSemana(semanaCon(null))).toBeNull();
  });

  it('con DOS descansos no se elige ninguno: null', () => {
    // El caso que cuesta dinero si se resuelve mal. Si se eligiera el miércoles, el domingo pasaría
    // a ser día ordinario y perdería el recargo del 90% por un error de planificación.
    const semana = semanaCon('MIERCOLES').map(d =>
      (d.dia === 'DOMINGO' ? { ...d, esDescanso: true } : d));
    expect(descansoDeLaSemana(semana)).toBeNull();
  });

  it('con TRES o más tampoco', () => {
    const semana = ['LUNES', 'MARTES', 'MIERCOLES'].map(d => dia(d, true));
    expect(descansoDeLaSemana(semana)).toBeNull();
  });

  it('los días que NO llevan descanso no cuentan, aunque estén', () => {
    // La semana llega entera desde la base: seis días de trabajo y uno de descanso. Si los de
    // trabajo contaran, cualquier semana daría «ambiguo».
    expect(descansoDeLaSemana(semanaCon('SABADO'))).toBe('SABADO');
  });

  it('una semana incompleta sirve igual: se pregunta por lo que hay', () => {
    // Al pintar, los días ya pasados de esa semana no se vuelven a leer ni a tocar. La función no
    // puede exigir siete.
    expect(descansoDeLaSemana([dia('JUEVES', true), dia('VIERNES')])).toBe('JUEVES');
  });

  it('una lista vacía es «sin plan», no un error', () => {
    expect(descansoDeLaSemana([])).toBeNull();
  });

  it('un nombre de día que no existe se ignora en silencio', () => {
    // `FranjaHorario.dias` y las columnas de descanso son texto libre en la base. Un valor raro no
    // puede cambiar quién descansa cuándo, que es la misma doctrina de `diaValido`.
    expect(descansoDeLaSemana([dia('JUEVES ', true), dia('lunes')])).toBe('JUEVES');
    expect(descansoDeLaSemana([dia('DIA_RARO', true)])).toBeNull();
  });

  it('el mismo día repetido cuenta como uno solo', () => {
    // No debería pasar (hay una fila por persona y fecha), pero si pasara, contarlo dos veces
    // diría «ambiguo» sobre una semana que está perfectamente clara.
    expect(descansoDeLaSemana([dia('MIERCOLES', true), dia('MIERCOLES', true)])).toBe('MIERCOLES');
  });

  it('acepta minúsculas y espacios, igual que el resto del módulo', () => {
    expect(descansoDeLaSemana([dia('  miercoles  ', true)])).toBe('MIERCOLES');
  });
});
