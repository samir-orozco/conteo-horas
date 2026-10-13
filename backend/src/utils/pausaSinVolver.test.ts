import { describe, it, expect } from 'vitest';
import {
  pausasPorAvisar, mensajePausasSinVolver, mensajeYaVolvio, cuerpoDePausaSinVolver, cuerpoYaVolvio,
  type FilaDelDia, type DiaDeLaPausa,
} from './pausaSinVolver';

// «NO HA VUELTO DE SU PAUSA» POR TELEGRAM (13 de octubre de 2026). Decisiones del dueño: avisa 15
// minutos después de la hora a la que debía volver, en un solo mensaje con la lista, con copia en la
// campana, y cuando la persona vuelve se avisa también. Igual que «no ha llegado».
//
// La mitad de las pruebas son de a quién NO: el grupo lee estos mensajes delante de la persona.
//
// Instantes en UTC explícito (CLAUDE.md §8.1).
const bog = (h: number, min = 0, d = 13) => new Date(Date.UTC(2026, 9, d, h + 5, min));
const HOY = bog(0);

const DIA: DiaDeLaPausa = {
  fecha: HOY, horaEntrada: '08:00', horaSalida: '17:00',
  almuerzoMin: 60, almuerzoInicio: '12:00', almuerzoFin: '13:00',
};

let n = 0;
const fila = (colaboradorId: string, o: Partial<FilaDelDia>): FilaDelDia => ({
  id: `r${++n}`, colaboradorId, fecha: HOY, entrada: bog(8), salida: null,
  salidaAlmuerzo: false, salidaDescanso: false, descansoVentana: null, ...o,
});
const almuerzo = (quien: string, salio: Date) => fila(quien, { salida: salio, salidaAlmuerzo: true });
// La ventana va como la guarda el kiosco (claveDeVentana): "15:00-15:15", no un JSON (§9.2).
const descanso = (quien: string, salio: Date, ventana = '15:00-15:15') =>
  fila(quien, { salida: salio, salidaDescanso: true, descansoVentana: ventana });

const PERSONAS = new Map([['ana', { nombre: 'Ana', apellido: 'Pérez' }], ['luis', { nombre: 'Luis', apellido: 'Ruiz' }]]);
const avisar = (ahora: Date, filas: FilaDelDia[], o: { dias?: Map<string, DiaDeLaPausa | null>; ya?: Set<string> } = {}) =>
  pausasPorAvisar(ahora, filas, (id, fecha) => (fecha.getTime() === HOY.getTime() ? (o.dias ?? new Map([['ana', DIA], ['luis', DIA]])).get(id) ?? null : null), PERSONAS, o.ya ?? new Set());

describe('pausasPorAvisar: cuándo', () => {
  it('almuerzo de 12 a 1: a la 1:15 sin volver, sí', () => {
    const r = avisar(bog(13, 15), [almuerzo('ana', bog(12))]);
    expect(r.map(p => [p.nombre, p.pausa, p.debiaVolver.toISOString()])).toEqual([['Ana Pérez', 'almuerzo', bog(13).toISOString()]]);
  });

  it('a la 1:14 todavía no: está en su pausa', () => {
    expect(avisar(bog(13, 14), [almuerzo('ana', bog(12))])).toEqual([]);
  });

  it('el descanso se mide contra SU ventana: de 3:00 a 3:15, el aviso es a las 3:30', () => {
    expect(avisar(bog(15, 29), [descanso('ana', bog(15))])).toEqual([]);
    expect(avisar(bog(15, 30), [descanso('ana', bog(15))]).map(p => p.pausa)).toEqual(['descanso']);
  });

  it('un almuerzo sin ventana fija se espera la salida más su duración', () => {
    const sinVentana = { ...DIA, almuerzoInicio: null, almuerzoFin: null };
    const filas = [almuerzo('ana', bog(12, 30))];
    const dias = new Map([['ana', sinVentana]]);
    expect(avisar(bog(13, 44), filas, { dias })).toEqual([]);
    expect(avisar(bog(13, 45), filas, { dias }).map(p => p.debiaVolver.toISOString())).toEqual([bog(13, 30).toISOString()]);
  });
});

