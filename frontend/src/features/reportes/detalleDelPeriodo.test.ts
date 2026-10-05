import { describe, it, expect } from 'vitest';
import { diasDelPeriodo, pendientesDelPeriodo, type RegistroDelPeriodo, type NovedadDelPeriodo } from './detalleDelPeriodo';

// Lo que muestra el modal de «Detalles» del reporte de nómina (15 de septiembre de 2026): las
// asistencias y las novedades de una persona en el período.
//
// Una fila por DÍA con marcación, de la más reciente a la más antigua, diciendo a qué hora entró, a
// qué hora salió, si quedó sin salida y si ese día tenía una novedad aprobada.
//
// Las fechas se comparan por día de calendario en Bogotá, no por instante: un registro guardado a
// medianoche de Bogotá son las 05:00 UTC, y compararlo crudo corre los días.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 0, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min)).toISOString();

const registro = (fecha: string, entrada: string | null, salida: string | null): RegistroDelPeriodo =>
  ({ id: 'r-' + fecha + (entrada ?? ''), fecha, entrada, salida });

const novedad = (tipo: string, ini: string, fin: string, extra: Partial<NovedadDelPeriodo> = {}): NovedadDelPeriodo =>
  ({ id: 'n-' + tipo + ini, tipo, fechaInicio: ini, fechaFin: fin, aprobado: true, remunerado: true, descripcion: null, ...extra });

const DESDE = '2026-09-01';
const HASTA = '2026-09-15';

describe('diasDelPeriodo', () => {
  it('sin marcaciones no arma días', () => {
    expect(diasDelPeriodo([], [], DESDE, HASTA)).toEqual([]);
  });

  it('arma un día por marcación, del más reciente al más antiguo', () => {
    const dias = diasDelPeriodo([
      registro(bog(2026, 9, 3), bog(2026, 9, 3, 8, 0), bog(2026, 9, 3, 17, 0)),
      registro(bog(2026, 9, 10), bog(2026, 9, 10, 8, 5), bog(2026, 9, 10, 17, 0)),
    ], [], DESDE, HASTA);
    expect(dias.map(d => d.dia)).toEqual(['2026-09-10', '2026-09-03']);
    expect(dias[0]).toMatchObject({ entrada: '08:05', salida: '17:00', sinSalida: false });
  });

  it('una marcación sin salida lo dice, y no inventa una hora', () => {
    const dias = diasDelPeriodo([registro(bog(2026, 9, 7), bog(2026, 9, 7, 10, 47), null)], [], DESDE, HASTA);
    expect(dias[0]).toMatchObject({ entrada: '10:47', salida: null, sinSalida: true });
  });

  it('marca el día que tiene una novedad aprobada, con su tipo', () => {
    const dias = diasDelPeriodo(
      [registro(bog(2026, 9, 14), bog(2026, 9, 14, 10, 47), null)],
      [novedad('MEDICO', bog(2026, 9, 14), bog(2026, 9, 14))],
      DESDE, HASTA,
    );
    expect(dias[0].novedades.map(n => n.tipo)).toEqual(['MEDICO']);
  });

  it('una novedad de varios días marca todos los días que cubre', () => {
    const dias = diasDelPeriodo([
      registro(bog(2026, 9, 7), bog(2026, 9, 7, 8, 0), bog(2026, 9, 7, 17, 0)),
      registro(bog(2026, 9, 8), bog(2026, 9, 8, 8, 0), bog(2026, 9, 8, 17, 0)),
      registro(bog(2026, 9, 9), bog(2026, 9, 9, 8, 0), bog(2026, 9, 9, 17, 0)),
    ], [novedad('VACACIONES', bog(2026, 9, 7), bog(2026, 9, 8))], DESDE, HASTA);
    const conNovedad = dias.filter(d => d.novedades.length > 0).map(d => d.dia);
    expect(conNovedad).toEqual(['2026-09-08', '2026-09-07']);
  });

  it('las novedades sin aprobar no marcan el día', () => {
    const dias = diasDelPeriodo(
      [registro(bog(2026, 9, 7), bog(2026, 9, 7, 8, 0), bog(2026, 9, 7, 17, 0))],
      [novedad('PERSONAL', bog(2026, 9, 7), bog(2026, 9, 7), { aprobado: false })],
      DESDE, HASTA,
    );
    expect(dias[0].novedades).toEqual([]);
  });

  it('deja por fuera lo que no cae en el período, aunque llegue en la lista', () => {
    const dias = diasDelPeriodo([
      registro(bog(2026, 8, 30), bog(2026, 8, 30, 8, 0), bog(2026, 8, 30, 17, 0)),
      registro(bog(2026, 9, 2), bog(2026, 9, 2, 8, 0), bog(2026, 9, 2, 17, 0)),
      registro(bog(2026, 9, 20), bog(2026, 9, 20, 8, 0), bog(2026, 9, 20, 17, 0)),
    ], [], DESDE, HASTA);
    expect(dias.map(d => d.dia)).toEqual(['2026-09-02']);
  });

  // Lo que llega de `GET /registros` es una fila por JORNADA, no por marcación: la propia ruta junta
  // los tramos de un día partido por el almuerzo o por un descanso («La tabla lista JORNADAS, no
  // marcaciones», backend/src/routes/registros.ts). Medido contra la base local el 15 de septiembre
  // de 2026: un día con tres marcaciones llegaba como una sola fila, con la primera entrada y la
  // salida que cierra. Así que esto cuenta JORNADAS, y llamarlo marcaciones es decir un número que
  // no es el que la persona marcó.
  it('dos jornadas del mismo día van juntas, en una sola fila, y se dice cuántas fueron', () => {
    const dias = diasDelPeriodo([
      registro(bog(2026, 9, 4), bog(2026, 9, 4, 8, 0), bog(2026, 9, 4, 12, 0)),
      registro(bog(2026, 9, 4), bog(2026, 9, 4, 13, 0), bog(2026, 9, 4, 17, 30)),
    ], [], DESDE, HASTA);
    expect(dias).toHaveLength(1);
    // La primera entrada y la última salida del día.
    expect(dias[0]).toMatchObject({ dia: '2026-09-04', entrada: '08:00', salida: '17:30', jornadas: 2 });
  });
});

