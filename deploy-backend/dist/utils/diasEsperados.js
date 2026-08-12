"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularDiasEsperados = calcularDiasEsperados;
exports.combinarDiasEsperados = combinarDiasEsperados;
const date_fns_tz_1 = require("date-fns-tz");
const tardanzas_1 = require("./tardanzas");
const saldoTiempo_1 = require("./saldoTiempo");
const TZ = 'America/Bogota';
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Medianoche de Bogotá del día al que pertenece un instante.
function medianocheBogotaDe(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), 5, 0, 0));
}
// Clave de día calendario Bogotá ("2026-07-01"). Se empareja por día y no por
// instante a propósito: MySQL puede devolver la fecha con milisegundos, y una
// fila que no empareje por unos milisegundos quedaría huérfana y el día caería
// al horario actual sin que nadie se entere.
function claveDiaBogota(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function calcularDiasEsperados(desde, finExclusivo, horario) {
    const activo = !!horario && horario.activo;
    const salida = [];
    // Se recorre en medianoches de Bogotá. Colombia es UTC-5 fijo, así que avanzar
    // 24h no arrastra desfases; con una zona con horario de verano habría que
    // recalcular la medianoche en cada paso.
    let cursor = medianocheBogotaDe(desde);
    const fin = finExclusivo.getTime();
    while (cursor.getTime() < fin) {
        const z = (0, date_fns_tz_1.toZonedTime)(cursor, TZ);
        const franja = activo ? (0, tardanzas_1.franjaDelDia)(horario, tardanzas_1.DIAS_SEMANA[z.getDay()]) : null;
        if (!franja) {
            salida.push({
                fecha: cursor,
                programado: false,
                horaEntrada: null,
                horaSalida: null,
                toleranciaMin: horario?.toleranciaMin ?? 0,
                almuerzoMin: 0,
                minutosEsperados: 0,
                toleranciaSalidaMin: horario?.toleranciaSalidaMin ?? 0,
                ajustaEntrada: horario?.ajustaEntrada ?? false,
            });
        }
        else {
            const almuerzo = franja.tieneAlmuerzo ? (horario.almuerzoMin ?? 0) : 0;
            const bruto = (0, saldoTiempo_1.duracionFranjaMin)(franja.horaEntrada, franja.horaSalida);
            salida.push({
                fecha: cursor,
                programado: true,
                horaEntrada: franja.horaEntrada,
                horaSalida: franja.horaSalida,
                toleranciaMin: horario.toleranciaMin ?? 0,
                almuerzoMin: almuerzo,
                minutosEsperados: Math.max(0, bruto - almuerzo),
                toleranciaSalidaMin: horario.toleranciaSalidaMin ?? 0,
                ajustaEntrada: horario.ajustaEntrada ?? false,
            });
        }
        cursor = new Date(cursor.getTime() + UN_DIA_MS);
    }
    return salida;
}
// Une lo materializado con el horario vigente para cubrir un rango completo.
//
// Donde HAY fila manda la fila: eso es lo que congela el pasado y es la razón de
// ser de toda la función. Donde NO la hay se cae al horario actual, que es
// exactamente lo que el sistema hacía antes de existir la tabla: así el backfill
// puede ir a su ritmo y nadie ve números distintos mientras tanto.
//
// Se devuelve una fila por cada día del rango, en orden, sin repetir.
function combinarDiasEsperados(desde, finExclusivo, materializados, horario) {
    const base = calcularDiasEsperados(desde, finExclusivo, horario);
    if (materializados.length === 0)
        return base;
    const porDia = new Map(materializados.map(m => [claveDiaBogota(m.fecha), m]));
    return base.map(dia => {
        const congelado = porDia.get(claveDiaBogota(dia.fecha));
        // La fecha se normaliza a la del rango: si la fila viniera con milisegundos
        // de la base de datos, aguas abajo se compara por día y no debe arrastrarlos.
        return congelado ? { ...congelado, fecha: dia.fecha } : dia;
    });
}
