// Qué auxilio de transporte se guarda en la ficha de una persona (17 de septiembre de 2026).
//
// `normalizar()` en routes/colaboradores.ts NO filtra campos: muta lo que llega en el cuerpo y lo
// devuelve, así que cualquier valor entra derecho a Prisma. Los guardas de la modalidad, del permiso
// de otra sede y del texto largo existen justo por eso: sin ellos, un valor crudo sale como un 500
// sin explicación. Este es el del auxilio.
//
// La diferencia con los otros: aquí `null` es un valor VÁLIDO y significa «el del decreto, si su
// básico da derecho». Por eso no se puede usar null como señal de error, como hace la modalidad, y
// hace falta un valor aparte para decir que lo que llegó no sirve.

export const AUXILIO_INVALIDO = 'INVALIDO' as const;

export type AuxilioNormalizado = number | null | undefined | typeof AUXILIO_INVALIDO;

// `undefined` significa «no venía en el cuerpo»: no se toca lo que ya está guardado. Es distinto de
// `null`, que es una decisión explícita de volver al valor del decreto.
export function normalizarAuxilio(valor: unknown): AuxilioNormalizado {
  if (valor === undefined) return undefined;
  // El formulario manda la cadena vacía cuando alguien borra el campo: eso es «que lo ponga el
  // decreto», no «cero pesos». Un cero se escribe con un cero.
  if (valor === null || valor === '') return null;

  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero)) return AUXILIO_INVALIDO;
  // Un auxilio negativo le restaría plata a la persona.
  if (numero < 0) return AUXILIO_INVALIDO;
  return numero;
}