// LAS NOVEDADES PENDIENTES DE APROBAR DEL PERÍODO (5 de octubre de 2026, petición 23).
//
// El modal del reporte pide TODAS las novedades de la persona, porque la ruta no
// acepta rango, y hasta ahora solo usaba las APROBADAS para pintar el día. Una
// pendiente no se veía en ninguna parte del reporte, así que no había desde dónde
// aprobarla: eso es lo que esto hace visible.
//
// Se trata de dinero: una novedad aprobada deja de exigir esos días y el total
// del período cambia. Por eso la lista es de lo pendiente, para decidir, y no una
// lista más de lo que ya está resuelto.
describe('pendientesDelPeriodo', () => {
  it('sin novedades no hay nada que aprobar', () => {
    expect(pendientesDelPeriodo([], DESDE, HASTA)).toEqual([]);
  });

  it('las aprobadas no entran: ya se decidieron', () => {
    const n = novedad('VACACIONES', bog(2026, 9, 2), bog(2026, 9, 5));
    expect(pendientesDelPeriodo([n], DESDE, HASTA)).toEqual([]);
  });

  it('una pendiente dentro del período entra', () => {
    const n = novedad('CITA_MEDICA', bog(2026, 9, 3), bog(2026, 9, 3), { aprobado: false });
    expect(pendientesDelPeriodo([n], DESDE, HASTA)).toEqual([n]);
  });

  // LO QUE MÁS IMPORTA: se mira el CRUCE con el período, no que quepa dentro.
  // Una incapacidad del 28 de agosto al 3 de septiembre toca el período y hay que
  // decidirla, aunque empiece antes.
  it('una pendiente que empieza antes del período pero lo toca, entra', () => {
    const n = novedad('INCAPACIDAD_EPS', bog(2026, 8, 28), bog(2026, 9, 3), { aprobado: false });
    expect(pendientesDelPeriodo([n], DESDE, HASTA)).toEqual([n]);
  });

  it('una pendiente que termina después del período pero lo toca, entra', () => {
    const n = novedad('VACACIONES', bog(2026, 9, 14), bog(2026, 9, 25), { aprobado: false });
    expect(pendientesDelPeriodo([n], DESDE, HASTA)).toEqual([n]);
  });

  it('una pendiente que envuelve el período entero entra', () => {
    const n = novedad('LICENCIA_MATERNIDAD', bog(2026, 7, 1), bog(2026, 12, 1), { aprobado: false });
    expect(pendientesDelPeriodo([n], DESDE, HASTA)).toEqual([n]);
  });

  it('una pendiente que no toca el período no entra', () => {
    const antes = novedad('PERMISO', bog(2026, 8, 1), bog(2026, 8, 20), { aprobado: false });
    const despues = novedad('PERMISO', bog(2026, 9, 16), bog(2026, 9, 20), { aprobado: false });
    expect(pendientesDelPeriodo([antes, despues], DESDE, HASTA)).toEqual([]);
  });

  // El día es el de Bogotá. Una novedad de un solo día guardada a medianoche de
  // Bogotá son las 05:00 UTC: comparada cruda contra «2026-09-01» se cae del
  // período por cinco horas, y la pendiente del primer día no se vería.
  it('el primer y el último día del período cuentan, en hora de Bogotá', () => {
    const primero = novedad('PERMISO', bog(2026, 9, 1), bog(2026, 9, 1), { aprobado: false });
    const ultimo = novedad('PERMISO', bog(2026, 9, 15), bog(2026, 9, 15), { aprobado: false });
    expect(pendientesDelPeriodo([primero, ultimo], DESDE, HASTA)).toHaveLength(2);
  });

  it('van de la más antigua a la más reciente, para que la lista no baile', () => {
    const tarde = novedad('PERMISO', bog(2026, 9, 10), bog(2026, 9, 10), { aprobado: false });
    const temprano = novedad('PERMISO', bog(2026, 9, 2), bog(2026, 9, 2), { aprobado: false });
    expect(pendientesDelPeriodo([tarde, temprano], DESDE, HASTA).map(n => n.fechaInicio))
      .toEqual([temprano.fechaInicio, tarde.fechaInicio]);
  });
});
