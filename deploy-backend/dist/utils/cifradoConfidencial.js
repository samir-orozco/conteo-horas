"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leerClave = leerClave;
exports.cifrar = cifrar;
exports.descifrar = descifrar;
const crypto_1 = require("crypto");
// Quién escribió una observación confidencial del clima laboral (4 de octubre de
// 2026). La empresa nunca lo ve; HoraPro lo guarda cifrado y solo el super admin
// lo descifra, para entregarlo por orden de una autoridad (docs/CLIMA_LABORAL.md §3.4).
//
// AES-256-GCM: además de esconder, detecta si alguien alteró el texto. Cada cifrado
// lleva su propio vector al azar, así que dos notas de la misma persona no se ven
// iguales en la base.
//
// La clave vive en la variable CLAVE_CONFIDENCIAL del .env, nunca en la base: quien
// tenga solo una copia de la base no puede saber quién escribió nada. PERDERLA ES
// PERDER TODOS LOS NOMBRES, sin forma de recuperarlos.
const VERSION = 'v1';
function leerClave(hex) {
    if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex))
        return null;
    return Buffer.from(hex, 'hex');
}
function cifrar(texto, clave) {
    const iv = (0, crypto_1.randomBytes)(12);
    const c = (0, crypto_1.createCipheriv)('aes-256-gcm', clave, iv);
    const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
    return [VERSION, iv.toString('base64'), c.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}
function descifrar(cifrado, clave) {
    const [version, iv, etiqueta, datos] = cifrado.split(':');
    if (version !== VERSION || !iv || !etiqueta || datos === undefined)
        throw new Error('Formato de cifrado desconocido');
    const d = (0, crypto_1.createDecipheriv)('aes-256-gcm', clave, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(etiqueta, 'base64'));
    return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8');
}
