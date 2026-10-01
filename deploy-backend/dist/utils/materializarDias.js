"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializarColaborador = materializarColaborador;
exports.pintarDiaDeColaborador = pintarDiaDeColaborador;
exports.marcarDescansoDeColaborador = marcarDescansoDeColaborador;
exports.despintarDiaDeColaborador = despintarDiaDeColaborador;
exports.mantenerVentanaDeColaborador = mantenerVentanaDeColaborador;
exports.diaYaEmpezado = diaYaEmpezado;
exports.regenerarDiasDeColaborador = regenerarDiasDeColaborador;
exports.regenerarDiasDeHorario = regenerarDiasDeHorario;
exports.regenerarDiasDeVarios = regenerarDiasDeVarios;
exports.asegurarDiaMaterializado = asegurarDiaMaterializado;
exports.asegurarDiaSinFallar = asegurarDiaSinFallar;
exports.mantenerVentana = mantenerVentana;
exports.backfillColaborador = backfillColaborador;
exports.backfillTodos = backfillTodos;
// Del módulo del cliente, no de `../index`: importar el entrypoint arrancaría el
// servidor, y esto también corre desde los scripts de `prisma/`.
const prisma_1 = require("../prisma");
const diasEsperados_1 = require("./diasEsperados");
const fechas_1 = require("./fechas");
const diasDeLaSemana_1 = require("./diasDeLaSemana");
const descansoObligatorio_1 = require("./descansoObligatorio");
const descansoDelHorario_1 = require("./descansoDelHorario");
const pintarDia_1 = require("./pintarDia");
// Escribe en la tabla `DiaEsperado` lo que el horario de cada colaborador exige
// cada día. Es la memoria del sistema: sin ella, editar un horario reescribe el
// pasado y las liquidaciones ya entregadas cambian solas.
//
// Regla que gobierna todo esto: los días PASADOS no se tocan nunca. Solo se
// generan los que faltan y se regeneran los futuros cuando cambia el horario.
// Cuántos días hacia adelante se mantienen materializados. Con esto el kiosco y
// el dashboard siempre tienen el día de hoy y las próximas semanas listos.
const DIAS_ADELANTE = 60;
function medianocheBogotaDe(d) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(d);
    return inicioDia;
}
// Genera los días de UN colaborador en un rango. `respetarPasado` evita pisar lo
// ya congelado: solo escribe donde no había fila.
async function materializarColaborador(colaboradorId, desde, finExclusivo, opciones = {}) {
    // Solo el horario y su id, que es lo que se escribe en cada día. Sin `select` venían todas las
    // columnas de la persona, también sus fotos y su descriptor facial, en cada materialización
    // (13 de septiembre de 2026). Las franjas ya venían: de ellas sale también qué día descansaba, que
    // el 30 de septiembre de 2026 dejó de salir de tres columnas de la persona.
    const colaborador = await prisma_1.prisma.colaborador.findUnique({
        where: { id: colaboradorId },
        select: { horarioId: true, horario: { include: { franjas: true } } },
    });
    if (!colaborador)
        return 0;
    const horario = colaborador.horario;
    const calculados = (0, diasEsperados_1.calcularDiasEsperados)(desde, finExclusivo, horario);
    if (calculados.length === 0)
        return 0;
    // DE DÓNDE SALE SU DESCANSO (30 de septiembre de 2026, regla del dueño): de las FRANJAS de su
    // horario, o de la programación si no tiene horario. Antes salía de tres columnas del colaborador
    // que un modal llenaba una vez; esas columnas nunca llegaron a producción y dejan de existir.
    const fuente = (0, descansoDelHorario_1.fuenteDelDescansoDe)(horario);
    // Lo que ya existe en ese rango, para no pisarlo si no toca.
    const existentes = await prisma_1.prisma.diaEsperado.findMany({
        where: { colaboradorId, fecha: { gte: desde, lt: finExclusivo } },
        select: { fecha: true, origen: true },
    });
    const yaHay = new Map(existentes.map(e => [e.fecha.getTime(), e.origen]));
    // EL PLAN DE CADA SEMANA (22 de septiembre de 2026). Sin esto, regenerar con `pisarExistentes`
    // —que es lo que hace guardar un horario— devolvía al DOMINGO las filas AUTO de una semana ya
    // planificada con otro día, en silencio y sin que fallara nada.
    //
    // SOBRE SEMANAS COMPLETAS y no sobre el rango pedido: el rango no empieza en lunes, así que un
    // descanso pintado que cayera justo fuera dejaría el plan invisible y escribiríamos el domingo
    // por defecto, deshaciendo lo planificado. Los extremos salen de `calculados`, cuyas fechas ya
    // están ancladas a medianoche de Bogotá; construirlos de `finExclusivo` obligaría a anclar a mano.
    //
    // `plantillaId: { not: null }` mantiene la consulta corta: un día sin pintar no puede llevar un
    // turno de descanso, así que no aporta nada al plan.
    const semanaIni = (0, fechas_1.rangoSemanaBogota)(calculados[0].fecha).lunes;
    const semanaFin = (0, fechas_1.rangoSemanaBogota)(calculados[calculados.length - 1].fecha).finExclusivo;
    const pintados = await prisma_1.prisma.diaEsperado.findMany({
        where: { colaboradorId, fecha: { gte: semanaIni, lt: semanaFin }, descansoPintado: true },
        select: { fecha: true },
    });
    // La columna del día y ya no la plantilla (23 de septiembre de 2026). Antes esto preguntaba
    // «¿este día se pintó con un turno cuyo `esDescanso` es true?», que obligaba a que el descanso
    // fuera una fila del catálogo. Ahora el día lo dice por sí mismo, y la consulta es más corta: se
    // filtra por la columna en vez de traer la relación para mirarla después.
    const planPorSemana = (0, descansoObligatorio_1.descansosPlanificadosPorSemana)(pintados.map(p => ({
        fecha: p.fecha,
        // `true` fijo y no una columna: la consulta de arriba YA filtró por `descansoPintado: true`,
        // así que cada fila que llega aquí es, por construcción, un día marcado como descanso.
        descansoMarcado: true,
    })));
    // Una semana sin plan o ambigua no está en el mapa, y entonces va `null`: cae al domingo, que es
    // la dirección segura.
    const planDe = (fecha) => planPorSemana.get((0, fechas_1.claveDiaBogota)((0, fechas_1.rangoSemanaBogota)(fecha).lunes)) ?? null;
    let escritos = 0;
    for (const d of calculados) {
        const origenPrevio = yaHay.get(d.fecha.getTime());
        if (origenPrevio !== undefined) {
            // Nunca se pisa un día que el admin ajustó a mano (turno rotativo).
            if (origenPrevio === 'MANUAL')
                continue;
            if (!opciones.pisarExistentes)
                continue;
        }
        await prisma_1.prisma.diaEsperado.upsert({
            where: { colaboradorId_fecha: { colaboradorId, fecha: d.fecha } },
            update: {
                programado: d.programado, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida,
                toleranciaMin: d.toleranciaMin, almuerzoMin: d.almuerzoMin,
                minutosEsperados: d.minutosEsperados, toleranciaSalidaMin: d.toleranciaSalidaMin,
                ajustaEntrada: d.ajustaEntrada, almuerzoInicio: d.almuerzoInicio, almuerzoFin: d.almuerzoFin,
                descansos: d.descansos,
                // `esDescanso` SÍ se actualiza, al revés que `origen`: son cosas distintas. `origen` es la
                // marca que protege un día ajustado a mano; esto es un dato derivado que debe seguir al
                // horario cuando el horario cambia hacia adelante. Los días pasados no llegan aquí.
                esDescanso: (0, descansoDelHorario_1.esDescansoObligatorioDe)((0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha), fuente, planDe(d.fecha)),
                // `origen` NO se toca al actualizar: es el único marcador que puede
                // proteger un día ajustado a mano, y reescribirlo a AUTO lo borraría.
                horarioId: colaborador.horarioId,
            },
            create: {
                colaboradorId, fecha: d.fecha,
                programado: d.programado, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida,
                toleranciaMin: d.toleranciaMin, almuerzoMin: d.almuerzoMin,
                minutosEsperados: d.minutosEsperados, toleranciaSalidaMin: d.toleranciaSalidaMin,
                ajustaEntrada: d.ajustaEntrada, almuerzoInicio: d.almuerzoInicio, almuerzoFin: d.almuerzoFin,
                descansos: d.descansos,
                // Sin planificador todavía, el día planificado va en `null`: un ROTATIVO cae al domingo,
                // que es la dirección segura. Ese `null` es el gancho donde el planificador se conecta.
                esDescanso: (0, descansoDelHorario_1.esDescansoObligatorioDe)((0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha), fuente, planDe(d.fecha)),
                horarioId: colaborador.horarioId, origen: 'AUTO',
            },
        });
        escritos++;
    }
    return escritos;
}
// Las columnas que el pintado necesita de la persona, y ninguna más. Las FRANJAS entran el 30 de
// septiembre de 2026: de ellas sale su día de descanso, que antes salía de tres columnas suyas.
const PARA_PINTAR = {
    horarioId: true,
    horario: {
        select: {
            toleranciaMin: true, almuerzoMin: true, toleranciaSalidaMin: true, ajustaEntrada: true,
            franjas: { select: { dias: true } },
        },
    },
};
// Comprueba las dos guardas de arriba. Devuelve el motivo si el día no se puede tocar.
async function diaTocable(colaboradorId, fecha, ahora) {
    const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    if (fecha.getTime() < inicioDia.getTime()) {
        return 'No se puede cambiar un día que ya pasó.';
    }
    if (fecha.getTime() < finDia.getTime()) {
        const marcas = await prisma_1.prisma.registro.findMany({
            where: {
                colaboradorId,
                OR: [
                    { fecha: { gte: inicioDia, lt: finDia } },
                    { salida: null, entrada: { gte: new Date(ahora.getTime() - VENTANA_TURNO_MS) } },
                ],
            },
            select: { fecha: true, entrada: true, salida: true },
        });
        if (diaYaEmpezado(marcas, inicioDia, finDia, ahora)) {
            return 'Esa persona ya empezó su jornada de hoy: el cambio solo puede aplicar desde mañana.';
        }
    }
    return null;
}
// ───────── EL DESCANSO DE UNA SEMANA ROTATIVA (22 de septiembre de 2026) ─────────
//
// Pintar un día tiene que reescribir OTRO día, y esta es la razón: `esDescanso` se guarda día por
// día, pero «cuál de estos siete lleva el descanso» es una pregunta de la SEMANA. Si alguien pinta
// el turno de descanso en miércoles, el domingo de esa semana —escrito desde hace días como el
// descanso presumido— tiene que pasar a `false`, o esa persona queda con dos descansos.
//
// Aquí solo hay plomería: leer la semana, escribir lo que cambió. Las dos decisiones son puras y
// están probadas aparte: `descansoDeLaSemana` dice qué día lleva el descanso (y devuelve `null`
// cuando hay cero o más de uno, que hace caer al domingo), y `reescrituraDeSemana` dice qué filas
// hay que tocar (nunca una del pasado) y con qué valor.
//
// El horario se busca aquí dentro y no se recibe: los dos que llaman a esto ya hicieron su propia
// consulta, y pasarlo como parámetro obligaba a que las dos trajeran las mismas franjas. Una consulta
// corta es más barata que esa coordinación.
async function reescribirSemanaDe(colaboradorId, fecha, ahora) {
    const col = await prisma_1.prisma.colaborador.findUnique({
        where: { id: colaboradorId },
        select: { horario: { select: { franjas: { select: { dias: true } } } } },
    });
    if (!col)
        return;
    const { lunes, finExclusivo } = (0, fechas_1.rangoSemanaBogota)(fecha);
    const semana = await prisma_1.prisma.diaEsperado.findMany({
        where: { colaboradorId, fecha: { gte: lunes, lt: finExclusivo } },
        // `descansoPintado` es lo que convierte un día marcado en EL descanso de la semana. Desde el
        // 23 de septiembre de 2026 es una columna del día y ya no una plantilla del catálogo: el
        // descanso dejó de ser un turno que había que crear.
        select: { fecha: true, esDescanso: true, descansoPintado: true },
    });
    const planificado = (0, descansoObligatorio_1.descansoDeLaSemana)(semana.map(d => ({
        dia: (0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha),
        esDescanso: d.descansoPintado,
    })));
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const cambios = (0, descansoObligatorio_1.reescrituraDeSemana)(semana.map(d => ({ fecha: d.fecha, diaSemana: (0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(d.fecha), esDescanso: d.esDescanso })), (0, descansoDelHorario_1.fuenteDelDescansoDe)(col.horario), planificado, inicioDia);
    for (const c of cambios) {
        await prisma_1.prisma.diaEsperado.updateMany({
            where: { colaboradorId, fecha: c.fecha },
            data: { esDescanso: c.esDescanso },
        });
    }
}
async function pintarDiaDeColaborador(colaboradorId, fecha, plantilla, ahora = new Date()) {
    const impedimento = await diaTocable(colaboradorId, fecha, ahora);
    if (impedimento)
        return { ok: false, motivo: impedimento };
    const colaborador = await prisma_1.prisma.colaborador.findUnique({
        where: { id: colaboradorId }, select: PARA_PINTAR,
    });
    if (!colaborador)
        return { ok: false, motivo: 'Colaborador no encontrado.' };
    // Las horas y las pausas salen de la PLANTILLA; las tolerancias, del HORARIO. Ese reparto lo
    // eligió el catálogo, y `diaDesdePlantilla` lo aplica con el mismo cálculo que usa el horario
    // para generar un día: si difirieran, la diferencia no se vería en ninguna pantalla.
    const campos = (0, pintarDia_1.diaDesdePlantilla)(plantilla, colaborador.horario);
    if (!campos)
        return { ok: false, motivo: 'Ese turno no tiene horas válidas para pintar un día.' };
    const fuente = (0, descansoDelHorario_1.fuenteDelDescansoDe)(colaborador.horario);
    // `null` como día planificado, IGUAL que en la materialización automática. Que el descanso
    // pintado mande para un ROTATIVO es una pregunta de la SEMANA («cuál de estos siete lleva el
    // turno de descanso»), no de este día suelto, y se resuelve aparte. Mientras tanto un ROTATIVO
    // cae al domingo, que es la dirección segura: un turno pintado puede agregar un recargo, nunca
    // quitarlo.
    const esDescansoDelDia = (0, descansoDelHorario_1.esDescansoObligatorioDe)((0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(fecha), fuente, null);
    await prisma_1.prisma.diaEsperado.upsert({
        where: { colaboradorId_fecha: { colaboradorId, fecha } },
        update: {
            ...campos, esDescanso: esDescansoDelDia, plantillaId: plantilla.id,
            // `MANUAL` es lo que protege este día de la siguiente pasada del materializador, que lo
            // regeneraría desde el horario y borraría lo que acaba de pintar el administrador.
            origen: 'MANUAL', horarioId: colaborador.horarioId,
        },
        create: {
            colaboradorId, fecha, ...campos, esDescanso: esDescansoDelDia,
            plantillaId: plantilla.id, origen: 'MANUAL', horarioId: colaborador.horarioId,
        },
    });
    // DESPUÉS del upsert, no antes: la semana se lee de la base, así que el día que se acaba de
    // pintar tiene que estar escrito para que cuente. Esto corrige también el `esDescanso` que el
    // upsert de arriba dejó con el valor por defecto.
    await reescribirSemanaDe(colaboradorId, fecha, ahora);
    return { ok: true };
}
// ───────── MARCAR UN DÍA COMO DESCANSO (23 de septiembre de 2026) ─────────
//
// Pedido del dueño: «descanso es siempre descanso», así que dejó de ser un turno del catálogo que
// cada empresa tenía que inventarse y pasó a ser una ACCIÓN sobre el día.
//
// Es hermana de `pintarDiaDeColaborador` y no un caso raro dentro de ella: pintar un turno y
// marcar un día libre son dos cosas distintas, y meterlas en la misma función obligaría a que la
// plantilla fuera opcional en una firma donde hoy es obligatoria.
//
// LOS CAMPOS DE UN DÍA LIBRE NO SE ESCRIBEN AQUÍ: se piden a `diaDesdePlantilla`, que ya tiene esa
// rama probada (sin horas, sin almuerzo, `programado: false`, y la política del horario copiada
// igual que en un día generado). Con una copia, el día que cambie qué exige un día libre habría
// dos versiones y solo una se acordaría de cambiar.
async function marcarDescansoDeColaborador(colaboradorId, fecha, ahora = new Date()) {
    const impedimento = await diaTocable(colaboradorId, fecha, ahora);
    if (impedimento)
        return { ok: false, motivo: impedimento };
    const colaborador = await prisma_1.prisma.colaborador.findUnique({
        where: { id: colaboradorId }, select: PARA_PINTAR,
    });
    if (!colaborador)
        return { ok: false, motivo: 'Colaborador no encontrado.' };
    const campos = (0, pintarDia_1.diaDesdePlantilla)({ esDescanso: true, horaEntrada: null, horaSalida: null, tieneAlmuerzo: false,
        almuerzoInicio: null, almuerzoFin: null, descansos: null }, colaborador.horario);
    // No puede pasar: la rama del descanso de `diaDesdePlantilla` nunca devuelve `null`. Se comprueba
    // igual porque el tipo lo permite, y tragarse un `null` aquí escribiría un día vacío.
    if (!campos)
        return { ok: false, motivo: 'No se pudo preparar el día de descanso.' };
    const fuente = (0, descansoDelHorario_1.fuenteDelDescansoDe)(colaborador.horario);
    const esDescansoDelDia = (0, descansoDelHorario_1.esDescansoObligatorioDe)((0, diasDeLaSemana_1.diaSemanaDeFechaBogota)(fecha), fuente, null);
    await prisma_1.prisma.diaEsperado.upsert({
        where: { colaboradorId_fecha: { colaboradorId, fecha } },
        update: {
            ...campos, esDescanso: esDescansoDelDia,
            // `descansoPintado` es el hecho nuevo; `plantillaId` se limpia porque este día ya no lo pinta
            // ningún turno del catálogo, y dejar el anterior haría que la celda mostrara su nombre.
            descansoPintado: true, plantillaId: null,
            origen: 'MANUAL', horarioId: colaborador.horarioId,
        },
        create: {
            colaboradorId, fecha, ...campos, esDescanso: esDescansoDelDia,
            descansoPintado: true, plantillaId: null, origen: 'MANUAL', horarioId: colaborador.horarioId,
        },
    });
    // DESPUÉS del upsert, igual que al pintar: la semana se lee de la base, así que el día que se
    // acaba de marcar tiene que estar escrito para que cuente en el plan.
    await reescribirSemanaDe(colaboradorId, fecha, ahora);
    return { ok: true };
}
// Quitar el turno pintado y devolver el día a lo que su horario exige.
//
// No se borra la fila: se le quita el marcador y se vuelve a generar desde el horario con
// `materializarColaborador`, que es el mismo camino de siempre. Borrarla también funcionaría
// —volvería a nacer en la siguiente pasada— pero dejaría un hueco mientras tanto, y un día sin
// fila se resuelve con el horario de HOY en vez del congelado.
async function despintarDiaDeColaborador(colaboradorId, fecha, ahora = new Date()) {
    const impedimento = await diaTocable(colaboradorId, fecha, ahora);
    if (impedimento)
        return { ok: false, motivo: impedimento };
    // Primero se quita el marcador: mientras diga `MANUAL`, `materializarColaborador` salta la fila
    // a propósito y no la regeneraría.
    const { count } = await prisma_1.prisma.diaEsperado.updateMany({
        where: { colaboradorId, fecha, origen: 'MANUAL' },
        // `descansoPintado` también se limpia: quitar lo que hay en un día tiene que devolverlo a lo
        // que su horario exige, y dejarlo en `true` lo mantendría libre para siempre y seguiría
        // contando como el descanso de esa semana.
        data: { origen: 'AUTO', plantillaId: null, descansoPintado: false },
    });
    if (count === 0)
        return { ok: false, motivo: 'Ese día no tiene ningún turno pintado.' };
    const finExclusivo = new Date(fecha.getTime() + 24 * 60 * 60 * 1000);
    await materializarColaborador(colaboradorId, fecha, finExclusivo, { pisarExistentes: true });
    // Quitar un turno también cambia el PLAN de la semana: si lo que se borró era el descanso del
    // miércoles, esa semana vuelve a no tener ninguno y el descanso regresa al domingo. Sin esto, el
    // miércoles se quedaría de descanso para siempre y el domingo seguiría sin su recargo.
    //
    // Va DESPUÉS de rematerializar, por lo mismo que en el pintado: la semana se lee de la base.
    await reescribirSemanaDe(colaboradorId, fecha, ahora);
    return { ok: true };
}
// Materializa la ventana de UN colaborador desde hoy. Para el recién creado:
// sin esto no tendría filas hasta la siguiente pasada diaria, y ese hueco se
// resolvería con el horario vigente.
async function mantenerVentanaDeColaborador(colaboradorId) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)();
    const hasta = new Date(inicioDia.getTime() + DIAS_ADELANTE * 24 * 60 * 60 * 1000);
    return materializarColaborador(colaboradorId, inicioDia, hasta);
}
// Lo máximo que puede durar un turno abierto antes de que el auto-cierre lo dé
// por olvidado. Nadie trabaja más: pasado eso, es una salida sin marcar.
const VENTANA_TURNO_MS = 18 * 60 * 60 * 1000;
// ¿Esta persona ya tiene el día de hoy empezado?
//
// Es la pregunta que decide desde cuándo aplica un cambio de horario. El día de
// hoy no es futuro ni pasado: está a medio consumir. La línea limpia no es una
// fecha, es un hecho.
//
// Si todavía no marcó, su fila de hoy no ha alimentado ningún cálculo y pisarla
// es idéntico a pisar la de mañana. Si ya marcó, pisarla movería su llegada, su
// descuento de almuerzo y lo que el día le exige — y nadie puede llegar tarde
// según una regla que no existía cuando marcó.
function diaYaEmpezado(marcas, inicioDia, finDia, ahora = new Date()) {
    return marcas.some(r => {
        if (r.fecha.getTime() >= inicioDia.getTime() && r.fecha.getTime() < finDia.getTime())
            return true;
        // Turno nocturno todavía abierto: se ancló al día en que entró, pero la
        // persona sigue dentro. Cambiarle hoy la ventana de almuerzo le movería el
        // descuento a mitad de jornada.
        return !r.salida && !!r.entrada && ahora.getTime() - r.entrada.getTime() <= VENTANA_TURNO_MS;
    });
}
// Regenera los días de UN colaborador desde hoy si su día está intacto, y desde
// mañana si ya lo empezó.
async function regenerarDiasDeColaborador(colaboradorId, ahora = new Date()) {
    const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const marcas = await prisma_1.prisma.registro.findMany({
        where: {
            colaboradorId,
            OR: [
                { fecha: { gte: inicioDia, lt: finDia } },
                { salida: null, entrada: { gte: new Date(ahora.getTime() - VENTANA_TURNO_MS) } },
            ],
        },
        select: { fecha: true, entrada: true, salida: true },
    });
    const empezado = diaYaEmpezado(marcas, inicioDia, finDia, ahora);
    const desde = empezado ? finDia : inicioDia;
    const hasta = new Date(finDia.getTime() + DIAS_ADELANTE * 24 * 60 * 60 * 1000);
    const escritos = await materializarColaborador(colaboradorId, desde, hasta, { pisarExistentes: true });
    return { escritos, aplicadoHoy: !empezado };
}
async function regenerarVarios(colaboradores, log) {
    let escritos = 0;
    let hoy = 0;
    const diferidos = [];
    for (const c of colaboradores) {
        const r = await regenerarDiasDeColaborador(c.id);
        escritos += r.escritos;
        if (r.aplicadoHoy)
            hoy++;
        else
            diferidos.push({ id: c.id, nombre: `${c.nombre} ${c.apellido}` });
    }
    log?.info(`Días esperados regenerados: ${escritos} · desde hoy ${hoy} · desde mañana ${diferidos.length}`);
    return { escritos, hoy, diferidos };
}
// Regenera los días de todos los colaboradores de un horario. Se llama cuando el
// admin lo edita.
async function regenerarDiasDeHorario(horarioId, log) {
    const colaboradores = await prisma_1.prisma.colaborador.findMany({
        where: { horarioId, activo: true },
        select: { id: true, nombre: true, apellido: true },
    });
    return regenerarVarios(colaboradores, log);
}
// Igual, pero para una lista ya resuelta. La usa el borrado de un horario, que
// tiene que quedarse con los colaboradores ANTES de desasignarlos: después ya no
// hay forma de saber a quiénes afectaba.
async function regenerarDiasDeVarios(colaboradores, log) {
    return regenerarVarios(colaboradores, log);
}
// Garantiza que UN día concreto tenga su fila. Se llama al crear o corregir un
// registro: un día con marcación es un día que va a salir en un reporte, y si
// llega ahí sin fila lo resuelve el horario vigente y vuelve a ser reescribible.
//
// No pisa lo que ya existe, así que corregir un registro viejo nunca cambia lo
// que ese día exigía.
async function asegurarDiaMaterializado(colaboradorId, fecha) {
    const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(fecha);
    return materializarColaborador(colaboradorId, inicioDia, finDia);
}
// Igual que la anterior pero para usar desde una ruta: nunca lanza. Materializar
// es un efecto secundario, y que falle no puede tumbar la marcación de nadie.
async function asegurarDiaSinFallar(colaboradorId, fecha, log) {
    if (!colaboradorId || !fecha)
        return;
    try {
        await asegurarDiaMaterializado(colaboradorId, fecha);
    }
    catch (err) {
        log?.error(err, 'No se pudo materializar el día del registro');
    }
}
// Mantiene la ventana hacia adelante de toda la plataforma. Corre al arrancar y
// cada 24h; es idempotente, así que correr de más no daña nada.
async function mantenerVentana(log) {
    try {
        const { inicioDia } = (0, fechas_1.rangoDiaBogota)();
        const hasta = new Date(inicioDia.getTime() + DIAS_ADELANTE * 24 * 60 * 60 * 1000);
        const colaboradores = await prisma_1.prisma.colaborador.findMany({
            where: { activo: true },
            select: { id: true },
        });
        let total = 0;
        for (const c of colaboradores) {
            total += await materializarColaborador(c.id, inicioDia, hasta);
        }
        if (total > 0)
            log?.info(`Días esperados generados: ${total}`);
        return total;
    }
    catch (err) {
        log?.error(err, 'Error manteniendo la ventana de días esperados');
        return 0;
    }
}
// Rellena hacia atrás desde la primera marcación de cada colaborador. Se usa una
// sola vez, al desplegar la función. Usa el horario ACTUAL de cada quien: es el
// único dato que existe, porque el sistema nunca guardó cuál era antes.
async function backfillColaborador(colaboradorId) {
    const [primero, colaborador] = await Promise.all([
        prisma_1.prisma.registro.findFirst({
            where: { colaboradorId },
            orderBy: { fecha: 'asc' },
            select: { fecha: true },
        }),
        prisma_1.prisma.colaborador.findUnique({ where: { id: colaboradorId }, select: { creadoEn: true } }),
    ]);
    if (!colaborador)
        return 0;
    // Desde lo más viejo de los dos. Solo la primera marcación no basta: al
    // corregir el pasado se crean registros ANTERIORES a esa fecha, y esos días
    // quedarían sin fila y volverían a resolverse con el horario de hoy.
    const candidatos = [colaborador.creadoEn, primero?.fecha].filter(Boolean);
    if (candidatos.length === 0)
        return 0;
    const desde = medianocheBogotaDe(new Date(Math.min(...candidatos.map(d => d.getTime()))));
    const { finDia } = (0, fechas_1.rangoDiaBogota)();
    if (desde >= finDia)
        return 0;
    return materializarColaborador(colaboradorId, desde, finDia);
}
// Rellena hacia atrás TODA la plataforma. Se corre una sola vez al desplegar la
// función. Es idempotente: no pisa nada de lo que ya exista.
async function backfillTodos(log) {
    const colaboradores = await prisma_1.prisma.colaborador.findMany({ select: { id: true } });
    let dias = 0;
    for (const c of colaboradores) {
        dias += await backfillColaborador(c.id);
    }
    log?.info(`Backfill de días esperados: ${dias} días en ${colaboradores.length} colaborador(es)`);
    return { colaboradores: colaboradores.length, dias };
}
