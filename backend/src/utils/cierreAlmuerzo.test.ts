import { describe, it, expect } from 'vitest';
import { almuerzoSinRegreso, descansoSinRegreso, descansoSigueEsperandoRegreso } from './cierreAlmuerzo';

// Quien sale a almorzar y no marca su regreso pierde la tarde entera: el sistema
// no la cuenta ni la paga, y hoy nadie se entera hasta que el trabajador
// reclama a fin de mes. Es el olvido más común de todos.
//
// Lo que este módulo NO hace, a propósito: inventar el regreso. La evidencia de
// quien volvió y no marcó es IDÉNTICA a la de quien se fue a la casa, así que
// darle la tarde por buena sería fabricar horas pagadas. Lo que hace es
// detectarlo y proponer una hora para que la confirme quien sí sabe: la propia
// persona en el kiosco, o el administrador.

const bog = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));
const dia = (extra: Record<string, unknown> = {}) => ({
  fecha: bog(5, 0),
  almuerzoMin: 60,
  almuerzoInicio: '12:00' as string | null,
  almuerzoFin: '13:00' as string | null,
  ...extra,
});

describe('almuerzoSinRegreso', () => {
  it('acaba de salir: todavía está almorzando, no hay nada que reclamar', () => {
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 12, 30));
    expect(r.vencido).toBe(false);
    expect(r.finVentana).toEqual(bog(5, 13, 0));
  });

  it('se pasó unos minutos: sigue sin ser un olvido', () => {
    // Volver 13:20 y marcar es normal. Preguntarle a esta persona sobraría, y
    // peor, la empujaría a aceptar una hora que no es la suya.
    expect(almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 13, 20)).vencido).toBe(false);
  });

  it('una hora larga después del fin: eso ya es un olvido', () => {
    expect(almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 14, 10)).vencido).toBe(true);
  });

  it('a las cinco de la tarde, clarísimo', () => {
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia(), bog(5, 17, 0));
    expect(r.vencido).toBe(true);
    // La hora que se propone es el fin de SU ventana, no la de ahora.
    expect(r.finVentana).toEqual(bog(5, 13, 0));
  });

  it('sin ventana no hay nada que proponer', () => {
    // El día no tiene horario de almuerzo congelado: no se sabe cuándo debía
    // volver, así que no se inventa una hora.
    const r = almuerzoSinRegreso(bog(5, 12, 5), dia({ almuerzoInicio: null, almuerzoFin: null }), bog(5, 17, 0));
    expect(r.vencido).toBe(false);
    expect(r.finVentana).toBeNull();
  });

  it('turno nocturno: la ventana de la madrugada es la del día siguiente', () => {
    // Turno 21:00 → 05:00, almuerzo de 01:00 a 01:30. Sale a la 01:00 del día 6.
    const d = dia({ almuerzoInicio: '01:00', almuerzoFin: '01:30', almuerzoMin: 30 });
    const r = almuerzoSinRegreso(bog(6, 1, 0), d, bog(6, 4, 0));
    expect(r.finVentana).toEqual(bog(6, 1, 30));
    expect(r.vencido).toBe(true);
  });
});

// El descanso no remunerado que nadie cerró es el mismo olvido, con la misma
// gracia. Desde el 12 de septiembre de 2026 el día tiene varios descansos, así que
// se mide contra la ventana A LA QUE SALIÓ, la que quedó guardada en la marcación,
// y la hora que se propone es la de `regresoEstimadoDelDescanso`.
describe('descansoSinRegreso', () => {
  const fecha = bog(5, 0);
  const manana = { inicio: '09:00', fin: '09:15' };

  it('se mide contra la ventana del descanso, no contra la del almuerzo', () => {
    const r = descansoSinRegreso(bog(5, 9, 2), fecha, manana, bog(5, 9, 30));
    expect(r.finVentana).toEqual(bog(5, 9, 15));
    expect(r.vencido).toBe(false);
  });

  it('una hora larga después del fin ya es un olvido', () => {
    expect(descansoSinRegreso(bog(5, 9, 2), fecha, manana, bog(5, 10, 20)).vencido).toBe(true);
  });

  it('sin ventana guardada no hay nada que proponer', () => {
    expect(descansoSinRegreso(bog(5, 9, 2), fecha, null, bog(5, 17, 0))).toEqual({ vencido: false, finVentana: null });
  });

  it('fuera de la ventana propone la salida más lo que dura ese descanso, y cuenta la gracia desde ahí', () => {
    // Carla sale a las 10:00 anotada en el de 15:00 a 15:10: le tocaba volver a las 10:10.
    const tarde = { inicio: '15:00', fin: '15:10' };
    expect(descansoSinRegreso(bog(5, 10, 0), fecha, tarde, bog(5, 11, 5))).toEqual({ vencido: false, finVentana: bog(5, 10, 10) });
    expect(descansoSinRegreso(bog(5, 10, 0), fecha, tarde, bog(5, 11, 15))).toEqual({ vencido: true, finVentana: bog(5, 10, 10) });
  });
});

