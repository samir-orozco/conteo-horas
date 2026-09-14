import { describe, it, expect } from 'vitest';
import { horasDeLaJornada, cuerpoDeLaJornada, type HorasDelFormulario, horasDelHorario, resumenDeLaJornada } from './formJornada';

// El formulario de una jornada tiene sus pausas: el almuerzo y, desde el 12 de
// septiembre de 2026, hasta tres descansos no remunerados, cada una con su salida y su
// regreso. Si al abrirlo una pausa se lee como otra, o un descanso se escribe encima del
// anterior, al guardar se descuenta como no pagada una hora que sí se paga, o se pierde
// un descanso, y eso no se ve en la pantalla: sale en la nómina.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (h: number, min = 0) => new Date(Date.UTC(2026, 8, 1, h + 5, min)).toISOString();
const marca = (entrada: string | null, salida: string | null, pausa?: 'ALMUERZO' | 'DESCANSO') => ({
  entrada, salida, salidaAlmuerzo: pausa === 'ALMUERZO', salidaDescanso: pausa === 'DESCANSO',
});

describe('horasDeLaJornada', () => {
  it('sin pausas: la entrada y la salida del día', () => {
    expect(horasDeLaJornada([marca(bog(8), bog(17))], bog(17))).toEqual({
      entrada: '08:00', salida: '17:00', almuerzoSalida: '', almuerzoRegreso: '', descansos: [],
    });
  });

  it('con descanso y almuerzo: cada pausa toma su salida y el regreso de la marcación siguiente', () => {
    const marcas = [marca(bog(8), bog(9), 'DESCANSO'), marca(bog(9, 15), bog(12), 'ALMUERZO'), marca(bog(13), bog(17))];
    expect(horasDeLaJornada(marcas, bog(17))).toEqual({
      entrada: '08:00', salida: '17:00', almuerzoSalida: '12:00', almuerzoRegreso: '13:00',
      descansos: [{ salida: '09:00', regreso: '09:15' }],
    });
  });

  // Con el formulario de un solo descanso, el segundo se escribía encima del primero:
  // abrir y guardar esta jornada le quitaba el descanso de la mañana.
  it('con dos descansos y almuerzo, cada descanso en su orden', () => {
    const marcas = [
      marca(bog(7), bog(9), 'DESCANSO'), marca(bog(9, 15), bog(12), 'ALMUERZO'),
      marca(bog(13), bog(15), 'DESCANSO'), marca(bog(15, 10), bog(16)),
    ];
    expect(horasDeLaJornada(marcas, bog(16))).toEqual({
      entrada: '07:00', salida: '16:00', almuerzoSalida: '12:00', almuerzoRegreso: '13:00',
      descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }],
    });
  });

  it('en su segundo descanso: ese descanso va sin regreso y la jornada sin salida', () => {
    const marcas = [marca(bog(7), bog(9), 'DESCANSO'), marca(bog(9, 15), bog(15), 'DESCANSO')];
    expect(horasDeLaJornada(marcas, null)).toEqual({
      entrada: '07:00', salida: '', almuerzoSalida: '', almuerzoRegreso: '',
      descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '' }],
    });
  });

  it('todavía en su almuerzo: sin regreso y sin salida del día, porque no ha terminado', () => {
    expect(horasDeLaJornada([marca(bog(8), bog(12), 'ALMUERZO')], null)).toEqual({
      entrada: '08:00', salida: '', almuerzoSalida: '12:00', almuerzoRegreso: '', descansos: [],
    });
  });

  it('dos formularios no comparten la lista de descansos', () => {
    const primero = horasDeLaJornada([marca(bog(8), bog(17))], bog(17));
    primero.descansos.push({ salida: '09:00', regreso: '09:15' });
    expect(horasDeLaJornada([marca(bog(8), bog(17))], bog(17)).descansos).toEqual([]);
  });
});

