import { describe, it, expect } from 'vitest';
import { marcasDelDia } from './marcasDelDia';

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
