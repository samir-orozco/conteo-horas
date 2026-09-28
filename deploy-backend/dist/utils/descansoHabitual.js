"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINIMO_HABITUAL = void 0;
exports.clasificarDescansos = clasificarDescansos;
exports.descansosTrabajadosPorMes = descansosTrabajadosPorMes;
const fechas_1 = require("./fechas");
// CUÁNDO TRABAJAR EL DÍA DE DESCANSO DEJA DE SER OCASIONAL (21 de septiembre de 2026).
//
// Trabajar 1 o 2 días de descanso en un MES CALENDARIO es ocasional; a partir de 3 es habitual, y
// ahí la compensación en tiempo deja de ser opcional. El recargo se paga igual en los dos casos,
// así que esto NO mueve dinero: mueve una alarma.
//
// VERIFICADO el 22 de septiembre de 2026, y antes no lo estaba: este comentario decía que el umbral
// era «la especificación del dueño, sin comprobar contra la ley». Sí está en la norma, y con estas
// palabras, en el PARÁGRAFO 1 del artículo 179 del CST: el trabajo en día de descanso obligatorio
// es ocasional cuando se laboran hasta DOS durante el mes calendario, y habitual cuando se laboran
// TRES o más. Ojo con el nombre: la norma dice «días de descanso obligatorio», no «domingos», así
// que aplica igual a quien descansa el miércoles.
//
// Y el artículo 181 confirma la otra mitad: quien lo trabaja HABITUALMENTE tiene derecho al
// descanso compensatorio «sin perjuicio de» la retribución en dinero. Los dos, no uno u otro.
//
// POR QUÉ ESTO NO VIVE EN EL MOTOR DE HORAS: el motor acumula por semana (`semanaKey`) porque el
// tope de 42 horas es semanal. Esta regla es mensual y no cambia ninguna tarifa, así que meterla
// ahí sería darle al motor una segunda ventana temporal para producir un aviso.
// El umbral. Sale a constante porque es el único número que hay que acertar aquí, y porque la
// pantalla también lo nombra: escribirlo dos veces es como se separan.
exports.MINIMO_HABITUAL = 3;
function clasificarDescansos(cuantos) {
    // Un número imposible no puede producir una alarma: la cuenta viene de una consulta, y si algún
    // día llega en negativo o como NaN, que caiga al lado silencioso y no al que acusa.
    if (!Number.isFinite(cuantos) || cuantos <= 0)
        return 'NINGUNO';
    return cuantos >= exports.MINIMO_HABITUAL ? 'HABITUAL' : 'OCASIONAL';
}
// Cuántos días de descanso trabajó, mes a mes. La clave es "YYYY-MM" del calendario de BOGOTÁ.
//
// Se deriva de `claveDiaBogota` y no se arma aparte: es la misma clave que usa todo lo demás,
// recortada. Un `getMonth()` suelto sobre una fecha guardada a las 05:00 UTC parece equivalente y
// deja de serlo en cuanto alguien pasa una fecha con otra hora, que es justo lo que prueba el caso
// del cambio de mes.
function descansosTrabajadosPorMes(dias) {
    const porMes = {};
    for (const d of dias) {
        if (!d.esDescanso || !d.trabajado)
            continue;
        const mes = (0, fechas_1.claveDiaBogota)(d.fecha).slice(0, 7);
        porMes[mes] = (porMes[mes] ?? 0) + 1;
    }
    return porMes;
}
