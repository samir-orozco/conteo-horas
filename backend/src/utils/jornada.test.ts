import { describe, it, expect } from 'vitest';
import { resumirAlmuerzoDelDia, minutosContadosDelDia, partirDiaEnJornadas } from './jornada';

// El almuerzo no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Esta función lee ese hueco y dice qué pasó, para que la columna
// de Registros y el modal digan lo mismo y no puedan contradecirse.

const bog = (h: number, m = 0, dia = 5) => new Date(Date.UTC(2026, 7, dia, h + 5, m, 0));

const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

const reg = (
  entrada: Date | null,
  salida: Date | null,
  extra: { salidaAlmuerzo?: boolean; entradaEstimada?: boolean } = {},
) => ({
  entrada, salida,
  salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
  entradaEstimada: extra.entradaEstimada ?? false,
});

describe('resumirAlmuerzoDelDia — sin ventana', () => {
  it('el día sin ventana no tiene nada que contar', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia({ almuerzoInicio: null, almuerzoFin: null }));
    expect(r.estado).toBe('SIN_VENTANA');
    expect(r.ventana).toBeNull();
  });

  it('aun sin ventana informa lo que se descuenta, que son los minutos fijos', () => {
    // Es el caso de la mayoría de las empresas hoy: "descontar almuerzo: sí,
    // 60 min", sin decir de qué hora a qué hora. Ese descuento existe y hasta
    // ahora era invisible.
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia({ almuerzoInicio: null, almuerzoFin: null }));
    expect(r.minutosDescontados).toBe(60);
  });

  it('un turno todavía abierto no ha pagado ningún almuerzo', () => {
    // `minutosAlmuerzoADescontar` devuelve los minutos fijos ANTES de mirar los
    // tramos, así que un día con la persona adentro afirmaría un descuento que
    // la liquidación no hizo: el motor solo mete al cálculo los días con algún
    // tramo cerrado.
    const r = resumirAlmuerzoDelDia([reg(bog(8), null)], dia({ almuerzoInicio: null, almuerzoFin: null }));
    expect(r.minutosDescontados).toBe(0);
  });
});

describe('resumirAlmuerzoDelDia — con ventana', () => {
  it('lo marcó completo: sale la hora real, no la programada', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toEqual(bog(13));
    expect(r.minutos).toBe(60);
    expect(r.seExcedio).toBe(false);
    expect(r.regresoEstimado).toBe(false);
    // No se le descuenta de nuevo: el hueco ya quedó fuera de lo trabajado.
    expect(r.minutosDescontados).toBe(0);
  });

  it('almorzó 20 minutos: se ve lo que tomó, y lo que se descuenta sigue siendo la ventana', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(12, 20), bog(17))],
      dia(),
    );
    expect(r.minutos).toBe(20);
    expect(r.seExcedio).toBe(false);
    // Estuvo marcado de 12:20 a 13:00: esos 40 se descuentan igual.
    expect(r.minutosDescontados).toBe(40);
  });

  it('se le pasó la hora: se marca como excedido y por cuánto', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13, 25), bog(17))],
      dia(),
    );
    expect(r.minutos).toBe(85);
    expect(r.seExcedio).toBe(true);
    expect(r.minutosDeMas).toBe(25); // volvió 25 min después de las 13:00
  });

  it('pasarse es respecto al FIN de la ventana, no a su duración', () => {
    // Salió a las 11:30 y volvió a las 12:50: almorzó 80 minutos, veinte más de
    // los que dura la ventana, y aun así llegó antes de las 13:00. No se pasó.
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(11, 30), { salidaAlmuerzo: true }), reg(bog(12, 50), bog(17))],
      dia(),
    );
    expect(r.minutos).toBe(80);
    expect(r.seExcedio).toBe(false);
    expect(r.minutosDeMas).toBe(0);
  });

  it('el regreso lo puso el sistema: eso tiene que constar', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17), { entradaEstimada: true })],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.regresoEstimado).toBe(true);
  });

  it('salió a almorzar y no volvió: queda abierto, sin inventar un regreso', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(12), { salidaAlmuerzo: true })], dia());
    expect(r.estado).toBe('ABIERTO');
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toBeNull();
    expect(r.minutos).toBeNull();
  });

  it('nadie marcó el almuerzo: se descuenta la ventana entera', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.salida).toBeNull();
    expect(r.minutosDescontados).toBe(60);
  });

  it('se fue temprano y nunca llegó a la ventana: no marcó, pero tampoco paga', () => {
    const r = resumirAlmuerzoDelDia([reg(bog(8), bog(10))], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(0);
  });

  it('un día sin marcaciones no descuenta nada', () => {
    const r = resumirAlmuerzoDelDia([], dia());
    expect(r.estado).toBe('NO_MARCADO');
    expect(r.minutosDescontados).toBe(0);
  });
});

