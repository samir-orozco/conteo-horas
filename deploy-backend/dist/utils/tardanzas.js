"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_SEMANA = void 0;
exports.minutosDe = minutosDe;
exports.franjaDelDia = franjaDelDia;
exports.calcularTardanzas = calcularTardanzas;
const date_fns_tz_1 = require("date-fns-tz");
const TZ = 'America/Bogota';
exports.DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
function minutosDe(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
// Franja del horario que aplica a un día de la semana (ej. "SABADO"), o null
// si ese día no se trabaja. Con esto un horario cubre variaciones como
// L-V 08:00-17:00 + Sáb 08:00-12:00.
function franjaDelDia(horario, diaSemana) {
    return horario.franjas.find(f => ((f.dias ?? []).includes(diaSemana))) ?? null;
}
function claveDia(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
// Llegadas tarde: primera entrada de cada día vs la franja del horario que
// aplica ese día + tolerancia. No cuenta festivos, días fuera del horario ni
// días cubiertos por novedades.
function calcularTardanzas(registros, horario, festivos, permisos) {
    const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
    // Primera entrada por día calendario
    const primeraEntrada = new Map();
    for (const r of registros) {
        if (!r.entrada)
            continue;
        const clave = claveDia(r.entrada);
        const actual = primeraEntrada.get(clave);
        if (!actual || r.entrada < actual)
            primeraEntrada.set(clave, r.entrada);
    }
    const detalle = [];
    for (const [clave, entrada] of [...primeraEntrada.entries()].sort()) {
        const z = (0, date_fns_tz_1.toZonedTime)(entrada, TZ);
        const franja = franjaDelDia(horario, exports.DIAS_SEMANA[z.getDay()]);
        if (!franja)
            continue;
        if (festSet.has(clave))
            continue;
        const cubiertoPorNovedad = permisos.some(p => claveDia(p.fechaInicio) <= clave && clave <= claveDia(p.fechaFin));
        if (cubiertoPorNovedad)
            continue;
        const llegadaMin = z.getHours() * 60 + z.getMinutes();
        const tarde = llegadaMin - (minutosDe(franja.horaEntrada) + horario.toleranciaMin);
        if (tarde > 0) {
            detalle.push({
                fecha: clave,
                horaEsperada: franja.horaEntrada,
                horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
                minutosTarde: tarde,
            });
        }
    }
    return {
        detalle,
        totalMinutos: detalle.reduce((s, t) => s + t.minutosTarde, 0),
        diasTarde: detalle.length,
        toleranciaMin: horario.toleranciaMin,
    };
}
