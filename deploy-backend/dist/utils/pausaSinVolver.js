"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAVE_PAUSAS = void 0;
exports.pausasPorAvisar = pausasPorAvisar;
exports.mensajePausasSinVolver = mensajePausasSinVolver;
exports.mensajeYaVolvio = mensajeYaVolvio;
exports.cuerpoDePausaSinVolver = cuerpoDePausaSinVolver;
exports.cuerpoYaVolvio = cuerpoYaVolvio;
const correo_1 = require("./correo");
const almuerzo_1 = require("./almuerzo");
const descansos_1 = require("./descansos");
const cierreAlmuerzo_1 = require("./cierreAlmuerzo");
const noHaLlegado_1 = require("./noHaLlegado");
// «NO HA VUELTO DE SU PAUSA» POR TELEGRAM (13 de octubre de 2026).
//
// Decisiones del dueño, las mismas de «no ha llegado»: avisa 15 minutos después de la hora a la que
// debía volver, en un solo mensaje con la lista, con copia en la campana, y cuando la persona vuelve
// se avisa también. Aquí vive la decisión y los textos; la plomería está en avisoPausaSinVolver.ts.
//
// Esto NO es el aviso del día siguiente (`avisarPausasSinRegreso`, cierreAlmuerzo.ts), que sigue
// igual: ese es para la pausa olvidada, con lo que cuesta en la nómina. Este es para el momento.
// El interruptor de la empresa, en `configuracion`. Apagado de fábrica, como los otros de Telegram.
exports.CLAVE_PAUSAS = 'TELEGRAM_PAUSAS';
const MIN = 60 * 1000;
// A qué hora le tocaba volver, o null si no se sabe.
//
// El almuerzo con ventana se mide contra ella, como en la tabla de Registros. SIN ventana, la tabla no
// propone hora —sería inventar un dato de nómina—, pero un aviso no escribe nada en la nómina: se
// espera la salida más lo que dura su almuerzo. Sin esto, ninguna empresa con almuerzo de duración
// fija recibiría el aviso.
function debiaVolver(f, dia) {
    if (f.salidaDescanso) {
        const v = (0, descansos_1.leerVentana)(f.descansoVentana);
        return v ? (0, descansos_1.regresoEsperadoDelDescanso)(f.salida, f.fecha, v) : null;
    }
    if (!dia)
        return null;
    const v = (0, almuerzo_1.ventanaDeAlmuerzo)(dia);
    if (v.inicio && v.fin)
        return new Date((0, almuerzo_1.finDeLaVentanaDe)(f.salida, v));
    return dia.almuerzoMin > 0 ? new Date(f.salida.getTime() + dia.almuerzoMin * MIN) : null;
}
// A quiénes les toca el aviso en este instante. Cada condición es para NO avisar: sin hora a la que
// volver, ya volvió, todavía está en tiempo, ya se le avisó, o ya pasó el fin de su turno (desde ahí
// la pausa olvidada la cubre el aviso del día siguiente, con lo que cuesta).
function pausasPorAvisar(ahora, filas, 
// El día esperado de la FECHA de la fila, no el de hoy: la pausa de un turno nocturno después de
// la medianoche es del día anterior.
diaDe, personas, yaAvisadas) {
    const resultado = [];
    for (const f of filas) {
        if (!f.salida || !(f.salidaAlmuerzo || f.salidaDescanso) || yaAvisadas.has(f.id))
            continue;
        // Volvió: una entrada posterior a la salida, en la misma fecha (el regreso hereda la de su salida).
        const volvio = filas.some(o => o.colaboradorId === f.colaboradorId && o.fecha.getTime() === f.fecha.getTime()
            && !!o.entrada && o.entrada > f.salida);
        if (volvio)
            continue;
        const dia = diaDe(f.colaboradorId, f.fecha);
        const regreso = debiaVolver(f, dia);
        if (!regreso || ahora.getTime() < regreso.getTime() + noHaLlegado_1.MINUTOS_DE_ESPERA * MIN)
            continue;
        const ventana = f.salidaDescanso ? (0, descansos_1.leerVentana)(f.descansoVentana) : null;
        if (ahora > (0, cierreAlmuerzo_1.limiteDeEsperaDelDescanso)(f.salida, dia, ventana))
            continue;
        const p = personas.get(f.colaboradorId);
        if (!p)
            continue;
        resultado.push({
            registroId: f.id, colaboradorId: f.colaboradorId, nombre: `${p.nombre} ${p.apellido}`,
            pausa: f.salidaDescanso ? 'descanso' : 'almuerzo', salio: f.salida, debiaVolver: regreso,
        });
    }
    return resultado.sort((a, b) => a.debiaVolver.getTime() - b.debiaVolver.getTime() || a.nombre.localeCompare(b.nombre, 'es'));
}
// «a la 1:00 p.m.», «a las 3:15 p.m.»: la una va en singular.
function aLaHora(d) {
    const h = (0, noHaLlegado_1.horaLegible)((0, noHaLlegado_1.horaDeBogota)(d));
    return `${h.startsWith('1:') ? 'a la' : 'a las'} ${h}`;
}
const delaPausa = (p) => (p === 'almuerzo' ? 'del almuerzo' : 'de su descanso');
function mensajePausasSinVolver(lista) {
    if (lista.length === 1) {
        const p = lista[0];
        return `☕ <b>${(0, correo_1.escapar)(p.nombre)}</b> no ha vuelto ${delaPausa(p.pausa)}\n🕐 ${cuerpoDePausaSinVolver(p)}`;
    }
    return `☕ <b>${lista.length} personas</b> no han vuelto de su pausa:\n`
        + lista.map(p => `• ${(0, correo_1.escapar)(p.nombre)} — ${p.pausa}, debía volver ${aLaHora(p.debiaVolver)}`).join('\n');
}
function mensajeYaVolvio(nombre, pausa, marco) {
    return `✅ <b>${(0, correo_1.escapar)(nombre)}</b> volvió ${delaPausa(pausa)}\n🕐 Marcó ${aLaHora(marco)}`;
}
// La campana, al avisar.
function cuerpoDePausaSinVolver(p) {
    return `Salió ${aLaHora(p.salio)} · debía volver ${aLaHora(p.debiaVolver)}`;
}
// La campana, cuando vuelve: se antepone la hora del regreso a lo que ya decía.
function cuerpoYaVolvio(marco, cuerpoAnterior) {
    const antes = cuerpoAnterior ? ` · ${cuerpoAnterior.charAt(0).toLowerCase()}${cuerpoAnterior.slice(1)}` : '';
    return `Volvió ${aLaHora(marco)}${antes}`;
}