// Hasta cuándo una salida al descanso sigue esperando su regreso (12 de septiembre de
// 2026). Contado solo por 18 horas, un descanso de la tarde que nadie cerró convertía la
// entrada de la mañana siguiente en su regreso. Espera hasta el fin del turno de SU día
// más la gracia, y nunca más de 18 horas; sin franja ese día, las 18 horas de siempre.
describe('descansoSigueEsperandoRegreso', () => {
  const deDia = { fecha: bog(5, 0), horaEntrada: '07:00' as string | null, horaSalida: '16:00' as string | null };

  it('espera hasta el fin del turno más una hora de gracia, y ni un minuto más', () => {
    expect(descansoSigueEsperandoRegreso(bog(5, 15), deDia, bog(5, 17, 0), null)).toBe(true);
    expect(descansoSigueEsperandoRegreso(bog(5, 15), deDia, bog(5, 17, 1), null)).toBe(false);
  });

  it('a las 07:30 del día siguiente ya no es su regreso, aunque no hayan pasado 18 horas', () => {
    expect(descansoSigueEsperandoRegreso(bog(5, 15), deDia, bog(6, 7, 30), null)).toBe(false);
  });

  it('el turno que cruza la medianoche termina en la madrugada del día siguiente', () => {
    const nocturno = { fecha: bog(5, 0), horaEntrada: '22:00', horaSalida: '06:00' };
    expect(descansoSigueEsperandoRegreso(bog(6, 2), nocturno, bog(6, 7, 0), null)).toBe(true);
    expect(descansoSigueEsperandoRegreso(bog(6, 2), nocturno, bog(6, 7, 1), null)).toBe(false);
  });

  it('nunca más de 18 horas desde la salida, aunque el turno termine después', () => {
    // Una franja de 23 horas: de las 06:00 a las 05:00 del día siguiente.
    const larga = { fecha: bog(5, 0), horaEntrada: '06:00', horaSalida: '05:00' };
    expect(descansoSigueEsperandoRegreso(bog(5, 7), larga, bog(6, 1, 0), null)).toBe(true);
    expect(descansoSigueEsperandoRegreso(bog(5, 7), larga, bog(6, 1, 1), null)).toBe(false);
  });

  it('sin franja ese día, o con la franja a medias o rota, se queda la regla de 18 horas', () => {
    const sinFranja = [null, { ...deDia, horaEntrada: null, horaSalida: null }, { ...deDia, horaSalida: null }, { ...deDia, horaSalida: 'xx' }, { ...deDia, horaEntrada: '7:00' }];
    for (const dia of sinFranja) {
      expect(descansoSigueEsperandoRegreso(bog(5, 15), dia, bog(6, 9, 0), null), JSON.stringify(dia)).toBe(true);
      expect(descansoSigueEsperandoRegreso(bog(5, 15), dia, bog(6, 9, 1), null), JSON.stringify(dia)).toBe(false);
    }
  });

  // Quien sale a su descanso después del fin de su turno (se quedó trabajando y el kiosco
  // lo anotó en el último pendiente) no puede quedar sin regreso en el acto: lo sigue
  // esperando lo que dura ESE descanso más la gracia, contado como lo cuenta el kiosco
  // (`regresoEsperadoDelDescanso`). Sin ventana guardada, desde la salida más la gracia.
  it('quien sale a su descanso después del fin del turno lo sigue esperando lo que dura ese descanso más la gracia', () => {
    const tarde = { inicio: '15:00', fin: '15:10' };
    expect(descansoSigueEsperandoRegreso(bog(5, 17, 30), deDia, bog(5, 18, 40), tarde)).toBe(true);
    expect(descansoSigueEsperandoRegreso(bog(5, 17, 30), deDia, bog(5, 18, 41), tarde)).toBe(false);
    expect(descansoSigueEsperandoRegreso(bog(5, 17, 30), deDia, bog(5, 18, 30), null)).toBe(true);
    expect(descansoSigueEsperandoRegreso(bog(5, 17, 30), deDia, bog(5, 18, 31), null)).toBe(false);
  });
});
