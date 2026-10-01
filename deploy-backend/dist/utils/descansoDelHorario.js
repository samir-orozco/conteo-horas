"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMINGO = void 0;
exports.diaDeDescansoDelHorario = diaDeDescansoDelHorario;
exports.esDescansoObligatorioDe = esDescansoObligatorioDe;
exports.fuenteDelDescansoDe = fuenteDelDescansoDe;
const diasDeLaSemana_1 = require("./diasDeLaSemana");
// DE DÓNDE SALE EL DÍA DE DESCANSO (30 de septiembre de 2026, regla del dueño). El bloque de la
// prueba tiene el porqué de cada borde; aquí el resumen.
//
// Con sus palabras: «nosotros solo sabemos el día de descanso de un trabajador a través del horario
// fijo. Cuando no tiene horario definido, el día de descanso se da en la programación. Si no tiene
// horario, no tiene día fijo asignado de descanso».
//
// SUSTITUYE A LA DECLARACIÓN POR PERSONA. Hasta hoy esto salía de tres columnas del colaborador que
// un modal llenaba una sola vez. Esas columnas NUNCA LLEGARON A PRODUCCIÓN —medido contra la base
// real: de las nueve del módulo de turnos solo existen dos— así que no hay nada que migrar.
exports.DOMINGO = 'DOMINGO';
// SI SOBRA UNO, ESE. SI SOBRAN VARIOS O NINGUNO, EL DOMINGO.
//
// El domingo no es un respaldo perezoso: es lo que la ley presume. Elegir otro de los que sobran
// sería mover el descanso fuera del domingo por deducción propia, que es justo lo que la ley no deja
// hacer sin acuerdo escrito. Y con cero libres tampoco hay nada que deducir.
//
// QUE EL DOMINGO ESTÉ TRABAJADO NO LO DEJA DE HACER EL DESCANSO: lo que hace es que se pague con
// recargo, que es distinto.
//
// AQUÍ HABÍA UN `diaValido` PARA DESCARTAR NOMBRES RAROS Y ERA CÓDIGO MUERTO, descubierto mutándolo:
// al quitarlo no se puso roja ninguna prueba. Los libres salen de FILTRAR la lista de días válidos,
// así que un valor que no esté en ella no puede cambiar el resultado por mucho que entre al conjunto.
// Es el cuarto de este tipo que aparece en dos días; el patrón es siempre el mismo, una guarda sobre
// una entrada que después se filtra igual.
function diaDeDescansoDelHorario(diasQueTrabaja) {
    const cubre = new Set(diasQueTrabaja);
    const libres = DIAS.filter(d => !cubre.has(d));
    return libres.length === 1 ? libres[0] : exports.DOMINGO;
}
// La semana, para recorrer los libres en un orden estable. El `DIAS_SEMANA` del backend empieza en
// DOMINGO porque su índice casa con `Date.getDay()`; aquí el orden da igual mientras sea uno solo,
// así que se escribe explícito en vez de importar el otro y depender de su propósito.
const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
// SI ESA FECHA ES EL DESCANSO OBLIGATORIO DE ESA PERSONA.
//
// CON HORARIO MANDA EL HORARIO, y la programación NO lo mueve: «solo sabemos el día de descanso a
// través del horario fijo». Si hay horario ya está dicho, y marcar otro día en la rejilla no puede
// contradecirlo.
//
// SIN HORARIO Y SIN PROGRAMAR NO HAY DESCANSO. Es una decisión del dueño, CONFIRMADA el 30 de
// septiembre de 2026 con el número delante: se le mostraron las dos opciones y lo que costaba cada
// una, medido contra la base con la comprobación diferencial del §5.3.
//
// Lo que cuesta: esa semana esa persona no tiene descanso obligatorio, así que su domingo trabajado se
// paga como día ordinario, sin el recargo del 90%. En la base de desarrollo movió a UNA persona —la
// única sin horario que ha marcado domingos—, cuyo agosto pasó de 251.000 a 121.000: dos domingos
// perdieron el recargo y una hora cruzó el tope de las 42 y se volvió extra.
//
// MEDIDO DESPUÉS CONTRA PRODUCCIÓN, y el número de verdad es otro: 105 personas activas sin horario en
// 14 empresas, de las cuales 25 han trabajado 28 domingos. El recargo en juego son unos 2,7 millones.
// Se le puso ese número delante y REAFIRMÓ la decisión el 30 de septiembre de 2026.
//
// Y EL ARGUMENTO EN CONTRA, escrito para que quien lo discuta no tenga que volver a buscarlo: el art.
// 172 del CST no lo tocó la reforma de 2025 y sigue diciendo que el empleador está obligado a dar
// descanso dominical remunerado. O sea que la lectura alternativa —a falta de horario y de
// programación, el descanso es el DOMINGO— tiene respaldo legal, y hoy en producción esas 105 personas
// no tienen cómo conseguir que les marquen un día, porque el módulo de turnos no está desplegado.
// Cambiarlo es una línea de esta función: devolver `DOMINGO` cuando `descansoProgramado` no es válido.
//
// El código hacía lo contrario a propósito —«un turno pintado puede AGREGAR un recargo, nunca
// quitarlo»— y esto lo cambia. Queda escrito para que el día que alguien lo discuta se sepa que se
// eligió con el precio a la vista, no que se olvidó.
function esDescansoObligatorioDe(diaDeLaFecha, fuente, 
// Qué día marcó la programación como descanso de esa semana, o `null` si nadie marcó.
descansoProgramado) {
    const hoy = (0, diasDeLaSemana_1.diaValido)(diaDeLaFecha);
    if (hoy === null)
        return false;
    if (fuente.de === 'HORARIO')
        return hoy === diaDeDescansoDelHorario(fuente.diasQueTrabaja);
    return hoy === (0, diasDeLaSemana_1.diaValido)(descansoProgramado);
}
// DE UN COLABORADOR A SU FUENTE DE DESCANSO. La costura entre la base y la regla de arriba.
//
// SALE A SU PROPIA FUNCIÓN porque la llaman SIETE sitios —el motor de horas, la materialización de
// días, tres rutas de reportes, el dashboard y el calendario— y escribir en cada uno «si tiene
// horario, junta los días de sus franjas» es como se separan dos copias de una regla que decide
// recargos (§9.3).
//
// UN HORARIO SIN FRANJAS SIGUE SIENDO UN HORARIO, y no «sin horario». No es lo mismo: sin horario no
// hay día fijo y lo pone la programación; con un horario vacío no hay nada cubierto, sobran los siete
// y manda la presunción legal. Confundirlos dejaría sin descanso obligatorio a quien tenga un horario
// a medio configurar.
function fuenteDelDescansoDe(
// El horario con sus franjas, o `null` si la persona no tiene. `dias` llega como `unknown` porque
// en la base es una columna JSON.
horario) {
    if (!horario)
        return { de: 'PROGRAMACION' };
    const vistos = new Set();
    for (const f of horario.franjas) {
        // `Array.isArray` y no un `as string[]`: es JSON y puede traer cualquier cosa. Un valor raro no
        // puede tumbar la liquidación de nadie.
        if (!Array.isArray(f.dias))
            continue;
        for (const d of f.dias) {
            const nombre = (0, diasDeLaSemana_1.diaValido)(d);
            if (nombre !== null)
                vistos.add(nombre);
        }
    }
    return { de: 'HORARIO', diasQueTrabaja: [...vistos] };
}
