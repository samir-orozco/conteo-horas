import { describe, it, expect } from 'vitest';
import { invitacionDelClima, repartoDeCaritas } from './clima';

// EL CLIMA EN EL INICIO (15 de octubre de 2026). Lo que decide la tarjeta, aparte de cómo se pinta.
// Las fechas de la prueba son el final del día de Bogotá: el último día cubierto es el anterior al instante
// `hasta`. Estas pruebas corren en Los Ángeles a propósito (vite.config.ts).

const PRUEBA = { disponible: false, vigente: null, terminada: null, dias: 30 };

describe('invitacionDelClima', () => {
  it('si la prueba gratis se puede pedir, invita a ella y lleva a la página del clima, donde se empieza', () => {
    expect(invitacionDelClima({ ...PRUEBA, disponible: true })).toEqual({ boton: 'Pruébalo gratis 30 días', destino: '/app/clima', nota: null });
  });

  it('si ya la usó, dice cuándo terminó y lleva a subir de plan', () => {
    expect(invitacionDelClima({ ...PRUEBA, terminada: { hasta: '2026-10-15T05:00:00.000Z' } })).toEqual({
      boton: 'Subir de plan', destino: '/app/configuracion?tab=suscripcion', nota: 'Tu prueba gratis terminó el 14 de octubre de 2026.',
    });
  });

  it('sin prueba que pedir ni prueba terminada (la quitó el super admin), solo el plan', () => {
    expect(invitacionDelClima(PRUEBA)).toEqual({ boton: 'Subir de plan', destino: '/app/configuracion?tab=suscripcion', nota: null });
  });
});

describe('repartoDeCaritas', () => {
  it('de Muy mal a Muy bien, con el ancho de cada tramo sobre el total', () => {
    expect(repartoDeCaritas({ 1: 1, 2: 0, 3: 1, 4: 2, 5: 0 })).toEqual([
      { carita: 1, nombre: 'Muy mal', cantidad: 1, ancho: 25 },
      { carita: 2, nombre: 'Mal', cantidad: 0, ancho: 0 },
      { carita: 3, nombre: 'Normal', cantidad: 1, ancho: 25 },
      { carita: 4, nombre: 'Bien', cantidad: 2, ancho: 50 },
      { carita: 5, nombre: 'Muy bien', cantidad: 0, ancho: 0 },
    ]);
  });

  it('sin respuestas, todos los tramos en cero y no un NaN', () => {
    expect(repartoDeCaritas({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }).map(t => t.ancho)).toEqual([0, 0, 0, 0, 0]);
  });
});
