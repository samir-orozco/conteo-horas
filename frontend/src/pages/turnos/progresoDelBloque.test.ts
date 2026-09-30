import { describe, it, expect } from 'vitest';
import { estadoDelProgreso } from './progresoDelBloque';

// POR DÓNDE VA UN ENVÍO DE CIENTOS DE JORNADAS (28 de septiembre de 2026).
//
// Hoy esto es una línea de texto dentro de la tarjeta: «Bloque 2 de 7 · no cierres esta ventana». Con
// siete bloques informa; con treinta, quien está mirando no sabe si va por la mitad o por el final, y
// un guardado que tarda y no dice nada se lee como uno colgado.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UNAS CUENTAS DENTRO DEL MODAL: de aquí sale un número que la
// persona usa para decidir si espera o si detiene. Un porcentaje calculado sobre el denominador
// equivocado no se ve mal, se ve plausible.
//
// EL PORCENTAJE VA SOBRE JORNADAS, NO SOBRE BLOQUES, y esa es la decisión central. Los bloques no son
// iguales: el último puede llevar una jornada o seis. Con «bloques hechos / bloques» un envío de 31
// jornadas en 6 bloques saltaría de 83% a 100% escribiendo una sola, y al revés, el primer bloque
// diría 17% habiendo escrito seis de 31 (19%). Son números parecidos y por eso peligrosos.

describe('el porcentaje', () => {
  it('va sobre las jornadas escritas, no sobre los bloques hechos', () => {
    // 6 de 31 jornadas es 19%, no 17% (que sería 1 de 6 bloques).
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 1, escritas: 6, total: 31, detenido: false });
    expect(r.pct).toBe(19);
  });

  it('empieza en cero', () => {
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 0, escritas: 0, total: 31, detenido: false });
    expect(r.pct).toBe(0);
  });

  it('SIN NADA QUE ESCRIBIR no da NaN, da cero', () => {
    // La maqueta de esto tiene ese defecto documentado: con el total sin llegar, el porcentaje salía
    // NaN y la ventana mostraba «NaN%». Pasa de verdad cuando todo lo marcado ya pasó y no hay nada
    // que escribir.
    const r = estadoDelProgreso({ bloques: 0, bloquesHechos: 0, escritas: 0, total: 0, detenido: false });
    expect(r.pct).toBe(0);
    expect(Number.isNaN(r.pct)).toBe(false);
  });

  it('se redondea, no se corta', () => {
    // 1 de 3 es 33,33: se dice 33. Y 2 de 3 es 66,67: se dice 67, no 66.
    expect(estadoDelProgreso({ bloques: 3, bloquesHechos: 1, escritas: 1, total: 3, detenido: false }).pct).toBe(33);
    expect(estadoDelProgreso({ bloques: 3, bloquesHechos: 2, escritas: 2, total: 3, detenido: false }).pct).toBe(67);
  });

  it('el 100% solo cuando se escribieron todas', () => {
    expect(estadoDelProgreso({ bloques: 3, bloquesHechos: 3, escritas: 30, total: 30, detenido: false }).pct).toBe(100);
  });

  it('DETENIDO A LA MITAD NO DICE 100, dice lo que alcanzó', () => {
    // El caso que importa: si al detenerse mostrara 100 o se pintara de verde, estaría diciendo «todo
    // bien» sobre una escritura incompleta, y quien lo lea se va tranquilo con la mitad sin escribir.
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 3, escritas: 18, total: 31, detenido: true });
    expect(r.pct).toBe(58);
    expect(r.terminado).toBe(false);
  });
});

describe('si terminó, y cómo', () => {
  it('mientras van bloques por delante, ni terminado ni cortado', () => {
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 2, escritas: 12, total: 31, detenido: false });
    expect(r).toMatchObject({ terminado: false, cortado: false });
  });

  it('con todos los bloques hechos, terminado', () => {
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 6, escritas: 31, total: 31, detenido: false });
    expect(r).toMatchObject({ terminado: true, cortado: false });
  });

  it('detenido antes de acabar es CORTADO, que no es lo mismo que terminado', () => {
    // Son dos finales distintos y la ventana los dice distinto: «Listo» frente a «Se detuvo». Juntarlos
    // haría que un envío a medias se leyera como uno completo.
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 3, escritas: 18, total: 31, detenido: true });
    expect(r).toMatchObject({ terminado: false, cortado: true });
  });

  it('pedir detener en el ÚLTIMO bloque no lo convierte en cortado', () => {
    // Se detiene AL TERMINAR el bloque en curso. Si ese era el último, no quedó nada sin escribir: el
    // envío está completo y decir «se detuvo» sería alarmar por nada.
    const r = estadoDelProgreso({ bloques: 6, bloquesHechos: 6, escritas: 31, total: 31, detenido: true });
    expect(r).toMatchObject({ terminado: true, cortado: false });
  });
});

