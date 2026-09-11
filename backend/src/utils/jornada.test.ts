import { describe, it, expect } from 'vitest';
import { resumirAlmuerzoDelDia, minutosContadosDelDia, partirDiaEnJornadas, tramoQueChoca, marcacionQueCierra, laCerroElSistema, instantesDeJornada, momentosDelDia, jornadaDeCadaMarcacion, sedesDeLaJornada, salidasTrasEditar } from './jornada';

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

  it('el almuerzo lo paga la jornada que estuvo dentro de la ventana, no la primera', () => {
    // Se fue a las 10:00 y volvió a las 11:30, sin marcar almuerzo. La ventana
    // es 12:00-13:00: quien no llegó a ella no almorzó. Cobrárselo a la jornada
    // de la mañana para no tocar la del mediodía deja las DOS filas mintiendo,
    // aunque el total del día cuadre.
    const j = partirDiaEnJornadas([reg(bog(8), bog(10)), reg(bog(11, 30), bog(17))], diaCompleto());
    expect(j).toHaveLength(2);
    expect(j[0].minutosContados).toBe(120);
    expect(j[1].minutosContados).toBe(270);
  });

  it('dos jornadas que cruzan la ventana a medias la pagan a medias', () => {
    // 08:00-12:30 pisa 30 minutos de la ventana; 12:40-18:00 pisa los otros 20.
    const j = partirDiaEnJornadas([reg(bog(8), bog(12, 30)), reg(bog(12, 40), bog(18))], diaCompleto());
    expect(j[0].minutosContados).toBe(240);
    expect(j[1].minutosContados).toBe(300);
  });

  it('sin ventana, la tarjeta de almuerzo dice lo que pagó ESA jornada', () => {
    // El fijo de 60 no cabe en media hora de jornada: 30 los paga la mañana y
    // 30 la tarde. La celda no puede decir "−1 h" sobre una fila que muestra 0.
    const sinVentana = diaCompleto({ almuerzoInicio: null, almuerzoFin: null });
    const j = partirDiaEnJornadas([reg(bog(8), bog(8, 30)), reg(bog(10), bog(17))], sinVentana);
    expect(j[0].minutosAlmuerzoAqui).toBe(30);
    expect(j[1].minutosAlmuerzoAqui).toBe(30);
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
      { nombre: 'ventana pisada solo por la segunda jornada', regs: [reg(bog(8), bog(10)), reg(bog(11, 30), bog(17))], dia: diaCompleto() },
      { nombre: 'ventana pisada a medias por dos jornadas', regs: [reg(bog(8), bog(12, 30)), reg(bog(12, 40), bog(18))], dia: diaCompleto() },
      { nombre: 'salida anterior a la entrada', regs: [reg(bog(8), bog(12)), reg(bog(18), bog(14))], dia: diaCompleto() },
      { nombre: 'segundos sueltos', regs: [reg(bog(8), new Date(bog(12).getTime() + 25_000)), reg(bog(14), new Date(bog(17).getTime() + 40_000))], dia: diaCompleto() },
    ];
    for (const e of escenarios) {
      const suma = partirDiaEnJornadas(e.regs, e.dia).reduce((s, j) => s + j.minutosContados, 0);
      expect(suma, e.nombre).toBe(minutosContadosDelDia(e.regs, e.dia));
    }
  });
});

// Nadie está en dos turnos a la vez. Un tramo que pisa a otro del mismo día es
// un imposible, y el formulario de edición lo dejaba guardar: quien corregía la
// salida de la mañana para ponerle la hora real de la tarde se tragaba el tramo
// del regreso, y el día volvía a partirse en dos filas.
describe('tramoQueChoca', () => {
  const t = (entrada: Date | null, salida: Date | null, id = 'x') => ({ id, entrada, salida });

  it('dos tramos separados no chocan', () => {
    expect(tramoQueChoca(t(bog(13), bog(17)), [t(bog(8), bog(12), 'a')])).toBeNull();
  });

  it('tocarse en un extremo NO es chocar', () => {
    // Volver del descanso exactamente a la hora en que se salió es lo normal.
    expect(tramoQueChoca(t(bog(12), bog(17)), [t(bog(8), bog(12), 'a')])).toBeNull();
  });

  it('pisarse aunque sea un minuto sí es chocar', () => {
    expect(tramoQueChoca(t(bog(11, 59), bog(17)), [t(bog(8), bog(12), 'a')])?.id).toBe('a');
  });

  it('el caso real: la salida corregida se traga el tramo del regreso', () => {
    // Marcó 08:00-11:00 y volvió 11:00-16:00. Al corregir la primera a 08:00-16:00,
    // esa marcación se come entera a la segunda.
    const otros = [t(bog(11), bog(16), 'regreso')];
    expect(tramoQueChoca(t(bog(8), bog(16)), otros)?.id).toBe('regreso');
  });

  it('un tramo todavía abierto no se puede juzgar', () => {
    expect(tramoQueChoca(t(bog(8), null), [t(bog(8), bog(12), 'a')])).toBeNull();
    expect(tramoQueChoca(t(bog(8), bog(12)), [t(bog(8), null, 'a')])).toBeNull();
  });
});

