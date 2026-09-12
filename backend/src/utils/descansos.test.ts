import { describe, it, expect } from 'vitest';
import {
  leerDescansos, escribirDescansos, leerVentana, claveDeVentana, ventanasEnOrden, horaValida,
  MAX_DESCANSOS_POR_FRANJA, MAX_MARCACIONES_POR_JORNADA,
  unirIntervalos, minutosDeLaUnion, minutosDescansoADescontar,
  descansoQueToca, ventanasTomadas, regresoEsperadoDelDescanso,
  emparejarSalidasDeDescanso, completarVentanasDeDescanso,
} from './descansos';
import { horaValida as horaValidaDeVentanas } from './ventanasDeHorario';
import { duracionFranjaMin } from './tardanzas';
import { duracionFranjaMin as duracionDesdeSaldo } from './saldoTiempo';

// VARIOS DESCANSOS NO REMUNERADOS POR FRANJA (12 de septiembre de 2026).
//
// La lista de ventanas se guarda como TEXTO en la franja del horario y se congela
// igual en cada día. Ese texto lo lee el kiosco en `/estado` antes de abrir la
// sesión: si leerlo lanzara con un valor roto, nadie podría entrar a marcar. Por
// eso la primera regla de este módulo es que LEER NUNCA LANZA, y lo que no se
// entiende se descarta elemento por elemento, sin tumbar lo demás.

const V = (inicio: string, fin: string) => ({ inicio, fin });

describe('leerDescansos: nunca lanza', () => {
  it('vacío, null, undefined, "null", "{}", "[]", "42" y "true" son sin descansos', () => {
    for (const valor of ['', null, undefined, 'null', '{}', '[]', '42', 'true', 42, true, {}, []]) {
      expect(leerDescansos(valor), JSON.stringify(valor) ?? 'undefined').toEqual([]);
    }
  });

  it('una lista bien escrita se lee tal cual', () => {
    expect(leerDescansos('[{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]'))
      .toEqual([V('09:00', '09:15'), V('15:00', '15:10')]);
  });

  it('un JSON cortado a la mitad no lanza: sin descansos', () => {
    expect(() => leerDescansos('[{"inicio":"09:00","fin":"09:1')).not.toThrow();
    expect(leerDescansos('[{"inicio":"09:00","fin":"09:1')).toEqual([]);
  });

  it('un elemento con hora imposible se descarta y los demás se quedan', () => {
    expect(leerDescansos('[{"inicio":"25:00","fin":"25:15"},{"inicio":"15:00","fin":"15:10"}]'))
      .toEqual([V('15:00', '15:10')]);
  });

  it('inicio igual a fin no es un descanso: sería de 24 horas', () => {
    expect(leerDescansos([V('09:00', '09:00'), V('10:00', '10:15')])).toEqual([V('10:00', '10:15')]);
  });

  it('"8:05" sin el cero no es una hora', () => {
    expect(leerDescansos([V('8:05', '8:20')])).toEqual([]);
  });

  it('los repetidos se leen una sola vez', () => {
    expect(leerDescansos([V('09:00', '09:15'), V('09:00', '09:15')])).toEqual([V('09:00', '09:15')]);
  });

  it('un objeto suelto, o el texto "09:00-09:15,15:00-15:10", también se entienden', () => {
    expect(leerDescansos('{"inicio":"09:00","fin":"09:15"}')).toEqual([V('09:00', '09:15')]);
    expect(leerDescansos('09:00-09:15,15:00-15:10')).toEqual([V('09:00', '09:15'), V('15:00', '15:10')]);
  });

  it('un arreglo ya parseado se acepta', () => {
    expect(leerDescansos([V('09:00', '09:15')])).toEqual([V('09:00', '09:15')]);
  });

  it('lo que no es un objeto ni un texto se descarta sin tumbar a los demás', () => {
    expect(leerDescansos([null, 5, true, ['09:00', '09:15'], V('09:00', '09:15')])).toEqual([V('09:00', '09:15')]);
  });

  it('los campos de más no viajan: solo inicio y fin', () => {
    expect(leerDescansos([{ inicio: '09:00', fin: '09:15', nombre: 'desayuno' }])).toEqual([V('09:00', '09:15')]);
  });

  it('con más de tres congelados los devuelve todos: el tope es al guardar', () => {
    const cuatro = [V('08:00', '08:05'), V('09:00', '09:05'), V('10:00', '10:05'), V('11:00', '11:05')];
    expect(leerDescansos(JSON.stringify(cuatro))).toHaveLength(4);
  });

  it('un texto gigante no se parsea', () => {
    // JSON válido de más de 2.000 caracteres: si se parseara, daría una ventana.
    const gigante = JSON.stringify(Array.from({ length: 80 }, () => V('09:00', '09:15')));
    expect(gigante.length).toBeGreaterThan(2000);
    expect(leerDescansos(gigante)).toEqual([]);
  });
});

