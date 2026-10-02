"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descansoDelDia = descansoDelDia;
exports.estadoDelDia = estadoDelDia;
const descansoDelHorario_1 = require("./descansoDelHorario");
// LO QUE EL CALENDARIO DE TURNOS PINTA EN CADA CELDA (20 de septiembre de 2026).
//
// Dos decisiones puras, separadas de la ruta a propósito (CLAUDE.md §8.2): la ruta es plomería
// —consultas, alcance por empresa— y esto es lo que decide qué ve una persona. Solo esto tiene
// que pasar del 80%.
// El `esDescanso` de un día, uniendo lo congelado con la regla vigente.
//
// Es la MISMA doctrina de `combinarDiasEsperados` aplicada a una sola columna: donde hay dato
// manda el dato, donde no lo hay se cae a la regla de hoy. Y existe porque `DiaEsperadoCalculado`
// no lleva `esDescanso`, así que al combinar los días el campo se perdería.
//
// La distinción que esta función protege, y que es la razón de que la columna sea anulable:
//
//   true / false  la fila lo calculó. Es un dato, y manda.
//   null          la fila es anterior a la función y nunca lo calculó. Es la AUSENCIA de un dato.
//   undefined     ese día no tiene fila; lo rellenó el horario vigente.
//
// Tratar `false` como si fuera `null` sería el defecto: un domingo congelado como día ordinario
// volvería a leerse como descanso y el día cambiaría de sentido cada vez que se relee.
function descansoDelDia(congelado, diaSemana, fuente) {
    if (typeof congelado === 'boolean')
        return congelado;
    // El día programado va en `null`: esta función resuelve una celda suelta y «cuál de los siete
    // lleva el descanso» es una pregunta de la SEMANA. Quien tiene horario se resuelve igual con sus
    // franjas; quien no lo tiene cae a la presunción legal, o sea el DOMINGO, hasta que se programe.
    //
    // Decía «se queda sin descanso» y era cierto durante las horas del 30 de septiembre al 1 de
    // octubre de 2026 en que la regla no le daba descanso a nadie sin horario. Se corrigió la regla y
    // este comentario se quedó: queda anotado porque un comentario que afirma lo contrario del código
    // en el archivo que decide un recargo es peor que no tener comentario.
    return (0, descansoDelHorario_1.esDescansoObligatorioDe)(diaSemana, fuente, null);
}
// `DESCANSO` y `SIN_TURNO` se separan a propósito, y no es cosmético: alguien de lunes a viernes
// tiene DOS días sin trabajar y solo uno es su descanso obligatorio. Pintarlos iguales afirmaría
// que el sábado también lo es, que es exactamente el error que el producto viene a quitar.
// `descansoPintado` es OPCIONAL porque las filas anteriores a la columna no lo traen, y su ausencia
// no puede cambiar ningún estado: sin él, esto se comporta exactamente como antes.
function estadoDelDia(dia) {
    // EL ORDEN DE ESTAS TRES LÍNEAS ES LA REGLA, y la primera tiene que ir primera.
    //
    // `esDescanso` es el descanso OBLIGATORIO y arrastra dinero: trabajarlo paga recargo (art. 179 y
    // siguientes). `descansoPintado` es «alguien marcó este día como libre», que es una decisión de
    // planificación y no tiene consecuencia legal por sí sola. Si los dos coinciden manda el legal.
    if (dia.esDescanso)
        return dia.programado ? 'DESCANSO_TRABAJADO' : 'DESCANSO';
    // Un día pintado como descanso se VE como descanso, que es lo que faltaba: antes caía a
    // SIN_TURNO y la celda mostraba el recuadro de «Agregar», como si ahí no hubiera nada.
    //
    // Y solo cuando NO está programado. Un día pintado libre en el que además hay turno es una
    // contradicción, y la salida segura es tratarlo como trabajo normal: devolver
    // DESCANSO_TRABAJADO aquí pagaría el recargo del descanso obligatorio por un martes cualquiera
    // que un administrador marcó libre. Nadie lo vería: saldría como un número más en la nómina.
    if (!dia.programado && dia.descansoPintado === true)
        return 'DESCANSO';
    return dia.programado ? 'TRABAJA' : 'SIN_TURNO';
}
