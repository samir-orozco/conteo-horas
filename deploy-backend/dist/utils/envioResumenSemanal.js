"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPO_RESUMEN_SEMANAL = exports.CLAVE_RESUMEN_SEMANAL = void 0;
exports.enviarResumenesSemanales = enviarResumenesSemanales;
const prisma_1 = require("../prisma");
const correo_1 = require("./correo");
const contratos_1 = require("./contratos");
const fechas_1 = require("./fechas");
const reportesDeEmpresa_1 = require("./reportesDeEmpresa");
const resumenSemanal_1 = require("./resumenSemanal");
Object.defineProperty(exports, "CLAVE_RESUMEN_SEMANAL", { enumerable: true, get: function () { return resumenSemanal_1.CLAVE_RESUMEN_SEMANAL; } });
exports.TIPO_RESUMEN_SEMANAL = 'RESUMEN_SEMANAL';
async function periodo(empresaId, s) {
    const [extras, tardanzas] = await Promise.all([
        (0, reportesDeEmpresa_1.liquidarEmpresa)(empresaId, s.desde, s.hasta),
        (0, reportesDeEmpresa_1.tardanzasDeEmpresa)(empresaId, s.desde, s.hasta),
    ]);
    return { horas: extras.filas, tardanzas: tardanzas.filas };
}
// Todo lo que el resumen necesita de una empresa, leído de la base.
async function entradaDe(empresaId, semana, ahora) {
    const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(semana.desde, semana.hasta);
    const [actual, anterior, cerrados, novedadesPorAprobar, contratos] = await Promise.all([
        periodo(empresaId, semana),
        periodo(empresaId, semana.anterior),
        // Las salidas que puso el auto-cierre. Por (colaboradorId, fecha), igual que los resúmenes:
        // ver el EXPLAIN en el commit (§8.4).
        prisma_1.prisma.registro.findMany({
            where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo }, salidaEstimada: true },
            select: { fecha: true, colaborador: { select: { nombre: true, apellido: true } } },
            orderBy: { fecha: 'asc' },
        }),
        prisma_1.prisma.permiso.count({ where: { aprobado: false, colaborador: { empresaId, activo: true } } }),
        prisma_1.prisma.contrato.findMany({
            where: { estado: 'VIGENTE', colaborador: { empresaId, activo: true } },
            select: {
                tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
                colaborador: { select: { nombre: true, apellido: true } },
                prorrogas: { select: { desde: true, hasta: true } },
            },
        }),
    ]);
    return {
        semana, actual, anterior,
        turnosCerradosSolos: cerrados.map(r => ({
            nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
            // `fecha` es medianoche de Bogotá (05:00 UTC): su fecha UTC es el día del turno.
            fecha: r.fecha.toISOString().slice(0, 10),
        })),
        novedadesPorAprobar,
        contratos: contratos.flatMap(c => {
            const { alertas } = (0, contratos_1.estadoDelContrato)({ tipo: c.tipo, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica }, c.prorrogas, ahora);
            const nombre = `${c.colaborador.nombre} ${c.colaborador.apellido}`;
            return alertas.map(a => ({ nombre, tipo: a.tipo, dias: a.dias }));
        }),
    };
}
// La pasada. Corre todos los días a las 7 y al arrancar (programarDiario), y solo hace algo el
// lunes: lo decide `semanaDelResumen`.
//
// Que no salga dos veces se decide con la notificación de la campana, igual que los avisos de
// cobro: su `entidadId` es el lunes de la semana. Se anota DESPUÉS de mandar, así que si el correo
// falla la próxima pasada del mismo lunes lo reintenta.
//
// Devuelve cuántas empresas lo recibieron. Deja rastro siempre, también cuando no toca (§8.3).
async function enviarResumenesSemanales(log, ahora = new Date()) {
    const semana = (0, resumenSemanal_1.semanaDelResumen)(ahora);
    if (!semana) {
        log?.info('Resumen semanal: hoy no toca');
        return 0;
    }
    const empresas = await prisma_1.prisma.empresa.findMany({
        where: { activa: true },
        select: {
            id: true, nombre: true, email: true,
            usuarios: { where: { rol: 'ADMIN', activo: true }, select: { email: true } },
            configuracion: { where: { clave: resumenSemanal_1.CLAVE_RESUMEN_SEMANAL }, select: { valor: true } },
        },
    });
    // De aquí salen el enlace a Reportes y el logo, que se publica con el frontend.
    const origen = process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
    let enviados = 0, apagadas = 0, sinNada = 0, yaEstaban = 0, fallidas = 0;
    for (const e of empresas) {
        try {
            if (e.configuracion[0]?.valor === '0') {
                apagadas++;
                continue;
            }
            const yaMandado = await prisma_1.prisma.notificacion.findFirst({
                where: { empresaId: e.id, tipo: exports.TIPO_RESUMEN_SEMANAL, entidad: 'resumen', entidadId: semana.desde },
                select: { id: true },
            });
            if (yaMandado) {
                yaEstaban++;
                continue;
            }
            const resumen = (0, resumenSemanal_1.armarResumen)(await entradaDe(e.id, semana, ahora));
            if (!resumen.hayAlgo) {
                sinNada++;
                continue;
            }
            const correo = (0, resumenSemanal_1.correoDelResumen)(resumen, e.nombre, origen);
            for (const para of (0, correo_1.destinatarios)(e)) {
                await (0, correo_1.enviarCorreo)({ para, asunto: correo.asunto, html: correo.html });
            }
            const aviso = (0, resumenSemanal_1.avisoDelResumen)(resumen);
            await prisma_1.prisma.notificacion.create({
                data: { empresaId: e.id, tipo: exports.TIPO_RESUMEN_SEMANAL, titulo: aviso.titulo, cuerpo: aviso.cuerpo, entidad: 'resumen', entidadId: semana.desde },
            });
            enviados++;
        }
        catch (err) {
            fallidas++;
            log?.error(err, `Resumen semanal: falló la empresa ${e.id}`);
        }
    }
    log?.info(`Resumen semanal ${semana.desde}: ${enviados} enviados · ${yaEstaban} ya estaban · ${apagadas} apagados · ${sinNada} sin nada que contar · ${fallidas} fallidas · de ${empresas.length} empresas`);
    return enviados;
}
