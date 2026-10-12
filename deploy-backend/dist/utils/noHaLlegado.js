"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAVE_NO_HA_LLEGADO = exports.MINUTOS_DE_ESPERA = void 0;
exports.quienesNoHanLlegado = quienesNoHanLlegado;
exports.horaLegible = horaLegible;
exports.mensajeNoHanLlegado = mensajeNoHanLlegado;
exports.mensajeYaLlego = mensajeYaLlego;
exports.cuerpoYaLlego = cuerpoYaLlego;
const fechas_1 = require("./fechas");
const tardanzas_1 = require("./tardanzas");
const correo_1 = require("./correo");
// «NO HA LLEGADO» POR TELEGRAM (11 de octubre de 2026).
//
// Decisiones del dueño: se avisa pasada la tolerancia de la persona más 15 minutos, en un solo
// mensaje con la lista, con copia en la campana, y cuando la persona llega se avisa también.
//
// Aquí vive la decisión de a quién le toca el aviso en un instante dado, y los mensajes. La plomería
// (el barrido cada 5 minutos, las consultas y el envío) está en avisoNoHaLlegado.ts.
exports.MINUTOS_DE_ESPERA = 15;
// El interruptor de la empresa, en `configuracion`. Apagado de fábrica, como el de llegadas tarde.
exports.CLAVE_NO_HA_LLEGADO = 'TELEGRAM_NO_HA_LLEGADO';
const MIN = 60 * 1000;
// A quiénes les toca el aviso en este instante.
//
// Un aviso falso en el grupo de una empresa acusa a alguien delante de su jefe, así que cada
// condición es para no avisar: sin turno hoy, festivo, ya marcó, tiene novedad, ya se avisó, todavía
// está en tiempo, su turno ya terminó, o no existía en el sistema cuando tenía que llegar.
function quienesNoHanLlegado(ahora, personas, c) {
    if (c.festivo)
        return [];
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const instante = (hhmm) => new Date(inicioDia.getTime() + (0, tardanzas_1.minutosDe)(hhmm) * MIN);
    return personas
        .filter(p => {
        const d = p.dia;
        if (!d || !d.programado || !d.horaEntrada)
            return false;
        if (c.conEntrada.has(p.colaboradorId) || c.yaAvisados.has(p.colaboradorId))
            return false;
        const entrada = instante(d.horaEntrada);
        if (ahora.getTime() < entrada.getTime() + (d.toleranciaMin + exports.MINUTOS_DE_ESPERA) * MIN)
            return false;
        // Su turno ya terminó: un aviso a las 6 p. m. de alguien que entraba a las 8 no sirve para nada.
        // Un turno que cruza la medianoche (salida antes que entrada) no termina hoy.
        if (d.horaSalida && (0, tardanzas_1.minutosDe)(d.horaSalida) > (0, tardanzas_1.minutosDe)(d.horaEntrada) && ahora >= instante(d.horaSalida))
            return false;
        if (p.creadoEn > entrada)
            return false;
        const horaEntrada = d.horaEntrada;
        return !c.novedades.some(n => n.colaboradorId === p.colaboradorId && (0, tardanzas_1.excusaLaTardanza)(n, inicioDia, horaEntrada));
    })
        .map(p => ({ colaboradorId: p.colaboradorId, nombre: p.nombre, apellido: p.apellido, horaEntrada: p.dia.horaEntrada }))
        .sort((a, b) => a.horaEntrada.localeCompare(b.horaEntrada) || a.nombre.localeCompare(b.nombre, 'es'));
}
// "13:30" → "1:30 p.m.", como el aviso de llegada tarde.
function horaLegible(hhmm) {
    const total = (0, tardanzas_1.minutosDe)(hhmm);
    const h = Math.floor(total / 60) % 24;
    return `${h % 12 || 12}:${String(total % 60).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
}
// La hora de pared de Bogotá de un instante, "HH:MM". Colombia es UTC-5 fijo.
function horaDeBogota(instante) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(instante);
    const min = Math.floor((instante.getTime() - inicioDia.getTime()) / MIN);
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
const nombre = (p) => (0, correo_1.escapar)(`${p.nombre} ${p.apellido}`);
// El mensaje del barrido. Telegram con parse_mode HTML: los nombres van escapados.
function mensajeNoHanLlegado(lista) {
    if (lista.length === 1) {
        return `❗ <b>${nombre(lista[0])}</b> no ha marcado entrada\n🕐 Entraba a las ${horaLegible(lista[0].horaEntrada)}`;
    }
    return `❗ <b>${lista.length} personas</b> no han marcado entrada:\n`
        + lista.map(p => `• ${nombre(p)} — entraba a las ${horaLegible(p.horaEntrada)}`).join('\n');
}
function mensajeYaLlego(nombreCompleto, marco, horaEntrada) {
    return `✅ <b>${(0, correo_1.escapar)(nombreCompleto)}</b> ya llegó\n🕐 Marcó a las ${horaLegible(horaDeBogota(marco))} · entraba a las ${horaLegible(horaEntrada)}`;
}
// El aviso de la campana, cerrado cuando la persona llega. Sin día calculado no se inventa a qué hora
// entraba.
function cuerpoYaLlego(marco, horaEntrada) {
    const llego = `Llegó a las ${horaLegible(horaDeBogota(marco))}`;
    return horaEntrada ? `${llego} · entraba a las ${horaLegible(horaEntrada)}` : llego;
}
