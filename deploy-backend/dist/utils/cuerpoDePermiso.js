"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limpiarPermiso = limpiarPermiso;
const client_1 = require("@prisma/client");
const documentos_1 = require("./documentos");
const TIPOS = Object.values(client_1.TipoPermiso);
// Un instante como lo acepta Prisma: fecha, hora con segundos y zona, con T, t o un espacio en medio.
// Sin segundos, sin zona o con la zona sin los dos puntos lo rechaza (medido, ver la prueba).
const INSTANTE = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
function esInstante(valor) {
    if (typeof valor !== 'string')
        return false;
    const partes = INSTANTE.exec(valor);
    if (!partes)
        return false;
    const [anio, mes, dia, hora, minuto, segundo] = partes.slice(1, 7).map(Number);
    // Un 30 de febrero o las 24:00 tienen la forma pero no existen, y Prisma también los rechaza. Un día que
    // no existe se corre a otro mes, así que basta con ver que el mes vuelva igual.
    const calendario = new Date(Date.UTC(anio, mes - 1, dia));
    return calendario.getUTCMonth() === mes - 1 && hora <= 23 && minuto <= 59 && segundo <= 59;
}
const vacio = (valor) => valor === undefined || valor === null || valor === '';
function limpiarPermiso(data, esNuevo) {
    // Al crear, lo que no llega falta. Al editar, lo que no llega no cambia, pero el tipo y las fechas son
    // obligatorios: mandarlos vacíos tampoco se puede.
    const falta = (campo) => (esNuevo || data[campo] !== undefined) && vacio(data[campo]);
    if (esNuevo && vacio(data.colaboradorId))
        return { ok: false, motivo: 'Falta la persona de la novedad.' };
    if (falta('tipo'))
        return { ok: false, motivo: 'Falta el tipo de la novedad.' };
    if (falta('fechaInicio'))
        return { ok: false, motivo: 'Falta la fecha de inicio.' };
    if (falta('fechaFin'))
        return { ok: false, motivo: 'Falta la fecha de fin.' };
    if (data.tipo !== undefined && !TIPOS.includes(data.tipo))
        return { ok: false, motivo: 'El tipo de la novedad no es válido.' };
    if (data.fechaInicio !== undefined && !esInstante(data.fechaInicio))
        return { ok: false, motivo: 'La fecha de inicio no es válida.' };
    if (data.fechaFin !== undefined && !esInstante(data.fechaFin))
        return { ok: false, motivo: 'La fecha de fin no es válida.' };
    if (typeof data.fechaInicio === 'string' && typeof data.fechaFin === 'string'
        && Date.parse(data.fechaFin) < Date.parse(data.fechaInicio)) {
        return { ok: false, motivo: 'La fecha de fin no puede ser anterior a la de inicio.' };
    }
    if (data.aprobado !== undefined && typeof data.aprobado !== 'boolean')
        return { ok: false, motivo: 'La aprobación tiene que ser sí o no.' };
    const datos = {};
    if (esNuevo)
        datos.colaboradorId = data.colaboradorId;
    if (data.tipo !== undefined)
        datos.tipo = data.tipo;
    if (data.descripcion !== undefined)
        datos.descripcion = data.descripcion || null;
    if (data.fechaInicio !== undefined)
        datos.fechaInicio = data.fechaInicio;
    if (data.fechaFin !== undefined)
        datos.fechaFin = data.fechaFin;
    if (data.aprobado !== undefined)
        datos.aprobado = data.aprobado;
    const cambio = (0, documentos_1.cambioDeDocumento)(data.evidencia, data.evidenciaNombre);
    if (cambio.accion === 'rechazar')
        return { ok: false, motivo: cambio.motivo };
    if (cambio.accion === 'quitar') {
        datos.evidencia = null;
        datos.evidenciaTipo = null;
        datos.evidenciaNombre = null;
    }
    else if (cambio.accion === 'guardar') {
        datos.evidencia = cambio.documento;
        datos.evidenciaTipo = cambio.tipo;
        datos.evidenciaNombre = cambio.nombre;
    }
    return { ok: true, datos };
}
