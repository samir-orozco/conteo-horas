import { describe, it, expect } from 'vitest';
import { tocaElMensajeDeTurnos, mensajeTurnosCerrados } from './turnosCerradosSolos';

// «TURNOS CERRADOS SOLOS» POR TELEGRAM (13 de octubre de 2026). Decisiones del dueño: un mensaje cada
// mañana a las 7, solo si hubo alguno, y sin aviso extra en la campana (cada turno ya deja el suyo).
//
// Un turno sin salida se cierra solo 18 horas después de la entrada (cierreTurnos.ts): quien entró a
// las 8:00 queda cerrado hacia las 2:00. Por eso el mensaje es de la mañana y no del momento del
// cierre, que llegaría al grupo de madrugada.
//
// Instantes en UTC explícito (CLAUDE.md §8.1).
const bog = (d: number, h: number, min = 0) => new Date(Date.UTC(2026, 9, d, h + 5, min));

describe('tocaElMensajeDeTurnos', () => {
  it('a las 7 de la mañana toca, con los cierres de las 7 de ayer a las 7 de hoy', () => {
    expect(tocaElMensajeDeTurnos(bog(14, 7), null)).toEqual({ hoy: '2026-10-14', desde: bog(13, 7), hasta: bog(14, 7) });
  });

  it('antes de las 7 no toca', () => {
    expect(tocaElMensajeDeTurnos(bog(14, 6, 59), null)).toBeNull();
  });

  it('si ya se mandó hoy no toca: el trabajo corre también al arrancar la app', () => {
    expect(tocaElMensajeDeTurnos(bog(14, 9), '2026-10-14')).toBeNull();
    expect(tocaElMensajeDeTurnos(bog(14, 9), '2026-10-13')?.hoy).toBe('2026-10-14');
  });

  it('si sale más tarde (la app dormida a las 7), la ventana sigue siendo de 7 a 7: cada cierre en un solo mensaje', () => {
    expect(tocaElMensajeDeTurnos(bog(14, 15), null)).toEqual({ hoy: '2026-10-14', desde: bog(13, 7), hasta: bog(14, 7) });
  });

  it('el día es el de Bogotá: a las 9 p. m. del 13 en Bogotá ya es 14 en UTC, y el del 13 ya se mandó', () => {
    expect(tocaElMensajeDeTurnos(bog(13, 21), '2026-10-13')).toBeNull();
  });
});

describe('mensajeTurnosCerrados', () => {
  const enlace = 'https://horapro.co/app/registros';
  const jorge = { nombre: 'Jorge Toro', entrada: bog(12, 8), salidaEstimada: bog(12, 17) };
  const ana = { nombre: 'Ana Pérez', entrada: bog(12, 13), salidaEstimada: null };

  it('uno solo, en singular, con la hora estimada', () => {
    expect(mensajeTurnosCerrados([jorge], enlace)).toBe(
      '🌙 Anoche se cerró solo 1 turno porque no marcaron la salida:\n'
      + '• Jorge Toro — lun 12, se estimó la salida a las 5:00 p.m.\n'
      + '<a href="https://horapro.co/app/registros">Revisar en HoraPro</a>',
    );
  });

  it('varios, en orden de entrada; el que quedó sin hora lo dice', () => {
    expect(mensajeTurnosCerrados([ana, jorge], enlace)).toBe(
      '🌙 Anoche se cerraron solos 2 turnos porque no marcaron la salida:\n'
      + '• Jorge Toro — lun 12, se estimó la salida a las 5:00 p.m.\n'
      + '• Ana Pérez — lun 12, sin hora de salida: hay que ponerla\n'
      + '<a href="https://horapro.co/app/registros">Revisar en HoraPro</a>',
    );
  });

  it('varios turnos de la misma persona el mismo día van en una línea, y el total sigue contando turnos', () => {
    const tres = [bog(12, 8), bog(12, 9), bog(12, 12)].map(entrada => ({ nombre: 'Sofía Ramos', entrada, salidaEstimada: null }));
    expect(mensajeTurnosCerrados([...tres, jorge], enlace)).toBe(
      '🌙 Anoche se cerraron solos 4 turnos porque no marcaron la salida:\n'
      + '• Jorge Toro — lun 12, se estimó la salida a las 5:00 p.m.\n'
      + '• Sofía Ramos — lun 12, 3 turnos sin hora de salida: hay que ponerla\n'
      + '<a href="https://horapro.co/app/registros">Revisar en HoraPro</a>',
    );
  });

  it('la una en singular', () => {
    expect(mensajeTurnosCerrados([{ ...jorge, salidaEstimada: bog(12, 13) }], enlace)).toContain('se estimó la salida a la 1:00 p.m.');
  });

  it('un nombre con HTML no rompe el mensaje', () => {
    expect(mensajeTurnosCerrados([{ ...jorge, nombre: '<b>Jorge & co' }], enlace)).toContain('&lt;b&gt;Jorge &amp; co');
  });
});
