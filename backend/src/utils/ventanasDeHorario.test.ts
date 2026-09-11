import { describe, it, expect } from 'vitest';
import { horaValida, franjasConVentanaImposible, franjaParaGuardar } from './ventanasDeHorario';

// Lo que el administrador escribe en el horario antes de guardarlo. Una ventana
// que no se puede cumplir se congela en los días y sale en la nómina como un
// número plausible, así que se rechaza al guardar con un mensaje que dice cuál.

const franja = (extra: Record<string, unknown> = {}) => ({
  dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true, ...extra,
});

describe('horaValida', () => {
  it('acepta HH:MM dentro del día', () => {
    expect(horaValida('08:05')).toBe('08:05');
  });

  it('rechaza lo que pasa la forma pero no es una hora, o no es texto', () => {
    expect(horaValida('99:99')).toBeNull();
    expect(horaValida('8:05')).toBeNull();
    expect(horaValida(805)).toBeNull();
  });
});

describe('franjasConVentanaImposible — almuerzo', () => {
  it('una franja sin ventanas es legítima', () => {
    expect(franjasConVentanaImposible([franja()])).toEqual([]);
  });

  it('un almuerzo dentro de la franja es legítimo', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00' })])).toEqual([]);
  });

  it('un almuerzo invertido por un dedazo no se guarda', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '13:00', almuerzoFin: '12:00' })]))
      .toEqual(['08:00-17:00 (almuerzo 13:00-12:00)']);
  });

  it('media ventana de almuerzo tampoco', () => {
    expect(franjasConVentanaImposible([franja({ almuerzoInicio: '12:00' })]))
      .toEqual(['08:00-17:00 (almuerzo 12:00-—)']);
  });
});

describe('franjasConVentanaImposible — descanso no remunerado', () => {
  it('un descanso dentro de la franja, aparte del almuerzo, es legítimo', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansoInicio: '09:00', descansoFin: '09:15' }),
    ])).toEqual([]);
  });

  it('un descanso fuera de la franja no se guarda', () => {
    expect(franjasConVentanaImposible([franja({ descansoInicio: '18:00', descansoFin: '18:15' })]))
      .toEqual(['08:00-17:00 (descanso 18:00-18:15)']);
  });

  it('media ventana de descanso tampoco', () => {
    expect(franjasConVentanaImposible([franja({ descansoFin: '09:15' })]))
      .toEqual(['08:00-17:00 (descanso —-09:15)']);
  });

  it('un descanso que se cruza con el almuerzo no se guarda: la misma hora no se descuenta dos veces', () => {
    expect(franjasConVentanaImposible([
      franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansoInicio: '12:30', descansoFin: '12:45' }),
    ])).toEqual(['08:00-17:00 (descanso 12:30-12:45 se cruza con el almuerzo)']);
  });

  it('turno nocturno: un descanso de madrugada dentro de la franja es legítimo', () => {
    expect(franjasConVentanaImposible([
      franja({ horaEntrada: '22:00', horaSalida: '06:00', descansoInicio: '02:00', descansoFin: '02:15' }),
    ])).toEqual([]);
  });
});

describe('franjaParaGuardar', () => {
  it('guarda las dos ventanas completas', () => {
    const f = franjaParaGuardar(franja({ almuerzoInicio: '12:00', almuerzoFin: '13:00', descansoInicio: '09:00', descansoFin: '09:15' }));
    expect([f.almuerzoInicio, f.almuerzoFin, f.descansoInicio, f.descansoFin]).toEqual(['12:00', '13:00', '09:00', '09:15']);
  });

  it('sin ventanas las deja vacías, y por defecto la franja descuenta almuerzo', () => {
    const f = franjaParaGuardar({ dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00' });
    expect([f.almuerzoInicio, f.almuerzoFin, f.descansoInicio, f.descansoFin, f.tieneAlmuerzo]).toEqual([null, null, null, null, true]);
  });
});
