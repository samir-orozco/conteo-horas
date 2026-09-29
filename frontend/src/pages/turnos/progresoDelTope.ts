// CUÁNTO LLEVA ALGUIEN DE SU TOPE SEMANAL, para la barra de la columna de total. El bloque de la
// prueba tiene el razonamiento entero; el resumen es que la barra y el número NO dicen lo mismo
// cuando alguien se pasa, y eso es a propósito:
//
//   `ancho` se corta en 100 porque una barra más larga que su carril no se puede dibujar sin
//   reescalar el carril, y reescalándolo 50 h se verían MÁS cortas que 42 h en la fila de al lado.
//   `pct` dice la verdad, 120, porque recortarlo escondería justo el dato que importa.
//
// El tope entra por parámetro: sale de la jornada legal vigente, que bajó a 42 h en 2026.
export function progresoDelTope(
  minutos: number,
  topeMinutos: number,
): { pct: number; ancho: number; pasa: boolean } {
  // Sin tope no hay contra qué medir. Cero y «no se pasa» es lo único que se puede afirmar sin
  // inventar nada; dividir daría `Infinity` y una barra rota.
  if (topeMinutos <= 0) return { pct: 0, ancho: 0, pasa: false };

  const pct = Math.round((minutos / topeMinutos) * 100);
  return {
    pct,
    ancho: Math.min(100, Math.max(0, pct)),
    // `>` y no `>=`: el tope JUSTO se cumple. Con `>=`, quien cumple la ley al milímetro saldría en
    // rojo y el aviso dejaría de significar «hay que quitarle horas».
    pasa: minutos > topeMinutos,
  };
}
