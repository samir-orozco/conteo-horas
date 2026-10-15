import { describe, it, expect } from 'vitest';
import { quienesNoHanLlegado, mensajeNoHanLlegado, mensajeYaLlego, cuerpoYaLlego, type PersonaDelDia, type ContextoDelDia } from './noHaLlegado';

// «NO HA LLEGADO» POR TELEGRAM (11 de octubre de 2026). Decisiones del dueño: se avisa pasada la
// tolerancia más 15 minutos, en un solo mensaje con la lista, con copia en la campana, y cuando la
// persona llega se avisa también.
//
// Un aviso falso en el grupo de una empresa es peor que no avisar: acusa a alguien delante de su
// jefe. Por eso la mitad de estas pruebas son de a quién NO se le avisa.
//
// Instantes en UTC explícito (CLAUDE.md §8.1).
const bog = (h: number, min = 0, d = 12) => new Date(Date.UTC(2026, 9, d, h + 5, min));
const HOY = bog(0);

const persona = (nombre: string, dia: Partial<NonNullable<PersonaDelDia['dia']>> | null = {}, o: Partial<PersonaDelDia> = {}): PersonaDelDia => ({
  colaboradorId: nombre.toLowerCase(), nombre, apellido: 'Ruiz', creadoEn: new Date(Date.UTC(2026, 0, 1)),
  dia: dia === null ? null : { programado: true, horaEntrada: '08:00', horaSalida: '17:00', toleranciaMin: 5, ...dia },
  ...o,
});
const contexto = (o: Partial<ContextoDelDia> = {}): ContextoDelDia => ({
  festivo: false, conEntrada: new Set(), novedades: [], yaAvisados: new Set(), ...o,
});
const ids = (ahora: Date, personas: PersonaDelDia[], c: Partial<ContextoDelDia> = {}) =>
  quienesNoHanLlegado(ahora, personas, contexto(c)).map(p => p.colaboradorId);

describe('quienesNoHanLlegado: cuándo', () => {
  it('pasada la tolerancia más 15 minutos sin marcar, sí', () => {
    // Entra 8:00 con 5 de tolerancia: el aviso es a las 8:20.
    expect(ids(bog(8, 20), [persona('Luis')])).toEqual(['luis']);
  });

  it('un minuto antes, no: todavía puede llegar sin que sea novedad', () => {
    expect(ids(bog(8, 19), [persona('Luis')])).toEqual([]);
  });

  it('la tolerancia de cada persona manda: con 20 minutos, el aviso es a las 8:35', () => {
    expect(ids(bog(8, 34), [persona('Luis', { toleranciaMin: 20 })])).toEqual([]);
    expect(ids(bog(8, 35), [persona('Luis', { toleranciaMin: 20 })])).toEqual(['luis']);
  });

  it('terminado su turno ya no se avisa: si la app despertó a las 6 p. m., ese aviso no sirve', () => {
    expect(ids(bog(17, 0), [persona('Luis')])).toEqual([]);
    expect(ids(bog(16, 59), [persona('Luis')])).toEqual(['luis']);
  });

  it('un turno de noche que cruza la medianoche se avisa en la noche', () => {
    expect(ids(bog(21, 20), [persona('Noe', { horaEntrada: '21:00', horaSalida: '05:00' })])).toEqual(['noe']);
  });
});

