import { describe, it, expect } from 'vitest';
import { pasosDeEnrolamiento, mensajeBajoLaTarjeta } from './pasosEnrolar';
import { flechaDelReto } from './reto';

// LOS PASOS DEL REGISTRO FACIAL GUIADO (14 de septiembre de 2026). El texto decía «Gira tu rostro a la
// derecha» para la pose que el sistema llama derecha, que se hace girando hacia la izquierda propia: la
// vista de la cámara está espejada (ver reto.ts). Quien obedecía giraba al revés y el paso no avanzaba.

describe('pasosDeEnrolamiento', () => {
  it('sin gafas: de frente y los dos giros, en ese orden', () => {
    const pasos = pasosDeEnrolamiento(false);
    expect(pasos.map(p => p.tipo)).toEqual(['frontal', 'derecha', 'izquierda']);
    expect(pasos[0].tarjeta).toBe('frente-sin-gafas');
  });

  it('con gafas: empieza con ellas puestas, como llega al kiosco, y termina sin ellas', () => {
    const pasos = pasosDeEnrolamiento(true);
    expect(pasos.map(p => p.tipo)).toEqual(['frontal', 'derecha', 'izquierda', 'frontal']);
    expect(pasos[0].tarjeta).toBe('frente-con-gafas');
    expect(pasos[3].tarjeta).toBe('frente-sin-gafas');
    expect(pasos[3].texto).toMatch(/Quítate las gafas/);
  });

  it('la flecha, la tarjeta y el rótulo de cada giro salen de la misma regla que la flecha del reto del kiosco', () => {
    const giros = pasosDeEnrolamiento(true).filter(p => p.tipo !== 'frontal');
    expect(giros).toHaveLength(2);
    for (const paso of giros) {
      const lado = flechaDelReto(paso.tipo);
      expect(paso.flecha).toBe(lado);
      expect(paso.tarjeta).toBe(lado === 'izq' ? 'gira-izquierda' : 'gira-derecha');
      expect(paso.etiqueta).toBe(lado === 'izq' ? 'Giro ←' : 'Giro →');
    }
  });

  it('los dos giros piden lados distintos', () => {
    const [primero, segundo] = pasosDeEnrolamiento(false).filter(p => p.tipo !== 'frontal');
    expect(primero.flecha).not.toBe(segundo.flecha);
  });

  it('ningún texto ni rótulo dice derecha o izquierda: con la vista espejada es donde se pierde la gente', () => {
    for (const paso of pasosDeEnrolamiento(true)) {
      expect(`${paso.etiqueta} ${paso.texto}`).not.toMatch(/derech|izquierd/i);
    }
  });

  it('los pasos de frente no llevan flecha', () => {
    expect(pasosDeEnrolamiento(true).filter(p => p.tipo === 'frontal').map(p => p.flecha)).toEqual([null, null]);
  });
});

describe('mensajeBajoLaTarjeta', () => {
  const texto = 'Gira levemente la cabeza hacia la flecha';

  it('si el mensaje es la instrucción del paso, no la repite: ya está en la tarjeta', () => {
    expect(mensajeBajoLaTarjeta(texto, texto)).toBe('');
  });

  it('mientras sostiene la pose, deja solo lo que cambia', () => {
    expect(mensajeBajoLaTarjeta(`${texto} · mantente quieto`, texto)).toBe('Mantente quieto');
  });

  it('los demás mensajes pasan tal cual', () => {
    expect(mensajeBajoLaTarjeta('Acércate un poco', texto)).toBe('Acércate un poco');
    expect(mensajeBajoLaTarjeta('Ubica tu rostro dentro del óvalo', undefined)).toBe('Ubica tu rostro dentro del óvalo');
  });
});
