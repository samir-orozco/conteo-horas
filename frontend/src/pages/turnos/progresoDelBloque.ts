// POR DÓNDE VA UN ENVÍO DE CIENTOS DE JORNADAS (28 de septiembre de 2026).
//
// Hoy esto es una línea de texto dentro de la tarjeta: «Bloque 2 de 7 · no cierres esta ventana». Con
// siete bloques informa; con treinta, quien mira no sabe si va por la mitad o por el final, y un
// guardado que tarda y no dice nada se lee como uno colgado.
//
// POR QUÉ ES PURO Y NO UNAS CUENTAS DENTRO DEL MODAL: de aquí sale el número con el que una persona
// decide si espera o si detiene. Un porcentaje calculado sobre el denominador equivocado no se ve
// mal: se ve plausible.

export type PasoDelBloque = 'HECHO' | 'EN_CURSO' | 'PENDIENTE';

export type EstadoDelProgreso = {
  // Entero de 0 a 100.
  pct: number;
  // Uno por bloque, para los círculos.
  pasos: PasoDelBloque[];
  // Con más de diez bloques los círculos no se dibujan y manda la barra.
  seVenLosPasos: boolean;
  // Se escribieron todos los bloques.
  terminado: boolean;
  // Se pidió detener y QUEDARON bloques sin escribir. No es lo mismo que terminado, y la ventana lo
  // dice distinto: «Listo» frente a «Se detuvo».
  cortado: boolean;
  // SE ENVIÓ TODO Y EL SERVIDOR RECHAZÓ PARTE (29 de septiembre de 2026). El tercer final, que hasta
  // hoy no existía: la ventana decía «Listo» en verde encima de una barra al 35 % y de «209 de 598».
  // No es `cortado` —nadie detuvo nada— y no es `terminado` —falta lo que no se aceptó—.
  conFallos: boolean;
};

export function estadoDelProgreso({ bloques, bloquesHechos, escritas, total, detenido }: {
  bloques: number;
  bloquesHechos: number;
  escritas: number;
  total: number;
  detenido: boolean;
}): EstadoDelProgreso {
  // EL PORCENTAJE VA SOBRE JORNADAS Y NO SOBRE BLOQUES, y esa es la decisión central de este módulo.
  // Los bloques no son iguales: el último puede llevar una jornada o seis. Sobre bloques, un envío de
  // 31 jornadas en 6 bloques saltaría de 83% a 100% escribiendo una sola, y el primer bloque diría
  // 17% habiendo escrito seis de 31, que es 19%. Números parecidos, y por eso peligrosos.
  //
  // LA GUARDA DEL CERO NO ES PARANOIA: con todo lo marcado en el pasado no hay nada que escribir, y
  // `0/0` es NaN. La maqueta de esto tiene ese defecto documentado, mostrando «NaN%».
  const pct = total > 0 ? Math.round((escritas / total) * 100) : 0;

  // SE ENVIARON TODOS LOS BLOQUES. Es el final del RECORRIDO, no el veredicto: que se mandaran los
  // cien bloques no dice que el servidor aceptara las seiscientas jornadas.
  const seEnviaronTodos = bloquesHechos >= bloques;
  // DETENER EN EL ÚLTIMO BLOQUE NO ES CORTAR. Se detiene AL TERMINAR el bloque en curso; si ese era el
  // último, no quedó nada sin escribir y decir «se detuvo» sería alarmar por nada.
  const cortado = detenido && bloquesHechos < bloques;

  // HUBO FALLOS: se recorrió todo y aun así faltan jornadas. Solo se puede afirmar AL FINAL: a mitad
  // de camino, que `escritas` vaya por debajo del total es lo normal, y decirlo ahí alarmaría en cada
  // envío.
  //
  // AQUÍ HABÍA UN `&& !cortado` Y ERA CÓDIGO MUERTO, descubierto mutándolo: al quitarlo no se puso
  // roja ninguna prueba. La razón es que `cortado` exige `bloquesHechos < bloques` y `seEnviaronTodos`
  // exige justo lo contrario, así que los dos no pueden ser ciertos a la vez. Un envío cortado nunca
  // llega aquí. Es el segundo de este archivo: el `pisaEsteEnvio <= 0` de la previa cayó igual.
  const conFallos = seEnviaronTodos && escritas < total;
  // TERMINADO ES «SE ESCRIBIÓ TODO», no «se enviaron todos los bloques». Era esto exactamente: la
  // línea decía `bloquesHechos >= bloques` y con eso el visto verde salía encima de dos tercios sin
  // escribir.
  const terminado = seEnviaronTodos && !conFallos;

  const pasos: PasoDelBloque[] = [];
  for (let i = 0; i < bloques; i++) {
    if (i < bloquesHechos) pasos.push('HECHO');
    // EN CURSO solo si de verdad hay algo corriendo. Cortado no es «sigue corriendo»: pintar ahí un
    // círculo activo diría que todavía se está escribiendo algo.
    else if (i === bloquesHechos && !cortado) pasos.push('EN_CURSO');
    else pasos.push('PENDIENTE');
  }

  return {
    pct,
    pasos,
    // «Más de diez» es once, no diez. Cien circulitos no informan de nada y la barra sí.
    seVenLosPasos: bloques > 0 && bloques <= 10,
    terminado,
    cortado,
    conFallos,
  };
}
