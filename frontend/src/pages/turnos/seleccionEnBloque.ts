// LA SELECCIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Programar a veinte personas un mes entero pintando día por día son seiscientos clics. Lo que hace
// viable el planificador es marcar un RECTÁNGULO: clic en una esquina, clic en la otra, y queda
// seleccionado todo lo de en medio.
//
// POR QUÉ ESTO ES UNA DECISIÓN PURA Y NO UN PUÑADO DE `onClick`: qué celdas caen dentro depende del
// ORDEN de la rejilla, que es filas por columnas, y ese orden lo decide la respuesta del servidor,
// no el ratón. Con las dos esquinas y las dos listas, el resto es aritmética, y se puede probar sin
// montar la pantalla.

export type Celda = { colaboradorId: string; fecha: string };

// La identidad de una celda es la misma pareja con la que el backend escribe un día
// (`PUT /turnos/dia` recibe `colaboradorId` y `fecha`). Así lo seleccionado se convierte en
// escrituras sin traducir nada por el camino.
//
// La barra vertical no aparece en un cuid ni en una fecha ISO, así que no hay forma de que dos
// celdas distintas colisionen en la misma clave.
export function claveDeCelda({ colaboradorId, fecha }: Celda): string {
  return `${colaboradorId}|${fecha}`;
}

// Todas las celdas entre dos esquinas, en el orden en que se leen: por filas.
//
// POR FILAS Y NO POR COLUMNAS, y no es indiferente: es también el orden en que se van a escribir,
// así que el progreso avanza persona por persona en vez de saltar entre ellas, que es lo que
// alguien mirando la pantalla espera ver.
//
// DA IGUAL POR QUÉ ESQUINA SE EMPIECE. Nadie arrastra siempre de arriba a la izquierda hacia abajo
// a la derecha, así que las dos esquinas se normalizan con min/max en vez de exigir un orden.
//
// UNA ESQUINA QUE NO ESTÁ EN LA REJILLA DEVUELVE NADA, y esto es deliberado: puede pasar tras
// recargar, cuando la selección guardaba a alguien que el filtro ya no muestra. Devolver un
// rectángulo a medias sería peor que no devolver nada, porque se escribiría sobre gente que quien
// lo marcó no está viendo.
export function celdasDelRectangulo(
  a: Celda,
  b: Celda,
  colaboradores: readonly string[],
  fechas: readonly string[],
): Celda[] {
  const filaA = colaboradores.indexOf(a.colaboradorId);
  const filaB = colaboradores.indexOf(b.colaboradorId);
  const colA = fechas.indexOf(a.fecha);
  const colB = fechas.indexOf(b.fecha);
  if (filaA === -1 || filaB === -1 || colA === -1 || colB === -1) return [];

  const desdeFila = Math.min(filaA, filaB);
  const hastaFila = Math.max(filaA, filaB);
  const desdeCol = Math.min(colA, colB);
  const hastaCol = Math.max(colA, colB);

  const celdas: Celda[] = [];
  for (let f = desdeFila; f <= hastaFila; f++) {
    for (let c = desdeCol; c <= hastaCol; c++) {
      celdas.push({ colaboradorId: colaboradores[f], fecha: fechas[c] });
    }
  }
  return celdas;
}
