"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.avisarTurnosCerrados = avisarTurnosCerrados;
const prisma_1 = require("../prisma");
const telegram_1 = require("./telegram");
const turnosCerradosSolos_1 = require("./turnosCerradosSolos");
const DIA_MS = 24 * 60 * 60 * 1000;
async function empresasConElAviso() {
    const cfgs = await prisma_1.prisma.configuracion.findMany({
        where: { clave: { in: [turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS, 'TELEGRAM_CHAT_ID', turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS_ENVIADO] }, empresa: { activa: true } },
        select: { empresaId: true, clave: true, valor: true },
    });
    const porEmpresa = new Map();
    for (const c of cfgs)
        porEmpresa.set(c.empresaId, { ...porEmpresa.get(c.empresaId), [c.clave]: c.valor });
    return [...porEmpresa.entries()]
        .filter(([, m]) => m[turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS] === '1' && m.TELEGRAM_CHAT_ID?.trim())
        .map(([empresaId, m]) => ({ empresaId, chat: m.TELEGRAM_CHAT_ID.trim(), ultimoEnvio: m[turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS_ENVIADO] ?? null }));
}
async function avisarTurnosCerrados(log, ahora = new Date()) {
    const origen = process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
    const empresas = await empresasConElAviso();
    let enviados = 0, fallidas = 0;
    for (const { empresaId, chat, ultimoEnvio } of empresas) {
        try {
            const toca = (0, turnosCerradosSolos_1.tocaElMensajeDeTurnos)(ahora, ultimoEnvio);
            if (!toca)
                continue;
            // Por (colaboradorId, fecha), como los demás barridos (§8.4). La entrada de un turno cerrado es
            // al menos 18 horas anterior a su cierre; una semana de margen cubre una app dormida varios días.
            const ids = (await prisma_1.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true } })).map(c => c.id);
            const cerrados = ids.length ? await prisma_1.prisma.registro.findMany({
                where: {
                    colaboradorId: { in: ids },
                    fecha: { gte: new Date(toca.desde.getTime() - 7 * DIA_MS) },
                    salidaEstimada: true,
                    // Lo cerró el sistema en la ventana, y nadie lo ha corregido: si un administrador ya lo
                    // editó, ya lo revisó y no hay nada que avisar.
                    editadoPor: 'SISTEMA',
                    editadoEn: { gte: toca.desde, lt: toca.hasta },
                },
                select: { entrada: true, salida: true, colaborador: { select: { nombre: true, apellido: true } } },
            }) : [];
            if (cerrados.length) {
                const r = await (0, telegram_1.enviarTelegram)(chat, (0, turnosCerradosSolos_1.mensajeTurnosCerrados)(cerrados.map(c => ({ nombre: `${c.colaborador.nombre} ${c.colaborador.apellido}`, entrada: c.entrada, salidaEstimada: c.salida })), `${origen}/app/registros`));
                if (!r.ok)
                    log?.error(r.error, `Turnos cerrados: Telegram rechazó el mensaje de la empresa ${empresaId}`);
                else
                    enviados++;
            }
            // Se anota aunque no hubiera nada que contar o Telegram fallara: es la marca de que la pasada de
            // hoy ya se hizo, y sin ella cada arranque de la app volvería a intentarlo.
            await prisma_1.prisma.configuracion.upsert({
                where: { empresaId_clave: { empresaId, clave: turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS_ENVIADO } },
                update: { valor: toca.hoy },
                create: { empresaId, clave: turnosCerradosSolos_1.CLAVE_TURNOS_CERRADOS_ENVIADO, valor: toca.hoy },
            });
        }
        catch (err) {
            fallidas++;
            log?.error(err, `Turnos cerrados: falló la empresa ${empresaId}`);
        }
    }
    log?.info(`Turnos cerrados por Telegram: ${enviados} mensajes · ${empresas.length} empresas con el aviso · ${fallidas} fallidas`);
    return enviados;
}