describe('escribirDescansos', () => {
  it('sin ventanas escribe NULL, nunca []', () => {
    expect(escribirDescansos([])).toBeNull();
  });

  it('leer lo escrito devuelve lo mismo', () => {
    const lista = [V('09:00', '09:15'), V('15:00', '15:10')];
    expect(leerDescansos(escribirDescansos(lista))).toEqual(lista);
  });

  it('escribe solo inicio y fin, en ese orden, y siempre igual', () => {
    const conDeMas = { fin: '09:15', inicio: '09:00', nombre: 'x' } as unknown as { inicio: string; fin: string };
    expect(escribirDescansos([conDeMas])).toBe('[{"inicio":"09:00","fin":"09:15"}]');
  });

  it('tres ventanas caben en 191 caracteres, el largo de la columna', () => {
    const texto = escribirDescansos([V('23:55', '00:05'), V('02:00', '02:15'), V('04:00', '04:10')]);
    expect(texto!.length).toBeLessThanOrEqual(191);
  });
});

describe('leerVentana', () => {
  it('"09:00-09:15" se lee; "09:00-" o "25:00-26:00" no', () => {
    expect(leerVentana('09:00-09:15')).toEqual(V('09:00', '09:15'));
    expect(leerVentana('09:00-')).toBeNull();
    expect(leerVentana('25:00-26:00')).toBeNull();
  });

  it('un objeto con inicio y fin también, y uno que cruza la medianoche es válido', () => {
    expect(leerVentana({ inicio: '23:55', fin: '00:05' })).toEqual(V('23:55', '00:05'));
  });

  it('nada, un número o una ventana de 24 horas no son ventanas', () => {
    expect(leerVentana(null)).toBeNull();
    expect(leerVentana(915)).toBeNull();
    expect(leerVentana('09:00-09:00')).toBeNull();
  });
});

describe('claveDeVentana', () => {
  it('es la forma en que la marcación guarda a cuál descanso salió', () => {
    expect(claveDeVentana(V('09:00', '09:15'))).toBe('09:00-09:15');
    expect(leerVentana(claveDeVentana(V('23:55', '00:05')))).toEqual(V('23:55', '00:05'));
  });
});

describe('ventanasEnOrden', () => {
  it('ordena desde la entrada: en un nocturno la de las 23:55 va antes que la de las 03:00', () => {
    expect(ventanasEnOrden('22:00', [V('03:00', '03:10'), V('23:55', '00:05')]))
      .toEqual([V('23:55', '00:05'), V('03:00', '03:10')]);
  });

  it('sin hora de entrada ordena por la hora del reloj', () => {
    expect(ventanasEnOrden(null, [V('23:55', '00:05'), V('03:00', '03:10')]))
      .toEqual([V('03:00', '03:10'), V('23:55', '00:05')]);
  });

  it('no desordena la lista que recibe', () => {
    const lista = [V('15:00', '15:10'), V('09:00', '09:15')];
    ventanasEnOrden('07:00', lista);
    expect(lista).toEqual([V('15:00', '15:10'), V('09:00', '09:15')]);
  });
});

