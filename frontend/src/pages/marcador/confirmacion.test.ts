import { describe, it, expect } from 'vitest';
import { confirmacionDeLaMarca, textoDeHace, MS_CONFIRMAR, MS_CONFIRMAR_REFORZADA } from './confirmacion';
import type { Estado } from './tipos';

// CUÁNTO HAY QUE SOSTENER EL BOTÓN, Y POR QUÉ (2 de octubre de 2026).
//
// El 1 de octubre una persona sin rostro registrado entró como Lina a las 08:49.
// A las 08:52 llegó Lina, el kiosco la reconoció bien, le ofreció «Registrar
// Salida» y lo oprimió: su entrada ya estaba abierta. Al nombre no lo mira nadie;
// lo que no cuadraba era la HORA, y la pantalla no lo decía.

// Las horas en UTC explícito: 13:49Z son las 08:49 en Bogotá.
const dentroDesde = (entrada: string): Estado => ({
  dentroAhora: true, entradaAbierta: { entrada }, turnoCerradoHoy: null,
  almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
});
const sinNada: Estado = {
  dentroAhora: false, entradaAbierta: null, turnoCerradoHoy: null,
  almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
};
const a = (iso: string) => new Date(iso);

describe('la confirmación de cada marca', () => {
  it('lo normal es sostener 1,5 segundos', () => {
    const c = confirmacionDeLaMarca({ estado: sinNada, ahora: a('2026-10-01T13:49:00Z'), parecidoDudoso: false });
    expect(c).toEqual({ nivel: 'NORMAL', ms: MS_CONFIRMAR });
    expect(MS_CONFIRMAR).toBe(1500);
  });

  it('EL CASO DEL 1 DE OCTUBRE: salir 3 minutos después de la entrada pide la reforzada y dice la hora', () => {
    const c = confirmacionDeLaMarca({
      estado: dentroDesde('2026-10-01T13:49:21Z'), ahora: a('2026-10-01T13:52:39Z'), parecidoDudoso: false,
    });
    expect(c).toEqual({
      nivel: 'REFORZADA', ms: MS_CONFIRMAR_REFORZADA, motivo: 'SALIDA_RECIEN_ENTRADA',
      entrada: '2026-10-01T13:49:21Z', minutos: 3,
    });
    expect(MS_CONFIRMAR_REFORZADA).toBe(3000);
  });

  it('a los 15 minutos de la entrada ya es una salida normal', () => {
    const c = confirmacionDeLaMarca({ estado: dentroDesde('2026-10-01T13:00:00Z'), ahora: a('2026-10-01T13:15:00Z'), parecidoDudoso: false });
    expect(c.nivel).toBe('NORMAL');
  });

  it('un segundo antes de los 15 minutos todavía es reciente', () => {
    const c = confirmacionDeLaMarca({ estado: dentroDesde('2026-10-01T13:00:00Z'), ahora: a('2026-10-01T13:14:59Z'), parecidoDudoso: false });
    expect(c.nivel).toBe('REFORZADA');
  });

  it('un parecido dudoso pide la reforzada aunque la hora cuadre', () => {
    const c = confirmacionDeLaMarca({ estado: sinNada, ahora: a('2026-10-01T13:49:00Z'), parecidoDudoso: true });
    expect(c).toEqual({ nivel: 'REFORZADA', ms: MS_CONFIRMAR_REFORZADA, motivo: 'PARECIDO_DUDOSO' });
  });

  it('con las dos cosas, gana la hora: es la que la persona puede comprobar', () => {
    const c = confirmacionDeLaMarca({ estado: dentroDesde('2026-10-01T13:49:00Z'), ahora: a('2026-10-01T13:52:00Z'), parecidoDudoso: true });
    expect(c.nivel === 'REFORZADA' && c.motivo).toBe('SALIDA_RECIEN_ENTRADA');
  });

  it('sin estado todavía no inventa nada', () => {
    expect(confirmacionDeLaMarca({ estado: null, ahora: a('2026-10-01T13:49:00Z'), parecidoDudoso: false }).nivel).toBe('NORMAL');
  });
});

describe('cómo se dice cuánto hace', () => {
  it('menos de un minuto', () => expect(textoDeHace(0)).toBe('hace menos de un minuto'));
  it('un minuto, en singular', () => expect(textoDeHace(1)).toBe('hace 1 minuto'));
  it('varios minutos', () => expect(textoDeHace(3)).toBe('hace 3 minutos'));
});
