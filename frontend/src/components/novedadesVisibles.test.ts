import { describe, it, expect } from 'vitest';
import { debeMostrarNovedades } from './novedadesVisibles';

// Cuándo se le abren las novedades a alguien sin que las pida.
//
// Son cuatro condiciones que antes vivían en una sola expresión dentro del
// componente, junto a tres lecturas de localStorage. Equivocarse aquí es o
// tapar la pantalla a alguien que ya dijo que no quiere verlas, o no contarle
// nunca a un cliente lo que acaba de pagar.

const base = {
  rol: 'ADMIN',
  vioLaGuia: true,
  vioEstaVersion: false,
  apagadas: false,
  forzado: false,
};

describe('debeMostrarNovedades', () => {
  it('se abren solas a quien ya conoce el producto y no ha visto este lote', () => {
    expect(debeMostrarNovedades(base)).toBe(true);
  });

  it('no se repiten a quien ya las vio', () => {
    expect(debeMostrarNovedades({ ...base, vioEstaVersion: true })).toBe(false);
  });

  it('respetan a quien pidió no verlas más', () => {
    // Es una promesa, no una preferencia: "no volver a mostrarme las novedades"
    // dice novedades, no "las de este mes".
    expect(debeMostrarNovedades({ ...base, apagadas: true })).toBe(false);
  });

  it('al usuario recién llegado no se le encima esto sobre la bienvenida', () => {
    // Todavía no ha visto la guía inicial. Para él TODO es nuevo, así que un
    // anuncio de "lo que cambió" no le dice nada y le tapa el video.
    expect(debeMostrarNovedades({ ...base, vioLaGuia: false })).toBe(false);
  });

  it('al super admin no le interesan: no es cliente del producto', () => {
    expect(debeMostrarNovedades({ ...base, rol: 'SUPER_ADMIN' })).toBe(false);
  });

  it('sin sesión no se muestran', () => {
    expect(debeMostrarNovedades({ ...base, rol: null })).toBe(false);
  });

  describe('cuando las pide desde el menú', () => {
    it('se abren aunque ya las haya visto', () => {
      expect(debeMostrarNovedades({ ...base, vioEstaVersion: true, forzado: true })).toBe(true);
    });

    it('se abren aunque las tenga apagadas: las está pidiendo él', () => {
      expect(debeMostrarNovedades({ ...base, apagadas: true, forzado: true })).toBe(true);
    });

    it('pero al super admin tampoco, porque el botón ni siquiera le sale', () => {
      expect(debeMostrarNovedades({ ...base, rol: 'SUPER_ADMIN', forzado: true })).toBe(false);
    });
  });
});