// Una salida al descanso NO es el fin de la jornada. La persona sigue en su
// turno, solo que ahora está descansando. Ponerla en la columna de Salida decía
// que se había ido a casa, y de paso dejaba la duración del día en cero.
describe('marcacionQueCierra', () => {
  const m = (entrada: Date | null, salida: Date | null, salidaAlmuerzo = false) =>
    ({ entrada, salida, salidaAlmuerzo, entradaEstimada: false });

  it('la jornada normal la cierra su última salida', () => {
    const j = [m(bog(8), bog(12), true), m(bog(13), bog(17))];
    expect(marcacionQueCierra(j)?.salida).toEqual(bog(17));
  });

  it('salió al descanso y todavía no vuelve: la jornada NO está cerrada', () => {
    expect(marcacionQueCierra([m(bog(8), bog(12), true)])).toBeNull();
  });

  it('volvió del descanso pero sigue dentro: tampoco está cerrada', () => {
    const j = [m(bog(8), bog(12), true), m(bog(13), null)];
    expect(marcacionQueCierra(j)).toBeNull();
  });

  it('sin ninguna salida no hay nada que cierre', () => {
    expect(marcacionQueCierra([m(bog(8), null)])).toBeNull();
  });
});

// La jornada puede estar cerrada POR EL SISTEMA aunque ninguna marcación tenga
// hora de salida: cuando el auto-cierre no encuentra la franja del colaborador,
// marca `salidaEstimada` y deja la hora en null a propósito, para que la ponga
// el admin. Sin esto, la tabla de Registros pintaba esas filas como si nadie
// las hubiera tocado y el chip "No marcó salida" no aparecía nunca.
describe('laCerroElSistema', () => {
  const m = (salida: Date | null, salidaEstimada = false, salidaAlmuerzo = false) =>
    ({ entrada: bog(8), salida, salidaAlmuerzo, entradaEstimada: false, salidaEstimada });

  it('una jornada que nadie tocó no la cerró el sistema', () => {
    expect(laCerroElSistema([m(bog(17))])).toBe(false);
  });

  it('la reconoce cuando el sistema estimó la hora de salida', () => {
    expect(laCerroElSistema([m(bog(16), true)])).toBe(true);
  });

  it('la reconoce cuando el sistema cerró SIN hora de salida', () => {
    // El caso que se perdía: `salida` en null, pero marcada por el sistema.
    expect(laCerroElSistema([m(null, true)])).toBe(true);
  });

  it('la reconoce aunque la marca esté en un tramo anterior', () => {
    // Salió al descanso y no volvió a marcar: el tramo marcado es el primero.
    expect(laCerroElSistema([m(bog(12), true, true), m(null)])).toBe(true);
  });

  it('un turno abierto de verdad sigue sin estar cerrado', () => {
    expect(laCerroElSistema([m(null)])).toBe(false);
  });
});

describe('resumirAlmuerzoDelDia — mientras está descansando', () => {
  const dia = () => ({
    fecha: bog(0), almuerzoMin: 60,
    almuerzoInicio: '12:00' as string | null, almuerzoFin: '13:00' as string | null,
  });
  const salioAlDescanso = [reg(bog(8), bog(12, 5), { salidaAlmuerzo: true })];

  it('dentro de su ventana está EN CURSO, no "sin regreso"', () => {
    // Acusar a alguien de no volver mientras está comiendo es sencillamente falso.
    expect(resumirAlmuerzoDelDia(salioAlDescanso, dia(), bog(12, 30)).estado).toBe('EN_CURSO');
  });

  it('pasada la ventana pero dentro de la hora de gracia, sigue EN CURSO', () => {
    expect(resumirAlmuerzoDelDia(salioAlDescanso, dia(), bog(13, 30)).estado).toBe('EN_CURSO');
  });

  it('pasada la ventana y la gracia, entonces sí es "sin regreso"', () => {
    expect(resumirAlmuerzoDelDia(salioAlDescanso, dia(), bog(14, 30)).estado).toBe('ABIERTO');
  });

  it('un día viejo sin regreso sigue siendo un problema, no un descanso en curso', () => {
    expect(resumirAlmuerzoDelDia(salioAlDescanso, dia(), bog(10, 0, 20)).estado).toBe('ABIERTO');
  });
});