// Reglas que se MUDARON a un solo sitio (CLAUDE.md §9.3): antes vivían copiadas.
describe('las reglas mudadas son una sola', () => {
  it('horaValida acepta HH:MM dentro del día y rechaza lo demás', () => {
    expect(horaValida('23:59')).toBe('23:59');
    for (const mala of ['24:00', '99:99', '8:05', ' 08:00', 805, null]) expect(horaValida(mala)).toBeNull();
  });

  it('ventanasDeHorario reexporta la misma horaValida, no una copia', () => {
    expect(horaValidaDeVentanas).toBe(horaValida);
  });

  it('duracionFranjaMin vive en tardanzas y saldoTiempo reexporta la misma', () => {
    expect(duracionDesdeSaldo).toBe(duracionFranjaMin);
    expect(duracionFranjaMin('08:00', '16:00')).toBe(480);
    expect(duracionFranjaMin('23:55', '00:05')).toBe(10);
  });

  it('los topes: tres descansos por franja y cinco marcaciones por jornada', () => {
    expect(MAX_DESCANSOS_POR_FRANJA).toBe(3);
    // Una fila, más una por cada pausa: el almuerzo y los tres descansos.
    expect(MAX_MARCACIONES_POR_JORNADA).toBe(5);
  });
});

// ─────────────────────────────── EL DINERO ───────────────────────────────
//
// Un instante en hora de Bogotá del lunes 7 de septiembre de 2026 (UTC-5 todo el
// año), dado en UTC explícito (CLAUDE.md §8.1).
const bog = (h: number, m = 0, dia = 7, s = 0) => new Date(Date.UTC(2026, 8, dia, h + 5, m, s));
const tramo = (desde: Date, hasta: Date) => ({ entrada: desde, salida: hasta });
const LUNES = bog(0);
const lista = (...v: { inicio: string; fin: string }[]) => JSON.stringify(v);
// 07:00-16:00 con descansos de 09:00 a 09:15 y de 15:00 a 15:10.
const DOS = lista(V('09:00', '09:15'), V('15:00', '15:10'));

describe('unirIntervalos', () => {
  it('funde los que se pisan y deja aparte los demás, en orden', () => {
    expect(unirIntervalos([[30, 40], [0, 10], [5, 20]])).toEqual([[0, 20], [30, 40]]);
  });

  it('los que solo se tocan también se funden: el largo es el mismo', () => {
    expect(unirIntervalos([[0, 10], [10, 15]])).toEqual([[0, 15]]);
  });

  it('uno vacío o al revés no suma nada', () => {
    expect(unirIntervalos([[10, 10], [20, 5]])).toEqual([]);
  });
});

describe('minutosDeLaUnion: lo que los descansos le quitan a lo exigido', () => {
  it('07:00-16:00 con dos descansos de 15 y 10 minutos: 25', () => {
    expect(minutosDeLaUnion('07:00', [V('09:00', '09:15'), V('15:00', '15:10')])).toBe(25);
  });

  it('dos ventanas congeladas que se pisan cuentan la unión, no la suma', () => {
    expect(minutosDeLaUnion('07:00', [V('09:00', '09:30'), V('09:15', '09:45')])).toBe(45);
  });

  it('una que cruza la medianoche en un nocturno cuenta sus 10 minutos', () => {
    expect(minutosDeLaUnion('22:00', [V('23:55', '00:05')])).toBe(10);
  });

  it('sin descansos, nada', () => {
    expect(minutosDeLaUnion('07:00', [])).toBe(0);
  });
});

