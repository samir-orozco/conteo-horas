"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deducirDiaDescanso = deducirDiaDescanso;
exports.estadoDescansoDe = estadoDescansoDe;
exports.esDescansoObligatorio = esDescansoObligatorio;
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
// `diaValido` vivía aquí, privada. Se mudó a `diasDeLaSemana` el 21 de septiembre de 2026, al
// aparecer la tercera necesidad: `descansoDeLaSemana`, más abajo. Al buscarla con `grep` resultó
// que ya estaban escritas DOS —esta y otra dentro de `cuerpoDeRespuestaDescanso`— y las dos se
// migran en este mismo commit, que es lo que pide CLAUDE.md §9.3. Se comprobó antes de fundirlas
// que hacían exactamente lo mismo.
function deducirDiaDescanso(diasQueTrabaja) {
    const trabaja = new Set(diasQueTrabaja.map(diasDeLaSemana_1.diaValido).filter((d) => d !== null));
    // El domingo libre manda sobre cualquier otro día libre: alguien de lunes a viernes tiene dos días
    // sin trabajar y solo uno de ellos es el descanso obligatorio. Por eso esta pregunta va PRIMERO y
    // no se mira cuántos días quedan libres.
    if (!trabaja.has('DOMINGO'))
        return { dia: 'DOMINGO', origen: 'PRESUNCION' };
    const libres = diasDeLaSemana_1.DIAS_SEMANA.filter(d => !trabaja.has(d));
    if (libres.length === 0)
        return { dia: null, origen: 'SIN_DIA_LIBRE' };
    if (libres.length === 1)
        return { dia: libres[0], origen: 'PROPUESTA' };
    return { dia: null, origen: 'AMBIGUO' };
}
// De las tres columnas al estado que usa el motor.
//
// AQUÍ VIVE LA GUARDA LEGAL, y es la razón de que esta función exista en vez de leer las columnas
// sueltas donde haga falta: la ley presume el domingo SALVO acuerdo escrito, así que declarar otro
// día sin tener el papel no alcanza para dejar de pagar el recargo dominical.
//
// Dicho en plata: si alguien marca a un mesero como «descansa los miércoles» y no hay acuerdo, sus
// domingos siguen valiendo el 90% de recargo.
//
// La comprobación del acuerdo va PRIMERO, antes de mirar el tipo, a propósito: así no hay ninguna
// rama que pueda saltársela. Y cualquier valor que no se reconozca cae también a PRESUMIDO, porque
// la columna es texto libre y un dato raro no puede dejar a nadie sin recargo.
function estadoDescansoDe(fila) {
    if (!fila.descansoAcuerdoEn)
        return { tipo: 'PRESUMIDO' };
    const tipo = typeof fila.descansoTipo === 'string' ? fila.descansoTipo.trim().toUpperCase() : '';
    if (tipo === 'ROTATIVO')
        return { tipo: 'ROTATIVO' };
    if (tipo === 'FIJO') {
        // Un día pactado que no existe no se puede cumplir, así que la declaración no vale.
        const dia = (0, diasDeLaSemana_1.diaValido)(fila.descansoDia);
        return dia === null ? { tipo: 'PRESUMIDO' } : { tipo: 'FIJO', dia };
    }
    return { tipo: 'PRESUMIDO' };
}
// La pregunta que hoy responde `esDomingo = diaSemana === 'DOMINGO'` (horasColombiana.ts:136), y la
// que decide si una hora lleva el recargo del 90%.
//
// `diaDeLaFecha` llega ya resuelto por quien llama: el motor lo calcula una vez por minuto y no
// tiene sentido volver a hacer aquí la conversión de zona horaria.
//
// LA REGLA: un turno pintado puede AGREGAR un recargo, nunca quitarlo. Por eso cada camino que no
// puede afirmar un día cae al DOMINGO en vez de devolver «ninguno»:
//
//   - PRESUMIDO ignora por completo lo planificado. Sin acuerdo escrito, pintar un turno no mueve
//     el descanso de nadie.
//   - FIJO con un día que no existe (dato viejo, error de escritura) vuelve al domingo.
//   - ROTATIVO sin semana planificada vuelve al domingo. Que nadie haya pintado el calendario es
//     una omisión del administrador, y no puede dejar a una persona sin descanso obligatorio.
function esDescansoObligatorio(diaDeLaFecha, estado, descansoPlanificado) {
    const hoy = (0, diasDeLaSemana_1.diaValido)(diaDeLaFecha);
    const esDomingo = hoy === 'DOMINGO';
    if (estado.tipo === 'FIJO') {
        const pactado = (0, diasDeLaSemana_1.diaValido)(estado.dia);
        return pactado === null ? esDomingo : hoy === pactado;
    }
    if (estado.tipo === 'ROTATIVO') {
        const planificado = (0, diasDeLaSemana_1.diaValido)(descansoPlanificado);
        return planificado === null ? esDomingo : hoy === planificado;
    }
    return esDomingo;
}
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
function reescrituraDeSemana(dias, estado, planificado, inicioDeHoy) {
    const cambios = [];
    for (const d of dias) {
        if (d.fecha.getTime() < inicioDeHoy.getTime())
            continue;
        const debeSer = esDescansoObligatorio(d.diaSemana, estado, planificado);
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
function descansosPlanificadosPorSemana(dias) {
    const porSemana = new Map();
    for (const d of dias) {
        const { lunes } = (0, fechas_1.rangoSemanaBogota)(d.fecha);
        const clave = (0, fechas_1.claveDiaBogota)(lunes);
        const entrada = {
            dia: (0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha),
            // `=== true` y no un truthy: lo que llega de la relación puede ser `null`, y `null` no es un
            // turno de descanso.
            esDescanso: d.esDescansoDeTurno === true,
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
function propuestaDeDescanso(dias, estado) {
    if (estado.tipo !== 'ROTATIVO')
        return { estado: 'NO_APLICA' };
    // El MISMO conjunto que usa `descansoDeLaSemana`, no una segunda versión: si contaran distinto,
    // la pantalla diría «resuelta el miércoles» mientras el motor liquida el domingo.
    const marcados = diasConTurnoDeDescanso(dias.map(d => ({ dia: d.dia, esDescanso: d.esDescansoDeTurno })));
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