// Armar los instantes de una jornada a partir de horas sueltas "HH:MM".
//
// Cada hora que no sea posterior a la anterior pertenece al día siguiente. Sin
// esto, un turno 20:00→05:00 se guardaba con la salida NUEVE horas antes de su
// entrada, porque el formulario colgaba las dos de la misma fecha.
describe('instantesDeJornada', () => {
  const medianoche = bog(0);

  it('jornada de día, con descanso', () => {
    const r = instantesDeJornada(medianoche, { entrada: '08:00', descansoSalida: '12:00', descansoRegreso: '13:00', salida: '17:00' });
    expect(r.entrada).toEqual(bog(8));
    expect(r.descansoSalida).toEqual(bog(12));
    expect(r.descansoRegreso).toEqual(bog(13));
    expect(r.salida).toEqual(bog(17));
  });

  it('turno nocturno: todo lo que cae después de medianoche pasa al día siguiente', () => {
    const r = instantesDeJornada(medianoche, { entrada: '20:00', descansoSalida: '01:00', descansoRegreso: '02:00', salida: '05:00' });
    expect(r.entrada).toEqual(bog(20));
    expect(r.descansoSalida).toEqual(bog(1, 0, 6));
    expect(r.descansoRegreso).toEqual(bog(2, 0, 6));
    expect(r.salida).toEqual(bog(5, 0, 6));
  });

  it('sin salida todavía: la jornada sigue abierta', () => {
    const r = instantesDeJornada(medianoche, { entrada: '08:00', descansoSalida: '12:00' });
    expect(r.descansoSalida).toEqual(bog(12));
    expect(r.descansoRegreso).toBeNull();
    expect(r.salida).toBeNull();
  });

  it('sin descanso, la salida se mide contra la entrada', () => {
    const r = instantesDeJornada(medianoche, { entrada: '22:00', salida: '06:00' });
    expect(r.salida).toEqual(bog(6, 0, 6));
  });

  it('un descanso de duración cero es válido, no rueda al día siguiente', () => {
    const r = instantesDeJornada(medianoche, { entrada: '08:00', descansoSalida: '12:00', descansoRegreso: '12:00', salida: '17:00' });
    expect(r.descansoRegreso).toEqual(bog(12));
    expect(r.salida).toEqual(bog(17));
  });
});

// Cuánto dura la ventana. Hace falta para decir "se tomó X de más": volver tarde
// y tomarse de más NO son lo mismo. Quien sale 15 min antes y vuelve 15 min
// tarde solo "volvió 15 tarde", pero se tomó media hora de más.
describe('minutosVentana', () => {
  const dia = (ini: string | null, fin: string | null) => ({
    fecha: bog(0), almuerzoMin: 60, almuerzoInicio: ini, almuerzoFin: fin,
  });
  const ventana = (ini: string | null, fin: string | null) =>
    resumirAlmuerzoDelDia([reg(bog(8), bog(17))], dia(ini, fin)).minutosVentana;

  it('una hora de descanso son 60 minutos', () => {
    expect(ventana('12:00', '13:00')).toBe(60);
  });

  it('media hora son 30', () => {
    expect(ventana('12:00', '12:30')).toBe(30);
  });

  it('la ventana que cruza la medianoche también se mide bien', () => {
    expect(ventana('23:30', '00:30')).toBe(60);
  });

  it('sin ventana no hay duración que dar', () => {
    expect(ventana(null, null)).toBeNull();
  });

  it('el caso real: 11:45 a 13:15 con ventana de una hora son 30 de más, no 15', () => {
    const r = resumirAlmuerzoDelDia(
      [reg(bog(8), bog(11, 45), { salidaAlmuerzo: true }), reg(bog(13, 15), bog(17))],
      dia('12:00', '13:00'),
    );
    expect(r.minutos).toBe(90);
    expect(r.minutosVentana).toBe(60);
    // Volvió 15 tarde, pero se tomó 30 de más: salió 15 antes de que empezara.
    expect(r.minutosDeMas).toBe(15);
    expect(r.minutos! - r.minutosVentana!).toBe(30);
  });
});