describe('los círculos de los bloques', () => {
  it('uno por bloque: los pasados HECHO, el que corre EN_CURSO, los demás PENDIENTE', () => {
    const r = estadoDelProgreso({ bloques: 4, bloquesHechos: 2, escritas: 12, total: 24, detenido: false });
    expect(r.pasos).toEqual(['HECHO', 'HECHO', 'EN_CURSO', 'PENDIENTE']);
  });

  it('al terminar no queda ninguno EN_CURSO', () => {
    const r = estadoDelProgreso({ bloques: 3, bloquesHechos: 3, escritas: 18, total: 18, detenido: false });
    expect(r.pasos).toEqual(['HECHO', 'HECHO', 'HECHO']);
  });

  it('al cortarse, los que no se hicieron se quedan PENDIENTE y ninguno EN_CURSO', () => {
    // Cortado no es «sigue corriendo»: nada está en curso, y pintar un círculo activo diría que algo
    // se está escribiendo todavía.
    const r = estadoDelProgreso({ bloques: 4, bloquesHechos: 2, escritas: 12, total: 24, detenido: true });
    expect(r.pasos).toEqual(['HECHO', 'HECHO', 'PENDIENTE', 'PENDIENTE']);
  });

  it('CON MÁS DE DIEZ BLOQUES no se ven: manda la barra', () => {
    // Cien circulitos no informan de nada. La regla es de la maqueta y el corte es el mismo.
    expect(estadoDelProgreso({ bloques: 11, bloquesHechos: 1, escritas: 6, total: 66, detenido: false }).seVenLosPasos)
      .toBe(false);
  });

  it('con diez EXACTOS todavía se ven', () => {
    // El borde, escrito: «más de diez» es 11, no 10.
    expect(estadoDelProgreso({ bloques: 10, bloquesHechos: 1, escritas: 6, total: 60, detenido: false }).seVenLosPasos)
      .toBe(true);
  });

  it('sin bloques no hay pasos ni se ven', () => {
    const r = estadoDelProgreso({ bloques: 0, bloquesHechos: 0, escritas: 0, total: 0, detenido: false });
    expect(r.pasos).toEqual([]);
    expect(r.seVenLosPasos).toBe(false);
  });
});

// ────────── «LISTO» AL 35 % (29 de septiembre de 2026, defecto visto por el dueño) ──────────
//
// La ventana decía «Listo», con su visto verde y el porcentaje en verde, encima de una barra al 35 %
// y de «209 jornadas escritas de 598». Las tres cosas a la vez, y la primera es falsa.
//
// LA CAUSA, y es de una línea: `terminado` significaba «se enviaron todos los BLOQUES», no «se
// escribió todo». Con 100 de 100 bloques enviados y 389 escrituras rechazadas por el servidor, el
// envío estaba terminado y roto al mismo tiempo, y la ventana solo sabía decir lo primero.
//
// SON TRES FINALES Y NO DOS, que es lo que faltaba modelar:
//
//   terminado   se enviaron todos los bloques y se escribió todo. Verde, «Listo».
//   cortado     alguien pulsó Detener y quedaron bloques sin enviar. Rojo, «Se detuvo».
//   conFallos   se enviaron todos los bloques y el servidor rechazó parte. NUEVO.
//
// EL TERCERO NO ES «CORTADO»: nadie detuvo nada, el envío llegó hasta el final. Y no es «terminado»:
// falta lo que el servidor no aceptó. Meterlo en cualquiera de los dos vuelve a mentir, en un sentido
// o en el otro.

describe('cuando se envía todo pero el servidor rechaza parte', () => {
  // El caso real del dueño, con sus números.
  const elCaso = { bloques: 100, bloquesHechos: 100, escritas: 209, total: 598, detenido: false };

  it('NO dice que terminó', () => {
    expect(estadoDelProgreso(elCaso).terminado).toBe(false);
  });

  it('tampoco dice que se cortó: nadie detuvo nada', () => {
    expect(estadoDelProgreso(elCaso).cortado).toBe(false);
  });

  it('lo dice con su propio estado', () => {
    expect(estadoDelProgreso(elCaso).conFallos).toBe(true);
  });

  it('y el porcentaje sigue siendo el de las jornadas, no el de los bloques', () => {
    // 209 de 598 es 35 %. Sobre bloques habría dicho 100 %, que es justo lo que se veía al lado del
    // «Listo» y lo que hacía que las dos mitades de la ventana se contradijeran.
    expect(estadoDelProgreso(elCaso).pct).toBe(35);
  });

  it('escribirlo TODO sigue siendo terminado, y sin fallos', () => {
    const r = estadoDelProgreso({ bloques: 100, bloquesHechos: 100, escritas: 598, total: 598, detenido: false });
    expect(r).toMatchObject({ terminado: true, cortado: false, conFallos: false });
  });

  it('a medio camino no hay fallos todavía: lo que falta puede estar por enviarse', () => {
    // Con cincuenta bloques hechos, que `escritas` vaya por debajo del total es lo NORMAL. Decir
    // «hubo fallos» ahí alarmaría en cada envío, y a mitad de camino no se puede afirmar.
    const r = estadoDelProgreso({ bloques: 100, bloquesHechos: 50, escritas: 300, total: 598, detenido: false });
    expect(r).toMatchObject({ terminado: false, cortado: false, conFallos: false });
  });

  it('un envío CORTADO no se llama además fallido', () => {
    // Quedan jornadas sin escribir, sí, pero porque alguien lo detuvo. «Se detuvo» ya lo explica, y
    // decir las dos cosas mandaría a buscar un error del servidor que no hubo.
    const r = estadoDelProgreso({ bloques: 100, bloquesHechos: 40, escritas: 240, total: 598, detenido: true });
    expect(r).toMatchObject({ cortado: true, conFallos: false });
  });

  it('sin nada que escribir no se inventa un fallo', () => {
    const r = estadoDelProgreso({ bloques: 0, bloquesHechos: 0, escritas: 0, total: 0, detenido: false });
    expect(r).toMatchObject({ terminado: true, conFallos: false });
  });
});
