// Cuánto cabe en los textos del colaborador (13 de septiembre de 2026). Son varchar(191), que es lo que
// crea Prisma en MySQL para un String sin tamaño. Medido contra MySQL: 191 caracteres caben y 192 no, y
// cuenta caracteres, no la longitud de JavaScript: un emoji es uno solo.
//
// La usan la carga masiva y el alta y la edición de una persona. Antes ninguna revisaba el largo: MySQL
// rechazaba el valor al guardar y la pantalla no decía por qué.
export const MAX_CARACTERES = 191;

// Las columnas de texto, con el nombre que ve la persona.
export const TEXTOS_DEL_COLABORADOR = {
  nombre: 'Nombre', apellido: 'Apellido', cedula: 'Cédula', cargo: 'Cargo', email: 'Correo', telefono: 'Teléfono',
} as const;

export const caracteres = (valor: string) => Array.from(valor).length;

// El primer texto que no cabe, dicho para la pantalla, o null si todos caben. Mide lo que llega sin
// recortar, porque el alta lo guarda así.
export function textoMuyLargo(datos: Record<string, unknown>): string | null {
  for (const [clave, nombre] of Object.entries(TEXTOS_DEL_COLABORADOR)) {
    const valor = datos[clave];
    if (typeof valor !== 'string') continue;
    const largo = caracteres(valor);
    if (largo > MAX_CARACTERES) return `El campo ${nombre} tiene ${largo} caracteres y caben ${MAX_CARACTERES}.`;
  }
  return null;
}