describe('minutosDescansoADescontar, con varios descansos', () => {
  const dia = (descansos: string | null) => ({ fecha: LUNES, descansos });

  it('dos descansos sin marcar ninguno descuentan los dos', () => {
    expect(minutosDescansoADescontar([tramo(bog(7), bog(16))], dia(DOS))).toBe(25);
  });

  it('marcó los dos: 0', () => {
    expect(minutosDescansoADescontar([tramo(bog(7), bog(9)), tramo(bog(9, 15), bog(15)), tramo(bog(15, 10), bog(16))], dia(DOS))).toBe(0);
  });

  it('marcó el de la mañana y no el de la tarde: descuenta 10', () => {
    expect(minutosDescansoADescontar([tramo(bog(7), bog(9)), tramo(bog(9, 15), bog(16))], dia(DOS))).toBe(10);
  });

  it('dos ventanas congeladas que se pisan descuentan la unión, no la suma', () => {
    expect(minutosDescansoADescontar([tramo(bog(7), bog(16))], dia(lista(V('09:00', '09:30'), V('09:15', '09:45'))))).toBe(45);
  });

  it('se redondea una vez por día: 7,5 + 7,5 son 15, no 16', () => {
    const d = dia(lista(V('09:00', '09:10'), V('10:00', '10:10')));
    const tramos = [tramo(bog(7), bog(9, 7, 7, 30)), tramo(bog(10, 2, 7, 30), bog(16))];
    expect(minutosDescansoADescontar(tramos, d)).toBe(15);
  });

  it('turno nocturno con dos descansos de madrugada', () => {
    const d = dia(lista(V('01:00', '01:15'), V('03:00', '03:10')));
    expect(minutosDescansoADescontar([tramo(bog(21), bog(5, 0, 8))], d)).toBe(25);
  });

  it('un descanso que cruza la medianoche', () => {
    expect(minutosDescansoADescontar([tramo(bog(22), bog(6, 0, 8))], dia(lista(V('23:55', '00:05'))))).toBe(10);
  });

  it('una lista rota no descuenta nada, y no lanza', () => {
    expect(minutosDescansoADescontar([tramo(bog(7), bog(16))], dia('[{"inicio":"09:00",'))).toBe(0);
  });
});

// ─────────────────────────────── EL KIOSCO ───────────────────────────────
//
// La persona solo toca «descanso». El servidor anota a cuál salió según la hora:
// el que está en curso; si no hay, el próximo; si ya pasaron todos, el último
// pendiente.
describe('descansoQueToca', () => {
  const dia = (descansos: string | null, horaEntrada: string | null = '07:00', fecha = LUNES) => ({ fecha, horaEntrada, descansos });

  it('a las 09:05 toca el de 09:00 a 09:15', () => {
    expect(descansoQueToca(bog(9, 5), dia(DOS), [])).toEqual(V('09:00', '09:15'));
  });

  it('antes de todos, a las 08:00, toca el primero', () => {
    expect(descansoQueToca(bog(8), dia(DOS), [])).toEqual(V('09:00', '09:15'));
  });

  it('a las 10:00, sin haber tomado ninguno, toca el de las 15:00 (Carla)', () => {
    expect(descansoQueToca(bog(10), dia(DOS), [])).toEqual(V('15:00', '15:10'));
  });

  it('a las 15:00, con el de la tarde ya anotado, toca el de la mañana', () => {
    expect(descansoQueToca(bog(15), dia(DOS), [V('15:00', '15:10')])).toEqual(V('09:00', '09:15'));
  });

  it('ya pasaron todos: a las 15:30, sin haber tomado ninguno, toca el último pendiente', () => {
    expect(descansoQueToca(bog(15, 30), dia(DOS), [])).toEqual(V('15:00', '15:10'));
  });

  it('tomados los dos, ninguno', () => {
    expect(descansoQueToca(bog(15, 5), dia(DOS), [V('09:00', '09:15'), V('15:00', '15:10')])).toBeNull();
  });

  it('nocturno 22:00-06:00: a la 01:30 toca el de las 02:00, no el de las 04:00', () => {
    const d = dia(lista(V('04:00', '04:15'), V('02:00', '02:15')), '22:00');
    expect(descansoQueToca(bog(1, 30, 8), d, [])).toEqual(V('02:00', '02:15'));
  });

  it('nocturno: dentro de la ventana de la madrugada, esa', () => {
    const d = dia(lista(V('02:00', '02:15'), V('04:00', '04:15')), '22:00');
    expect(descansoQueToca(bog(4, 5, 8), d, [])).toEqual(V('04:00', '04:15'));
  });

  it('sin horaEntrada ordena por la hora del reloj', () => {
    expect(descansoQueToca(bog(8), dia(lista(V('15:00', '15:10'), V('09:00', '09:15')), null), [])).toEqual(V('09:00', '09:15'));
  });

  it('día roto: null', () => {
    expect(descansoQueToca(bog(9, 5), dia('basura'), [])).toBeNull();
    expect(descansoQueToca(bog(9, 5), dia(null), [])).toBeNull();
  });
});

