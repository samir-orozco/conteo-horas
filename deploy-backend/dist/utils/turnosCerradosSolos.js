"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HORA_TURNOS_CERRADOS = exports.CLAVE_TURNOS_CERRADOS_ENVIADO = exports.CLAVE_TURNOS_CERRADOS = void 0;
exports.tocaElMensajeDeTurnos = tocaElMensajeDeTurnos;
exports.mensajeTurnosCerrados = mensajeTurnosCerrados;
const correo_1 = require("./correo");
const fechas_1 = require("./fechas");
const resumenSemanal_1 = require("./resumenSemanal");
const pausaSinVolver_1 = require("./pausaSinVolver");
// «TURNOS CERRADOS SOLOS» POR TELEGRAM (13 de octubre de 2026).
//
// Decisiones del dueño: un mensaje cada mañana a las 7, solo si hubo alguno, y sin aviso extra en la
// campana (cada turno cerrado ya deja el suyo, en cierreTurnos.ts). Un turno sin salida se cierra solo
// 18 horas después de la entrada, o sea de madrugada: por eso el mensaje es de la mañana.
//
// La decisión de cuándo toca y el texto viven aquí; la plomería está en avisoTurnosCerrados.ts.
exports.CLAVE_TURNOS_CERRADOS = 'TELEGRAM_TURNOS_CERRADOS';
// La fecha del último envío, "YYYY-MM-DD", por empresa en `configuracion`. Es interna: el trabajo de
// las 7 corre también al arrancar la app, y sin ella cada despliegue de la mañana repetiría el mensaje.
exports.CLAVE_TURNOS_CERRADOS_ENVIADO = 'TURNOS_CERRADOS_ENVIADO_EL';
exports.HORA_TURNOS_CERRADOS = 7;
const HORA_MS = 60 * 60 * 1000;
// Si toca el mensaje en este instante, y de qué cierres. La ventana es de 7 a 7 aunque el mensaje
// salga más tarde: así cada cierre cae en un solo mensaje, también la mañana en que la app estaba
// dormida a las 7.
function tocaElMensajeDeTurnos(ahora, ultimoEnvio) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const hasta = new Date(inicioDia.getTime() + exports.HORA_TURNOS_CERRADOS * HORA_MS);
    if (ahora < hasta)
        return null;
    const hoy = (0, fechas_1.claveDiaBogota)(ahora);
    if (ultimoEnvio === hoy)
        return null;
    return { hoy, desde: new Date(hasta.getTime() - 24 * HORA_MS), hasta };
}
function mensajeTurnosCerrados(lista, enlace) {
    const n = lista.length;
    const encabezado = n === 1
        ? '🌙 Anoche se cerró solo 1 turno porque no marcaron la salida:'
        : `🌙 Anoche se cerraron solos ${n} turnos porque no marcaron la salida:`;
    // Una línea por persona, día y desenlace: quien tenía tres marcaciones abiertas el mismo día salía tres
    // veces (visto en la base local con cierres reales). El total del encabezado sigue contando turnos.
    const lineas = new Map();
    for (const t of [...lista].sort((a, b) => a.entrada.getTime() - b.entrada.getTime() || a.nombre.localeCompare(b.nombre, 'es'))) {
        const dia = (0, resumenSemanal_1.diaCorto)((0, fechas_1.claveDiaBogota)(t.entrada));
        // Sin franja ese día el cierre no pone hora: la tiene que poner el administrador.
        const salida = t.salidaEstimada ? `se estimó la salida ${(0, pausaSinVolver_1.aLaHora)(t.salidaEstimada)}` : 'sin hora de salida: hay que ponerla';
        const clave = `${t.nombre}|${dia}|${salida}`;
        const l = lineas.get(clave);
        if (l)
            l.veces++;
        else
            lineas.set(clave, { nombre: t.nombre, dia, salida, veces: 1 });
    }
    const filas = [...lineas.values()].map(l => {
        const cuantos = l.veces === 1 ? '' : l.salida.startsWith('sin') ? `${l.veces} turnos ` : `${l.veces} turnos, `;
        return `• ${(0, correo_1.escapar)(l.nombre)} — ${l.dia}, ${cuantos}${l.salida}`;
    });
    return [encabezado, ...filas, `<a href="${(0, correo_1.escapar)(enlace)}">Revisar en HoraPro</a>`].join('\n');
}
