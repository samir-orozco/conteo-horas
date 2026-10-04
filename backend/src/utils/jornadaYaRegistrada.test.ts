import { describe, it, expect } from 'vitest';
import { jornadaYaRegistrada, HORAS_PARA_PREGUNTAR_NOCTURNO } from './jornadaYaRegistrada';

// «LUIS, YA REGISTRASTE TU JORNADA» TAMBIÉN EN EL TURNO NOCTURNO (4 de octubre de 2026, decisión del
// dueño). El kiosco pregunta antes de abrir una entrada nueva a quien ya cerró su turno, para que
// nadie abra un turno de más creyendo que no le quedó la salida. Miraba solo los turnos guardados en
// el día de hoy, y el de Luis (7:00 p. m. a 6:00 a. m.) está guardado en el día en que entró.
//
// Pero no todo el día: si contara la jornada que se cerró «hoy» a las 6:00 a. m., a Luis le
// preguntaría cada noche al llegar a su turno siguiente. El dueño eligió cuatro horas.

// Un instante en hora de Bogotá del día `d` de octubre de 2026 (UTC−5 todo el año).
const a = (d: number, hh: number, mm = 0) => new Date(Date.UTC(2026, 9, d, hh + 5, mm));
const dia = (d: number) => a(d, 0);

// Luis: entró ayer a las 7:00 p. m. (guardado en ayer) y cerró hoy a las 6:00 a. m.
const nocheDeLuis = { fecha: dia(3), entrada: a(3, 19), salida: a(4, 6) };
const base = { cerradoDeHoy: null, ultimoCerrado: null, pausaEnCurso: false };

describe('qué jornada cuenta como ya registrada', () => {
  it('son cuatro horas', () => {
    expect(HORAS_PARA_PREGUNTAR_NOCTURNO).toBe(4);
  });

  // Lo de siempre, sin cambios: un turno de día cerrado hoy cuenta todo el día.
  it('un turno de hoy ya cerrado cuenta, a cualquier hora', () => {
    const deMaria = { fecha: dia(4), entrada: a(4, 8), salida: a(4, 17) };
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 22), cerradoDeHoy: deMaria })).toBe(deMaria);
  });

  it('Luis vuelve a las 6:05 a comprobar: cuenta su jornada nocturna', () => {
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 6, 5), ultimoCerrado: nocheDeLuis })).toBe(nocheDeLuis);
  });

  it('Luis llega a las 7:00 p. m. a su turno siguiente: ya no cuenta', () => {
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 19), ultimoCerrado: nocheDeLuis })).toBeNull();
  });

  it('cuenta hasta un minuto antes de las cuatro horas, y a las cuatro ya no', () => {
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 9, 59), ultimoCerrado: nocheDeLuis })).toBe(nocheDeLuis);
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 10), ultimoCerrado: nocheDeLuis })).toBeNull();
  });

  // María salió ayer a las 5:00 p. m.: hoy a las 7:00 a. m. entra normal.
  it('una jornada de ayer que se cerró hace más de cuatro horas no cuenta', () => {
    const ayerDeMaria = { fecha: dia(3), entrada: a(3, 8), salida: a(3, 17) };
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 7), ultimoCerrado: ayerDeMaria })).toBeNull();
  });

  // Lo que cuenta es cuánto hace que cerró, no el día del calendario: quien cerró a las 11:00 p. m. y
  // a la 1:00 a. m. intenta abrir otra entrada es el mismo caso de Luis a las 6:05.
  it('una jornada que se cerró anoche, hace dos horas, cuenta', () => {
    const tarde = { fecha: dia(3), entrada: a(3, 15), salida: a(3, 23) };
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 1), ultimoCerrado: tarde })).toBe(tarde);
  });

  // El aviso dice a qué hora entró: sin esa hora no tiene qué mostrar.
  it('un turno sin hora de entrada no cuenta', () => {
    const sinEntrada = { fecha: dia(3), entrada: null, salida: a(4, 6) };
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 6, 5), ultimoCerrado: sinEntrada })).toBeNull();
  });

  // Luis salió a almorzar a las 5:30 a. m. y no ha vuelto: su jornada no está cerrada, está en pausa.
  it('una pausa que espera regreso no es una jornada cerrada', () => {
    const almuerzo = { fecha: dia(3), entrada: a(3, 19), salida: a(4, 5, 30) };
    expect(jornadaYaRegistrada({ ...base, ahora: a(4, 6), ultimoCerrado: almuerzo, pausaEnCurso: true })).toBeNull();
  });
});
