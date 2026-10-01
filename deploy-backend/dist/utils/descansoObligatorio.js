"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descansoDeLaSemana = descansoDeLaSemana;
exports.reescrituraDeSemana = reescrituraDeSemana;
exports.descansosPlanificadosPorSemana = descansosPlanificadosPorSemana;
exports.propuestaDeDescanso = propuestaDeDescanso;
// Del módulo sin dependencias y NO de `tardanzas`: tenerla allí cerraba el ciclo
// horasColombiana → descansoObligatorio → tardanzas → horasColombiana.
const diasDeLaSemana_1 = require("./diasDeLaSemana");
// `fechas` no importa nada de `utils` (solo `date-fns-tz`), así que traerlo NO reabre el ciclo que
// describe el comentario de arriba. Se comprobó leyendo el archivo, no suponiéndolo.
const fechas_1 = require("./fechas");
const descansoDelHorario_1 = require("./descansoDelHorario");
// LO QUE QUEDA AQUÍ ES LA PREGUNTA DE LA SEMANA: cuál de los siete días lleva el descanso cuando lo
// pone la programación. De dónde sale el descanso de una persona lo responde `descansoDelHorario.ts`,
// que es quien tiene la regla.
//
// LO QUE VIVÍA AQUÍ Y YA NO (30 de septiembre de 2026, regla del dueño): `deducirDiaDescanso`,
// `estadoDescansoDe`, `esDescansoObligatorio` y el tipo `EstadoDescanso`. Eran el modelo de la
// DECLARACIÓN POR PERSONA: tres columnas en `colaboradores` que un modal llenaba una vez, con un
// acuerdo escrito como guarda legal.
//
// Se van completas y no se dejan «por si acaso», porque dejarlas sería lo que prohíbe el §9.3: dos
// versiones de la misma regla, y la vieja gobernando el camino más usado. Su sustituto es una sola
// frase del dueño: «solo sabemos el día de descanso de un trabajador a través del horario fijo; si no
// tiene horario, no tiene día fijo y lo pone la programación».
//
// NO HABÍA NADA QUE MIGRAR: medido contra la base de producción antes de borrarlas, de las nueve
// columnas del módulo de turnos solo existen dos, y estas tres no están entre ellas. El módulo nunca
// se desplegó.
// ────────── CUÁL DE LOS SIETE DÍAS LLEVA EL DESCANSO EN UNA SEMANA PLANIFICADA ──────────
//
// Es lo que alimenta el tercer argumento de `esDescansoObligatorio`, que hasta hoy recibía `null`
// desde sus CINCO llamadores: la rama ROTATIVO existía y nada la alimentaba, así que un rotativo
// caía siempre al domingo.
//
// La fuente de verdad es el propio calendario, sin entidad nueva ni columna nueva: el día que lleva
// pintado un turno cuyo `PlantillaTurno.esDescanso` es true ES el descanso de esa semana. Lo que
// faltaba no era dónde guardarlo, era preguntárselo a la SEMANA en vez de al día suelto.
//
// TODO LO QUE NO SEA «EXACTAMENTE UNO» DEVUELVE NULL, y el llamador cae entonces al domingo. Las
// dos razones son la misma regla: un turno pintado puede AGREGAR un recargo, nunca quitarlo.
//
//   ninguno    la semana no está planificada. Es una omisión del administrador, y una omisión no
//              puede dejar a una persona sin descanso obligatorio.
//   dos o más  alguien se equivocó al planificar. Elegir uno convertiría al otro en día ordinario,
//              y si ese otro era el domingo le quitaría el recargo del 90% sin que nadie lo decida.
//
// Y el día EN BLANCO no se asume como descanso (decidido con el dueño el 21 de septiembre de 2026).
// El olvido de pintar un día y la decisión de dejarlo libre producen exactamente el mismo dato, así
// que asumir sería dejar de pagar un recargo por deducción propia. El planificador lo PROPONE
// cuando sobra un solo día y una persona lo confirma; esta función solo lee lo confirmado.
function descansoDeLaSemana(dias) {
    const marcados = diasConTurnoDeDescanso(dias);
    return marcados.size === 1 ? Array.from(marcados)[0] : null;
}
// Los días de una semana que llevan pintado un turno de descanso, validados y sin repetir.
//
// Vive aparte porque lo necesitan DOS: esta función, que colapsa cero y ambiguo en `null`, y
// `propuestaDeDescanso`, que tiene que distinguirlos para decirle a la persona cosas distintas.
// Copiar el bucle habría sembrado la cuarta copia de una regla el mismo día que se migraron tres
// (CLAUDE.md §9.3).
//
// Un conjunto y no un contador: si la misma fecha llegara dos veces (no debería, hay una fila por
// persona y día), contarla dos veces diría «ambiguo» sobre una semana que está clara.
function diasConTurnoDeDescanso(dias) {
    const marcados = new Set();
    for (const d of dias) {
        if (d.esDescanso !== true)
            continue;
        const nombre = (0, diasDeLaSemana_1.diaValido)(d.dia);
        if (nombre !== null)
            marcados.add(nombre);
    }
    return marcados;
}
// ────────── QUÉ DÍAS DE LA SEMANA HAY QUE REESCRIBIR AL PLANIFICAR (22 de septiembre de 2026) ──────────
//
// `esDescanso` se escribe DÍA POR DÍA, pero «cuál de estos siete lleva el descanso» es una pregunta
// de la SEMANA. Por eso pintar el turno de descanso en miércoles no basta con poner `true` en el
// miércoles: hay que poner `false` en el domingo de esa misma semana, que ya está escrito desde
// hace días. Pintar un día tiene que reescribir OTRO día, y esto decide cuáles.
//
// LA GUARDA QUE IMPORTA: un día YA PASADO no se toca nunca. Reescribirlo cambiaría lo que ese día
// exigía, y de ahí salen la tardanza, el descuento de almuerzo y el saldo de un período que puede
// estar liquidado. El día de HOY sí entra aquí: si además esa persona ya marcó lo decide
// `diaTocable`, que es otra guarda, vive en `materializarDias` y necesita la base.
//
// Consecuencia conocida y aceptada: planificar el descanso en miércoles cuando el domingo de esa
// semana YA PASÓ deja la semana con dos descansos, porque el domingo está congelado y no se toca.
// Paga de más y nunca de menos, que es la dirección correcta, pero hay que saberlo.
//
// DEVUELVE SOLO LO QUE CAMBIA, y no es por ahorrar consultas: una fila reescrita con el mismo valor
// queda con `actualizadoEn` de hoy, y eso borra la única pista que permite fechar quién tocó qué.
// Hizo falta exactamente esa pista para entender un susto del 21 de septiembre de 2026.
function reescrituraDeSemana(dias, fuente, planificado, inicioDeHoy) {
    const cambios = [];
    for (const d of dias) {
        if (d.fecha.getTime() < inicioDeHoy.getTime())
            continue;
        const debeSer = (0, descansoDelHorario_1.esDescansoObligatorioDe)(d.diaSemana, fuente, planificado);
        // `!==` y no `!`: una fila en `null` es la AUSENCIA del dato, no un `false`, y el motor la
        // resuelve con el respaldo (o sea, domingo). Dejarla sin escribir haría que esa semana se
        // liquidara contra el domingo justo cuando el plan dice otro día.
        if (d.esDescanso !== debeSer)
            cambios.push({ fecha: d.fecha, esDescanso: debeSer });
    }
    return cambios;
}
// ────────── EL PLAN DE CADA SEMANA, PARA UN RANGO DE MUCHAS (22 de septiembre de 2026) ──────────
//
// La pieza anterior arregló el pintado. Falta el otro camino, y es el que muerde en silencio:
// `materializarColaborador` recorre hasta 60 días escribiendo `esDescanso` día por día, y cuando
// alguien cambia un horario esa regeneración corre con `pisarExistentes` y devuelve al DOMINGO las
// filas AUTO de una semana ya planificada con otro día. No falla nada, solo cambia un recargo.
//
// Las dos mitades ya existen y están probadas: `rangoSemanaBogota` dice a qué semana pertenece un
// día y `descansoDeLaSemana` dice cuál lleva el descanso. Esto es la UNIÓN, que es donde un error
// aplicaría el plan de una semana a la de al lado.
//
// La clave es el LUNES de la semana, en "YYYY-MM-DD". Una semana sin plan o AMBIGUA no entra en el
// mapa: quien pregunta recibe `undefined`, pasa `null`, y cae al domingo. Así la regla de la
// ambigüedad vive en un solo sitio (`descansoDeLaSemana`) en vez de escribirse dos veces.
//
// EL CAMPO SE LLAMA `descansoMarcado` Y NO `esDescansoDeTurno` desde el 29 de septiembre de 2026.
// Es SOLO un cambio de nombre, sin ningún cambio de comportamiento: quien la llama ya consultaba
// `descansoPintado` desde el 23 de septiembre. Se renombra porque el nombre viejo es exactamente lo
// que indujo el error en la otra mitad, `propuestaDeDescanso`, que se quedó alimentada con
// `plantilla.esDescanso` durante seis días diciéndole a la pantalla lo contrario que el motor.
function descansosPlanificadosPorSemana(dias) {
    const porSemana = new Map();
    for (const d of dias) {
        const { lunes } = (0, fechas_1.rangoSemanaBogota)(d.fecha);
        const clave = (0, fechas_1.claveDiaBogota)(lunes);
        const entrada = {
            dia: (0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha),
            // `=== true` y no un truthy: lo que llega de la relación puede ser `null`, y `null` no es un
            // día marcado como descanso.
            esDescanso: d.descansoMarcado === true,
        };
        const lista = porSemana.get(clave);
        if (lista)
            lista.push(entrada);
        else
            porSemana.set(clave, [entrada]);
    }
    const salida = new Map();
    for (const [clave, lista] of porSemana) {
        const dia = descansoDeLaSemana(lista);
        if (dia !== null)
            salida.set(clave, dia);
    }
    return salida;
}
function propuestaDeDescanso(dias, fuente) {
    // CON HORARIO NO HAY NADA QUE PROPONER: su día libre ya lo dicen las franjas. El corte era antes
    // «quien no es ROTATIVO», o sea la declaración por persona; ahora es el dato que sí existe.
    if (fuente.de === 'HORARIO')
        return { estado: 'NO_APLICA' };
    // El MISMO conjunto que usa `descansoDeLaSemana`, no una segunda versión: si contaran distinto,
    // la pantalla diría «resuelta el miércoles» mientras el motor liquida el domingo.
    //
    // Y SALE DE LA MISMA COLUMNA, que es lo que faltaba hasta el 29 de septiembre de 2026: este campo
    // se llamaba `esDescansoDeTurno` y la ruta lo alimentaba con `plantilla.esDescanso`, o sea con el
    // modelo viejo, el del turno de descanso del catálogo. El motor ya leía `descansoPintado`, la
    // columna del día, desde el 23 de septiembre. Compartir la función no alcanzaba: lo que las
    // separaba era el dato que cada una recibía. Se renombró para que el nombre no invite a repetirlo.
    const marcados = diasConTurnoDeDescanso(dias.map(d => ({ dia: d.dia, esDescanso: d.descansoMarcado })));
    // Lo que alguien ELIGIÓ manda sobre lo que se puede deducir de un hueco.
    if (marcados.size === 1)
        return { estado: 'RESUELTA', dia: Array.from(marcados)[0] };
    if (marcados.size > 1)
        return { estado: 'AMBIGUA' };
    // Sin ningún descanso pintado: se propone si sobra EXACTAMENTE un día. Los nombres inválidos se
    // descartan antes de contar, porque proponer un día que no existe pintaría un turno que el
    // backend rechazaría con un error que nadie sabría explicar.
    const enBlanco = new Set(dias.filter(d => d.pintado !== true)
        .map(d => (0, diasDeLaSemana_1.diaValido)(d.dia))
        .filter((n) => n !== null));
    return enBlanco.size === 1
        ? { estado: 'PROPUESTA', dia: Array.from(enBlanco)[0] }
        : { estado: 'SIN_DESCANSO' };
}