describe('ventanasTomadas', () => {
  const dia = { fecha: LUNES, horaEntrada: '07:00', descansos: DOS };

  it('la ventana guardada en la marcación manda, aunque la hora diga otra cosa', () => {
    expect(ventanasTomadas(dia, [{ salida: bog(10), descansoVentana: '09:00-09:15' }])).toEqual([V('09:00', '09:15')]);
  });

  it('una salida con ventana guardada que ya no está en el día se infiere por la hora', () => {
    expect(ventanasTomadas(dia, [{ salida: bog(15, 2), descansoVentana: '10:00-10:15' }])).toEqual([V('15:00', '15:10')]);
  });

  it('sin ventana guardada, cada salida se asigna por la hora en el orden en que ocurrieron', () => {
    expect(ventanasTomadas(dia, [
      { salida: bog(15), descansoVentana: null },
      { salida: bog(10), descansoVentana: null },
    ])).toEqual([V('15:00', '15:10'), V('09:00', '09:15')]);
  });

  it('una ventana guardada dos veces cuenta una sola: la segunda se infiere', () => {
    expect(ventanasTomadas(dia, [
      { salida: bog(9), descansoVentana: '09:00-09:15' },
      { salida: bog(9, 30), descansoVentana: '09:00-09:15' },
    ])).toEqual([V('09:00', '09:15'), V('15:00', '15:10')]);
  });

  it('no cuenta más de las que hay', () => {
    expect(ventanasTomadas(dia, [
      { salida: bog(9), descansoVentana: null }, { salida: bog(11), descansoVentana: null }, { salida: bog(15), descansoVentana: null },
    ])).toHaveLength(2);
  });
});

// La hora a la que le tocaba volver, para proponerla cuando olvida marcar el regreso
// y como tope de la hora que declara. Dentro de su ventana, el fin; fuera de ella,
// la salida más lo que dura ese descanso. Supuesto técnico en una sola función.
describe('regresoEsperadoDelDescanso', () => {
  it('dentro de la ventana, el fin', () => {
    expect(regresoEsperadoDelDescanso(bog(9, 5), LUNES, V('09:00', '09:15'))).toEqual(bog(9, 15));
  });

  it('antes de la ventana, la salida más 15', () => {
    expect(regresoEsperadoDelDescanso(bog(8, 40), LUNES, V('09:00', '09:15'))).toEqual(bog(8, 55));
  });

  it('después de la ventana, la salida más 15, nunca mañana', () => {
    expect(regresoEsperadoDelDescanso(bog(9, 30), LUNES, V('09:00', '09:15'))).toEqual(bog(9, 45));
  });

  it('nocturno a las 02:05, el fin de las 02:15 del día siguiente', () => {
    expect(regresoEsperadoDelDescanso(bog(2, 5, 8), LUNES, V('02:00', '02:15'))).toEqual(bog(2, 15, 8));
  });

  it('una ventana que cruza la medianoche: sale a las 23:58 y le toca volver a las 00:05', () => {
    expect(regresoEsperadoDelDescanso(bog(23, 58), LUNES, V('23:55', '00:05'))).toEqual(bog(0, 5, 8));
  });

  it('Carla: salida 10:00 con ventana 15:00-15:10, le toca volver a las 10:10', () => {
    expect(regresoEsperadoDelDescanso(bog(10), LUNES, V('15:00', '15:10'))).toEqual(bog(10, 10));
  });
});

