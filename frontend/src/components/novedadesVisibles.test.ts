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
  // El caso normal: un lote que respeta a quien apagó las novedades. El bloque de abajo prueba el
  // otro. Es OBLIGATORIO y no opcional a propósito: con un valor por defecto, una pantalla nueva que
  // se olvidara del campo decidiría sola si pisa una decisión del usuario.
  ineludible: false,
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

  // ────────── UN LOTE QUE SE MUESTRA A TODOS (30 de septiembre de 2026) ──────────
  //
  // Pedido del dueño para el lanzamiento del módulo de turnos: «quiero que aparezca a todos los
  // usuarios». Es el módulo más grande del año y no quiere que nadie se lo pierda.
  //
  // PISA UNA DECISIÓN QUE ALGUIEN TOMÓ A PROPÓSITO, y por eso es un interruptor por LOTE y no una
  // regla nueva: `ineludible` se enciende para esta versión y se apaga en la siguiente. Escrito como
  // regla permanente, «no volver a mostrarme las novedades» dejaría de significar nada.
  //
  // LO QUE NO PISA: que ya lo haya visto. Un lote ineludible se muestra UNA vez, como cualquier otro;
  // si no, quien lo cierra se lo encuentra otra vez en cada carga y eso no es insistir, es acosar.
  describe('un lote marcado como ineludible', () => {
    const lote = { ...base, ineludible: true };

    it('se le muestra incluso a quien apagó las novedades', () => {
      expect(debeMostrarNovedades({ ...lote, apagadas: true })).toBe(true);
    });

    it('pero NO se le repite a quien ya lo vio', () => {
      expect(debeMostrarNovedades({ ...lote, apagadas: true, vioEstaVersion: true })).toBe(false);
    });

    it('y sigue sin tapar el video de bienvenida de quien acaba de llegar', () => {
      expect(debeMostrarNovedades({ ...lote, vioLaGuia: false })).toBe(false);
    });

    it('al super admin tampoco: sigue sin ser cliente del producto', () => {
      expect(debeMostrarNovedades({ ...lote, rol: 'SUPER_ADMIN' })).toBe(false);
    });

    it('y sin la marca, los MISMOS datos respetan a quien las apagó', () => {
      // El contraste que le da sentido al bloque, y la guarda de que la marca de verdad decide.
      expect(debeMostrarNovedades({ ...base, apagadas: true, ineludible: true })).toBe(true);
      expect(debeMostrarNovedades({ ...base, apagadas: true, ineludible: false })).toBe(false);
    });
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
