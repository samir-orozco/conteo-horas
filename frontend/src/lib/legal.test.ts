import { describe, it, expect } from 'vitest';
import { POLITICA_PRIVACIDAD } from './legal';
import { PRIVACIDAD } from '../../blog/legal/privacidad.mjs';

// La única razón de ser de este archivo: `legal.ts` es una copia a mano de dos
// datos que mandan desde `blog/legal/privacidad.mjs`, y una copia sin guarda se
// queda atrás. El día que se publique la política, si alguien cambia solo el
// `borrador` la página de inicio quedaría sin el enlace y nadie se enteraría,
// porque nada se rompe: simplemente no aparece.

describe('el pie de la página de inicio no se puede desincronizar de la política', () => {
  it('publicada es exactamente lo contrario de borrador', () => {
    expect(POLITICA_PRIVACIDAD.publicada).toBe(!PRIVACIDAD.borrador);
  });

  it('la ruta del enlace es la ruta real del documento', () => {
    expect(POLITICA_PRIVACIDAD.ruta).toBe(PRIVACIDAD.ruta);
  });
});