describe('cuerpoDeLaJornada', () => {
  const horas: HorasDelFormulario = {
    entrada: '08:00', salida: '17:00', almuerzoSalida: '12:00', almuerzoRegreso: '13:00', descansos: [],
  };

  it('manda cada pausa con su nombre, y la que no se marcó no viaja', () => {
    expect(cuerpoDeLaJornada(horas)).toEqual({
      entrada: '08:00', salida: '17:00', almuerzo: { salida: '12:00', regreso: '13:00' },
    });
    expect(cuerpoDeLaJornada(horas)).not.toHaveProperty('descansos');
  });

  it('con dos descansos manda la lista en su orden', () => {
    const cuerpo = cuerpoDeLaJornada({
      ...horas, descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }],
    });
    expect(cuerpo.descansos).toEqual([{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }]);
  });

  // «Descanso N» en el mensaje del servidor es la POSICIÓN en que llegó la fila, contando
  // las vacías, igual que la pantalla (12 de septiembre de 2026). Si el formulario quitara
  // las vacías, el regreso sin salida del Descanso 2 llegaría primero y el servidor diría
  // «descanso 1» mientras la pantalla dice «Descanso 2».
  it('manda todas las filas de descanso en su orden, también las vacías, para que el servidor las numere como la pantalla', () => {
    expect(cuerpoDeLaJornada({
      ...horas, descansos: [{ salida: '', regreso: '' }, { salida: '', regreso: '09:15' }],
    }).descansos).toEqual([{ salida: '', regreso: '' }, { salida: '', regreso: '09:15' }]);
    expect(cuerpoDeLaJornada({
      ...horas, descansos: [{ salida: '', regreso: '' }, { salida: '15:00', regreso: '15:10' }],
    }).descansos).toEqual([{ salida: '', regreso: '' }, { salida: '15:00', regreso: '15:10' }]);
    // Una sola fila vacía también viaja: el servidor la ignora y la jornada queda sin descansos.
    expect(cuerpoDeLaJornada({ ...horas, descansos: [{ salida: '', regreso: '' }] }).descansos)
      .toEqual([{ salida: '', regreso: '' }]);
  });

  it('nunca manda `descanso` en singular ni las claves de antes: el servidor ignora la una y rechaza las otras', () => {
    const cuerpo = cuerpoDeLaJornada({ ...horas, descansos: [{ salida: '09:00', regreso: '09:15' }] });
    expect(cuerpo).not.toHaveProperty('descanso');
    expect(cuerpo).not.toHaveProperty('descansoSalida');
    expect(cuerpo).not.toHaveProperty('descansoRegreso');
    expect(cuerpo.descansos).toEqual([{ salida: '09:00', regreso: '09:15' }]);
  });

  it('una pausa con solo el regreso viaja igual, para que el servidor diga qué hora falta', () => {
    expect(cuerpoDeLaJornada({ ...horas, almuerzoSalida: '' }).almuerzo).toEqual({ salida: '', regreso: '13:00' });
    expect(cuerpoDeLaJornada({ ...horas, descansos: [{ salida: '', regreso: '09:15' }] }).descansos)
      .toEqual([{ salida: '', regreso: '09:15' }]);
  });
});

// Traer el horario de ese día al agregar una jornada a mano (12 de septiembre de 2026): la
// entrada, la salida y la ventana de cada pausa, para no escribirlas una por una.
describe('horasDelHorario', () => {
  const DIA = {
    programado: true, horaEntrada: '07:00', horaSalida: '16:00', almuerzoInicio: '12:00', almuerzoFin: '13:00',
    descansos: [{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }],
  };

  it('con almuerzo y dos descansos: cada pausa con las horas de su ventana, en su orden', () => {
    expect(horasDelHorario(DIA)).toEqual({
      entrada: '07:00', salida: '16:00', almuerzoSalida: '12:00', almuerzoRegreso: '13:00',
      descansos: [{ salida: '09:00', regreso: '09:15' }, { salida: '15:00', regreso: '15:10' }],
    });
  });

  it('con el almuerzo en minutos fijos, sin horas: el almuerzo queda vacío y se descuenta igual', () => {
    expect(horasDelHorario({ ...DIA, almuerzoInicio: null, almuerzoFin: null, descansos: [] }))
      .toEqual({ entrada: '07:00', salida: '16:00', almuerzoSalida: '', almuerzoRegreso: '', descansos: [] });
  });

  it('un día sin turno no trae nada', () => {
    expect(horasDelHorario({ programado: false })).toBeNull();
    expect(horasDelHorario({ ...DIA, horaEntrada: null })).toBeNull();
  });

  it('dos formularios no comparten la lista de descansos', () => {
    horasDelHorario(DIA)!.descansos.push({ salida: '10:00', regreso: '10:10' });
    expect(horasDelHorario(DIA)!.descansos).toHaveLength(2);
  });
});

// La línea bajo las horas del formulario (13 de septiembre de 2026): dice qué día queda la
// jornada antes de guardarla. La fecha del campo es un día de calendario de Bogotá; leída
// como medianoche UTC, al occidente de Colombia se pintaba el día anterior (CLAUDE.md §7).
describe('resumenDeLaJornada', () => {
  it('el día de la semana, la fecha y de qué hora a qué hora', () => {
    expect(resumenDeLaJornada('2026-09-11', '08:00', '17:00')).toBe('Viernes 11 de septiembre, de 08:00 a 17:00');
  });

  it('sin salida todavía, desde la hora de entrada', () => {
    expect(resumenDeLaJornada('2026-09-11', '08:00', '')).toBe('Viernes 11 de septiembre, desde las 08:00');
  });

  it('sin horas, solo el día', () => {
    expect(resumenDeLaJornada('2026-09-11', '', '')).toBe('Viernes 11 de septiembre');
  });

  it('sin fecha no dice nada', () => {
    expect(resumenDeLaJornada('', '08:00', '17:00')).toBe('');
  });

  // Formatear una fecha inválida lanza, y esa excepción tumbaría la pantalla entera.
  it('con una fecha que no se entiende no dice nada, y no rompe el formulario', () => {
    expect(resumenDeLaJornada('no es una fecha', '08:00', '17:00')).toBe('');
  });
});
