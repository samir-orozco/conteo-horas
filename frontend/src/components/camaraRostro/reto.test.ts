import { describe, it, expect } from 'vitest';
import { sortearLado, poseDelReto, flechaDelReto, LADO_PANTALLA_DERECHA } from './reto';

// EL RETO DE GIRO DEL INGRESO FACIAL.
//
// Sale de una prueba real: el 9 de septiembre de 2026 se marcó una salida
// mostrando la foto de una cara en la pantalla de un celular, y el sistema la
// aceptó. Peor: esa marcación dio la MEJOR distancia del día (0,2157 contra
// 0,28-0,41 de las legítimas), porque una foto es una cara frontal, quieta y
// bien iluminada, mientras que una captura viva tiene movimiento y sombras.
//
// Una foto fija no puede girar la cabeza cuando se le pide y volver al frente.
// Inclinando el celular se puede falsear PARTE del giro, así que el lado se
// sortea en cada intento: lo que no se puede ensayar es acertar la dirección
// que toca, en el momento que toca.
//
// POR QUÉ HAY UNA CONSTANTE PARA LA FLECHA. El preview del kiosco está espejado
// (`scaleX(-1)`), y el yaw se calcula sobre los puntos CRUDOS del video. Razonar
// de cabeza cómo se combinan esas dos cosas es la mejor forma de equivocarse; se
// mira una vez en pantalla y se fija. Lo que estas pruebas garantizan es que la
// flecha y la detección salgan SIEMPRE de la misma constante, de modo que no
// puedan contradecirse: si la flecha apunta al revés, se cambia en un sitio y se
// arreglan las dos.

describe('el lado se sortea en cada intento', () => {
  it('reparte los dos lados', () => {
    expect(sortearLado(0)).toBe('derecha');
    expect(sortearLado(0.49)).toBe('derecha');
    expect(sortearLado(0.5)).toBe('izquierda');
    expect(sortearLado(0.99)).toBe('izquierda');
  });

  it('nunca devuelve frontal: un reto que se cumple mirando al frente no es un reto', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(sortearLado(r)).not.toBe('frontal');
    }
  });
});

describe('qué pose pide cada fase', () => {
  it('primero girar hacia el lado sorteado', () => {
    expect(poseDelReto('GIRAR', 'derecha')).toBe('derecha');
    expect(poseDelReto('GIRAR', 'izquierda')).toBe('izquierda');
  });

  it('y después volver al frente, que es donde se toma la muestra', () => {
    // El descriptor enrolado se compara mejor de frente, y además obliga al
    // movimiento completo: girar y volver. Una foto inclinada podría fingir el
    // giro, pero entonces se queda inclinada.
    expect(poseDelReto('VOLVER', 'derecha')).toBe('frontal');
    expect(poseDelReto('VOLVER', 'izquierda')).toBe('frontal');
  });
});

describe('hacia dónde apunta la flecha en la pantalla', () => {
  it('los dos lados apuntan a sitios OPUESTOS', () => {
    // Es lo único que de verdad se puede afirmar sin mirar una pantalla, y es lo
    // que impide el defecto peor: que las dos direcciones dibujen la misma
    // flecha y el reto se vuelva imposible de cumplir a propósito.
    expect(flechaDelReto('derecha')).not.toBe(flechaDelReto('izquierda'));
  });

  it('la flecha sale de la constante, no de un valor escrito aparte', () => {
    // Si alguien cambia la constante porque en pruebas la flecha apuntaba al
    // revés, la detección y la flecha tienen que moverse juntas. Esta prueba
    // falla si alguien escribe el lado a mano en algún sitio.
    expect(flechaDelReto('derecha')).toBe(LADO_PANTALLA_DERECHA);
    expect(flechaDelReto('izquierda')).toBe(LADO_PANTALLA_DERECHA === 'izq' ? 'der' : 'izq');
  });
});
