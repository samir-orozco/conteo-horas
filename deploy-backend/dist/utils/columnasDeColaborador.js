"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLABORADOR_SIN_DESCRIPTOR = exports.COLABORADOR_SIN_FOTOS = void 0;
// Todas las columnas de un colaborador menos `foto`, `fotoMini` y `rostroDescriptor`, para las
// respuestas que devuelven el colaborador entero (13 de septiembre de 2026). GET
// /reportes/liquidacion mandaba al navegador las dos fotos, base64 de cientos de KB, y el
// descriptor facial, que es un dato biométrico, sin que ninguna pantalla los use desde ese
// reporte: solo leen el nombre y el apellido.
//
// Una lista y no «todas menos esas»: el cliente de Prisma 5.22 no tiene `omit` sin activar una
// función en vista previa del esquema. La prueba de al lado la compara con las columnas que
// declara el cliente, así que una columna nueva no se queda afuera sin que nadie lo note.
exports.COLABORADOR_SIN_FOTOS = {
    id: true, empresaId: true, nombre: true, apellido: true, cedula: true, cargo: true, email: true,
    telefono: true, fechaNacimiento: true, salarioMensual: true, auxilioTransporte: true, rostroEnroladoEn: true, rostroRechazadoEn: true, horarioId: true,
    modalidad: true, puedeCerrarEnOtraSede: true, activo: true, fechaRetiro: true, motivoRetiro: true,
    retiroProgramado: true, creadoEn: true, actualizadoEn: true,
};
// Lo que devuelven la ficha y las rutas que crean, editan, retiran o reingresan a una persona: las
// fotos sí, porque la ficha las pinta, pero no el descriptor facial, que viajaba al navegador sin que
// ninguna pantalla lo use.
exports.COLABORADOR_SIN_DESCRIPTOR = {
    ...exports.COLABORADOR_SIN_FOTOS, foto: true, fotoMini: true,
};
