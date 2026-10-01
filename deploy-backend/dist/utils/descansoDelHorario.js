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
// «NO TIENE DÍA FIJO» NO ES «NO TIENE DÍA». Leerlo como lo segundo costó 3,34 millones en septiembre
// de 2026; está contado entero sobre `esDescansoObligatorioDe`, más abajo.
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
// SIN HORARIO Y SIN PROGRAMAR, EL DESCANSO ES EL DOMINGO. Esto se decidió al revés el 30 de
// septiembre de 2026 («sin horario y sin programar no hay descanso, ninguno»), se desplegó el 1 de
// octubre, y se CORRIGIÓ ese mismo día con el daño ya hecho. Las dos cosas quedan escritas porque la
// segunda no se entiende sin la primera.
//
// QUÉ PASÓ. La regla del dueño, con sus palabras, es «solo cuando se programa se pone el día de
// descanso». Eso responde CUÁL día es el descanso, y se implementó como si respondiera SI HAY UNO:
// a quien no tenía horario ni semana pintada, el motor dejó de verle descanso ningún día. Su domingo
// trabajado pasó de `HDD` a `HOD` y el recargo no se mudó de día, desapareció. Alguien podía trabajar
// los siete días sin disparar un solo recargo.
//
// QUÉ COSTÓ, medido en producción el 1 de octubre con la columna `dias_esperados.horarioId`, que es
// la que dice qué horario tenía esa persona ESE día (y no el que tiene hoy, que fue el primer
// recuento y estaba mal): 37 personas en septiembre, unos 3,34 millones de recargo, sobre un mes ya
// cerrado. Concentrado en dos empresas que trabajan todos los días: una clínica veterinaria de
// urgencias y un restaurante.
//
// POR QUÉ EL DOMINGO. El art. 172 del CST no lo tocó la Ley 2466 de 2025 y sigue obligando al
// descanso dominical remunerado. Mientras nadie programe la semana no hay nada que deducir, así que
// manda la presunción legal. En cuanto se pinta, la programación decide y puede llevarse el descanso
// al miércoles: la regla del dueño queda intacta donde de verdad aplica.
//
// LO QUE SE APRENDIÓ, que es lo que esto tiene que impedir la próxima vez: la decisión («cuál día»)
// tenía prueba unitaria desde el primer día, y el CABLE que la lleva al dinero no tenía ninguna.
// `routes/reportes.ts` pasa `fuenteDelDescansoDe(colaborador.horario)`, y nadie había liquidado un
// domingo con ese valor de punta a punta. Ahora sí: `liquidarRegistros.descanso.test.ts`.
//
function esDescansoObligatorioDe(diaDeLaFecha, fuente, 
// Qué día marcó la programación como descanso de esa semana, o `null` si nadie marcó.
descansoProgramado) {
    const hoy = (0, diasDeLaSemana_1.diaValido)(diaDeLaFecha);
    if (hoy === null)
        return false;
    if (fuente.de === 'HORARIO')
        return hoy === diaDeDescansoDelHorario(fuente.diasQueTrabaja);
    // `?? DOMINGO` y no `=== diaValido(...)`: sin programación válida manda la presunción legal, no el
    // vacío. Un `null` aquí es «nadie ha dicho nada todavía», que es exactamente el caso que el art.
    // 172 resuelve, y un día corrupto tampoco es una decisión de que esa semana no hay descanso.
    return hoy === ((0, diasDeLaSemana_1.diaValido)(descansoProgramado) ?? exports.DOMINGO);
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
