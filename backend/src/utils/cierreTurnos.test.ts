import { describe, it, expect } from 'vitest';
import { decidirCierre } from './cierreTurnos';

// Un instante dado en hora de Bogotá. Se escribe en UTC a propósito: así la
// prueba dice lo mismo en la máquina de cualquiera, sin depender de su reloj.
// Bogotá es UTC-5 todo el año (no tiene horario de verano).
const bog = (anio: number, mes: number, dia: number, hora: number, min = 0) =>
  new Date(Date.UTC(anio, mes - 1, dia, hora + 5, min, 0));

type Franja = { dias: string[]; horaEntrada: string; horaSalida: string };
const horario = (franjas: Franja[], activo = true) => ({ activo, franjas });

// El horario de la empresa que reportó el fallo.
const OFICINA = horario([
  { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES'], horaEntrada: '07:00', horaSalida: '16:00' },
  { dias: ['VIERNES'], horaEntrada: '07:00', horaSalida: '15:00' },
  { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00' },
]);

const NOCTURNO = horario([
  { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '21:00', horaSalida: '05:00' },
]);

describe('decidirCierre', () => {
  describe('el turno todavía puede estar en curso', () => {
    it('no cierra un turno que empezó HOY, por viejo que parezca el reloj', () => {
      // Entró a las 07:00 y ya son las 23:00 del mismo día: son 16 horas, pero
      // el día no ha terminado. Cerrarlo sería inventarle una salida a alguien
      // que quizá sigue adentro.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 7, 0), horario: OFICINA },
        bog(2026, 8, 31, 23, 0),
      );
      expect(d.cerrar).toBe(false);
    });

    it('espera las 18 horas completas de la ventana, ni un minuto menos', () => {
      // Nocturno del lunes: entró a las 21:00, así que el kiosco le acepta la
      // salida hasta las 15:00 del martes. Un minuto antes no se toca.
      const turno = { entrada: bog(2026, 8, 31, 21, 0), horario: NOCTURNO };
      expect(decidirCierre(turno, bog(2026, 9, 1, 14, 59)).cerrar).toBe(false);
      expect(decidirCierre(turno, bog(2026, 9, 1, 15, 0)).cerrar).toBe(true);
    });
  });

  describe('el caso que reportó producción', () => {
    it('cierra el turno del lunes 31 de agosto con la hora de SU franja', () => {
      // Entrada 06:52 del lunes; la franja LUNES sale a las 16:00.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 6, 52), horario: OFICINA },
        bog(2026, 9, 1, 11, 40),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 8, 31, 16, 0));
      expect(d.horaFranja).toBe('16:00');
    });

    it('se cierra de madrugada, no al final del día siguiente', () => {
      // Es la corrección del fallo: entró a las 06:52, así que su ventana de 18
      // horas vence a las 00:52 del martes y ahí ya le toca al barrido. Lo que
      // NO puede pasar es lo de producción, que se cerrara a las 22:12.
      const turno = { entrada: bog(2026, 8, 31, 6, 52), horario: OFICINA };
      expect(decidirCierre(turno, bog(2026, 9, 1, 0, 30)).cerrar).toBe(false);
      const d = decidirCierre(turno, bog(2026, 9, 1, 1, 0));
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 8, 31, 16, 0));
    });

    it('usa la franja del día en que ENTRÓ, no la de hoy', () => {
      // Entró un viernes (salida 15:00) y se revisa un lunes. Si tomara el día
      // de hoy le pondría las 16:00 y le regalaría una hora.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 28, 7, 0), horario: OFICINA },
        bog(2026, 8, 31, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 8, 28, 15, 0));
      expect(d.horaFranja).toBe('15:00');
    });
  });

  describe('turnos que cruzan la medianoche', () => {
    it('pone la salida en el día siguiente', () => {
      const d = decidirCierre(
        { entrada: bog(2026, 8, 26, 21, 0), horario: NOCTURNO },
        bog(2026, 8, 28, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 8, 27, 5, 0));
    });

    it('cruza también el cambio de mes', () => {
      // Entró el 31 de agosto a las 21:00; su salida es el 1 de septiembre.
      // Es la pregunta que quedó abierta: el fin de mes no mueve nada.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 21, 0), horario: NOCTURNO },
        bog(2026, 9, 2, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 9, 1, 5, 0));
    });

    it('respeta la gracia contada desde la salida del día siguiente', () => {
      // Entró 21:00 del lunes, sale 05:00 del martes. A las 06:00 del martes
      // todavía está en gracia: apenas pasó una hora de su salida.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 21, 0), horario: NOCTURNO },
        bog(2026, 9, 1, 6, 0),
      );
      expect(d.cerrar).toBe(false);
    });
  });

  describe('la entrada no cae dentro de su franja', () => {
    // El ancla de la salida es el día de la ENTRADA, y hasta ahora nadie
    // comprobaba que la entrada tuviera algo que ver con su franja. Con eso, una
    // marca fuera de horario producía una salida absurda y la liquidación la
    // tomaba como buena: es un número plausible, no una pantalla rota.
    it('volvió de noche a hacer extras: no le pone una salida ANTERIOR a su entrada', () => {
      // Entró a las 18:00 y su franja sale a las 16:00. Anclando al día de la
      // entrada le escribiría una salida dos horas antes de que llegara.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 18, 0), horario: OFICINA },
        bog(2026, 9, 2, 8, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toBeNull();
    });

    it('turno nocturno al que le cambian la hora: no le inventa una jornada de 28 horas', () => {
      // Entró a la 01:00 del martes con franja 21:00→05:00. Como la franja cruza
      // medianoche, el ancla se va al miércoles: 28 horas seguidas, liquidadas
      // como ordinarias más extras más recargo nocturno.
      const d = decidirCierre(
        { entrada: bog(2026, 9, 1, 1, 0), horario: NOCTURNO },
        bog(2026, 9, 3, 8, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toBeNull();
    });

    it('la jornada larga pero real sí conserva su hora', () => {
      // 21:00 a 05:00 son ocho horas: eso no es absurdo y no se toca.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 21, 0), horario: NOCTURNO },
        bog(2026, 9, 2, 8, 0),
      );
      expect(d.salida).toEqual(bog(2026, 9, 1, 5, 0));
    });
  });

  describe('no le gana a quien todavía puede marcar su salida', () => {
    // El kiosco acepta la salida de un turno durante 18 horas desde la entrada.
    // Cerrarlo antes de que venza esa ventana le cambia sus horas REALES por las
    // teóricas de su franja, y encima le quita la posibilidad de arreglarlo.
    const NOCHE_DEL_LUNES = bog(2026, 8, 31, 21, 0);

    it('el nocturno del lunes sigue intacto a media mañana del martes', () => {
      // Diez horas desde la entrada. Con la vieja gracia de 2 horas ya estaría
      // cerrado a las 07:00, y con el barrido corriendo cada hora eso dejó de
      // ser teórico: le habría quitado sus horas reales antes de que llegara a
      // marcarlas.
      const d = decidirCierre({ entrada: NOCHE_DEL_LUNES, horario: NOCTURNO }, bog(2026, 9, 1, 7, 0));
      expect(d.cerrar).toBe(false);
    });

    it('y se cierra cuando ya nadie puede marcarlo', () => {
      // Pasadas las 18 horas el kiosco ya no lo reconoce como turno en curso,
      // así que ahí sí queda huérfano y le toca al barrido.
      const d = decidirCierre({ entrada: NOCHE_DEL_LUNES, horario: NOCTURNO }, bog(2026, 9, 1, 16, 0));
      expect(d.cerrar).toBe(true);
      expect(d.salida).toEqual(bog(2026, 9, 1, 5, 0));
    });
  });

  describe('sin franja aplicable', () => {
    it('cierra sin hora cuando el colaborador no tiene horario', () => {
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 7, 0), horario: null },
        bog(2026, 9, 1, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toBeNull();
      expect(d.horaFranja).toBeNull();
    });

    it('trata un horario inactivo como si no lo tuviera', () => {
      const d = decidirCierre(
        { entrada: bog(2026, 8, 31, 7, 0), horario: horario(OFICINA.franjas, false) },
        bog(2026, 9, 1, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toBeNull();
    });

    it('cierra sin hora si marcó un día que su horario no cubre', () => {
      // Domingo 30 de agosto: ninguna franja lo cubre.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 30, 8, 0), horario: OFICINA },
        bog(2026, 8, 31, 9, 0),
      );
      expect(d.cerrar).toBe(true);
      expect(d.salida).toBeNull();
    });

    it('espera 16 horas antes de darlo por olvidado', () => {
      // Entró a las 22:00 del domingo y son las 09:00 del lunes: 11 horas.
      // Sin horario que consultar, todavía puede ser una jornada larga real.
      const d = decidirCierre(
        { entrada: bog(2026, 8, 30, 22, 0), horario: null },
        bog(2026, 8, 31, 9, 0),
      );
      expect(d.cerrar).toBe(false);
    });
  });
});
