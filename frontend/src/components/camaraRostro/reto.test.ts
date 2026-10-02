import { describe, it, expect } from 'vitest';
import { sortearLado, poseDelReto, flechaDelReto, LADO_PANTALLA_DERECHA, lecturaDelGiro, MARCAS_DEL_MEDIDOR, textoDelReto } from './reto';
import { poseCumple, SIGNO_DERECHA, UMBRAL_GIRO_MIN, UMBRAL_GIRO_MAX } from './rostroCliente';

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

// CUÁNTO FALTA PARA EL GIRO (2 de octubre de 2026, pedido del dueño a partir de una
// app de verificación que vio ese día).
//
// La flecha decía hacia dónde girar, pero no cuánto. Quien giraba poco se quedaba
// esperando sin saber por qué, y quien giraba de más se pasaba del tope y el reto
// tampoco avanzaba. Ahora una regla de marcas al lado del óvalo se llena a medida
// que se gira, y el texto dice si falta, si sobra o si va al otro lado.
describe('la lectura del giro', () => {
  // El yaw que corresponde a girar hacia el lado pedido, con el signo que use la
  // detección (SIGNO_DERECHA), para no razonar el espejo de cabeza.
  const hacia = (lado: 'derecha' | 'izquierda', magnitud: number) =>
    (lado === 'derecha' ? SIGNO_DERECHA : -SIGNO_DERECHA) * magnitud;

  it('de frente no ha avanzado nada', () => {
    expect(lecturaDelGiro('derecha', 0)).toEqual({ estado: 'FALTA', avance: 0, encendidas: 0 });
  });

  it('a mitad del camino la regla va por la mitad', () => {
    const l = lecturaDelGiro('derecha', hacia('derecha', UMBRAL_GIRO_MIN / 2));
    expect(l.estado).toBe('FALTA');
    expect(l.avance).toBeCloseTo(0.5, 5);
    expect(l.encendidas).toBe(MARCAS_DEL_MEDIDOR / 2);
  });

  it('pasado el umbral está lista y la regla llena', () => {
    expect(lecturaDelGiro('izquierda', hacia('izquierda', 0.2))).toEqual({ estado: 'LISTO', avance: 1, encendidas: MARCAS_DEL_MEDIDOR });
  });

  it('pasado el tope, sobra: hay que girar menos', () => {
    expect(lecturaDelGiro('derecha', hacia('derecha', UMBRAL_GIRO_MAX + 0.05)).estado).toBe('DE_MAS');
  });

  it('girando hacia el lado contrario tanto como un giro de verdad, va al revés', () => {
    expect(lecturaDelGiro('derecha', hacia('izquierda', UMBRAL_GIRO_MIN + 0.02)).estado).toBe('AL_REVES');
  });

  it('un temblor hacia el otro lado no se trata como «al revés»', () => {
    expect(lecturaDelGiro('derecha', hacia('izquierda', 0.03)).estado).toBe('FALTA');
  });

  // LA REGLA DEL MEDIDOR NO PUEDE DECIR «LISTO» CUANDO LA DETECCIÓN NO LO DA POR
  // CUMPLIDO, ni al revés: sería una flecha que se contradice con lo que el reto
  // espera, que es lo que este archivo existe para impedir.
  it('dice LISTO exactamente cuando el reto da el giro por cumplido, en todo el recorrido', () => {
    for (const lado of ['derecha', 'izquierda'] as const) {
      for (let yaw = -0.6; yaw <= 0.6; yaw += 0.005) {
        expect(lecturaDelGiro(lado, yaw).estado === 'LISTO').toBe(poseCumple(lado, yaw));
      }
    }
  });
});

// QUÉ DICE LA PANTALLA EN CADA MOMENTO DEL RETO. Una cosa a la vez y en grande: pedir
// dos a la vez es lo que hizo fracasar el intento del parpadeo.
describe('el texto del reto', () => {
  it('girando: falta, listo, de más o al revés', () => {
    expect(textoDelReto('GIRAR', 'FALTA').titulo).toBe('Gire la cabeza hacia la flecha');
    expect(textoDelReto('GIRAR', 'LISTO').titulo).toBe('¡Así! No se mueva');
    expect(textoDelReto('GIRAR', 'DE_MAS').titulo).toBe('Un poco menos');
    expect(textoDelReto('GIRAR', 'AL_REVES').titulo).toBe('Hacia el otro lado');
  });

  it('volviendo al frente, lo que se haya leído del giro ya no importa', () => {
    expect(textoDelReto('VOLVER', 'DE_MAS').titulo).toBe('Ahora vuelva a mirar al frente');
    expect(textoDelReto('VOLVER', 'FALTA').titulo).toBe('Ahora vuelva a mirar al frente');
  });
});
