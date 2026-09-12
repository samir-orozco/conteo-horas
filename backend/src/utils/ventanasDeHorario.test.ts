import { describe, it, expect } from 'vitest';
import {
  horaValida, franjasConVentanaImposible, franjaParaGuardar, franjaBasicaValida,
  franjaParaResponder, pantallaViejaBorraDescansos,
} from './ventanasDeHorario';

// Lo básico de una franja antes de mirar sus pausas: días y horas de entrada y
// salida. Vivía en la ruta con su propia regex, que dejaba pasar «99:99»
// (CLAUDE.md §9.3: la regla de la hora es una sola, `horaValida`).
describe('franjaBasicaValida', () => {
  const basica = (extra: Record<string, unknown> = {}) => ({ dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00', ...extra });

  it('una franja con días y horas válidas pasa', () => {
    expect(franjaBasicaValida(basica())).toBe(true);
  });

  it('"99:99" no es una hora de entrada', () => {
    expect(franjaBasicaValida(basica({ horaEntrada: '99:99' }))).toBe(false);
  });

  it('"24:00" tampoco es una hora de salida', () => {
    expect(franjaBasicaValida(basica({ horaSalida: '24:00' }))).toBe(false);
  });

  it('sin días, o sin franja, no pasa', () => {
    expect(franjaBasicaValida(basica({ dias: [] }))).toBe(false);
    expect(franjaBasicaValida(basica({ dias: 'LUNES' }))).toBe(false);
    expect(franjaBasicaValida(null)).toBe(false);
  });
});

// Lo que el administrador escribe en el horario antes de guardarlo. Una ventana
// que no se puede cumplir se congela en los días y sale en la nómina como un
// número plausible, así que se rechaza al guardar con un mensaje que dice cuál.

const franja = (extra: Record<string, unknown> = {}) => ({
  dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true, ...extra,
});
const V = (inicio: string, fin: string) => ({ inicio, fin });

describe('horaValida', () => {
  it('acepta HH:MM dentro del día', () => {
    expect(horaValida('08:05')).toBe('08:05');
  });

  it('rechaza lo que pasa la forma pero no es una hora, o no es texto', () => {
    expect(horaValida('99:99')).toBeNull();
    expect(horaValida('8:05')).toBeNull();
    expect(horaValida(805)).toBeNull();
  });
});

describe('franjasConVentanaImposible — almuerzo', () => {
  it('una franja sin ventanas es legítima', () => {
    expect(franjasConVentanaImposible([franja()])).toEqual([]);
  });

  it('un almuerzo dentro de la franja es legítimo', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00' })])).toEqual([]);
  });

  it('un almuerzo invertido por un dedazo no se guarda', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '13:00', almuerzoFin: '12:00' })]))
      .toEqual(['08:00-17:00 (almuerzo 13:00-12:00)']);
  });

  it('media ventana de almuerzo tampoco', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '12:00' })]))
      .toEqual(['08:00-17:00 (almuerzo 12:00-—)']);
  });
});

// Varios descansos por franja desde el 12 de septiembre de 2026: hasta tres, cada
// uno con su desde y su hasta. El mensaje dice el número con que el administrador
// ve la fila.
describe('franjasConVentanaImposible — descansos no remunerados', () => {
  it('un descanso dentro de la franja, aparte del almuerzo, es legítimo', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [V('09:00', '09:15')] }),
    ])).toEqual([]);
  });

  it('dos descansos dentro de la franja y aparte del almuerzo son legítimos', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [V('09:00', '09:15'), V('15:00', '15:10')] }),
    ])).toEqual([]);
  });

  it('un descanso fuera de la franja no se guarda', () => {
    expect(franjasConVentanaImposible([franja({ descansos: [V('18:00', '18:15')] })]))
      .toEqual(['08:00-17:00 (descanso 1: 18:00-18:15)']);
  });

  it('medio descanso tampoco', () => {
    expect(franjasConVentanaImposible([franja({ descansos: [V('09:00', '09:15'), V('', '10:15')] })]))
      .toEqual(['08:00-17:00 (descanso 2: ?-10:15)']);
  });

  it('dos descansos que se cruzan no se guardan: la misma hora se descontaría dos veces', () => {
    expect(franjasConVentanaImposible([franja({ descansos: [V('09:00', '09:30'), V('09:15', '09:45')] })]))
      .toEqual(['08:00-17:00 (descansos 1 y 2 se cruzan)']);
  });

  it('dos descansos pegados (10:00-10:15 y 10:15-10:30) se guardan', () => {
    expect(franjasConVentanaImposible([franja({ descansos: [V('10:00', '10:15'), V('10:15', '10:30')] })])).toEqual([]);
  });

  it('un descanso que se cruza con el almuerzo no se guarda', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [V('12:30', '12:45')] }),
    ])).toEqual(['08:00-17:00 (descanso 1: 12:30-12:45 se cruza con el almuerzo)']);
  });

  it('el segundo descanso cruzado con el almuerzo tampoco', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [V('09:00', '09:15'), V('12:30', '12:45')] }),
    ])).toEqual(['08:00-17:00 (descanso 2: 12:30-12:45 se cruza con el almuerzo)']);
  });

  it('cuatro descansos no se guardan', () => {
    expect(franjasConVentanaImposible([
      franja({ descansos: [V('08:30', '08:40'), V('09:30', '09:40'), V('10:30', '10:40'), V('11:30', '11:40')] }),
    ])).toEqual(['08:00-17:00 (tiene 4 descansos; el máximo es 3)']);
  });

  it('una fila con las dos horas vacías se ignora, y no cuenta para el máximo', () => {
    expect(franjasConVentanaImposible([
      franja({ descansos: [V('', ''), V('08:30', '08:40'), V('09:30', '09:40'), V('10:30', '10:40')] }),
    ])).toEqual([]);
  });

  it('descansos que no son un arreglo no se guardan', () => {
    expect(franjasConVentanaImposible([franja({ descansos: '09:00-09:15' })]))
      .toEqual(['08:00-17:00 (los descansos no tienen el formato esperado)']);
  });

  it('un elemento que no es un descanso no se guarda', () => {
    expect(franjasConVentanaImposible([franja({ descansos: [V('09:00', '09:15'), '10:00-10:15'] })]))
      .toEqual(['08:00-17:00 (descanso 2: no tiene el formato esperado)']);
  });

  it('turno nocturno: dos descansos de madrugada dentro de la franja son legítimos', () => {
    expect(franjasConVentanaImposible([
      franja({ horaEntrada: '22:00', horaSalida: '06:00', descansos: [V('04:00', '04:15'), V('02:00', '02:15')] }),
    ])).toEqual([]);
  });
});

