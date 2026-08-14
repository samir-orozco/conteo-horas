"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minutosEnVentana = minutosEnVentana;
exports.minutosAlmuerzoADescontar = minutosAlmuerzoADescontar;
exports.dentroDeLaVentana = dentroDeLaVentana;
exports.puedeSalirAAlmorzar = puedeSalirAAlmorzar;
const tardanzas_1 = require("./tardanzas");
// Cuánto almuerzo se le descuenta a alguien en un día.
//
// La regla es una sola:
//
//   Se descuentan los minutos de la ventana de almuerzo durante los cuales la
//   persona estuvo MARCADA.
//
// De ahí salen solos cuatro comportamientos que antes eran problemas distintos:
//
//  - No marcó el almuerzo: estuvo marcado toda la ventana → se descuenta
//    completa. No marcar deja de ser negocio.
//  - Se fue temprano y nunca llegó a la ventana: no se descuenta nada. Antes
//    perdía una hora que jamás tomó — quien salía a las 10:00 tras trabajar dos
//    horas terminaba con una sola contada.
//  - Marcó su almuerzo: el hueco ya quedó fuera de lo trabajado, así que no se
//    vuelve a restar. Antes se cobraba dos veces, y el disciplinado que marcaba
//    cobraba menos que el que no.
//  - Almorzó en 20 minutos: los otros 40 estuvo marcado y se le descuentan
//    igual. Ese tiempo se lo regala a la empresa; la jornada semanal la fija la
//    norma, no la velocidad para comer.
//
// Sin ventana configurada se conserva el comportamiento de siempre (restar los
// minutos fijos). Eso es lo que mantiene quietos los reportes ya emitidos: los
// días materializados antes de esta función no tienen ventana.
const MS_MIN = 60000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Minutos en que dos intervalos se solapan.
function solape(aIni, aFin, bIni, bFin) {
    return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni)) / MS_MIN;
}
// Minutos EXACTOS —sin redondear— que estos tramos pasaron dentro de la ventana
// de almuerzo. `null` cuando el día no tiene ventana: ahí el descuento es un
// fijo del horario, no un solape, y no hay nada que repartir.
//
// Se expone aparte porque el descuento de un día hay que saber a QUIÉN cobrárselo
// cuando el día tiene más de una jornada. Sin esto, la fila de quien se fue a las
// 10 de la mañana cargaba el almuerzo del que se quedó hasta las cinco.
function minutosEnVentana(tramos, dia) {
    if (!dia.almuerzoInicio || !dia.almuerzoFin)
        return null;
    const inicio = dia.fecha.getTime() + (0, tardanzas_1.minutosDe)(dia.almuerzoInicio) * MS_MIN;
    let fin = dia.fecha.getTime() + (0, tardanzas_1.minutosDe)(dia.almuerzoFin) * MS_MIN;
    // Ventana que cruza medianoche (turno nocturno que almuerza en la madrugada).
    if (fin <= inicio)
        fin += UN_DIA_MS;
    // El almuerzo de un turno nocturno cae en la madrugada del día SIGUIENTE al
    // que ancla la fila, así que la ventana tiene DOS ubicaciones posibles y hay
    // que contar las dos.
    //
    // Se suman en vez de elegir una. Una fila de día puede contener tramos de dos
    // noches distintas —el regreso del almuerzo de la noche anterior y la noche
    // siguiente completa— y sus almuerzos caen en madrugadas distintas. Probar
    // solo la primera que diera algo dejaba el otro almuerzo sin descontar: 60
    // minutos nocturnos pagados como trabajados, cada vez que alguien marcaba su
    // almuerzo una noche y no la siguiente.
    //
    // Sumar es seguro: las dos ventanas están a 24 h de distancia, así que un
    // tramo tendría que durar más de un día para caer en ambas.
    const cruza = (ini, f) => tramos.reduce((s, t) => s + solape(t.entrada.getTime(), t.salida.getTime(), ini, f), 0);
    return cruza(inicio, fin) + cruza(inicio + UN_DIA_MS, fin + UN_DIA_MS);
}
function minutosAlmuerzoADescontar(tramos, dia) {
    // Sin ventana: comportamiento histórico. No se toca el pasado. Ojo al orden:
    // esta guarda va ANTES de mirar los tramos, y hay reportes viejos que dependen
    // de eso. Quien necesite un cero con la lista vacía lo comprueba por su cuenta.
    if (!dia.almuerzoInicio || !dia.almuerzoFin)
        return dia.almuerzoMin;
    if (tramos.length === 0)
        return 0;
    // El redondeo se queda aquí, en el único sitio donde estaba: lo consume
    // `reportes.ts` y moverlo movería nómina ya emitida.
    return Math.round(minutosEnVentana(tramos, dia));
}
// ¿La persona está DENTRO de su ventana en este instante?
//
// No decide si puede marcar el descanso —eso es `puedeSalirAAlmorzar`, que a
// propósito no mira la hora— sino cómo se le ofrece. Estando dentro, el botón
// grande del kiosco lo dice de frente en vez de esconderlo detrás de "Registrar
// Salida", que era algo que había que adivinar.
//
// Prueba las dos posiciones posibles de la ventana, por lo mismo que el
// descuento: la de un turno nocturno cae en la madrugada del día SIGUIENTE al
// que ancla la fila.
function dentroDeLaVentana(ahora, 
// Solo lo que de verdad necesita: así la sirve tanto un día completo como el
// `select` acotado con el que el kiosco lee su ventana.
dia) {
    if (!dia.almuerzoInicio || !dia.almuerzoFin)
        return false;
    const inicio = dia.fecha.getTime() + (0, tardanzas_1.minutosDe)(dia.almuerzoInicio) * MS_MIN;
    let fin = dia.fecha.getTime() + (0, tardanzas_1.minutosDe)(dia.almuerzoFin) * MS_MIN;
    if (fin <= inicio)
        fin += UN_DIA_MS;
    const t = ahora.getTime();
    const cae = (i, f) => t >= i && t < f;
    return cae(inicio, fin) || cae(inicio + UN_DIA_MS, fin + UN_DIA_MS);
}
// ¿Este turno puede cerrarse como "salgo a almorzar"?
//
// La usan los dos extremos: el kiosco para mostrar la pregunta y el servidor
// para creerle a la marca. Si estuvieran separadas podrían discrepar, y la
// persona marcaría un almuerzo que el servidor descarta sin decir nada.
//
// No mira la hora a propósito. Quien sale a las 11:40 a almorzar no debería
// pelear con el reloj, y responder no cuesta nada: la marca de almuerzo no
// cambia cuánto se descuenta —eso lo decide `minutosAlmuerzoADescontar` por
// solape— solo deja constancia de qué fue esa salida.
function puedeSalirAAlmorzar(dia, yaAlmorzo) {
    if (!dia?.almuerzoInicio || !dia.almuerzoFin)
        return false;
    return !yaAlmorzo;
}
