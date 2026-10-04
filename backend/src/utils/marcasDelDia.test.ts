import { describe, it, expect } from 'vitest';
import { marcasDelDia, desdeCuandoSeListan } from './marcasDelDia';

// LO QUE YA MARCÓ HOY, PARA QUE EL KIOSCO SE LO MUESTRE (3 de octubre de 2026, diseño del dueño).
//
// La pantalla de marcar lista las marcas que la persona ya tiene en el día. Es lo que delata que
// alguien marcó a su nombre: el 1 de octubre Lina habría visto «Entrada a las 8:49» sin haber
// entrado. Cada marca se nombra con la MISMA regla del panel (`momentosDelDia`), para que el
// kiosco y el panel no puedan llamar distinto a la misma marca.

const h = (hh: number, mm = 0) => new Date(Date.UTC(2026, 9, 3, hh + 5, mm));
const reg = (id: string, p: Partial<{ entrada: Date | null; salida: Date | null; salidaAlmuerzo: boolean; salidaDescanso: boolean; entradaEstimada: boolean; salidaEstimada: boolean }>) => ({
  id, entrada: null, salida: null, salidaAlmuerzo: false, salidaDescanso: false, entradaEstimada: false, salidaEstimada: false, ...p,
});

describe('las marcas del día', () => {
  it('un turno abierto: solo la entrada', () => {
    expect(marcasDelDia([reg('a', { entrada: h(8) })])).toEqual([{ momento: 'ENTRADA', hora: h(8) }]);
  });

  it('con almuerzo: entrada, salida a almorzar, regreso y salida, en orden', () => {
    const r = marcasDelDia([
      reg('b', { entrada: h(13), salida: h(17) }),
      reg('a', { entrada: h(8), salida: h(12), salidaAlmuerzo: true }),
    ]);
    expect(r.map(m => m.momento)).toEqual(['ENTRADA', 'SALIDA_ALMUERZO', 'REGRESO_ALMUERZO', 'SALIDA']);
    expect(r.map(m => m.hora)).toEqual([h(8), h(12), h(13), h(17)]);
  });

  it('lo que puso el sistema no es una marca de la persona y no se lista', () => {
    const r = marcasDelDia([
      reg('a', { entrada: h(8), salida: h(12), salidaAlmuerzo: true }),
      reg('b', { entrada: h(13), entradaEstimada: true, salida: h(17), salidaEstimada: true }),
    ]);
    expect(r.map(m => m.momento)).toEqual(['ENTRADA', 'SALIDA_ALMUERZO']);
  });

  it('sin registros, nada', () => {
    expect(marcasDelDia([])).toEqual([]);
  });
});

// EL TURNO NOCTURNO (3 de octubre de 2026). Luis entra el viernes a las 7:00 p. m. y su marca queda
// guardada en el viernes. El sábado a las 6:00 a. m. llega a marcar su salida: si la lista solo
// mirara el sábado, saldría vacía, y no vería su entrada —ni una entrada que alguien hubiera marcado
// por él—. Mientras haya una jornada en curso que empezó antes de hoy, la lista arranca en su día.
describe('desde qué día se listan las marcas', () => {
  // Medianoche de Bogotá (05:00 UTC) de un día de octubre de 2026.
  const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 5, 0));
  // Un instante en hora de Bogotá del día `d`.
  const a = (d: number, hh: number, mm = 0) => new Date(Date.UTC(2026, 9, d, hh + 5, mm));
  const hoy = dia(3);
  const nada = { abierto: null, pausaEnCurso: null, ultimoCerrado: null };

  it('sin nada en curso, las de hoy', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada })).toEqual(hoy);
  });

  it('con un turno abierto que empezó hoy, las de hoy', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, abierto: { fecha: hoy } })).toEqual(hoy);
  });

  // Una marca cargada a mano en el panel guarda la fecha CON su hora, no a medianoche
  // (POST /registros/entrada). Si la lista arrancara en ella, escondería lo de hoy antes de las 9.
  it('con un turno abierto de hoy guardado con hora, las de hoy desde la medianoche', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, abierto: { fecha: a(3, 9) } })).toEqual(hoy);
  });

  it('con un turno nocturno abierto desde ayer, desde ayer', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, abierto: { fecha: dia(2) } })).toEqual(dia(2));
  });

  // Luis salió a almorzar a las 12:30 a. m. y no ha vuelto: no hay turno abierto, pero su jornada
  // del viernes sigue en curso y el regreso que va a marcar es de ella.
  it('en una pausa sin regreso de una jornada de ayer, desde ayer', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, pausaEnCurso: { fecha: dia(2) } })).toEqual(dia(2));
  });

  // Alguien marcó la salida de Luis a las 3:00 a. m. a su nombre, o el propio Luis cerró a las 6:00 y
  // volvió a las 6:05 a comprobar que le quedó. La jornada ya no está en curso, pero se cerró HOY: si
  // la lista no la trajera, saldría vacía justo cuando hay algo que ver.
  it('una jornada de ayer que se cerró hoy, desde ayer', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, ultimoCerrado: { fecha: dia(2), salida: a(3, 3) } })).toEqual(dia(2));
  });

  // María salió ayer a las 5:00 p. m. a su casa: su jornada terminó ayer y no se cuela en la de hoy.
  it('una jornada de ayer que se cerró ayer, las de hoy', () => {
    expect(desdeCuandoSeListan({ inicioDia: hoy, ...nada, ultimoCerrado: { fecha: dia(2), salida: a(2, 17) } })).toEqual(hoy);
  });
});

// Con la lista arrancando en el viernes, las marcas de Luis cruzan la medianoche. Cada una se sigue
// nombrando bien porque `momentosDelDia` agrupa por la cadena de pausas, no por la fecha.
describe('las marcas de una jornada que cruza la medianoche', () => {
  const vie = (hh: number, mm = 0) => new Date(Date.UTC(2026, 9, 2, hh + 5, mm));
  const sab = (hh: number, mm = 0) => new Date(Date.UTC(2026, 9, 3, hh + 5, mm));

  it('entrada del viernes, salida a almorzar y regreso de la madrugada, en orden', () => {
    const r = marcasDelDia([
      reg('regreso', { entrada: sab(1) }),
      reg('entrada', { entrada: vie(19), salida: sab(0, 30), salidaAlmuerzo: true }),
    ]);
    expect(r.map(m => m.momento)).toEqual(['ENTRADA', 'SALIDA_ALMUERZO', 'REGRESO_ALMUERZO']);
    expect(r.map(m => m.hora)).toEqual([vie(19), sab(0, 30), sab(1)]);
  });
});
