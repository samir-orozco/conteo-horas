"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.msHastaLaHoraBogota = msHastaLaHoraBogota;
exports.correrRonda = correrRonda;
exports.programarDiario = programarDiario;
const fechas_1 = require("./fechas");
// A qué hora corren los trabajos diarios (19 de septiembre de 2026).
//
// Hasta hoy los cuatro barridos se programaban así:
//
//   trabajo();
//   setInterval(trabajo, 24 * 60 * 60 * 1000);
//
// O sea: corre ahora, y después cada 24 horas contadas DESDE AHORA. Como «ahora» es el arranque del
// servidor, la hora a la que corre cada día es la hora del último despliegue.
//
// Eso ya costó un incidente. El 31 de agosto de 2026 un despliegue reinició la app a las 22:12 y
// movió el auto-cierre de turnos a esa hora; como solo actúa sobre días ya pasados, cuatro turnos
// del lunes seguían abiertos el martes al mediodía y nadie lo notó durante dos semanas, con la
// suite en verde todo el tiempo. Está documentado en CLAUDE.md, sección 8.3, que además dice que
// los otros barridos siguen con el mismo patrón y no se han revisado.
//
// Aquí se arreglan los tres defectos que esa sección enumera:
//   1. El anclaje al reloj, con `msHastaLaHoraBogota`.
//   2. Que la pasada vacía deje rastro, con `correrRonda`.
//   3. Que una caída se distinga de una pasada tranquila, también en `correrRonda`.
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
// Milisegundos hasta la próxima vez que den las `hora` en Bogotá.
//
// No se calcula sobre la fecha UTC: entre las 7 p.m. y la medianoche de Bogotá, en UTC ya es el día
// siguiente, así que preguntar «qué día es hoy» con los getters UTC se salta un disparo justo esa
// franja. `rangoDiaBogota` ya resuelve la medianoche de Bogotá como instante, y se reutiliza en
// lugar de escribir una quinta copia del cálculo de zona (saldoTiempo.ts ya advierte de las otras
// cuatro).
//
// A la hora EN PUNTO devuelve un día entero, no cero: con cero, el arranque dispararía el trabajo
// dos veces seguidas, la llamada directa y el temporizador.
function msHastaLaHoraBogota(ahora, hora) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const objetivoHoy = inicioDia.getTime() + hora * HORA_MS;
    const falta = objetivoHoy - ahora.getTime();
    return falta > 0 ? falta : falta + DIA_MS;
}
// Corre un barrido dejando rastro SIEMPRE, y sin dejar que su caída tumbe el proceso.
//
// El «siempre» es el punto. Hoy `mantenerVentana` tiene `if (total > 0) log.info(...)` y
// `limpiarFotosAntiguas` tiene `if (count > 0) app.log.info(...)`: cuando no encuentran nada,
// callan. En el log, un barrido que dejó de correr se ve idéntico a uno que corrió sin trabajo, y
// esa ambigüedad es exactamente la que escondió las dos semanas del auto-cierre.
//
// Se registra al arrancar y al terminar. La línea de arranque no es redundante: si el trabajo se
// cuelga contra la base, es lo único que distingue «se colgó» de «nunca corrió».
//
// El error se registra y se traga a propósito: son barridos independientes y la caída de uno no
// puede impedir los otros ni matar el servidor. Lo que NO se hace es devolver un valor neutro y
// seguir como si nada, que es el defecto 3 de la sección 8.3.
async function correrRonda(nombre, trabajo, log) {
    const arranque = Date.now();
    log?.info(`[${nombre}] arranca`);
    try {
        const resultado = await trabajo();
        const cuanto = typeof resultado === 'number' ? String(resultado) : 'sin conteo';
        log?.info(`[${nombre}] terminó: ${cuanto} · ${Date.now() - arranque} ms`);
    }
    catch (err) {
        log?.error(err, `[${nombre}] FALLÓ: la ronda se perdió y hay que revisarla`);
    }
}
// Programa un barrido diario anclado al reloj de Bogotá.
//
// Esto es plomería (§8.6): la decisión que mueve el resultado es `msHastaLaHoraBogota`, que está
// probada aparte sin reloj real. Aquí solo se encadenan los temporizadores.
//
// Se sigue corriendo también al arrancar, y es deliberado: en un hosting que duerme la app, el
// arranque es lo que de verdad garantiza que el barrido ocurra, porque cualquier petición la
// despierta. Los cuatro trabajos son idempotentes, así que correr de más no daña nada.
function programarDiario(nombre, hora, trabajo, log) {
    void correrRonda(nombre, trabajo, log);
    const espera = msHastaLaHoraBogota(new Date(), hora);
    log?.info(`[${nombre}] programado a las ${String(hora).padStart(2, '0')}:00 de Bogotá · primera pasada en ${Math.round(espera / 60000)} min`);
    setTimeout(() => {
        void correrRonda(nombre, trabajo, log);
        setInterval(() => void correrRonda(nombre, trabajo, log), DIA_MS);
    }, espera);
}
