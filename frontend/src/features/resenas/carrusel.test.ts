import { describe, it, expect } from 'vitest';
import { paginar, derivar, envolver, suavizar, etiquetaDePosicion } from './carrusel';

// Cómo se reparte el carrusel de reseñas de la landing (docs/RESENAS.md, R36, R37 y R39).
//
// Computador: tres a la vista y la fila deslizándose sola, muy despacio, sin fin. Celular: de a una,
// con «2 / 15». Con tres o menos no se mueve. Un error aquí no rompe la página: deja una fila que
// salta al dar la vuelta, que desaparece, o un carrusel que gira con lo que ya cabía quieto.

describe('paginar', () => {
  it('15 reseñas de a tres son cinco grupos, y rota', () => {
    expect(paginar(15, 3)).toEqual({ paginas: 5, rota: true });
  });

  it('un grupo incompleto al final también cuenta como grupo', () => {
    expect(paginar(7, 3)).toEqual({ paginas: 3, rota: true });
  });

  // R39: con tres o menos no hay flechas ni movimiento.
  it('con tres o menos, de a tres, no rota', () => {
    expect(paginar(3, 3)).toEqual({ paginas: 1, rota: false });
    expect(paginar(2, 3)).toEqual({ paginas: 1, rota: false });
    expect(paginar(1, 3)).toEqual({ paginas: 1, rota: false });
  });

  it('con una más de las que caben, ya rota', () => {
    expect(paginar(4, 3)).toEqual({ paginas: 2, rota: true });
  });

  // R39: con cero la sección ni aparece; aquí basta con que no invente un grupo vacío.
  it('sin reseñas no hay grupos', () => {
    expect(paginar(0, 3)).toEqual({ paginas: 0, rota: false });
  });

  // R37: en el celular cada reseña es su propia página.
  it('de a una, cada reseña es una página', () => {
    expect(paginar(15, 1)).toEqual({ paginas: 15, rota: true });
    expect(paginar(1, 1)).toEqual({ paginas: 1, rota: false });
  });

  it('un tamaño de página sin sentido se trata como de a una, en vez de dividir por cero', () => {
    expect(paginar(5, 0)).toEqual({ paginas: 5, rota: true });
  });
});

// R36: en el computador la fila se desliza sola, muy despacio, hacia la derecha.
describe('derivar', () => {
  // Que las tarjetas viajen hacia la derecha es que la fila se desplace hacia atrás. A 18 píxeles por
  // segundo, una décima son 1,8.
  it('corre hacia la derecha lo que dice la velocidad, según el tiempo que pasó', () => {
    expect(derivar(1000, 100, 18)).toBeCloseTo(998.2, 9);
    expect(derivar(1000, 200, 18)).toBeCloseTo(996.4, 9);
  });

  // Un cuadro que llega con el tiempo hacia atrás (el reloj del navegador al volver de otra pestaña)
  // no puede hacer que la fila salte para el otro lado.
  it('sin tiempo, o con tiempo negativo, no se mueve', () => {
    expect(derivar(1000, 0, 18)).toBe(1000);
    expect(derivar(1000, -40, 18)).toBe(1000);
  });

  // Si la pestaña estuvo oculta, el primer cuadro al volver trae segundos de diferencia. Moverse todo
  // eso de golpe se ve como un salto: se toma como mucho un cuarto de segundo.
  it('después de una pausa larga no salta: cuenta como mucho un cuarto de segundo', () => {
    expect(derivar(1000, 30000, 18)).toBeCloseTo(995.5, 9);
  });
});

// La fila lleva tres copias de las reseñas y se mantiene siempre en la del medio: al salirse por un
// lado, se la corre una copia entera, que se ve idéntica, y la vuelta no se acaba nunca.
describe('envolver', () => {
  // La copia del medio va de media copia hasta justo antes de una y media: 1500 ya es la siguiente.
  it('dentro de la copia del medio no cambia nada', () => {
    expect(envolver(500, 1000)).toBe(500);
    expect(envolver(1499, 1000)).toBe(1499);
  });

  it('al salirse por la izquierda vuelve una copia hacia adelante', () => {
    expect(envolver(499, 1000)).toBe(1499);
  });

  it('al salirse por la derecha vuelve una copia hacia atrás', () => {
    expect(envolver(1500.5, 1000)).toBe(500.5);
  });

  // Una flecha justo en el borde, o varias seguidas, pueden dejarla más de una copia afuera.
  it('aunque se haya salido más de una copia, vuelve a la del medio', () => {
    expect(envolver(-2600, 1000)).toBe(1400);
    expect(envolver(4200, 1000)).toBe(1200);
  });

  // Antes de que el navegador mida las tarjetas, el ancho es cero: dividir por él dejaría NaN y la
  // fila desaparecería.
  it('sin ancho medido no toca la posición', () => {
    expect(envolver(700, 0)).toBe(700);
  });
});

// Las flechas corren una tarjeta con un movimiento que arranca y frena suave.
describe('suavizar', () => {
  it('empieza en cero, pasa por la mitad a mitad de camino y termina en uno', () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(0.5)).toBe(0.5);
    expect(suavizar(1)).toBe(1);
  });

  it('arranca despacio y frena despacio', () => {
    expect(suavizar(0.1)).toBeLessThan(0.1);
    expect(suavizar(0.9)).toBeGreaterThan(0.9);
  });

  it('fuera del recorrido se queda en los extremos', () => {
    expect(suavizar(-1)).toBe(0);
    expect(suavizar(3)).toBe(1);
  });
});

// R37: abajo de la tarjeta, en el celular.
describe('etiquetaDePosicion', () => {
  it('cuenta desde uno, como lo cuenta una persona', () => {
    expect(etiquetaDePosicion(0, 15)).toBe('1 / 15');
    expect(etiquetaDePosicion(1, 15)).toBe('2 / 15');
    expect(etiquetaDePosicion(14, 15)).toBe('15 / 15');
  });

  it('nunca dice una posición que no existe', () => {
    expect(etiquetaDePosicion(20, 15)).toBe('15 / 15');
    expect(etiquetaDePosicion(-1, 15)).toBe('1 / 15');
  });

  it('sin reseñas no dice nada', () => {
    expect(etiquetaDePosicion(0, 0)).toBe('');
  });
});
