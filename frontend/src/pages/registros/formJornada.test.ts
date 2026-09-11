import { describe, it, expect } from 'vitest';
import { horasDeLaJornada, cuerpoDeLaJornada } from './formJornada';

// El formulario de una jornada tiene dos pausas, almuerzo y descanso no
// remunerado, y cada una con su salida y su regreso. Si al abrirlo una pausa se
// lee como la otra, al guardar se descuenta como no pagada una hora que sí se
// paga —o al revés—, y eso no se ve en la pantalla: sale en la nómina.

// Un instante dado en hora de Bogotá (UTC-5 todo el año).
const bog = (h: number, min = 0) => new Date(Date.UTC(2026, 8, 1, h + 5, min)).toISOString();
const marca = (entrada: string | null, salida: string | null, pausa?: 'ALMUERZO' | 'DESCANSO') => ({
  entrada, salida, salidaAlmuerzo: pausa === 'ALMUERZO', salidaDescanso: pausa === 'DESCANSO',
});

describe('horasDeLaJornada', () => {
  it('sin pausas: la entrada y la salida del día', () => {
    expect(horasDeLaJornada([marca(bog(8), bog(17))], bog(17))).toEqual({
      entrada: '08:00', salida: '17:00',
      almuerzoSalida: '', almuerzoRegreso: '', descansoSalida: '', descansoRegreso: '',
    });
  });

  it('con descanso y almuerzo: cada pausa toma su salida y el regreso de la marcación siguiente', () => {
    const marcas = [marca(bog(8), bog(9), 'DESCANSO'), marca(bog(9, 15), bog(12), 'ALMUERZO'), marca(bog(13), bog(17))];
    expect(horasDeLaJornada(marcas, bog(17))).toEqual({
      entrada: '08:00', salida: '17:00',
      almuerzoSalida: '12:00', almuerzoRegreso: '13:00', descansoSalida: '09:00', descansoRegreso: '09:15',
    });
  });

  it('todavía en su almuerzo: sin regreso y sin salida del día, porque no ha terminado', () => {
    expect(horasDeLaJornada([marca(bog(8), bog(12), 'ALMUERZO')], null)).toEqual({
      entrada: '08:00', salida: '',
      almuerzoSalida: '12:00', almuerzoRegreso: '', descansoSalida: '', descansoRegreso: '',
    });
  });
});

describe('cuerpoDeLaJornada', () => {
  const horas = {
    entrada: '08:00', salida: '17:00',
    almuerzoSalida: '12:00', almuerzoRegreso: '13:00', descansoSalida: '', descansoRegreso: '',
  };

  it('manda cada pausa con su nombre, y la que no se marcó no viaja', () => {
    expect(cuerpoDeLaJornada(horas)).toEqual({
      entrada: '08:00', salida: '17:00', almuerzo: { salida: '12:00', regreso: '13:00' },
    });
    expect(cuerpoDeLaJornada(horas).descanso).toBeUndefined();
  });

  it('nunca manda las claves de antes: el servidor las rechaza para no guardar el almuerzo como descanso', () => {
    const cuerpo = cuerpoDeLaJornada({ ...horas, descansoSalida: '09:00', descansoRegreso: '09:15' });
    expect(Object.keys(cuerpo)).not.toContain('descansoSalida');
    expect(Object.keys(cuerpo)).not.toContain('descansoRegreso');
    expect(cuerpo.descanso).toEqual({ salida: '09:00', regreso: '09:15' });
  });

  it('una pausa con solo el regreso viaja igual, para que el servidor diga qué hora falta', () => {
    expect(cuerpoDeLaJornada({ ...horas, almuerzoSalida: '' }).almuerzo).toEqual({ salida: '', regreso: '13:00' });
  });
});