describe('resumirAlmuerzoDelDia — casos que podrían confundirla', () => {
  it('los tramos abiertos no cuentan como regreso ni rompen el cálculo', () => {
    // El segundo tramo aún no tiene salida (la persona está adentro).
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), null)],
      dia(),
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.regreso).toEqual(bog(13));
    expect(r.minutos).toBe(60);
  });

  it('el regreso es el primer tramo posterior, no cualquiera', () => {
    const r = resumirAlmuerzoDelDia(
      [
        reg(bog(8), bog(12), { salidaAlmuerzo: true }),
        reg(bog(13), bog(15)),
        reg(bog(15, 30), bog(17)),
      ],
      dia(),
    );
    expect(r.regreso).toEqual(bog(13));
  });

  it('no depende del orden en que lleguen los registros', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(13), bog(17)), reg(bog(8), bog(12), { salidaAlmuerzo: true })],
      dia(),
    );
    expect(r.salida).toEqual(bog(12));
    expect(r.regreso).toEqual(bog(13));
  });

  it('turno nocturno: el almuerzo de la madrugada es del día en que entró', () => {
    // Turno 21:00 → 05:00 con almuerzo de 01:00 a 01:30.
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const r = resumirAlmuerzoDelDia(
      [
        reg(bog(21), bog(1, 0, 6), { salidaAlmuerzo: true }),
        reg(bog(1, 30, 6), bog(5, 0, 6)),
      ],
      d,
    );
    expect(r.estado).toBe('MARCADO');
    expect(r.minutos).toBe(30);
    expect(r.seExcedio).toBe(false);
  });
});

