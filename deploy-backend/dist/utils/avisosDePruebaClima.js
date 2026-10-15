"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.avisarPruebasDelClima = avisarPruebasDelClima;
const prisma_1 = require("../prisma");
const fechas_1 = require("./fechas");
const pruebaClima_1 = require("./pruebaClima");
const DIA_MS = 24 * 60 * 60 * 1000;
// Una prueba que terminó hace más de una semana ya no recibe el aviso de «terminó»: si la pasada estuvo caída tanto
// tiempo, avisarlo tarde confunde más de lo que informa.
const DIAS_DE_GRACIA_DEL_FIN = 7;
async function avisarPruebasDelClima(log, ahora = new Date(), db = prisma_1.prisma) {
    // La tabla de concesiones es pequeña (una fila por función dada a una empresa), así que leerla entera filtrando
    // por función y origen no es un recorrido de las tablas grandes que prohíbe la §8.4.
    const pruebas = await db.concesionFuncion.findMany({
        where: {
            funcion: pruebaClima_1.FUNCION_DE_PRUEBA, origen: 'PRUEBA', revocadaEn: null,
            hasta: { gt: new Date(ahora.getTime() - DIAS_DE_GRACIA_DEL_FIN * DIA_MS) },
        },
        select: { id: true, empresaId: true, desde: true, hasta: true, revocadaEn: true },
    });
    let enviados = 0;
    for (const p of pruebas) {
        const aviso = (0, pruebaClima_1.avisoDePrueba)(p, ahora);
        if (!aviso)
            continue;
        try {
            // Lo que se ha encontrado, solo para el aviso de avance: las respuestas desde el día en que empezó.
            const hallado = aviso === 'AVANCE'
                ? await db.calificacionClima.aggregate({
                    where: { empresaId: p.empresaId, fecha: { gte: (0, fechas_1.rangoDiaBogota)(p.desde).inicioDia } },
                    _count: { _all: true }, _avg: { carita: true },
                })
                : null;
            const texto = (0, pruebaClima_1.textoDeAviso)(aviso, {
                hasta: p.hasta, respuestas: hallado?._count._all ?? 0, promedio: hallado?._avg.carita ?? null,
            });
            const yaMandado = await db.notificacion.findFirst({
                where: { empresaId: p.empresaId, tipo: texto.tipo, entidad: 'clima', entidadId: p.id }, select: { id: true },
            });
            if (yaMandado)
                continue;
            await db.notificacion.create({
                data: { empresaId: p.empresaId, tipo: texto.tipo, titulo: texto.titulo, cuerpo: texto.cuerpo, entidad: 'clima', entidadId: p.id },
            });
            enviados++;
        }
        catch (err) {
            log?.error(err, `Pruebas del clima: falló la prueba ${p.id} de la empresa ${p.empresaId}`);
        }
    }
    log?.info(`Pruebas del clima: ${enviados} avisos de ${pruebas.length} pruebas revisadas`);
    return enviados;
}
