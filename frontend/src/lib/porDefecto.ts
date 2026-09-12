// La etiqueta de una sede que ninguna marca probó con la ubicación y que se le
// muestra y se le cuenta a un presencial al leer (decisión del dueño del 12 de
// septiembre de 2026, «mostrarla al leer»). Vive en un solo lugar para que
// reportes, registros y colaboradores la escriban igual.
//
// Entre paréntesis y no con « · »: en los reportes las sedes de un mixto ya van
// separadas por « · », y «Norte · por defecto · Sur» no dice de cuál de las dos es.
export function nombreConDefecto(nombre: string): string {
  return `${nombre} (por defecto)`;
}
