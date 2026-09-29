import { sePuedePintar } from './semana';

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

// ────────── LO QUE NO SE PUEDE ESCRIBIR NO SE PUEDE MARCAR (29 de septiembre de 2026) ──────────
//
// Pedido del dueño: «si no lo puedo cambiar, sería bueno que no lo deje seleccionar tampoco». Antes
// una celda de un día pasado entraba a la selección, se pintaba apagada, y solo al confirmar salía
// la línea «no se tocan porque el día ya pasó: 30».
//
// PASA POR `sePuedePintar` Y NO POR UNA COMPARACIÓN PROPIA: es la misma regla con la que la rejilla
// decide si dibuja el «+», la misma del plan de escritura y la misma de la previa. Con una copia
// aquí, la pantalla ofrecería marcar algo que el envío descartaría en silencio (§9.3).
//
// GENÉRICA EN `T` Y NO SOBRE `Celda`: quien llama marca celdas que llevan datos de más (la marca
// guarda la fila y la columna para poder deshacer), y estrechar el tipo obligaría a volver a armar
// los objetos después de filtrarlos.
export function escribibles<T extends { fecha: string }>(celdas: readonly T[], hoy: string): T[] {
  return celdas.filter(c => sePuedePintar(c.fecha, hoy));
}

// MARCAR O DESMARCAR UN CONJUNTO ENTERO: la fila de una persona, la columna de un día.
//
// Los dos botones son interruptores: si ya está todo marcado, el segundo clic lo quita.
//
// LA DIRECCIÓN SE DECIDE SOBRE LO ESCRIBIBLE Y NO SOBRE LO PEDIDO, y esa es toda la decisión. Una
// fila que empieza el lunes cuando hoy es jueves lleva tres días que no se pueden marcar y que no se
// van a marcar nunca; contándolos, la fila no estaría «completa» jamás y el botón pasaría a marcar
// siempre sin poder apagar. El interruptor se rompería en el gesto más usado de la pantalla y nada
// fallaría: simplemente dejaría de desmarcar.
//
// `every` Y NO `some`: se apaga solo cuando está TODA marcada. Con `some`, una fila a la que le
// falta un día se apagaría entera y quien la estaba armando perdería lo que llevaba.
export function alternarConjunto<T extends { fecha: string }>(
  celdas: readonly T[],
  estaMarcada: (celda: T) => boolean,
  hoy: string,
): { celdas: T[]; apagar: boolean } {
  const suyas = escribibles(celdas, hoy);
  return { celdas: suyas, apagar: suyas.every(estaMarcada) };
}