// Qué es cada marca DENTRO del día.
//
// Existe porque `salidaAlmuerzo` es un booleano suelto en el registro y cada
// pantalla lo re-interpretaba por su cuenta —o se olvidaba—. El resultado fue
// que el detalle de la jornada rotulaba la foto de la salida a almorzar como
// "Salida", diciendo que la persona se había ido a su casa a las 14:04 cuando
// volvió a las 14:50. Esa es la primera prueba de la lista.
describe('momentosDelDia', () => {
  const m = (
    id: string,
    entrada: Date | null,
    salida: Date | null,
    extra: { salidaAlmuerzo?: boolean } = {},
  ) => ({
    id, entrada, salida,
    salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
    entradaEstimada: false,
  });

  it('un día de un solo tramo: entrada y salida, sin vueltas', () => {
    const r = momentosDelDia([m('a', bog(8), bog(17))]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA' });
  });

  it('EL BUG: la salida al descanso no es la salida del trabajo', () => {
    // El día del reporte: entró 10:00, salió a almorzar 14:04, volvió 14:50 y
    // todavía no ha cerrado. Antes esto rotulaba la foto de las 14:04 como
    // "Salida" y escondía la de las 14:50.
    const r = momentosDelDia([
      m('a', bog(10), bog(14, 4), { salidaAlmuerzo: true }),
      m('b', bog(14, 50), null),
    ]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA_ALMUERZO' });
    expect(r.get('b')).toEqual({ entrada: 'REGRESO_ALMUERZO', salida: null });
  });

  it('el mismo día ya cerrado: la salida de verdad es la del segundo tramo', () => {
    const r = momentosDelDia([
      m('a', bog(10), bog(14, 4), { salidaAlmuerzo: true }),
      m('b', bog(14, 50), bog(19)),
    ]);
    expect(r.get('a')!.salida).toBe('SALIDA_ALMUERZO');
    expect(r.get('b')).toEqual({ entrada: 'REGRESO_ALMUERZO', salida: 'SALIDA' });
  });

  it('salió a almorzar y no volvió: sigue siendo descanso, no fin de jornada', () => {
    // Aunque sea la última marca del día. Es justo lo que `marcacionQueCierra`
    // ya decide para la columna de Salida; aquí no puede decir otra cosa.
    const r = momentosDelDia([m('a', bog(8), bog(12), { salidaAlmuerzo: true })]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA_ALMUERZO' });
  });

  it('LA TRAMPA: volver de noche a hacer extras abre una jornada nueva', () => {
    // Si esto se resolviera con "la primera entrada del día es ENTRADA y las
    // demás son regresos", la entrada de las 19:00 diría "Regreso del descanso"
    // y el administrador leería un almuerzo de siete horas.
    const r = momentosDelDia([
      m('a', bog(8), bog(12)),
      m('b', bog(19), bog(22)),
    ]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA' });
    expect(r.get('b')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA' });
  });

  it('almuerzo y además extras de noche: tres marcas, tres papeles distintos', () => {
    const r = momentosDelDia([
      m('a', bog(8), bog(12), { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17)),
      m('c', bog(19), bog(22)),
    ]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA_ALMUERZO' });
    expect(r.get('b')).toEqual({ entrada: 'REGRESO_ALMUERZO', salida: 'SALIDA' });
    expect(r.get('c')).toEqual({ entrada: 'ENTRADA', salida: 'SALIDA' });
  });

  it('el orden en que vengan de la base no cambia el resultado', () => {
    // `partirDiaEnJornadas` ordena antes de agrupar porque la base no garantiza
    // orden; esta función depende de lo mismo y no puede confiar en el llamador.
    const r = momentosDelDia([
      m('b', bog(14, 50), bog(19)),
      m('a', bog(10), bog(14, 4), { salidaAlmuerzo: true }),
    ]);
    expect(r.get('a')!.entrada).toBe('ENTRADA');
    expect(r.get('b')!.entrada).toBe('REGRESO_ALMUERZO');
  });

  it('una marcación cargada a mano sin hora de entrada no inventa un momento', () => {
    const r = momentosDelDia([m('a', null, bog(17))]);
    expect(r.get('a')).toEqual({ entrada: null, salida: 'SALIDA' });
  });

  it('un turno abierto no tiene salida que rotular', () => {
    const r = momentosDelDia([m('a', bog(8), null)]);
    expect(r.get('a')).toEqual({ entrada: 'ENTRADA', salida: null });
  });

  it('un día sin marcaciones devuelve un mapa vacío', () => {
    expect(momentosDelDia([]).size).toBe(0);
  });
});

// A QUÉ TURNO PERTENECE CADA MARCACIÓN.
//
// Lo necesita la pantalla de fotos del día: con varios ingresos, la grilla plana
// no dejaba ver qué salida cerraba qué entrada. Va en una función APARTE y no
// como un campo nuevo de `momentosDelDia`, porque las pruebas de arriba comparan
// ese objeto entero con `toEqual` y un campo más las rompería todas sin que nada
// hubiera cambiado de verdad.
//
// El riesgo de tener dos funciones es que digan cosas distintas del mismo día.
// La última prueba lo cierra: una ENTRADA abre turno nuevo, siempre.
describe('jornadaDeCadaMarcacion', () => {
  const m = (
    id: string,
    entrada: Date | null,
    salida: Date | null,
    extra: { salidaAlmuerzo?: boolean } = {},
  ) => ({
    id, entrada, salida,
    salidaAlmuerzo: extra.salidaAlmuerzo ?? false,
    entradaEstimada: false,
  });

  it('un día de un solo tramo es el turno 0', () => {
    const r = jornadaDeCadaMarcacion([m('a', bog(8), bog(17))]);
    expect(r.get('a')).toBe(0);
  });

  it('volver del descanso es el MISMO turno', () => {
    const r = jornadaDeCadaMarcacion([
      m('a', bog(8), bog(12), { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17)),
    ]);
    expect([r.get('a'), r.get('b')]).toEqual([0, 0]);
  });

  it('volver de noche a hacer extras abre OTRO turno', () => {
    const r = jornadaDeCadaMarcacion([
      m('a', bog(8), bog(12)),
      m('b', bog(19), bog(22)),
    ]);
    expect([r.get('a'), r.get('b')]).toEqual([0, 1]);
  });

  it('almuerzo y además extras de noche: dos turnos, el primero partido', () => {
    const r = jornadaDeCadaMarcacion([
      m('a', bog(8), bog(12), { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17)),
      m('c', bog(19), bog(22)),
    ]);
    expect([r.get('a'), r.get('b'), r.get('c')]).toEqual([0, 0, 1]);
  });

  it('no depende del orden en que lleguen las marcaciones', () => {
    const r = jornadaDeCadaMarcacion([
      m('c', bog(19), bog(22)),
      m('a', bog(8), bog(12), { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17)),
    ]);
    expect([r.get('a'), r.get('b'), r.get('c')]).toEqual([0, 0, 1]);
  });

  it('dice lo mismo que momentosDelDia: una ENTRADA abre turno nuevo, siempre', () => {
    const dias = [
      [m('a', bog(8), bog(17))],
      [m('a', bog(10), bog(14, 4), { salidaAlmuerzo: true }), m('b', bog(14, 50), null)],
      [m('a', bog(8), bog(12)), m('b', bog(19), bog(22))],
      [m('a', bog(8), bog(12), { salidaAlmuerzo: true }), m('b', bog(13), bog(17)), m('c', bog(19), bog(22))],
      [m('a', bog(7, 48), bog(8, 32)), m('b', bog(8, 32), bog(9, 6)), m('c', bog(9, 7), bog(9, 7))],
    ];
    for (const dia of dias) {
      const turnos = jornadaDeCadaMarcacion(dia);
      const momentos = momentosDelDia(dia);
      const vistos = new Set<number>();
      const enOrden = [...dia].sort((x, y) => x.entrada!.getTime() - y.entrada!.getTime());
      for (const r of enOrden) {
        const t = turnos.get(r.id)!;
        const abreTurno = !vistos.has(t);
        vistos.add(t);
        expect(momentos.get(r.id)!.entrada === 'ENTRADA').toBe(abreTurno);
      }
    }
  });
});

describe('sedesDeLaJornada', () => {
  const P = { id: 's1', nombre: 'El Poblado' };
  const L = { id: 's2', nombre: 'Laureles' };
  type S = typeof P;
  const m = (id: string, entrada: Date | null, salida: Date | null, sede: S | null, sedeSalida: S | null,
    extra: { salidaAlmuerzo?: boolean } = {}) => ({ ...reg(entrada, salida, extra), id, sede, sedeSalida });

  it('la salida a almorzar en otra sede no es el cierre: cerró donde marcó la salida de verdad', () => {
    const dia = [
      m('a', bog(8), bog(12), P, L, { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17), L, P),
    ];
    // Se pregunte por la marcación que se pregunte, es la misma jornada.
    expect(sedesDeLaJornada(dia, 'a')).toEqual({ abrio: P, cerro: P });
    expect(sedesDeLaJornada(dia, 'b')).toEqual({ abrio: P, cerro: P });
  });

  it('volver del almuerzo en otra sede y cerrar allí sí es cruzar', () => {
    const dia = [
      m('a', bog(8), bog(12), P, P, { salidaAlmuerzo: true }),
      m('b', bog(13), bog(17), L, L),
    ];
    expect(sedesDeLaJornada(dia, 'a')).toEqual({ abrio: P, cerro: L });
  });

  it('una jornada que sigue abierta no tiene sede de cierre', () => {
    const dia = [
      m('a', bog(8), bog(12), P, L, { salidaAlmuerzo: true }),
      m('b', bog(13), null, L, null),
    ];
    expect(sedesDeLaJornada(dia, 'b')).toEqual({ abrio: P, cerro: null });
  });

  it('cada jornada del día responde por las suyas, lleguen en el orden que lleguen', () => {
    // Desordenadas a propósito, con el regreso del almuerzo ANTES de su salida:
    // sin ordenar por entrada, el regreso quedaría como una jornada suelta.
    const dia = [
      m('b', bog(13), bog(17), L, P),
      m('c', bog(19), bog(21), L, L),
      m('a', bog(8), bog(12), P, L, { salidaAlmuerzo: true }),
    ];
    expect(sedesDeLaJornada(dia, 'b')).toEqual({ abrio: P, cerro: P });
    expect(sedesDeLaJornada(dia, 'c')).toEqual({ abrio: L, cerro: L });
  });

  it('salió a almorzar y no volvió: la salida al descanso tampoco es un cierre', () => {
    expect(sedesDeLaJornada([m('a', bog(8), bog(12), P, L, { salidaAlmuerzo: true })], 'a'))
      .toEqual({ abrio: P, cerro: null });
  });

  it('dice lo mismo que la fila de la tabla, marcación por marcación', () => {
    // La fila toma la sede de la primera marcación de cada jornada y la de salida
    // de `marcacionQueCierra` (routes/registros.ts). Si las dos agruparan
    // distinto, el detalle volvería a contradecir a la tabla.
    const horario = {
      fecha: bog(0), programado: true, horaEntrada: '08:00', horaSalida: '17:00', toleranciaSalidaMin: 0,
      ajustaEntrada: false, almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00',
    };
    const dia = [
      m('d', bog(19), bog(21), L, L),
      m('b', bog(13), bog(17), L, P),
      m('a', bog(8), bog(12), P, L, { salidaAlmuerzo: true }),
      m('e', null, bog(22), null, P),
    ];
    const jornadas = partirDiaEnJornadas(dia, horario);
    expect(jornadas).toHaveLength(3);
    for (const { marcaciones } of jornadas) {
      const fila = { abrio: marcaciones[0].sede, cerro: marcacionQueCierra(marcaciones)?.sedeSalida ?? null };
      for (const x of marcaciones) expect(sedesDeLaJornada(dia, x.id)).toEqual(fila);
    }
  });

  it('una marcación que no está en el día no tiene sedes', () => {
    expect(sedesDeLaJornada([m('a', bog(8), bog(17), P, P)], 'otra')).toEqual({ abrio: null, cerro: null });
  });
});

describe('salidasTrasEditar', () => {
  // Quitar o poner el descanso cambia CUÁL salida guarda cada fila. Todo lo que
  // dice cómo se marcó esa salida es de la salida y no de la fila. Antes solo
  // viajaba la sede: al quitar el descanso, la foto de la salida al descanso
  // aparecía rotulada «Salida 17:00».
  //
  // Las fotos son etiquetas legibles: la función no mira los bytes, solo decide a
  // qué fila va cada una.
  type Opc = {
    salidaAlmuerzo?: boolean; fotoEntrada?: string; sede?: string; foto?: string;
    metodo?: 'ROSTRO' | 'CEDULA'; distancia?: number; estimada?: boolean;
  };
  const m = (id: string, entrada: Date | null, salida: Date | null, o: Opc = {}) => ({
    ...reg(entrada, salida, { salidaAlmuerzo: o.salidaAlmuerzo }),
    id,
    fotoEntrada: o.fotoEntrada ?? null,
    sedeSalidaId: o.sede ?? null,
    fotoSalida: o.foto ?? null,
    metodoSalida: o.metodo ?? null,
    distanciaSalida: o.distancia ?? null,
    salidaEstimada: o.estimada ?? false,
  });
  const horas = (descansoSalida: Date | null, descansoRegreso: Date | null, salida: Date | null) =>
    ({ descansoSalida, descansoRegreso, salida });

  // Un día con descanso: las cuatro marcas del kiosco, con rostro.
  const conDescanso = [
    m('a', bog(8), bog(12), { salidaAlmuerzo: true, fotoEntrada: 'F08', sede: 'L', foto: 'F12', metodo: 'ROSTRO', distancia: 0.31 }),
    m('b', bog(13), bog(17), { fotoEntrada: 'F13', sede: 'P', foto: 'F17', metodo: 'ROSTRO', distancia: 0.42 }),
  ];
  const soloCierre = [m('a', bog(8), bog(17), { fotoEntrada: 'F08', sede: 'P', foto: 'F17', metodo: 'ROSTRO', distancia: 0.42 })];
  const DEL_DESCANSO = { sedeSalidaId: 'L', fotoSalida: 'F12', metodoSalida: 'ROSTRO', distanciaSalida: 0.31, salidaEstimada: false };
  const DEL_CIERRE = { sedeSalidaId: 'P', fotoSalida: 'F17', metodoSalida: 'ROSTRO', distanciaSalida: 0.42, salidaEstimada: false };
  // La escribió el administrador: nadie la marcó en ningún kiosco.
  const A_MANO = { sedeSalidaId: null, fotoSalida: null, metodoSalida: 'MANUAL', distanciaSalida: null, salidaEstimada: false };
  const SIN_SALIDA = { sedeSalidaId: null, fotoSalida: null, metodoSalida: null, distanciaSalida: null, salidaEstimada: false };

  describe('lo de cada salida va con ella', () => {
    it('quitar el descanso: la que queda cierra con todo lo de la salida del día', () => {
      const r = salidasTrasEditar(conDescanso, horas(null, null, bog(17)));
      expect(r.primera).toEqual(DEL_CIERRE);
      expect(r.segunda).toBeNull();
    });

    it('poner el descanso: la salida del día pasa entera a la marcación nueva, y la del descanso la escribió el administrador', () => {
      const r = salidasTrasEditar(soloCierre, horas(bog(12), bog(13), bog(17)));
      expect(r.primera).toEqual(A_MANO);
      expect(r.segunda).toEqual(DEL_CIERRE);
    });

    it('mover las horas sin tocar el descanso deja cada salida con lo suyo', () => {
      const r = salidasTrasEditar(conDescanso, horas(bog(12, 15), bog(13, 15), bog(17, 15)));
      expect(r.primera).toEqual(DEL_DESCANSO);
      expect(r.segunda).toEqual(DEL_CIERRE);
    });

    it('una salida que estimó el sistema sigue estimada y no se queda con la foto del descanso', () => {
      const cerroElSistema = [conDescanso[0], m('b', bog(13), bog(18), { fotoEntrada: 'F13', estimada: true })];
      expect(salidasTrasEditar(cerroElSistema, horas(null, null, bog(18))).primera)
        .toEqual({ ...SIN_SALIDA, salidaEstimada: true });
    });

    it('completar un descanso sin regreso no inventa cómo se marcó la salida del día', () => {
      const r = salidasTrasEditar([conDescanso[0]], horas(bog(12), bog(13), bog(17)));
      expect(r.primera).toEqual(DEL_DESCANSO);
      expect(r.segunda).toEqual(A_MANO);
    });

    it('escribirle la salida a un turno abierto: la escribió el administrador', () => {
      expect(salidasTrasEditar([m('a', bog(8), null)], horas(null, null, bog(17))).primera).toEqual(A_MANO);
    });

    it('si el barrido lo marcó sin poder ponerle hora, sigue diciendo que nadie marcó esa salida', () => {
      expect(salidasTrasEditar([m('a', bog(8), null, { estimada: true })], horas(null, null, bog(17))).primera)
        .toEqual({ ...A_MANO, salidaEstimada: true });
    });
  });

  describe('sin salida no queda nada de ella', () => {
    it('reabrir el turno vacía sede, foto, método y distancia', () => {
      expect(salidasTrasEditar(soloCierre, horas(null, null, null)).primera).toEqual(SIN_SALIDA);
    });

    it('reabrir un turno que cerró el sistema lo deja marcado, para que el barrido no lo vuelva a cerrar', () => {
      expect(salidasTrasEditar([m('a', bog(8), bog(18), { estimada: true })], horas(null, null, null)).primera)
        .toEqual({ ...SIN_SALIDA, salidaEstimada: true });
    });

    it('reabrir solo la tarde conserva la del descanso y vacía la del cierre', () => {
      const r = salidasTrasEditar(conDescanso, horas(bog(12), bog(13), null));
      expect(r.primera).toEqual(DEL_DESCANSO);
      expect(r.segunda).toEqual(SIN_SALIDA);
    });
  });

  describe('cambiar de papel sin cambiar de minuto es la misma marca', () => {
    // Quien oprimió «salir a descansar» cuando se iba. El administrador corrige
    // QUÉ fue esa marca, no cuándo ni dónde ocurrió.
    it('un descanso sin regreso que pasa a ser la salida del día a la misma hora conserva lo suyo', () => {
      // Con segundos: el kiosco los guarda y el formulario solo manda HH:mm.
      const conSegundos = [m('a', bog(8), new Date(bog(12).getTime() + 37_000),
        { salidaAlmuerzo: true, sede: 'L', foto: 'F12', metodo: 'ROSTRO', distancia: 0.31 })];
      const r = salidasTrasEditar(conSegundos, horas(null, null, bog(12)));
      expect(r.primera).toEqual(DEL_DESCANSO);
      expect(r.fotosQueSePierden).toEqual([]);
    });

    it('a otra hora ya no es la misma marca: la salida la escribió el administrador', () => {
      const r = salidasTrasEditar([conDescanso[0]], horas(null, null, bog(17)));
      expect(r.primera).toEqual(A_MANO);
      expect(r.fotosQueSePierden).toEqual([{ momento: 'SALIDA_ALMUERZO', hora: bog(12) }]);
    });

    it('una salida del día que pasa a ser descanso a la misma hora conserva lo suyo', () => {
      expect(salidasTrasEditar(soloCierre, horas(bog(17), null, null)).primera).toEqual(DEL_CIERRE);
    });

    it('una misma marca no se hereda dos veces: un descanso que sale a la hora de la salida no copia su foto', () => {
      const r = salidasTrasEditar(soloCierre, horas(bog(17), bog(18), bog(20)));
      expect(r.primera).toEqual(A_MANO);
      expect(r.segunda).toEqual(DEL_CIERRE);
    });
  });

  describe('fotosQueSePierden', () => {
    it('quitar el descanso pierde las fotos del descanso y del regreso, no la de la salida del día', () => {
      expect(salidasTrasEditar(conDescanso, horas(null, null, bog(17))).fotosQueSePierden).toEqual([
        { momento: 'SALIDA_ALMUERZO', hora: bog(12) },
        { momento: 'REGRESO_ALMUERZO', hora: bog(13) },
      ]);
    });

    it('poner el descanso o mover las horas no pierde ninguna', () => {
      expect(salidasTrasEditar(soloCierre, horas(bog(12), bog(13), bog(17))).fotosQueSePierden).toEqual([]);
      expect(salidasTrasEditar(conDescanso, horas(bog(12, 15), bog(13, 15), bog(17, 15))).fotosQueSePierden).toEqual([]);
    });

    it('reabrir el turno pierde la foto de la salida', () => {
      expect(salidasTrasEditar(soloCierre, horas(null, null, null)).fotosQueSePierden)
        .toEqual([{ momento: 'SALIDA', hora: bog(17) }]);
    });

    it('una marca sin foto no se avisa: se marcó con cédula, o la foto ya se borró a los dos meses', () => {
      const conCedula = [
        m('a', bog(8), bog(12), { salidaAlmuerzo: true, metodo: 'CEDULA' }),
        m('b', bog(13), bog(17), { metodo: 'CEDULA' }),
      ];
      expect(salidasTrasEditar(conCedula, horas(null, null, bog(17))).fotosQueSePierden).toEqual([]);
    });

    it('una foto que quedó escondida en un turno reabierto también se avisa, al final y sin hora', () => {
      // Reabrir con PUT /:id vacía la hora de salida pero no toca la foto. Sin
      // avisarla, reaparecería pegada a la hora que se escriba ahora.
      const reabierto = [conDescanso[0], m('b', bog(13), null, { fotoEntrada: 'F13', foto: 'F17' })];
      expect(salidasTrasEditar(reabierto, horas(null, null, bog(17))).fotosQueSePierden).toEqual([
        { momento: 'SALIDA_ALMUERZO', hora: bog(12) },
        { momento: 'REGRESO_ALMUERZO', hora: bog(13) },
        { momento: 'SALIDA', hora: null },
      ]);
    });
  });

  describe('novedades', () => {
    // La novedad de una salida temprana cuelga de la marcación que cerró y se
    // borra en cascada con ella. Sin moverla, quitar el descanso la borraba aunque
    // ya estuviera aprobada, y eso mueve la liquidación.
    it('quitar el descanso: lo que colgaba de la tarde pasa a la marcación que queda', () => {
      expect(salidasTrasEditar(conDescanso, horas(null, null, bog(17))).novedades)
        .toEqual([{ desde: 'b', hacia: 'primera' }]);
    });

    it('poner el descanso: pasa a la marcación nueva, que es la que tiene la salida del día', () => {
      expect(salidasTrasEditar(soloCierre, horas(bog(12), bog(13), bog(17))).novedades)
        .toEqual([{ desde: 'a', hacia: 'segunda' }]);
    });

    it('mover las horas no mueve nada', () => {
      expect(salidasTrasEditar(conDescanso, horas(bog(12, 15), bog(13, 15), bog(17, 15))).novedades).toEqual([]);
    });

    it('si la tarde se borra sin que su salida quede en ninguna parte, lo suyo va a la primera', () => {
      const r = salidasTrasEditar(conDescanso, horas(bog(12), null, null));
      expect(r.novedades).toEqual([{ desde: 'b', hacia: 'primera' }]);
      expect(r.fotosQueSePierden).toEqual([
        { momento: 'REGRESO_ALMUERZO', hora: bog(13) },
        { momento: 'SALIDA', hora: bog(17) },
      ]);
    });
  });
});
