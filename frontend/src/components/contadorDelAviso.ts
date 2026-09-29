// EL CONTADOR DE UN AVISO QUE SE REPITE. Ver el bloque de la prueba para el porqué de cada borde.
//
// El resumen: una celda de un día ya pasado no se puede marcar, y al hacerle clic no pasaba NADA.
// Quien no sabe por qué, vuelve a hacer clic. Ahora sale un aviso que lo explica, y los clics
// siguientes no apilan doce avisos iguales: suben un número dentro del mismo.

// EL PRIMER VALOR QUE YA NO SE PINTA COMO CIFRA. Es a la vez el techo de la cuenta y el umbral del
// rótulo, y por eso es UNA constante y no dos números sueltos: con dos, cambiar uno y olvidar el otro
// deja el aviso clavado en «8» para siempre o contando hasta trescientos por dentro.
export const TOPE_DEL_CONTADOR = 10;

// `null` LA PRIMERA VEZ, y no la cadena «1». Un «1» al lado de un aviso que acaba de salir no informa
// de nada —claro que pasó una vez, ahí está— y obliga a leerlo para descartarlo. El número aparece
// cuando empieza a significar algo, que es a la segunda. Devolviendo `null`, quien pinta no puede
// «olvidarse» del caso: el tipo le obliga a decidir qué hace sin número.
export function rotuloDelContador(veces: number): string | null {
  if (veces < 2) return null;
  // `>=` y no `>`: el tope ES el primero que se dice «9+». Con `>`, el diez se pintaría «10» y el
  // rótulo nunca cuadraría con el punto donde la cuenta se detiene.
  return veces >= TOPE_DEL_CONTADOR ? `${TOPE_DEL_CONTADOR - 1}+` : String(veces);
}

// SE DETIENE EN EL TOPE DE VERDAD, no solo en lo que se pinta (pedido del dueño: «después de eso no
// deje dar más»). Si siguiera subiendo por dentro, cada clic cambiaría el estado y volvería a
// disparar el temblor para siempre.
//
// EL PRECIO, dicho para que se sepa: pasado el tope, un clic más no da ninguna señal nueva. El aviso
// sigue en pantalla diciendo por qué, pero quien insista no verá moverse nada.
export function sumarRepeticion(veces: number): number {
  return Math.min(veces + 1, TOPE_DEL_CONTADOR);
}
