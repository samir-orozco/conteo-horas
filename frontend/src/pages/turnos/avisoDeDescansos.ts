// EL CHIP DE LA FILA: «2 descansos · ocasional». Ver el bloque de la prueba para el porqué.
//
// El resumen: uno o dos descansos trabajados en el mes se pagan con recargo; desde el tercero, la
// compensación EN TIEMPO deja de ser opcional (art. 181). La diferencia entre las dos palabras
// cambia lo que la empresa debe, así que va en la fila de esa persona y no solo en un total.

type Habitual = { trabajados: number; clase: 'NINGUNO' | 'OCASIONAL' | 'HABITUAL' };

export function avisoDeDescansos({ trabajados, clase }: Habitual): { texto: string; grave: boolean } | null {
  // `NINGUNO` no dibuja nada aunque venga con número: ese estado el servidor no debería mandarlo, y
  // ponerle una palabra aquí sería inventarse una categoría legal. Que falte el chip se nota y se
  // pregunta; que diga «ocasional» sin serlo, no.
  if (clase === 'NINGUNO') return null;

  // LA CLASE ES DEL SERVIDOR Y NO SE DEDUCE DEL NÚMERO. El umbral vive allá (`MINIMO_HABITUAL`) y
  // puede cambiar; deduciéndolo aquí, la pantalla diría «ocasional» de alguien a quien el servidor ya
  // cuenta como habitual, y la compensación en tiempo no se reclamaría.
  return {
    texto: `${trabajados} ${trabajados === 1 ? 'descanso' : 'descansos'} · ${
      clase === 'HABITUAL' ? 'habitual' : 'ocasional'}`,
    grave: clase === 'HABITUAL',
  };
}