// ─────────────────────────────── EL EDITOR ───────────────────────────────
//
// Cuando el administrador reescribe una jornada, cada salida al descanso que queda
// hereda lo de UNA salida al descanso de antes: su foto, su sede, cómo se marcó.
// Emparejarlas en orden, o hueco por hueco con la más cercana, le pega la foto de un
// descanso al otro (P9 de la crítica del plan, 12 de septiembre de 2026). Las horas
// van en UTC explícito, lunes 7 de septiembre de 2026 en Bogotá (CLAUDE.md §8.1).
const alLunes = (h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 8, 7, h + 5, m, s));

describe('emparejarSalidasDeDescanso', () => {
  it('mover el primero a las 14:40 sin tocar el de las 15:00: el de las 15:00 se queda con la suya y el de las 14:40 con la de las 09:00', () => {
    expect(emparejarSalidasDeDescanso([alLunes(14, 40), alLunes(15)], [alLunes(9), alLunes(15)])).toEqual([0, 1]);
  });

  it('quitar el primero y mover el segundo a las 15:05: hereda la de las 15:00', () => {
    expect(emparejarSalidasDeDescanso([alLunes(15, 5)], [alLunes(9), alLunes(15)])).toEqual([1]);
  });

  it('mover los dos cinco minutos: cada uno hereda la suya', () => {
    expect(emparejarSalidasDeDescanso([alLunes(9, 5), alLunes(15, 5)], [alLunes(9), alLunes(15)])).toEqual([0, 1]);
  });

  it('todos en el mismo minuto: cada uno con la suya, aunque lleguen en otro orden', () => {
    expect(emparejarSalidasDeDescanso([alLunes(9), alLunes(12), alLunes(15)], [alLunes(15), alLunes(9), alLunes(12)])).toEqual([1, 2, 0]);
  });

  it('el mismo minuto manda sobre la cercanía en segundos: el kiosco guarda segundos y el formulario no', () => {
    // A las 09:00 del formulario, la de las 09:00:45 es la misma marca aunque la de
    // las 08:59:30 esté más cerca.
    expect(emparejarSalidasDeDescanso([alLunes(9)], [alLunes(8, 59, 30), alLunes(9, 0, 45)])).toEqual([1]);
  });

  it('un descanso nuevo al que no le queda salida de antes: nadie lo marcó', () => {
    expect(emparejarSalidasDeDescanso([alLunes(9), alLunes(15)], [alLunes(9)])).toEqual([0, null]);
  });

  it('a la misma distancia gana el hueco más temprano, y después la salida más temprana', () => {
    expect(emparejarSalidasDeDescanso([alLunes(10), alLunes(12)], [alLunes(11)])).toEqual([0, null]);
    expect(emparejarSalidasDeDescanso([alLunes(11)], [alLunes(12), alLunes(10)])).toEqual([1]);
  });

  it('sin huecos o sin salidas de antes, nada que emparejar', () => {
    expect(emparejarSalidasDeDescanso([], [alLunes(9)])).toEqual([]);
    expect(emparejarSalidasDeDescanso([alLunes(9)], [])).toEqual([null]);
  });

  it('en orden: correr los dos descansos no cruza sus fotos', () => {
    // Antes salió a las 09:00 y a las 09:30; el administrador los corrió a las 09:20 y a las
    // 09:40. Por el par más cercano suelto, el de las 09:20 se llevaba la salida de las 09:30
    // y al de las 09:40 le quedaba la de las 09:00: cada foto en el descanso del otro.
    expect(emparejarSalidasDeDescanso([alLunes(9, 20), alLunes(9, 40)], [alLunes(9), alLunes(9, 30)])).toEqual([0, 1]);
  });

  it('nadie hereda por encima de un descanso que no se movió', () => {
    // El de las 09:00 se quedó donde estaba. Uno nuevo a las 08:00 no puede llevarse la
    // salida de las 10:00, que queda del otro lado: esa foto se avisa como perdida.
    expect(emparejarSalidasDeDescanso([alLunes(8), alLunes(9)], [alLunes(9), alLunes(10)])).toEqual([null, 0]);
  });
});

