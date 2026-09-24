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

// LA TOLERANCIA DEL TURNO SOBRESCRIBE LA DEL HORARIO (23 de septiembre de 2026).
//
// Pedido del dueño, y es un cambio de la regla anterior. Hasta hoy la tolerancia era SIEMPRE de la
// persona: su horario la fijaba y pintarle un turno no se la tocaba. El caso que lo movió es real:
// un turno nocturno puede merecer otra tolerancia que uno diurno, y eso es forma del turno, no
// política de la empresa.
//
// Lo que NO se hizo, y conviene que quede dicho: mover la tolerancia al turno. Sigue viviendo en el
// horario, y el turno solo puede sobrescribirla. VACÍO significa «la del horario», así que una
// empresa que no quiera saber de esto no cambia nada.
//
// LOS DOS CASOS QUE SOSTIENEN TODO ESTO son el cero y el `false`. Son sobrescrituras legítimas, no
// vacíos, y esa diferencia es exactamente la que se pierde escribiendo `||` en vez de `??`: un
// turno que dice «sin tolerancia» heredaría los diez minutos del horario, y nadie lo vería hasta
// que alguien llegara tarde y no le contara.
describe('la tolerancia del turno sobrescribe la del horario', () => {
  it('sin sobrescritura, sigue mandando el horario', () => {
    const d = diaDesdePlantilla(TURNO, POLITICA);
    expect(d?.toleranciaMin).toBe(10);
    expect(d?.toleranciaSalidaMin).toBe(15);
    expect(d?.ajustaEntrada).toBe(true);
  });

  it('el turno con tolerancia propia manda, y lo demás sigue del horario', () => {
    const d = diaDesdePlantilla({ ...TURNO, toleranciaMin: 3 }, POLITICA);
    expect(d?.toleranciaMin).toBe(3);
    expect(d?.toleranciaSalidaMin).toBe(15);
    expect(d?.ajustaEntrada).toBe(true);
  });

  it('CERO es una sobrescritura válida, no un vacío', () => {
    // El caso que separa `??` de `||`. Un turno de cero tolerancia cuenta la tardanza desde el
    // primer minuto; heredando los diez del horario, no la contaría.
    const d = diaDesdePlantilla({ ...TURNO, toleranciaMin: 0 }, POLITICA);
    expect(d?.toleranciaMin).toBe(0);
  });

  it('`ajustaEntrada` en false APAGA el true del horario', () => {
    // El mismo caso con un booleano: `false || true` es `true`, y con eso el turno no podría quitar
    // nunca esa política.
    const d = diaDesdePlantilla({ ...TURNO, ajustaEntrada: false }, POLITICA);
    expect(d?.ajustaEntrada).toBe(false);
  });

  it('cada una se sobrescribe por su lado', () => {
    // Sobrescribir la de salida no puede arrastrar la de entrada: son tres decisiones, no una.
    const d = diaDesdePlantilla({ ...TURNO, toleranciaSalidaMin: 0 }, POLITICA);
    expect(d?.toleranciaSalidaMin).toBe(0);
    expect(d?.toleranciaMin).toBe(10);
  });

  it('un día de DESCANSO también lleva la sobrescritura', () => {
    // La política se copia también en la rama del descanso, igual que hace `calcularDiasEsperados`.
    // Si aquí se perdiera, pintar un día libre devolvería a la persona a la tolerancia del horario
    // sin que nada lo dijera.
    const d = diaDesdePlantilla({ ...TURNO, esDescanso: true, toleranciaMin: 3 }, POLITICA);
    expect(d?.programado).toBe(false);
    expect(d?.toleranciaMin).toBe(3);
  });

  it('sin horario y sin sobrescritura, no hay tolerancia', () => {
    // A esta persona nadie le asignó horario, que es un caso real.
    const d = diaDesdePlantilla(TURNO, null);
    expect(d?.toleranciaMin).toBe(0);
    expect(d?.toleranciaSalidaMin).toBe(0);
    expect(d?.ajustaEntrada).toBe(false);
  });

  it('sin horario pero con sobrescritura, manda la del turno', () => {
    const d = diaDesdePlantilla({ ...TURNO, toleranciaMin: 5 }, null);
    expect(d?.toleranciaMin).toBe(5);
  });
});

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