describe('franjaParaGuardar', () => {
  it('guarda el almuerzo completo y la lista de descansos ordenada desde la entrada', () => {
    const f = franjaParaGuardar(franja({
      horaEntrada: '07:00', horaSalida: '16:00', almuerzoInicio: '12:00', almuerzoFin: '13:00',
      descansos: [V('15:00', '15:10'), V('', ''), V('09:00', '09:15')],
    }));
    expect([f.almuerzoInicio, f.almuerzoFin, f.descansos])
      .toEqual(['12:00', '13:00', '[{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]']);
  });

  it('en un nocturno, desde la entrada y no por el reloj', () => {
    const f = franjaParaGuardar(franja({ horaEntrada: '22:00', horaSalida: '06:00', descansos: [V('02:00', '02:15'), V('23:30', '23:40')] }));
    expect(f.descansos).toBe('[{"inicio":"23:30","fin":"23:40"},{"inicio":"02:00","fin":"02:15"}]');
  });

  it('sin ventanas las deja vacías, con NULL y nunca [], y por defecto la franja descuenta almuerzo', () => {
    const sin = franjaParaGuardar({ dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00' });
    const vacia = franjaParaGuardar(franja({ descansos: [] }));
    expect([sin.almuerzoInicio, sin.almuerzoFin, sin.descansos, sin.tieneAlmuerzo, vacia.descansos]).toEqual([null, null, null, true, null]);
  });
});

describe('franjaParaResponder', () => {
  it('devuelve los descansos como arreglo, nunca como el texto guardado', () => {
    const f = franjaParaResponder({ id: 'f1', horaEntrada: '07:00', descansos: '[{"inicio":"09:00","fin":"09:15"}]' });
    expect(f).toEqual({ id: 'f1', horaEntrada: '07:00', descansos: [V('09:00', '09:15')] });
  });

  it('con texto roto o NULL, un arreglo vacío', () => {
    expect(franjaParaResponder({ descansos: '[{"inicio":' }).descansos).toEqual([]);
    expect(franjaParaResponder({ descansos: null }).descansos).toEqual([]);
  });
});

// Una pestaña de la pantalla de horarios abierta ANTES del despliegue no conoce los
// descansos: manda las franjas sin la clave `descansos`, y la ruta reemplaza las
// franjas enteras. Sin esta guarda, al guardar una tolerancia borraría sin aviso los
// descansos que otro administrador ya configuró.
describe('pantallaViejaBorraDescansos', () => {
  const guardadas = [{ descansos: '[{"inicio":"09:00","fin":"09:15"}]' }, { descansos: null }];

  it('la pantalla de antes, sin la clave descansos, no puede borrar descansos guardados', () => {
    expect(pantallaViejaBorraDescansos(guardadas, [franja(), franja()])).toBe(true);
  });

  it('sin descansos guardados, la pantalla de antes guarda como siempre', () => {
    expect(pantallaViejaBorraDescansos([{ descansos: null }, { descansos: '[]' }], [franja()])).toBe(false);
  });

  it('con descansos: [] en el cuerpo, sí se quitan: es la pantalla nueva que los quitó', () => {
    expect(pantallaViejaBorraDescansos(guardadas, [franja({ descansos: [] }), franja({ descansos: [] })])).toBe(false);
  });
});