describe('pausasPorAvisar: a quién no', () => {
  it('quien ya volvió: una entrada posterior a la salida, ese mismo día', () => {
    const filas = [almuerzo('ana', bog(12)), fila('ana', { entrada: bog(13, 5) })];
    expect(avisar(bog(14), filas)).toEqual([]);
  });

  it('una salida que no es a pausa no espera regreso', () => {
    expect(avisar(bog(14), [fila('ana', { salida: bog(12) })])).toEqual([]);
  });

  it('a quien ya se le avisó por esa pausa', () => {
    const s = almuerzo('ana', bog(12));
    expect(avisar(bog(14), [s], { ya: new Set([s.id]) })).toEqual([]);
  });

  it('pasado el fin del turno ya no se avisa: lo cubre el aviso del día siguiente', () => {
    // Turno hasta las 5 p. m. y una hora de gracia: a las 6:01 la pausa ya no se espera.
    expect(avisar(bog(18, 1), [almuerzo('ana', bog(12))])).toEqual([]);
    expect(avisar(bog(17, 59), [almuerzo('ana', bog(12))]).length).toBe(1);
  });

  it('sin día calculado ni ventana no se sabe a qué hora volvía: no se inventa', () => {
    expect(avisar(bog(14), [almuerzo('ana', bog(12))], { dias: new Map([['ana', null]]) })).toEqual([]);
    expect(avisar(bog(16), [descanso('ana', bog(15), '')])).toEqual([]);
  });
});

describe('pausasPorAvisar: el turno nocturno', () => {
  it('la pausa de después de la medianoche se mide con el día de AYER, que es el de su fila', () => {
    const AYER = bog(0, 0, 12);
    const noche: DiaDeLaPausa = { fecha: AYER, horaEntrada: '21:00', horaSalida: '05:00', almuerzoMin: 30, almuerzoInicio: null, almuerzoFin: null };
    const s = fila('ana', { fecha: AYER, entrada: bog(21, 0, 12), salida: bog(1, 0, 13), salidaAlmuerzo: true });
    const diaDe = (id: string, fecha: Date) => (fecha.getTime() === AYER.getTime() ? noche : null);
    // Salió a la 1:00 a. m. con 30 minutos de almuerzo: debía volver a la 1:30, aviso a la 1:45.
    expect(pausasPorAvisar(bog(1, 44), [s], diaDe, PERSONAS, new Set())).toEqual([]);
    expect(pausasPorAvisar(bog(1, 45), [s], diaDe, PERSONAS, new Set()).map(p => p.debiaVolver.toISOString())).toEqual([bog(1, 30).toISOString()]);
  });
});

describe('pausasPorAvisar: el orden', () => {
  it('por la hora a la que debía volver y después por nombre', () => {
    const r = avisar(bog(16), [descanso('luis', bog(15)), almuerzo('ana', bog(12))]);
    expect(r.map(p => p.nombre)).toEqual(['Ana Pérez', 'Luis Ruiz']);
  });
});

describe('los mensajes', () => {
  const ana = { registroId: 'r1', colaboradorId: 'ana', nombre: 'Ana Pérez', pausa: 'almuerzo' as const, salio: bog(12), debiaVolver: bog(13) };
  const luis = { registroId: 'r2', colaboradorId: 'luis', nombre: 'Luis Ruiz', pausa: 'descanso' as const, salio: bog(15), debiaVolver: bog(15, 15) };

  it('una persona', () => {
    expect(mensajePausasSinVolver([ana]))
      .toBe('☕ <b>Ana Pérez</b> no ha vuelto del almuerzo\n🕐 Salió a las 12:00 p.m. · debía volver a la 1:00 p.m.');
  });

  it('varias, en un solo mensaje con la lista, con el artículo bien puesto', () => {
    expect(mensajePausasSinVolver([ana, luis])).toBe(
      '☕ <b>2 personas</b> no han vuelto de su pausa:\n• Ana Pérez — almuerzo, debía volver a la 1:00 p.m.\n• Luis Ruiz — descanso, debía volver a las 3:15 p.m.',
    );
  });

  it('un nombre con HTML no rompe el mensaje', () => {
    expect(mensajePausasSinVolver([{ ...ana, nombre: '<b>Ana & co' }])).toContain('&lt;b&gt;Ana &amp; co');
  });

  it('ya volvió', () => {
    expect(mensajeYaVolvio('Ana Pérez', 'almuerzo', bog(13, 40)))
      .toBe('✅ <b>Ana Pérez</b> volvió del almuerzo\n🕐 Marcó a la 1:40 p.m.');
  });

  it('la campana: al avisar y al volver', () => {
    expect(cuerpoDePausaSinVolver(ana)).toBe('Salió a las 12:00 p.m. · debía volver a la 1:00 p.m.');
    expect(cuerpoYaVolvio(bog(13, 40), 'Salió a las 12:00 p.m. · debía volver a la 1:00 p.m.'))
      .toBe('Volvió a la 1:40 p.m. · salió a las 12:00 p.m. · debía volver a la 1:00 p.m.');
  });
});
