"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventoDeError = eventoDeError;
exports.eventoDeNavegador = eventoDeNavegador;
const huellaDeEvento_1 = require("./huellaDeEvento");
// De un error a la fila que se guarda (23 de septiembre de 2026).
//
// El detalle se guarda COMPLETO, incluida la consulta de Prisma con sus valores. Es una decisión
// tomada con el dueño sabiendo lo que implica: ahí pueden ir cédulas y correos de la gente. Sin el
// rastro entero, la mitad de los errores no se diagnostican y el módulo no sirve para lo que se
// pidió. Solo lo ve el super admin, y hay botón de borrado.
//
// Lo que NO se guarda es la respuesta al usuario: eso sigue siendo el texto fijo de
// `respuestaDeError.ts`, que es lo que impide que la consulta salga al navegador.
const MAXIMO_MENSAJE = 500;
const MAXIMO_DETALLE = 20000;
function textoDelError(error) {
    if (error instanceof Error) {
        return { mensaje: error.message || error.name, rastro: error.stack || error.message || '' };
    }
    return { mensaje: String(error), rastro: String(error) };
}
function eventoDeError(error, peticion, estado = 500) {
    const { mensaje, rastro } = textoDelError(error);
    // La ruta se guarda TAL CUAL (sin la consulta), porque el id concreto es lo que permite
    // reproducir el caso. Lo que se normaliza es la huella, que es lo que agrupa.
    const ruta = (peticion.url ?? '').split('?')[0] || null;
    return {
        tipo: 'ERROR',
        origen: 'SERVIDOR',
        huella: (0, huellaDeEvento_1.huellaDeEvento)(peticion.metodo, peticion.url, mensaje),
        mensaje: (0, huellaDeEvento_1.recortar)(mensaje, MAXIMO_MENSAJE),
        detalle: (0, huellaDeEvento_1.recortar)(rastro, MAXIMO_DETALLE),
        metodo: peticion.metodo?.toUpperCase() ?? null,
        ruta,
        estado,
        ip: peticion.ip ?? null,
        navegador: (0, huellaDeEvento_1.recortar)(peticion.navegador, 255) || null,
        usuarioId: peticion.usuario?.id ?? null,
        usuarioEmail: peticion.usuario?.email ?? null,
        usuarioNombre: peticion.usuario?.nombre ?? null,
        empresaId: peticion.empresa?.id ?? null,
        empresaNombre: peticion.empresa?.nombre ?? null,
    };
}
function eventoDeNavegador(reporte, peticion) {
    // Nada de filas en blanco: un reporte sin mensaje no dice nada y solo ensucia la pantalla.
    const mensaje = reporte?.mensaje?.trim();
    if (!mensaje)
        return null;
    const pantalla = reporte.pantalla ?? '';
    return {
        tipo: 'ERROR',
        origen: 'NAVEGADOR',
        // `huellaDeEvento` normaliza la ruta por su cuenta, y por eso el mismo fallo en el kiosco de
        // dos empresas distintas —cuyos enlaces llevan un token distinto— es un solo problema. Aquí
        // había una segunda llamada a `rutaNormalizada` que no hacía nada: se cazó rompiéndola a
        // propósito y viendo que la prueba seguía verde (CLAUDE.md §9.1).
        huella: (0, huellaDeEvento_1.huellaDeEvento)('NAVEGADOR', pantalla, mensaje),
        mensaje: (0, huellaDeEvento_1.recortar)(mensaje, MAXIMO_MENSAJE),
        detalle: (0, huellaDeEvento_1.recortar)([mensaje, reporte.rastro].filter(Boolean).join('\n\n'), MAXIMO_DETALLE),
        metodo: null,
        ruta: (0, huellaDeEvento_1.recortar)(pantalla.split('?')[0], 255) || null,
        estado: null,
        ip: peticion.ip ?? null,
        navegador: (0, huellaDeEvento_1.recortar)(peticion.navegador, 255) || null,
        usuarioId: peticion.usuario?.id ?? null,
        usuarioEmail: peticion.usuario?.email ?? null,
        usuarioNombre: peticion.usuario?.nombre ?? null,
        empresaId: peticion.empresa?.id ?? null,
        empresaNombre: peticion.empresa?.nombre ?? null,
    };
}
