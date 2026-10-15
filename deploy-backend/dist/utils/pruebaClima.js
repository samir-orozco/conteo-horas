"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_DE_PRUEBA = exports.FUNCION_DE_PRUEBA = void 0;
exports.finDePrueba = finDePrueba;
exports.decidirPrueba = decidirPrueba;
exports.estadoDePrueba = estadoDePrueba;
exports.avisoDePrueba = avisoDePrueba;
exports.textoDeAviso = textoDeAviso;
const concesiones_1 = require("./concesiones");
const fechas_1 = require("./fechas");
// LA PRUEBA GRATIS DEL CLIMA LABORAL (14 de octubre de 2026, PENDIENTES nº 39, fase 3).
//
// Una empresa sin el plan Empresarial la pide sola, UNA vez, y tiene el panel completo 30 días contando el día en
// que la pidió. Es una concesión de `clima` con origen PRUEBA (utils/concesiones.ts): vence sola al leer, y su
// historial es lo que dice si la empresa ya la usó. Aquí está todo lo que se decide; la plomería, en las rutas de
// routes/clima.ts y en la pasada diaria de utils/avisosDePruebaClima.ts.
exports.FUNCION_DE_PRUEBA = 'clima';
exports.DIAS_DE_PRUEBA = 30;
// Cuándo llegan los avisos de la campana: a los 20 días con lo que se ha encontrado, y 3 días antes del fin.
const DIA_DEL_AVANCE = 20;
const DIAS_ANTES_DEL_FIN = 3;
const DIA_MS = 24 * 60 * 60 * 1000;
const masDias = (dia, n) => {
    const [a, m, d] = dia.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
/** El fin exclusivo de una prueba pedida hoy: 30 días contando hoy, el último incluido entero. */
function finDePrueba(hoy) {
    return (0, concesiones_1.finDelDiaBogota)(masDias(hoy, exports.DIAS_DE_PRUEBA - 1));
}
function decidirPrueba(p) {
    if (p.tieneClima)
        return { ok: false, codigo: 'YA_TIENE', error: 'Tu empresa ya tiene el clima laboral.' };
    if (p.pruebasPrevias > 0)
        return { ok: false, codigo: 'YA_USO', error: 'Esta empresa ya usó su prueba gratis del clima laboral.' };
    return { ok: true };
}
/** Lo que la pantalla necesita saber de las pruebas del clima de una empresa. */
function estadoDePrueba(pruebas, ahora) {
    if (pruebas.length === 0)
        return { disponible: true, vigente: null, terminada: null };
    const vigente = pruebas.find(p => p.revocadaEn === null && p.desde <= ahora && ahora < p.hasta);
    if (vigente)
        return { disponible: false, vigente: { hasta: vigente.hasta }, terminada: null };
    // La que terminó, con el instante en que de verdad terminó: su fin, o cuándo se quitó.
    const fines = pruebas.map(p => p.revocadaEn ?? p.hasta).sort((a, b) => b.getTime() - a.getTime());
    return { disponible: false, vigente: null, terminada: { hasta: fines[0] } };
}
/**
 * Cuál aviso de la campana le toca HOY a una prueba, o null. Uno solo: el más avanzado. Así, si la pasada diaria
 * dejó de correr unos días, no llega tarde un aviso que ya no sirve (el de avance después del de por terminar).
 * Que no se mande dos veces lo decide la pasada, con la notificación como marca.
 */
function avisoDePrueba(p, ahora) {
    if (p.revocadaEn !== null)
        return null;
    if (ahora >= p.hasta)
        return 'TERMINO';
    if (ahora.getTime() >= p.hasta.getTime() - DIAS_ANTES_DEL_FIN * DIA_MS)
        return 'POR_TERMINAR';
    if (ahora.getTime() >= p.desde.getTime() + DIA_DEL_AVANCE * DIA_MS)
        return 'AVANCE';
    return null;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// «12 de noviembre»: el último día de la prueba, el anterior a su fin exclusivo, en Bogotá.
const ultimoDia = (hasta) => {
    const [, m, d] = (0, fechas_1.claveDiaBogota)(new Date(hasta.getTime() - 1)).split('-').map(Number);
    return `${d} de ${MESES[m - 1]}`;
};
const unDecimal = (n) => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TIPO = {
    INICIO: 'PRUEBA_CLIMA_INICIO', AVANCE: 'PRUEBA_CLIMA_AVANCE', POR_TERMINAR: 'PRUEBA_CLIMA_POR_TERMINAR', TERMINO: 'PRUEBA_CLIMA_TERMINO',
};
function textoDeAviso(aviso, d) {
    const fin = ultimoDia(d.hasta);
    switch (aviso) {
        case 'INICIO':
            return { tipo: TIPO.INICIO, titulo: 'Empezó tu prueba gratis del clima laboral',
                cuerpo: `Hasta el ${fin} ves el panel completo: cómo está el ánimo de tu equipo, por qué y quién necesita atención.` };
        case 'AVANCE': {
            const hallado = d.respuestas && d.promedio != null
                ? `Tu equipo ha dejado ${d.respuestas} respuestas, con un ánimo promedio de ${unDecimal(d.promedio)} de 5.`
                : 'Tu equipo todavía no ha calificado su día. Revisa que la calificación del día esté encendida en Configuración › Marcación.';
            return { tipo: TIPO.AVANCE, titulo: 'Llevas 20 días de prueba del clima laboral', cuerpo: `${hallado} Tu prueba va hasta el ${fin}.` };
        }
        case 'POR_TERMINAR':
            return { tipo: TIPO.POR_TERMINAR, titulo: 'Tu prueba del clima laboral termina en 3 días',
                cuerpo: `El último día es el ${fin}. Con el plan Empresarial sigues viendo el panel completo.` };
        case 'TERMINO':
            return { tipo: TIPO.TERMINO, titulo: 'Terminó tu prueba del clima laboral',
                cuerpo: 'Tu equipo sigue calificando su día. Con el plan Empresarial vuelves a ver quién necesita atención, los motivos y el buzón.' };
    }
}
