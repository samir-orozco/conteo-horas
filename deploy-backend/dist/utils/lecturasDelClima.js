"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruebasDe = void 0;
exports.sedesDeLaGente = sedesDeLaGente;
exports.sincronizarSeguimientos = sincronizarSeguimientos;
exports.resumenDelPanel = resumenDelPanel;
const prisma_1 = require("../prisma");
const fechas_1 = require("./fechas");
const sedesDeEmpresa_1 = require("./sedesDeEmpresa");
const atencionClima_1 = require("./atencionClima");
const clima_1 = require("./clima");
const climaDelKiosco_1 = require("./climaDelKiosco");
const pruebaClima_1 = require("./pruebaClima");
// LAS LECTURAS DEL CLIMA que usan el panel y el Inicio: el resumen del panel y las pruebas gratis de la empresa.
// Sacadas de routes/clima.ts el 15 de octubre de 2026 sin cambiar una línea, para que el Inicio (la tarjeta del
// clima de la semana) cuente exactamente lo mismo que el panel. Lo que se decide está en utils/clima.ts, con sus
// pruebas; esto lee la base y lo conecta. prisma/diferencial-clima-panel.ts comprueba que /clima/resumen y
// /clima/vistazo responden byte a byte lo mismo que antes de sacarlo.
const RECIENTES = 30;
// Las pruebas gratis del clima que tuvo la empresa (PENDIENTES nº 39, fase 3). Qué se decide con ellas está en
// utils/pruebaClima.ts.
const pruebasDe = (empresaId) => prisma_1.prisma.concesionFuncion.findMany({
    where: { empresaId, funcion: pruebaClima_1.FUNCION_DE_PRUEBA, origen: 'PRUEBA' },
    select: { desde: true, hasta: true, revocadaEn: true },
});
exports.pruebasDe = pruebasDe;
// La sede de cada persona, atribuida al LEER con la regla de los reportes: sus sedes asignadas, o la
// principal si es presencial y no tiene ninguna. Null («Sin sede») solo para híbridos y remotos.
async function sedesDeLaGente(empresaId) {
    const [colaboradores, asignadas, sedes, defecto] = await Promise.all([
        prisma_1.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true, nombre: true, apellido: true, cargo: true, modalidad: true, activo: true } }),
        prisma_1.prisma.colaboradorSede.findMany({ where: { sede: { empresaId, activa: true } }, select: { colaboradorId: true, sedeId: true } }),
        prisma_1.prisma.sede.findMany({ where: { empresaId, activa: true }, select: { id: true, nombre: true }, orderBy: { creadoEn: 'asc' } }),
        (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId),
    ]);
    const sedesDe = new Map();
    for (const a of asignadas)
        sedesDe.set(a.colaboradorId, [...(sedesDe.get(a.colaboradorId) ?? []), a.sedeId]);
    for (const c of colaboradores) {
        if (sedesDe.has(c.id))
            continue;
        sedesDe.set(c.id, [c.modalidad === 'PRESENCIAL' ? defecto(c.id) : null]);
    }
    return { colaboradores, sedes, sedesDe };
}
// EL SEGUIMIENTO (4 de octubre de 2026): cada persona que entra a «Necesitan atención» recibe su caso,
// con las reglas de `casosPorAbrir`. Se abren al leer la lista, y la llave única (persona, comienzo de
// la racha) impide que dos lecturas simultáneas abran el mismo caso dos veces.
async function sincronizarSeguimientos(empresaId, atencion) {
    if (atencion.length === 0)
        return;
    const casos = await prisma_1.prisma.seguimientoClima.findMany({
        where: { empresaId, colaboradorId: { in: atencion.map(a => a.colaboradorId) } },
        select: { colaboradorId: true, desde: true, estado: true },
    });
    const nuevos = (0, clima_1.casosPorAbrir)(atencion, casos);
    if (nuevos.length > 0) {
        await prisma_1.prisma.seguimientoClima.createMany({
            data: nuevos.map(n => ({ empresaId, colaboradorId: n.colaboradorId, desde: n.desde })),
            skipDuplicates: true,
        });
    }
}
// EL RESUMEN DEL PANEL. Lo usan el panel completo y la vista sin el plan, que es una lista blanca de esto
// (utils/climaSinPlan.ts): así las dos cuentan exactamente lo mismo. `abrirCasos` decide si abre los casos de
// seguimiento de quien entró a «necesita atención»: el panel sí; la vista sin el plan no, porque nadie puede ver
// esos casos y quedarían abiertos con una fecha en la que nadie los vio.
async function resumenDelPanel(empresaId, desde, hasta, sede, abrirCasos) {
    const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
    // El período anterior, del mismo largo, para la variación del promedio.
    const desdeAnterior = new Date(desdeF.getTime() - (finExclusivo.getTime() - desdeF.getTime()));
    const { colaboradores, sedes, sedesDe } = await sedesDeLaGente(empresaId);
    const enLaSede = (colaboradorId) => sede === null || (sedesDe.get(colaboradorId) ?? []).includes(sede);
    const persona = new Map(colaboradores.map(c => [c.id, c]));
    const nombreDe = (id) => { const c = persona.get(id); return c ? `${c.nombre} ${c.apellido}` : 'Persona eliminada'; };
    const nombreDeSede = new Map([...sedes.map(s => [s.id, s.nombre]), [null, 'Sin sede']]);
    const filas = await prisma_1.prisma.calificacionClima.findMany({
        where: { empresaId, fecha: { gte: desdeAnterior, lt: finExclusivo } },
        select: { colaboradorId: true, fecha: true, carita: true, motivos: true, observacion: true, actualizadoEn: true },
    });
    const todas = filas.map(f => ({ ...f, motivos: (0, atencionClima_1.comoLista)(f.motivos) }));
    const delPeriodo = (d, h) => (c) => c.fecha >= d && c.fecha < h;
    const actualTodas = todas.filter(delPeriodo(desdeF, finExclusivo));
    const actual = actualTodas.filter(c => enLaSede(c.colaboradorId));
    const anterior = todas.filter(delPeriodo(desdeAnterior, desdeF)).filter(c => enLaSede(c.colaboradorId));
    const resumen = (0, clima_1.resumenDelClima)(actual);
    const resumenAnterior = (0, clima_1.resumenDelClima)(anterior);
    // Cuántas JORNADAS (persona y día) se cerraron en el kiosco en el período: es contra qué se compara
    // «respondieron». Por jornadas y no por personas: por personas, en un rango largo casi todos responden
    // alguna vez y el porcentaje se quedaba en 100. Solo las salidas que abren la ventana: ni pausas, ni
    // el cierre automático, ni las cargadas a mano (revisión adversarial del 4 de octubre de 2026). Un
    // turno partido son dos salidas pero una sola jornada, por eso se agrupa por persona y día.
    //
    // Se leen las de TODA la empresa: con ellas sale también la participación de cada sede.
    const ids = colaboradores.map(c => c.id);
    const jornadasTodas = ids.length === 0 ? [] : await prisma_1.prisma.registro.groupBy({
        by: ['colaboradorId', 'fecha'],
        where: {
            colaboradorId: { in: ids }, fecha: { gte: desdeF, lt: finExclusivo },
            ...climaDelKiosco_1.SALIDAS_QUE_ABREN_LA_VENTANA,
        },
    });
    const jornadas = jornadasTodas.filter(j => enLaSede(j.colaboradorId));
    // «Necesitan atención» es cómo está cada uno HOY, no en el período. Los casos de seguimiento se abren
    // con TODA la empresa, no solo con la sede del filtro: filtrar la vista no puede dejar a nadie sin caso.
    const activos = new Set(colaboradores.filter(c => c.activo).map(c => c.id));
    const atencionTodas = await (0, atencionClima_1.atencionDeLaEmpresa)(empresaId, activos);
    if (abrirCasos)
        await sincronizarSeguimientos(empresaId, atencionTodas);
    const casos = atencionTodas.length === 0 ? [] : await prisma_1.prisma.seguimientoClima.findMany({
        where: { empresaId, colaboradorId: { in: atencionTodas.map(a => a.colaboradorId) } },
        select: { id: true, colaboradorId: true, desde: true, estado: true },
    });
    const atencion = atencionTodas.filter(a => enLaSede(a.colaboradorId)).map(a => {
        // El caso de esta racha; si no hay, el que siga abierto (`casoDeLaAtencion`, la misma regla de Seguimiento).
        const caso = (0, clima_1.casoDeLaAtencion)(a, casos.filter(c => c.colaboradorId === a.colaboradorId));
        return {
            ...a,
            nombre: nombreDe(a.colaboradorId),
            cargo: persona.get(a.colaboradorId)?.cargo ?? null,
            sedes: (sedesDe.get(a.colaboradorId) ?? []).map(s => nombreDeSede.get(s) ?? 'Sin sede'),
            seguimiento: caso ? { id: caso.id, estado: caso.estado } : null,
        };
    });
    const recientes = [...actual]
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.actualizadoEn.getTime() - a.actualizadoEn.getTime())
        .slice(0, RECIENTES)
        .map(c => ({ colaboradorId: c.colaboradorId, nombre: nombreDe(c.colaboradorId), fecha: c.fecha, carita: c.carita, motivos: c.motivos, observacion: c.observacion }));
    return {
        ...resumen,
        variacion: (0, clima_1.variacionDelPromedio)(resumen.promedio, resumenAnterior.promedio),
        jornadas: jornadas.length,
        porSede: (0, clima_1.promedioPorSede)(actualTodas, jornadasTodas, sedesDe, sedes),
        atencion,
        recientes,
    };
}
