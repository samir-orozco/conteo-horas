"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estadoDeAsistencia = estadoDeAsistencia;
exports.huecosDelVinculo = huecosDelVinculo;
exports.asistenciaPorDia = asistenciaPorDia;
const tardanzas_1 = require("./tardanzas");
const fechas_1 = require("./fechas");
const MIN = 60 * 1000;
function estadoDeAsistencia(e) {
    const { dia } = e;
    if (!dia || !dia.programado || !dia.horaEntrada)
        return 'SIN_TURNO';
    if (e.festivo)
        return 'FESTIVO';
    const horaEntrada = dia.horaEntrada;
    const entrada = e.inicioDia.getTime() + (0, tardanzas_1.minutosDe)(horaEntrada) * MIN;
    // Si marcó, llegó, aunque lo hayan creado después de su hora: así lo cuentan las llegadas tarde y el reporte.
    if (e.llego)
        return 'LLEGO';
    if (e.creadoEn.getTime() > entrada)
        return 'NO_EXISTIA';
    if ((e.huecos ?? []).some(([desde, hasta]) => entrada >= desde.getTime() && entrada < hasta.getTime()))
        return 'NO_EXISTIA';
    if (e.novedades.some(n => (0, tardanzas_1.excusaLaTardanza)(n, e.inicioDia, horaEntrada)))
        return 'NOVEDAD';
    if (e.ahora.getTime() <= entrada + dia.toleranciaMin * MIN)
        return 'EN_TIEMPO';
    return 'FALTA';
}
const DIA_MS = 24 * 60 * MIN;
const DESDE_SIEMPRE = new Date(0);
function huecosDelVinculo(eventos) {
    const enOrden = eventos
        .filter(e => e.tipo !== 'INGRESO')
        .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime() || a.fecha.getTime() - b.fecha.getTime());
    const huecos = [];
    let abierto = null;
    enOrden.forEach((e, i) => {
        if (e.tipo === 'RETIRO') {
            if (!abierto)
                abierto = new Date((0, fechas_1.medianocheBogota)((0, fechas_1.claveDiaBogota)(e.fecha)).getTime() + DIA_MS);
            return;
        }
        // Un reingreso sin retiro abierto solo cierra algo si es el primer evento: el de antes del historial.
        const desde = abierto ?? (i === 0 ? DESDE_SIEMPRE : null);
        const fin = new Date(Math.max(e.fecha.getTime(), e.creadoEn.getTime()));
        if (desde && fin > desde)
            huecos.push([desde, fin]);
        abierto = null;
    });
    return huecos;
}
function asistenciaPorDia(claves, ahora, personas, festivos) {
    const hoy = (0, fechas_1.claveDiaBogota)(ahora);
    return claves.map(clave => {
        const inicioDia = (0, fechas_1.medianocheBogota)(clave);
        const festivo = festivos.has(clave);
        const d = {
            clave, fecha: inicioDia, esHoy: clave === hoy, futuro: clave > hoy, festivo,
            debian: 0, llegaron: 0, llegaronSinTurno: 0, conNovedad: 0, enTiempo: 0, conTurno: 0,
        };
        for (const p of personas) {
            const llego = p.llegoEn.has(clave);
            const estado = estadoDeAsistencia({ dia: p.dias.get(clave) ?? null, inicioDia, llego, creadoEn: p.creadoEn, festivo, novedades: p.novedades, ahora, huecos: p.huecos });
            switch (estado) {
                case 'LLEGO':
                    d.debian++;
                    d.llegaron++;
                    d.conTurno++;
                    break;
                case 'FALTA':
                    d.debian++;
                    d.conTurno++;
                    break;
                case 'EN_TIEMPO':
                    d.enTiempo++;
                    d.conTurno++;
                    break;
                case 'NOVEDAD':
                    d.conNovedad++;
                    break;
                case 'SIN_TURNO':
                case 'FESTIVO':
                case 'NO_EXISTIA':
                    if (llego)
                        d.llegaronSinTurno++;
                    break;
                default: {
                    const nunca = estado;
                    throw new Error(`estado de asistencia sin manejar: ${nunca}`);
                }
            }
        }
        return d;
    });
}
