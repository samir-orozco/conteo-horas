import { describe, it, expect } from 'vitest';
import { diaDesdePlantilla } from './pintarDia';
import { leerDescansos } from './descansos';

// QUÉ EXIGE UN DÍA QUE SE PINTÓ CON UN TURNO DEL CATÁLOGO (21 de septiembre de 2026).
//
// Es la decisión que sostiene el planificador, y mueve dinero: lo que esta función devuelve se
// escribe en `DiaEsperado`, y de ahí salen la tolerancia, el descuento de almuerzo, el saldo de
// tiempo y qué horas son extra. Un minuto de más aquí es un minuto pagado de más en la nómina.
//
// El reparto NO es invención de esta función, es el que ya eligió el catálogo cuando se creó:
//
//   la PLANTILLA lleva lo de la franja: horas, ventana de almuerzo, descansos.
//   el HORARIO sigue llevando lo de política: tolerancias, `ajustaEntrada`, y los minutos de
//   almuerzo de respaldo para cuando no hay ventana.
//
// Por eso la función recibe los dos. Es el mismo cálculo que hace `calcularDiasEsperados` con una
// franja, y se escribió mirándolo línea por línea para que un día pintado y un día generado por el
// horario no puedan exigir cosas distintas con los mismos datos.

const TURNO = {
  esDescanso: false,
  horaEntrada: '10:00',
  horaSalida: '16:00',
  tieneAlmuerzo: false,
  almuerzoInicio: null,
  almuerzoFin: null,
  descansos: null,
};

// La política de la empresa, que vive en el horario y no en el turno.
const POLITICA = { toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 15, ajustaEntrada: true };

describe('un turno de trabajo', () => {
  it('exige los minutos que dura, cuando no descuenta nada', () => {
    const d = diaDesdePlantilla(TURNO, POLITICA);
    expect(d?.programado).toBe(true);
    expect(d?.horaEntrada).toBe('10:00');
    expect(d?.horaSalida).toBe('16:00');
    expect(d?.minutosEsperados).toBe(360); // 10:00 a 16:00
    expect(d?.almuerzoMin).toBe(0);
  });

  it('un turno NOCTURNO cruza medianoche y no sale negativo', () => {
    // 22:00 a 06:00 son ocho horas, no menos veintiséis. Es el caso que rompe una resta ingenua.
    const d = diaDesdePlantilla({ ...TURNO, horaEntrada: '22:00', horaSalida: '06:00' }, POLITICA);
    expect(d?.minutosEsperados).toBe(480);
  });

  it('la VENTANA de almuerzo manda sobre los minutos sueltos del horario', () => {
    // El administrador dijo «de 12:00 a 13:00», así que el almuerzo dura eso y no los 60 del
    // horario por casualidad: si la ventana fuera de 30, tendrían que descontarse 30.
    const d = diaDesdePlantilla(
      { ...TURNO, tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '12:30' }, POLITICA);
    expect(d?.almuerzoMin).toBe(30);
    expect(d?.minutosEsperados).toBe(330); // 360 - 30
    expect(d?.almuerzoInicio).toBe('12:00');
  });

  it('sin ventana, el almuerzo cae a los minutos del HORARIO', () => {
    // El respaldo de siempre, para los turnos a los que nadie les puso ventana.
    const d = diaDesdePlantilla({ ...TURNO, tieneAlmuerzo: true }, POLITICA);
    expect(d?.almuerzoMin).toBe(60);
    expect(d?.minutosEsperados).toBe(300); // 360 - 60
    expect(d?.almuerzoInicio).toBeNull();
  });

  it('una ventana en un turno que NO descuenta almuerzo se ignora', () => {
    // La pantalla oculta la ventana al desmarcar el almuerzo, así que si llega es residuo de lo que
    // el administrador había escrito antes de cambiar de idea. Descontarla le quitaría una hora a
    // alguien por un dato que ya no quiso.
    const d = diaDesdePlantilla(
      { ...TURNO, tieneAlmuerzo: false, almuerzoInicio: '12:00', almuerzoFin: '13:00' }, POLITICA);
    expect(d?.almuerzoMin).toBe(0);
    expect(d?.minutosEsperados).toBe(360);
    expect(d?.almuerzoInicio).toBeNull();
    expect(d?.almuerzoFin).toBeNull();
  });

  it('los descansos no remunerados se restan y se guardan', () => {
    const d = diaDesdePlantilla(
      { ...TURNO, descansos: '[{"inicio":"11:00","fin":"11:15"},{"inicio":"14:00","fin":"14:10"}]' },
      POLITICA);
    expect(d?.minutosEsperados).toBe(335); // 360 - 15 - 10
    // Se comprueba el ida y vuelta, no un texto literal: el formato canónico lo decide
    // `escribirDescansos` y fijarlo aquí ataría esta prueba a un detalle que no es suyo.
    expect(leerDescansos(d?.descansos)).toEqual([
      { inicio: '11:00', fin: '11:15' },
      { inicio: '14:00', fin: '14:10' },
    ]);
  });

  it('los descansos NO dependen de que el turno descuente almuerzo', () => {
    // El sábado corto sin almuerzo puede tener descansos igual.
    const d = diaDesdePlantilla(
      { ...TURNO, tieneAlmuerzo: false, descansos: '[{"inicio":"11:00","fin":"11:15"}]' }, POLITICA);
    expect(d?.minutosEsperados).toBe(345);
  });

  it('lo exigido nunca baja de cero, por absurdas que sean las pausas', () => {
    // Un turno de una hora con dos de almuerzo. No debería poder guardarse, pero si llega, que no
    // produzca un número negativo que después se sume a un saldo.
    const d = diaDesdePlantilla(
      { ...TURNO, horaEntrada: '10:00', horaSalida: '11:00', tieneAlmuerzo: true, almuerzoInicio: '10:00', almuerzoFin: '12:00' },
      POLITICA);
    expect(d?.minutosEsperados).toBe(0);
  });
});