// A cuál descanso queda anotada cada fila de la jornada reescrita. Es la MISMA
// asignación del kiosco y de la tabla (`ventanasDeLasSalidas`): si el editor guardara
// otra, la tabla contaría una historia distinta de lo que se acaba de guardar.
describe('completarVentanasDeDescanso', () => {
  const DIA = { fecha: alLunes(0), horaEntrada: '07:00', descansos: JSON.stringify([V('09:00', '09:15'), V('15:00', '15:10')]) };
  const fila = (salida: Date | null, fin: string | null) => ({ salida, fin });

  it('conserva la ventana heredada del mismo minuto, aunque la hora diga otra cosa (Carla)', () => {
    expect(completarVentanasDeDescanso(DIA,
      [fila(alLunes(10), 'DESCANSO'), fila(alLunes(12), 'ALMUERZO'), fila(alLunes(15), 'DESCANSO'), fila(alLunes(16), 'SALIDA')],
      ['15:00-15:10', null, '09:00-09:15', null],
    )).toEqual(['15:00-15:10', null, '09:00-09:15', null]);
  });

  it('infiere por la hora la del descanso movido, que no heredó ventana', () => {
    expect(completarVentanasDeDescanso(DIA,
      [fila(alLunes(9, 5), 'DESCANSO'), fila(alLunes(15), 'DESCANSO'), fila(alLunes(16), 'SALIDA')],
      [null, '15:00-15:10', null],
    )).toEqual(['09:00-09:15', '15:00-15:10', null]);
  });

  it('una heredada que ya no está en el día se infiere por la hora', () => {
    expect(completarVentanasDeDescanso(DIA, [fila(alLunes(15, 2), 'DESCANSO')], ['10:00-10:15'])).toEqual(['15:00-15:10']);
  });

  it('una fila que no termina en un descanso nunca lleva ventana, aunque herede una', () => {
    expect(completarVentanasDeDescanso(DIA, [fila(alLunes(9), 'SALIDA'), fila(alLunes(9, 30), 'ALMUERZO')], ['09:00-09:15', '09:00-09:15']))
      .toEqual([null, null]);
  });

  it('sin día, o con un día sin descansos, ninguna', () => {
    expect(completarVentanasDeDescanso(null, [fila(alLunes(9), 'DESCANSO')], ['09:00-09:15'])).toEqual([null]);
    expect(completarVentanasDeDescanso({ ...DIA, descansos: null }, [fila(alLunes(9), 'DESCANSO')], [null])).toEqual([null]);
  });

  it('más descansos en la jornada que en el día: los que sobran quedan sin ventana', () => {
    expect(completarVentanasDeDescanso(DIA,
      [fila(alLunes(9), 'DESCANSO'), fila(alLunes(11), 'DESCANSO'), fila(alLunes(15), 'DESCANSO')], [null, null, null],
    )).toEqual(['09:00-09:15', '15:00-15:10', null]);
  });

  it('mover el de la mañana a las 14:40 no le quita la ventana al de las 15:00, que no se movió y la tiene guardada', () => {
    // La guardada manda: primero se reparten las ventanas guardadas y después se
    // infieren por la hora las que no tienen. En una sola pasada, la de las 14:40 se
    // inferiría al de las 15:00, el próximo que empieza, y le quitaría la suya.
    expect(completarVentanasDeDescanso(DIA, [fila(alLunes(14, 40), 'DESCANSO'), fila(alLunes(15), 'DESCANSO')], [null, '15:00-15:10']))
      .toEqual(['09:00-09:15', '15:00-15:10']);
  });
});