describe('quienesNoHanLlegado: a quién no', () => {
  it('quien ya marcó entrada hoy', () => {
    expect(ids(bog(9), [persona('Luis')], { conEntrada: new Set(['luis']) })).toEqual([]);
  });

  it('quien no tiene turno hoy, o no tiene día calculado', () => {
    expect(ids(bog(9), [persona('Luis', { programado: false }), persona('Ana', null), persona('Eva', { horaEntrada: null })])).toEqual([]);
  });

  it('nadie en un festivo', () => {
    expect(ids(bog(9), [persona('Luis')], { festivo: true })).toEqual([]);
  });

  it('quien tiene una novedad que cubre el día o la hora de entrada, aprobada o no', () => {
    const vacaciones = { colaboradorId: 'luis', fechaInicio: bog(0, 0, 10), fechaFin: bog(0, 0, 16), horaInicio: null, horaFin: null };
    const cita = { colaboradorId: 'ana', fechaInicio: HOY, fechaFin: HOY, horaInicio: '07:30', horaFin: '10:00' };
    const tarde = { colaboradorId: 'eva', fechaInicio: HOY, fechaFin: HOY, horaInicio: '14:00', horaFin: '17:00' };
    expect(ids(bog(9), [persona('Luis'), persona('Ana'), persona('Eva')], { novedades: [vacaciones, cita, tarde] })).toEqual(['eva']);
  });

  it('a quien ya se le avisó hoy', () => {
    expect(ids(bog(9), [persona('Luis')], { yaAvisados: new Set(['luis']) })).toEqual([]);
  });

  it('a quien se registró después de su hora de entrada: no existía cuando tenía que llegar', () => {
    expect(ids(bog(10), [persona('Luis', {}, { creadoEn: bog(9, 30) })])).toEqual([]);
    expect(ids(bog(10), [persona('Ana', {}, { creadoEn: bog(7, 0) })])).toEqual(['ana']);
  });

  // La misma regla que el Inicio (15 de octubre de 2026, verificación adversarial): quien reingresó hoy a las 9:30
  // estaba retirado a las 8, su hora de entrada. El grupo no puede recibir un «no ha marcado entrada» suyo.
  it('a quien reingresó hoy después de su hora de entrada: estaba retirado cuando tenía que llegar', () => {
    expect(ids(bog(10), [persona('Luis', {}, { huecos: [[bog(0, 0, 1), bog(9, 30)]] })])).toEqual([]);
    expect(ids(bog(10), [persona('Ana', {}, { huecos: [[bog(0, 0, 1), bog(7, 0)]] })])).toEqual(['ana']);
  });
});

describe('quienesNoHanLlegado: el orden', () => {
  it('por hora de entrada y después por nombre', () => {
    const r = quienesNoHanLlegado(bog(10), [
      persona('Zoe', { horaEntrada: '07:00' }), persona('Ana', { horaEntrada: '08:00' }), persona('Bea', { horaEntrada: '07:00' }),
    ], contexto());
    expect(r.map(p => `${p.nombre} ${p.horaEntrada}`)).toEqual(['Bea 07:00', 'Zoe 07:00', 'Ana 08:00']);
  });
});

describe('los mensajes', () => {
  const luis = { colaboradorId: 'l', nombre: 'Luis', apellido: 'Ramírez', horaEntrada: '08:00' };
  const ana = { colaboradorId: 'a', nombre: 'Ana', apellido: 'Pérez', horaEntrada: '13:30' };

  it('una persona', () => {
    expect(mensajeNoHanLlegado([luis])).toBe('❗ <b>Luis Ramírez</b> no ha marcado entrada\n🕐 Entraba a las 8:00 a.m.');
  });

  it('varias, en un solo mensaje con la lista', () => {
    expect(mensajeNoHanLlegado([luis, ana])).toBe(
      '❗ <b>2 personas</b> no han marcado entrada:\n• Luis Ramírez — entraba a las 8:00 a.m.\n• Ana Pérez — entraba a las 1:30 p.m.',
    );
  });

  it('un nombre con HTML no rompe el mensaje de Telegram', () => {
    expect(mensajeNoHanLlegado([{ ...luis, nombre: '<b>Luis', apellido: 'R&R' }])).toContain('&lt;b&gt;Luis R&amp;R');
  });

  it('ya llegó', () => {
    expect(mensajeYaLlego('Luis Ramírez', bog(8, 40), '08:00'))
      .toBe('✅ <b>Luis Ramírez</b> ya llegó\n🕐 Marcó a las 8:40 a.m. · entraba a las 8:00 a.m.');
  });

  it('en la campana, el aviso se cierra con la hora a la que llegó', () => {
    expect(cuerpoYaLlego(bog(8, 40), '08:00')).toBe('Llegó a las 8:40 a.m. · entraba a las 8:00 a.m.');
    // Sin día calculado no se inventa una hora de entrada.
    expect(cuerpoYaLlego(bog(8, 40), null)).toBe('Llegó a las 8:40 a.m.');
  });
});
