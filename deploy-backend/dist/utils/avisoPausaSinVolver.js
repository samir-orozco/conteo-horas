"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPO_PAUSA_SIN_VOLVER = void 0;
exports.avisarPausasSinVolver = avisarPausasSinVolver;
exports.avisarSiYaVolvio = avisarSiYaVolvio;
const prisma_1 = require("../prisma");
const telegram_1 = require("./telegram");
const fechas_1 = require("./fechas");
const diasEsperados_1 = require("./diasEsperados");
const suscripcion_1 = require("./suscripcion");
const pausaSinVolver_1 = require("./pausaSinVolver");
// LA PLOMERÍA DE «NO HA VUELTO DE SU PAUSA» (13 de octubre de 2026).
//
// El barrido cada 5 minutos y el «ya volvió» que dispara el kiosco. Mismo molde que
// avisoNoHaLlegado.ts. La decisión está en pausaSinVolver.ts, probada. Se verifica contra la base
// local con prisma/probar-pausa-sin-volver.ts (§8.6).
exports.TIPO_PAUSA_SIN_VOLVER = 'PAUSA_SIN_VOLVER';
const DIA_MS = 24 * 60 * 60 * 1000;
async function empresasConElAviso() {
    const cfgs = await prisma_1.prisma.configuracion.findMany({
        where: { clave: { in: [pausaSinVolver_1.CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] }, empresa: { activa: true } },
        select: { empresaId: true, clave: true, valor: true },
    });
    const porEmpresa = new Map();
    for (const c of cfgs)
        porEmpresa.set(c.empresaId, { ...porEmpresa.get(c.empresaId), [c.clave]: c.valor });
    return [...porEmpresa.entries()]
        .filter(([, m]) => m[pausaSinVolver_1.CLAVE_PAUSAS] === '1' && m.TELEGRAM_CHAT_ID?.trim())
        .map(([empresaId, m]) => ({ empresaId, chat: m.TELEGRAM_CHAT_ID.trim() }));
}
async function avisarEmpresa(empresaId, chat, ahora, log) {
    const { finDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    // Hoy y ayer: la pausa de un turno nocturno después de la medianoche tiene la fecha de ayer.
    const desde = new Date(finDia.getTime() - 2 * DIA_MS);
    const empresa = await prisma_1.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { exentaPago: true, suscripcion: { select: { estado: true, finPrueba: true, pagadoHasta: true } } },
    });
    if (!empresa || (0, suscripcion_1.kioscoPausado)(empresa, empresa.suscripcion, ahora))
        return 0;
    // Las personas primero y lo demás por su lista de ids, para que MySQL use el índice
    // (colaboradorId, fecha) entero: ver la nota de avisoNoHaLlegado.ts (§8.4).
    const colaboradores = await prisma_1.prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: { id: true, nombre: true, apellido: true, horario: { include: { franjas: true } } },
    });
    if (!colaboradores.length)
        return 0;
    const ids = colaboradores.map(c => c.id);
    const [filas, materializados] = await Promise.all([
        prisma_1.prisma.registro.findMany({
            where: { colaboradorId: { in: ids }, fecha: { gte: desde, lt: finDia } },
            select: { id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
        }),
        prisma_1.prisma.diaEsperado.findMany({
            where: { colaboradorId: { in: ids }, fecha: { gte: desde, lt: finDia } },
            select: {
                colaboradorId: true, fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true,
                almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true, ajustaEntrada: true,
                almuerzoInicio: true, almuerzoFin: true, descansos: true,
            },
        }),
    ]);
    const pausas = filas.filter(f => f.salida && (f.salidaAlmuerzo || f.salidaDescanso));
    if (!pausas.length)
        return 0;
    const avisados = await prisma_1.prisma.notificacion.findMany({
        // Acotado por fecha para ir por el índice (empresaId, creadoEn): el aviso de una pausa de la ventana
        // no puede ser anterior a ella. Sin esto se recorrían todos los avisos de la empresa (§8.4).
        where: { empresaId, creadoEn: { gte: desde }, tipo: exports.TIPO_PAUSA_SIN_VOLVER, entidadId: { in: pausas.map(p => p.id) } },
        select: { entidadId: true },
    });
    // El día esperado de cada persona en cada fecha, materializado o del horario.
    const dias = new Map();
    for (const c of colaboradores) {
        const suyos = materializados.filter(d => d.colaboradorId === c.id);
        for (const d of (0, diasEsperados_1.combinarDiasEsperados)(desde, finDia, suyos, c.horario)) {
            dias.set(`${c.id}|${(0, fechas_1.claveDiaBogota)(d.fecha)}`, d);
        }
    }
    const lista = (0, pausaSinVolver_1.pausasPorAvisar)(ahora, filas, (id, fecha) => dias.get(`${id}|${(0, fechas_1.claveDiaBogota)(fecha)}`) ?? null, new Map(colaboradores.map(c => [c.id, { nombre: c.nombre, apellido: c.apellido }])), new Set(avisados.map(a => a.entidadId).filter((x) => !!x)));
    if (!lista.length)
        return 0;
    // La campana se escribe aunque Telegram falle, por lo mismo que en «no ha llegado»: es la marca de
    // «ya se avisó», y sin ella un chat mal puesto reintentaría cada 5 minutos para siempre.
    const r = await (0, telegram_1.enviarTelegram)(chat, (0, pausaSinVolver_1.mensajePausasSinVolver)(lista));
    if (!r.ok)
        log?.error(r.error, `Pausa sin volver: Telegram rechazó el aviso de la empresa ${empresaId}`);
    await prisma_1.prisma.notificacion.createMany({
        data: lista.map(p => ({
            empresaId, tipo: exports.TIPO_PAUSA_SIN_VOLVER,
            titulo: `${p.nombre} no ha vuelto ${p.pausa === 'almuerzo' ? 'del almuerzo' : 'de su descanso'}`,
            cuerpo: (0, pausaSinVolver_1.cuerpoDePausaSinVolver)(p),
            entidad: 'registro', entidadId: p.registroId,
        })),
    });
    return lista.length;
}
async function avisarPausasSinVolver(log, ahora = new Date()) {
    const empresas = await empresasConElAviso();
    let personas = 0, fallidas = 0;
    for (const { empresaId, chat } of empresas) {
        try {
            personas += await avisarEmpresa(empresaId, chat, ahora, log);
        }
        catch (err) {
            fallidas++;
            log?.error(err, `Pausa sin volver: falló la empresa ${empresaId}`);
        }
    }
    log?.info(`Pausa sin volver: ${personas} avisadas en ${empresas.length} empresas con el aviso · ${fallidas} fallidas`);
    return personas;
}
// Lo llama el kiosco al registrar el regreso de una pausa. Si se avisó que esa pausa estaba sin volver,
// se cierra el tema en el grupo y en la campana. No bloquea la marca.
async function avisarSiYaVolvio(empresaId, registroDeLaPausa, nombre, pausa, marco) {
    const aviso = await prisma_1.prisma.notificacion.findFirst({
        // Corre en cada regreso de pausa del kiosco: acotado por fecha, por el índice (empresaId, creadoEn).
        // El aviso de una pausa que todavía espera regreso no tiene más de 18 horas (VENTANA_TURNO_MS).
        where: { empresaId, creadoEn: { gte: new Date(marco.getTime() - DIA_MS) }, tipo: exports.TIPO_PAUSA_SIN_VOLVER, entidad: 'registro', entidadId: registroDeLaPausa },
        select: { id: true, cuerpo: true },
    });
    // Sin aviso no hay nada que cerrar; con el aviso ya cerrado, tampoco.
    if (!aviso || aviso.cuerpo?.startsWith('Volvió'))
        return;
    const cfgs = await prisma_1.prisma.configuracion.findMany({ where: { empresaId, clave: { in: [pausaSinVolver_1.CLAVE_PAUSAS, 'TELEGRAM_CHAT_ID'] } } });
    const cfg = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
    if (cfg[pausaSinVolver_1.CLAVE_PAUSAS] === '1' && cfg.TELEGRAM_CHAT_ID) {
        await (0, telegram_1.enviarTelegram)(cfg.TELEGRAM_CHAT_ID, (0, pausaSinVolver_1.mensajeYaVolvio)(nombre, pausa, marco));
    }
    await prisma_1.prisma.notificacion.update({ where: { id: aviso.id }, data: { cuerpo: (0, pausaSinVolver_1.cuerpoYaVolvio)(marco, aviso.cuerpo) } });
}