// "¿Trabajó sus ocho horas o no?" es la pregunta por la que se abre la pantalla,
// y hoy no se responde en ningún lado: la tabla muestra cada tramo por separado
// y deja al administrador sumando de cabeza, cuarenta veces al día.
//
// Este total NO depende de lo que la persona llevara acumulado esa semana: el
// acumulado cambia cómo se CLASIFICAN los minutos (ordinaria u extra), no
// cuántos son. Por eso se puede mostrar sin que el número baile según el filtro
// de fechas que tenga puesto la pantalla.
describe('minutosContadosDelDia', () => {
  const diaCompleto = (extra: Record<string, unknown> = {}) => ({
    fecha: bog(0),
    programado: true,
    horaEntrada: '08:00' as string | null,
    horaSalida: '17:00' as string | null,
    toleranciaSalidaMin: 0,
    ajustaEntrada: false,
    almuerzoMin: 60,
    almuerzoInicio: '12:00' as string | null,
    almuerzoFin: '13:00' as string | null,
    ...extra,
  });

  it('suma los tramos y descuenta el almuerzo una sola vez', () => {
    const r = minutosContadosDelDia(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))],
      diaCompleto(),
    );
    // 4h + 4h = 480. El hueco ya está fuera, así que no se vuelve a restar.
    expect(r).toBe(480);
  });

  it('jornada corrida sin marcar almuerzo: se le descuenta la ventana', () => {
    const r = minutosContadosDelDia([reg(bog(8), bog(17))], diaCompleto());
    expect(r).toBe(480); // 540 trabajados − 60 de ventana
  });

  it('se fue temprano y nunca llegó a la ventana: no paga almuerzo', () => {
    // El error que originó todo esto: dos horas trabajadas contaban como una.
    const r = minutosContadosDelDia([reg(bog(8), bog(10))], diaCompleto());
    expect(r).toBe(120);
  });

  it('aplica la tolerancia de salida, igual que la liquidación', () => {
    // Se quedó 10 minutos de más con 15 de tolerancia: no se pagan como extra,
    // así que tampoco se cuentan aquí. Si este total los contara, contradiría
    // al reporte de nómina en la misma pantalla.
    const r = minutosContadosDelDia(
      [reg(bog(8), bog(17, 10))],
      diaCompleto({ toleranciaSalidaMin: 15 }),
    );
    expect(r).toBe(480);
  });

  it('un tramo todavía abierto no suma nada', () => {
    const r = minutosContadosDelDia([reg(bog(8), null)], diaCompleto());
    expect(r).toBe(0);
  });

  it('nunca devuelve un número negativo', () => {
    // Media hora trabajada con una hora de almuerzo fijo: la resta da -30.
    const r = minutosContadosDelDia(
      [reg(bog(8), bog(8, 30))],
      diaCompleto({ almuerzoInicio: null, almuerzoFin: null }),
    );
    expect(r).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Un día no es una lista de marcaciones sueltas: es una lista de JORNADAS.
//
// Marcar el almuerzo parte la jornada en dos tramos, y la tabla de Registros los
// mostraba como dos filas —el mismo día repetido, con la segunda medio vacía—
// que se leían como una marcación duplicada. Volver del almuerzo NO es empezar
// otra jornada; volver por la tarde a hacer horas extra SÍ lo es.
//
// De ahí la regla: un tramo se funde con el siguiente solo si ese tramo cerró
// saliendo a almorzar.
describe('partirDiaEnJornadas', () => {
  const diaCompleto = (extra: Record<string, unknown> = {}) => ({
    fecha: bog(0),
    programado: true,
    horaEntrada: '08:00' as string | null,
    horaSalida: '17:00' as string | null,
    toleranciaSalidaMin: 0,
    ajustaEntrada: false,
    almuerzoMin: 60,
    almuerzoInicio: '12:00' as string | null,
    almuerzoFin: '13:00' as string | null,
    ...extra,
  });

  it('el almuerzo NO parte el día: los dos tramos son una sola jornada', () => {
    const j = partirDiaEnJornadas(
      [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))],
      diaCompleto(),
    );
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones).toHaveLength(2);
    expect(j[0].minutosContados).toBe(480);
  });

  it('volver por la tarde a hacer horas extra SÍ abre otra jornada', () => {
    // El caso que distingue las dos cosas: 08-12 almuerzo 13-17 es UNA jornada;
    // regresar a las 19:00 es otra, y tiene que verse como otra fila.
    const j = partirDiaEnJornadas(
      [
        reg(bog(8), bog(12), { salidaAlmuerzo: true }),
        reg(bog(13), bog(17)),
        reg(bog(19), bog(21)),
      ],
      diaCompleto(),
    );
    expect(j).toHaveLength(2);
    expect(j[0].marcaciones).toHaveLength(2);
    expect(j[1].marcaciones).toHaveLength(1);
    expect(j[0].minutosContados).toBe(480);
    expect(j[1].minutosContados).toBe(120);
  });

  it('salir y volver SIN marcar almuerzo son dos jornadas distintas', () => {
    const j = partirDiaEnJornadas([reg(bog(8), bog(12)), reg(bog(14), bog(17))], diaCompleto());
    expect(j).toHaveLength(2);
  });

  it('salió a almorzar y nunca volvió: una sola jornada, de un tramo', () => {
    const j = partirDiaEnJornadas([reg(bog(8), bog(12), { salidaAlmuerzo: true })], diaCompleto());
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones).toHaveLength(1);
    expect(j[0].almuerzo?.estado).toBe('ABIERTO');
  });

  it('el almuerzo se cuelga de la jornada que lo contiene, y solo de esa', () => {
    // Repetirlo en las dos filas invita a sumarlo dos veces. `minutos` y
    // `minutosDescontados` son plata.
    const j = partirDiaEnJornadas(
      [
        reg(bog(8), bog(12), { salidaAlmuerzo: true }),
        reg(bog(13), bog(17)),
        reg(bog(19), bog(21)),
      ],
      diaCompleto(),
    );
    expect(j[0].almuerzo?.estado).toBe('MARCADO');
    expect(j[1].almuerzo).toBeNull();
  });

  it('las marcaciones desordenadas se ordenan antes de agrupar', () => {
    const j = partirDiaEnJornadas(
      [reg(bog(13), bog(17)), reg(bog(8), bog(12), { salidaAlmuerzo: true })],
      diaCompleto(),
    );
    expect(j).toHaveLength(1);
    expect(j[0].marcaciones[0].entrada).toEqual(bog(8));
  });

  it('un tramo todavía abierto no arrastra al siguiente', () => {
    const j = partirDiaEnJornadas([reg(bog(8), null), reg(bog(13), bog(17))], diaCompleto());
    expect(j).toHaveLength(2);
  });

  it('turno nocturno: el almuerzo de madrugada tampoco parte la jornada', () => {
    const j = partirDiaEnJornadas(
      [
        reg(bog(20, 0, 5), bog(1, 0, 6), { salidaAlmuerzo: true }),
        reg(bog(2, 0, 6), bog(5, 0, 6)),
      ],
      diaCompleto({ horaEntrada: '20:00', horaSalida: '05:00', almuerzoInicio: '01:00', almuerzoFin: '02:00' }),
    );
    expect(j).toHaveLength(1);
    expect(j[0].minutosContados).toBe(480);
  });

  it('una marcación sin hora de entrada no rompe la agrupación', () => {
    const j = partirDiaEnJornadas([reg(null, bog(17)), reg(bog(8), bog(12))], diaCompleto());
    expect(j).toHaveLength(2);
    expect(j.every(x => typeof x.minutosContados === 'number')).toBe(true);
  });

  it('sin ventana, el almuerzo fijo se descuenta UNA vez aunque haya dos jornadas', () => {
    // La trampa de este cambio. `minutosAlmuerzoADescontar` sin ventana devuelve
    // los minutos fijos del día, no un número proporcional a los tramos: pedirlo
    // una vez por jornada descontaría el almuerzo dos veces y le robaría una
    // hora al día. Aquí: 4h + 3h = 420, menos 60 de almuerzo = 360.
    const sinVentana = diaCompleto({ almuerzoInicio: null, almuerzoFin: null });
    const j = partirDiaEnJornadas([reg(bog(8), bog(12)), reg(bog(14), bog(17))], sinVentana);
    expect(j).toHaveLength(2);
    expect(j[0].minutosContados + j[1].minutosContados).toBe(360);
  });

  it('si la primera jornada no da para el almuerzo fijo, el resto lo paga la siguiente', () => {
    // Media hora por la mañana y siete horas por la tarde, con almuerzo fijo de
    // 60. Recortar solo la primera jornada dejaría 0 + 420 = 420: media hora de
    // almuerzo regalada. El total honesto es 30 + 420 − 60 = 390.
    const sinVentana = diaCompleto({ almuerzoInicio: null, almuerzoFin: null });
    const j = partirDiaEnJornadas([reg(bog(8), bog(8, 30)), reg(bog(10), bog(17))], sinVentana);
    expect(j[0].minutosContados + j[1].minutosContados).toBe(390);
    expect(j[0].minutosContados).toBe(0);
  });

  it('una salida anterior a su entrada cuenta cero, no en negativo', () => {
    // Pasa de verdad: el formulario de edición arma entrada y salida sobre la
    // MISMA fecha, así que corregir un turno nocturno puede dejar guardada una
    // salida anterior a su entrada. Restarla le quitaba al día horas que nadie
    // dejó de trabajar.
    const j = partirDiaEnJornadas([reg(bog(8), bog(12)), reg(bog(18), bog(14))], diaCompleto());
    expect(j).toHaveLength(2);
    expect(j[1].minutosContados).toBe(0);
    // 4h de la mañana menos la hora de almuerzo que estuvo marcado: 12:00 cierra
    // justo al empezar la ventana, así que no hay solape y quedan los 240.
    expect(j[0].minutosContados).toBe(240);
  });

  it('LA INVARIANTE: las jornadas de un día suman exactamente lo que cuenta el día', () => {
    // Si esta prueba se cae, la tabla muestra filas que no suman lo que dice el
    // modal, y no hay forma de que el administrador sepa a cuál creerle.
    const escenarios: { nombre: string; regs: ReturnType<typeof reg>[]; dia: ReturnType<typeof diaCompleto> }[] = [
      { nombre: 'almuerzo marcado', regs: [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17))], dia: diaCompleto() },
      { nombre: 'almuerzo + extra', regs: [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17)), reg(bog(19), bog(21))], dia: diaCompleto() },
      { nombre: 'jornada corrida', regs: [reg(bog(8), bog(17))], dia: diaCompleto() },
      { nombre: 'dos turnos sin almuerzo', regs: [reg(bog(8), bog(12)), reg(bog(14), bog(17))], dia: diaCompleto() },
      { nombre: 'sin ventana, dos jornadas', regs: [reg(bog(8), bog(12)), reg(bog(14), bog(17))], dia: diaCompleto({ almuerzoInicio: null, almuerzoFin: null }) },
      { nombre: 'sin ventana, jornada corta', regs: [reg(bog(8), bog(8, 30)), reg(bog(10), bog(17))], dia: diaCompleto({ almuerzoInicio: null, almuerzoFin: null }) },
      { nombre: 'con tolerancia de salida', regs: [reg(bog(8), bog(12), { salidaAlmuerzo: true }), reg(bog(13), bog(17, 20))], dia: diaCompleto({ toleranciaSalidaMin: 30 }) },
      { nombre: 'tramo abierto', regs: [reg(bog(8), bog(12)), reg(bog(14), null)], dia: diaCompleto() },
      { nombre: 'salida anterior a la entrada', regs: [reg(bog(8), bog(12)), reg(bog(18), bog(14))], dia: diaCompleto() },
      { nombre: 'segundos sueltos', regs: [reg(bog(8), new Date(bog(12).getTime() + 25_000)), reg(bog(14), new Date(bog(17).getTime() + 40_000))], dia: diaCompleto() },
    ];
    for (const e of escenarios) {
      const suma = partirDiaEnJornadas(e.regs, e.dia).reduce((s, j) => s + j.minutosContados, 0);
      expect(suma, e.nombre).toBe(minutosContadosDelDia(e.regs, e.dia));
    }
  });
});