describe('la política sale del HORARIO, no del turno', () => {
  it('tolerancias y ajustaEntrada se copian del horario', () => {
    const d = diaDesdePlantilla(TURNO, POLITICA);
    expect(d?.toleranciaMin).toBe(10);
    expect(d?.toleranciaSalidaMin).toBe(15);
    expect(d?.ajustaEntrada).toBe(true);
  });

  it('una persona SIN horario asignado no hereda tolerancias de la nada', () => {
    // Se puede pintar un turno a alguien que no tiene horario: el turno trae las horas y la
    // política simplemente no existe. Inventar una tolerancia le regalaría minutos de gracia que
    // nadie configuró.
    const d = diaDesdePlantilla(TURNO, null);
    expect(d?.toleranciaMin).toBe(0);
    expect(d?.toleranciaSalidaMin).toBe(0);
    expect(d?.ajustaEntrada).toBe(false);
    expect(d?.minutosEsperados).toBe(360);
  });
});

describe('un turno de DESCANSO', () => {
  const LIBRE = { ...TURNO, esDescanso: true, horaEntrada: null, horaSalida: null };

  it('deja el día sin programar y sin exigir nada', () => {
    const d = diaDesdePlantilla(LIBRE, POLITICA);
    expect(d?.programado).toBe(false);
    expect(d?.horaEntrada).toBeNull();
    expect(d?.horaSalida).toBeNull();
    expect(d?.minutosEsperados).toBe(0);
    expect(d?.almuerzoMin).toBe(0);
    expect(d?.descansos).toBeNull();
  });

  it('pero conserva la política del horario, igual que un día no programado normal', () => {
    // `calcularDiasEsperados` hace exactamente esto en su rama sin franja. Que un día pintado y uno
    // generado difieran aquí sería una diferencia invisible entre dos caminos.
    const d = diaDesdePlantilla(LIBRE, POLITICA);
    expect(d?.toleranciaMin).toBe(10);
    expect(d?.toleranciaSalidaMin).toBe(15);
  });

  it('ignora las horas que traiga: un descanso no tiene horario', () => {
    const d = diaDesdePlantilla({ ...LIBRE, horaEntrada: '10:00', horaSalida: '16:00' }, POLITICA);
    expect(d?.programado).toBe(false);
    expect(d?.horaEntrada).toBeNull();
    expect(d?.minutosEsperados).toBe(0);
  });
});

describe('lo que NO se puede pintar', () => {
  it('un turno de trabajo sin horas devuelve null en vez de un día vacío', () => {
    // La alternativa sería devolverlo como «no programado», y eso convertiría en silencio un turno
    // de trabajo en un día libre. Quien llama tiene que poder rechazarlo.
    expect(diaDesdePlantilla({ ...TURNO, horaEntrada: null }, POLITICA)).toBeNull();
    expect(diaDesdePlantilla({ ...TURNO, horaSalida: null }, POLITICA)).toBeNull();
  });

  it('una hora con formato roto tampoco se pinta', () => {
    expect(diaDesdePlantilla({ ...TURNO, horaEntrada: '25:00' }, POLITICA)).toBeNull();
    expect(diaDesdePlantilla({ ...TURNO, horaSalida: 'tarde' }, POLITICA)).toBeNull();
  });

  it('entrada igual a salida no es un tramo de cero, así que no se pinta', () => {
    // Mismo criterio que `leerVentana` y que `limpiarPlantilla`: 10:00 a 10:00 son veinticuatro
    // horas, no ninguna, y nadie quiso decir eso.
    expect(diaDesdePlantilla({ ...TURNO, horaEntrada: '10:00', horaSalida: '10:00' }, POLITICA)).toBeNull();
  });
});
