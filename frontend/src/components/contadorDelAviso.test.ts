import { describe, it, expect } from 'vitest';
import { rotuloDelContador, sumarRepeticion, TOPE_DEL_CONTADOR } from './contadorDelAviso';

// EL CONTADOR DE UN AVISO QUE SE REPITE (29 de septiembre de 2026, pedido del dueño).
//
// Sale de un caso concreto: una celda de un día ya pasado no se puede marcar, y al hacerle clic no
// pasa NADA. Quien no sabe por qué, vuelve a hacer clic. Ahora sale un aviso que lo explica, y el
// pedido del dueño es que los clics siguientes NO apilen doce avisos iguales: «si le dan varias
// veces sea la misma alerta con un número».
//
// EL PRIMERO NO LLEVA NÚMERO, y por eso esto devuelve `null` en vez de «1». Un «1» al lado de un
// aviso que acaba de salir no informa de nada —claro que pasó una vez, ahí está— y además obliga a
// leerlo para descartarlo. El número aparece cuando empieza a significar algo, que es a la segunda.
//
// EL TOPE ES 9+ Y DETIENE LA CUENTA DE VERDAD, no solo lo que se pinta. Es lo que pidió el dueño
// («hasta llegar a 9+, que ya después de eso no deje dar más») y además tiene una razón: si el número
// siguiera subiendo por dentro hasta 300, cada clic seguiría cambiando el estado y volviendo a
// disparar el temblor. Parándolo, a partir del décimo la pantalla se queda quieta.
//
// EL PRECIO, dicho para que se sepa: pasado el tope, un clic más no da NINGUNA señal nueva. El aviso
// sigue en pantalla diciendo por qué, que es lo que hay que leer, pero quien insista no verá moverse
// nada. Es la consecuencia de detener la cuenta, no un descuido.

describe('el contador de un aviso repetido', () => {
  it('la primera vez no lleva número', () => {
    expect(rotuloDelContador(1)).toBeNull();
  });

  it('desde la segunda sí, y dice cuántas van', () => {
    expect(rotuloDelContador(2)).toBe('2');
    expect(rotuloDelContador(5)).toBe('5');
    expect(rotuloDelContador(9)).toBe('9');
  });

  it('a partir del décimo dice «9+» y ya no crece', () => {
    expect(rotuloDelContador(10)).toBe('9+');
    expect(rotuloDelContador(11)).toBe('9+');
    expect(rotuloDelContador(400)).toBe('9+');
  });

  it('EL NUEVE SE VE ENTERO antes de saltar a «9+»', () => {
    // El borde. Con `>= 9` en vez de `> 9`, el nueve no se vería nunca: se pasaría de «8» a «9+» y el
    // aviso diría «más de nueve» cuando van exactamente nueve.
    expect(rotuloDelContador(9)).toBe('9');
    expect(rotuloDelContador(10)).toBe('9+');
  });

  it('cero o menos no lleva número, y no revienta', () => {
    // No debería llegar: el contador nace en uno. Inventarle un «0» a un aviso que está en pantalla
    // diría que no ha pasado, que es lo contrario de lo que se ve.
    expect(rotuloDelContador(0)).toBeNull();
    expect(rotuloDelContador(-3)).toBeNull();
  });

  it('sumar una repetición cuenta de uno en uno', () => {
    expect(sumarRepeticion(1)).toBe(2);
    expect(sumarRepeticion(8)).toBe(9);
  });

  it('Y SE DETIENE EN EL TOPE: del décimo no pasa', () => {
    // Lo que pidió el dueño. Y lo que evita que cada clic siga cambiando el estado y redisparando el
    // temblor para siempre.
    expect(sumarRepeticion(9)).toBe(TOPE_DEL_CONTADOR);
    expect(sumarRepeticion(TOPE_DEL_CONTADOR)).toBe(TOPE_DEL_CONTADOR);
    expect(sumarRepeticion(TOPE_DEL_CONTADOR + 50)).toBe(TOPE_DEL_CONTADOR);
  });

  it('el tope es el primer valor que se pinta como «9+»', () => {
    // Amarra las dos funciones: si alguien cambiara el tope sin tocar el rótulo, la cuenta se pararía
    // en un número que todavía se pinta como cifra y el aviso se quedaría clavado en «8» para siempre.
    expect(rotuloDelContador(TOPE_DEL_CONTADOR)).toBe('9+');
    expect(rotuloDelContador(TOPE_DEL_CONTADOR - 1)).toBe(String(TOPE_DEL_CONTADOR - 1));
  });
});
