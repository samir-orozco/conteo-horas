"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_ENTRE_AVISOS = void 0;
exports.vistazoDelClima = vistazoDelClima;
exports.avisoDeAtencionSinPlan = avisoDeAtencionSinPlan;
exports.textoDelAvisoSinPlan = textoDelAvisoSinPlan;
const fechas_1 = require("./fechas");
// EL CLIMA PARA UNA EMPRESA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4).
//
// La calificación del día está encendida para todos los planes, así que también una empresa sin el Empresarial
// junta respuestas. Decisión del dueño: sin el plan ve el ánimo promedio, la participación y CUÁNTAS personas
// necesitan atención, sin nombres; y la campana le avisa cuando alguien entra a «necesita atención», sin decir
// quién. Aquí está lo que se decide; la plomería, en routes/clima.ts y en utils/avisoClimaSinPlan.ts.
const DIA_MS = 24 * 60 * 60 * 1000;
// Entre dos avisos de la campana pasan por lo menos estos días: es una invitación, no una alarma diaria.
exports.DIAS_ENTRE_AVISOS = 7;
/**
 * Lo único del resumen del panel que sale para una empresa sin el plan. Es una LISTA BLANCA: se copia campo por
 * campo, y lo que no está aquí no sale, por mucho que el resumen completo crezca después.
 */
function vistazoDelClima(r) {
    return { total: r.total, personas: r.personas, promedio: r.promedio, variacion: r.variacion, jornadas: r.jornadas, atencion: r.atencion.length };
}
/**
 * Si toca avisar en la campana que hay personas en «necesita atención». Toca cuando alguien entró DESPUÉS del último
 * aviso (el aviso guarda hasta qué día de entrada contó) y pasaron al menos DIAS_ENTRE_AVISOS desde él. Cuenta a
 * todos los que están, no solo a los nuevos: es la foto de hoy.
 */
function avisoDeAtencionSinPlan(p) {
    if (p.enAtencion.length === 0)
        return null;
    const dias = p.enAtencion.map(e => (0, fechas_1.claveDiaBogota)(e.entro)).sort();
    const hastaDia = dias[dias.length - 1];
    if (p.ultimo) {
        if (p.ahora.getTime() - p.ultimo.creadoEn.getTime() < exports.DIAS_ENTRE_AVISOS * DIA_MS)
            return null;
        if (p.ultimo.hastaDia !== null && hastaDia <= p.ultimo.hastaDia)
            return null;
    }
    return { personas: p.enAtencion.length, hastaDia };
}
function textoDelAvisoSinPlan(personas, pruebaDisponible) {
    const titulo = personas === 1 ? '1 persona reportó días malos seguidos' : `${personas} personas reportaron días malos seguidos`;
    const cuerpo = 'Lo dijeron al calificar su día en el kiosco. Con el plan Empresarial ves quiénes son, por qué y les haces seguimiento.'
        + (pruebaDisponible ? ' Puedes probarlo gratis 30 días.' : '');
    return { tipo: 'CLIMA_ATENCION_SIN_PLAN', titulo, cuerpo };
}
