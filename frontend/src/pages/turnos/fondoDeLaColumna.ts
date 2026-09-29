// EL FONDO DE UNA COLUMNA DE LA REJILLA. Ver el bloque de la prueba para el porqué de la precedencia.
//
// El resumen: cuatro situaciones quieren pintar el mismo sitio y solo puede ganar una. La selección
// gana siempre porque es lo que acaba de hacer quien mira, y un fondo que no responde al gesto se lee
// como que el gesto no funcionó. Hoy gana al relleno de otro mes porque hoy puede CAER en el relleno
// —el 1 de octubre en la vista de septiembre— y ahí es cuando más falta hace.
export type EstadoDeLaColumna = {
  // Su fila, o su columna, está marcada ENTERA. No es «esta celda está marcada»: eso lo dice el halo
  // de la propia celda, y es otra cosa.
  enSeleccionEntera: boolean;
  esHoy: boolean;
  // El relleno de la primera y la última fila de la vista de mes, que son días del mes vecino.
  deOtroMes: boolean;
};

// UN CASO POR VALOR Y NO UN `? :` ENCADENADO (§9.4): son cuatro salidas hoy, la quinta ya se ve venir
// (la columna de un festivo), y con ternarios anidados la quinta heredaría en silencio el fondo de
// otra. Escrito así, obliga a venir aquí a decidir.
//
// LAS CLASES VAN ENTERAS, no armadas: `bg-${x}-100` se ve bien en desarrollo y sale SIN COLOR en el
// paquete de producción, porque Tailwind purga lo que no encuentra escrito.
//
// SON OPACAS Y NO `bg-primary/20`, y eso tiene una razón concreta (29 de septiembre de 2026): la
// columna de la persona es `sticky`, y un fondo translúcido deja ver por debajo las columnas que
// pasan al desplazar. Los dos valores son exactamente el amarillo de la marca compuesto sobre blanco
// —#FFD85E al 20 % y al 5 %—, así que se ven igual que antes en el resto de la rejilla.
export function fondoDeLaColumna({ enSeleccionEntera, esHoy, deOtroMes }: EstadoDeLaColumna): string {
  // `!` PORQUE COMPITE CON EL GRIS DEL RELLENO. Dos utilidades del mismo `background-color` las ordena
  // la HOJA de estilos, no la posición en el atributo `class`: sin el `!`, el gris gana aunque se
  // escriba después. Es la misma trampa que ya mordió con los bordes de la celda marcada.
  if (enSeleccionEntera) return '!bg-[#fff7df]';
  // Un tinte y no un borde: el número de hoy ya lleva su píldora oscura, y dos marcas fuertes en la
  // misma columna compiten. Esto solo tiene que decir «esta columna es la de hoy» de reojo.
  if (esHoy) return 'bg-[#fffdf7]';
  if (deOtroMes) return 'bg-gray-100';
  return '';
}
