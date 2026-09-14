"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caracteres = exports.TEXTOS_DEL_COLABORADOR = exports.MAX_CARACTERES = void 0;
exports.textoMuyLargo = textoMuyLargo;
// Cuánto cabe en los textos del colaborador (13 de septiembre de 2026). Son varchar(191), que es lo que
// crea Prisma en MySQL para un String sin tamaño. Medido contra MySQL: 191 caracteres caben y 192 no, y
// cuenta caracteres, no la longitud de JavaScript: un emoji es uno solo.
//
// La usan la carga masiva y el alta y la edición de una persona. Antes ninguna revisaba el largo: MySQL
// rechazaba el valor al guardar y la pantalla no decía por qué.
exports.MAX_CARACTERES = 191;
// Las columnas de texto, con el nombre que ve la persona.
exports.TEXTOS_DEL_COLABORADOR = {
    nombre: 'Nombre', apellido: 'Apellido', cedula: 'Cédula', cargo: 'Cargo', email: 'Correo', telefono: 'Teléfono',
};
const caracteres = (valor) => Array.from(valor).length;
exports.caracteres = caracteres;
// El primer texto que no cabe, dicho para la pantalla, o null si todos caben. Mide lo que llega sin
// recortar, porque el alta lo guarda así.
function textoMuyLargo(datos) {
    for (const [clave, nombre] of Object.entries(exports.TEXTOS_DEL_COLABORADOR)) {
        const valor = datos[clave];
        if (typeof valor !== 'string')
            continue;
        const largo = (0, exports.caracteres)(valor);
        if (largo > exports.MAX_CARACTERES)
            return `El campo ${nombre} tiene ${largo} caracteres y caben ${exports.MAX_CARACTERES}.`;
    }
    return null;
}
