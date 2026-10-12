import { describe, it, expect } from 'vitest';
import { mensajesDelKiosco, type QueAvisar } from './telegramDelKiosco';

// QUÉ LE MANDA EL KIOSCO AL GRUPO DE TELEGRAM AL MARCAR (12 de octubre de 2026).
//
// Decisiones del dueño:
// - La novedad por aprobar NO dice el tipo ni el motivo: varios son datos de salud (incapacidad, cita
//   médica, licencia) y el chat suele ser un grupo donde no todos son administradores.
// - Si alguien llega tarde y deja el motivo, sale UN solo mensaje que dice las dos cosas.

const base: QueAvisar = {
  nombre: 'Ana Pérez', hora: '08:17', minutosTarde: null, dejoNovedad: false,
  alertasTarde: true, novedades: true, enlace: 'https://horapro.co/app/colaboradores/c1?tab=novedades',
};
const ENLACE = '<a href="https://horapro.co/app/colaboradores/c1?tab=novedades">Revisar en HoraPro</a>';

describe('mensajesDelKiosco', () => {
  it('llegó tarde: el mensaje de siempre', () => {
    expect(mensajesDelKiosco({ ...base, minutosTarde: 17 })).toEqual(['⚠️ <b>Ana Pérez</b> llegó tarde\n🕐 8:17 a.m. · 17 min tarde']);
  });

  it('más de una hora tarde se dice en horas y minutos', () => {
    expect(mensajesDelKiosco({ ...base, minutosTarde: 75 })).toEqual(['⚠️ <b>Ana Pérez</b> llegó tarde\n🕐 8:17 a.m. · 1h 15min tarde']);
  });

  it('reportó una novedad: sin tipo ni motivo, con el enlace para revisarla', () => {
    expect(mensajesDelKiosco({ ...base, dejoNovedad: true })).toEqual([
      `📝 <b>Ana Pérez</b> reportó una novedad y espera tu aprobación\n${ENLACE}`,
    ]);
  });

  it('llegó tarde y dejó el motivo: un solo mensaje con las dos cosas', () => {
    expect(mensajesDelKiosco({ ...base, minutosTarde: 17, dejoNovedad: true })).toEqual([
      `⚠️ <b>Ana Pérez</b> llegó tarde\n🕐 8:17 a.m. · 17 min tarde\n📝 Dejó una novedad por aprobar · ${ENLACE}`,
    ]);
  });

  it('cada aviso respeta su interruptor', () => {
    // Solo el de novedades: la llegada tarde con motivo sale como novedad.
    expect(mensajesDelKiosco({ ...base, minutosTarde: 17, dejoNovedad: true, alertasTarde: false }))
      .toEqual([`📝 <b>Ana Pérez</b> reportó una novedad y espera tu aprobación\n${ENLACE}`]);
    // Solo el de llegadas tarde: no menciona la novedad.
    expect(mensajesDelKiosco({ ...base, minutosTarde: 17, dejoNovedad: true, novedades: false }))
      .toEqual(['⚠️ <b>Ana Pérez</b> llegó tarde\n🕐 8:17 a.m. · 17 min tarde']);
    // Ninguno.
    expect(mensajesDelKiosco({ ...base, minutosTarde: 17, dejoNovedad: true, alertasTarde: false, novedades: false })).toEqual([]);
  });

  it('una marca a tiempo y sin novedad no manda nada', () => {
    expect(mensajesDelKiosco(base)).toEqual([]);
  });

  it('un nombre con HTML no rompe el mensaje', () => {
    expect(mensajesDelKiosco({ ...base, nombre: '<b>Ana & co', minutosTarde: 5 })[0]).toContain('&lt;b&gt;Ana &amp; co');
  });
});
