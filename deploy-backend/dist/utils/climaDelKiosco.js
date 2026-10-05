"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALIDAS_QUE_ABREN_LA_VENTANA = exports.DURACION_TOKEN_CLIMA = exports.ROL_CLIMA = exports.CLAVE_MOTIVOS = void 0;
exports.motivosDeEmpresa = motivosDeEmpresa;
exports.climaDeLaSalida = climaDeLaSalida;
const crypto_1 = require("crypto");
const prisma_1 = require("../prisma");
const capacidades_1 = require("./capacidades");
const clima_1 = require("./clima");
const fechas_1 = require("./fechas");
// La plomería del clima laboral en el kiosco (4 de octubre de 2026). Las decisiones están en
// `clima.ts`, con sus pruebas; esto solo las conecta con la base.
// Los motivos de cada empresa van en `configuracion`, con esta clave y la lista como JSON.
exports.CLAVE_MOTIVOS = 'climaMotivos';
// LA VENTANA ESCRIBE CON SU PROPIO TOKEN, NO CON EL DE LA SESIÓN. Lo firma la salida, y dice de quién
// y de qué jornada es: así la carita solo puede caer en un día que de verdad terminó con una salida,
// y ni la persona ni el día salen nunca del cuerpo de la petición. Las rutas de marcar exigen el rol
// WORKER, así que con este no se puede marcar nada.
exports.ROL_CLIMA = 'CLIMA';
exports.DURACION_TOKEN_CLIMA = '15m';
// LAS SALIDAS QUE ABREN LA VENTANA: las que la persona marcó en el kiosco al cerrar la jornada. No las
// pausas, ni las que puso el cierre automático (`salidaEstimada`), ni las cargadas a mano (MANUAL). Las
// usan la ventana (¿ya se le preguntó hoy?) y el panel («Respondieron»): las dos cuentas tienen que
// hablar de las mismas salidas. Null en `metodoSalida` son las del kiosco anteriores a esa columna.
exports.SALIDAS_QUE_ABREN_LA_VENTANA = {
    salida: { not: null },
    salidaAlmuerzo: false,
    salidaDescanso: false,
    salidaEstimada: false,
    OR: [{ metodoSalida: null }, { metodoSalida: { not: 'MANUAL' } }],
};
async function motivosDeEmpresa(empresaId) {
    const fila = await prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: exports.CLAVE_MOTIVOS } } });
    return (0, clima_1.leerMotivosDeEmpresa)(fila?.valor ?? null);
}
// Lo que la respuesta de la salida le manda al kiosco para abrir la ventana, o null si no toca.
async function climaDeLaSalida(p, firmar) {
    // Las consultas se saltan cuando ya se sabe la respuesta: una pausa no pregunta nunca.
    const tieneModulo = !p.pausa && await (0, capacidades_1.tieneFuncion)(p.empresaId, 'clima');
    const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(p.fechaJornada);
    const delDia = { colaboradorId: p.colaboradorId, fecha: { gte: inicioDia, lt: finDia } };
    const [calificada, otrasSalidas] = tieneModulo
        ? await Promise.all([
            prisma_1.prisma.calificacionClima.findFirst({ where: delDia, select: { id: true } }),
            prisma_1.prisma.registro.count({ where: { ...delDia, ...exports.SALIDAS_QUE_ABREN_LA_VENTANA, id: { not: p.registroId } } }),
        ])
        : [null, 0];
    const preguntado = (0, clima_1.yaSePreguntoHoy)({ calificoHoy: !!calificada, otrasSalidasDelKioscoHoy: otrasSalidas });
    if (!(0, clima_1.debePreguntarClima)({ accion: 'SALIDA', pausa: p.pausa, tieneModulo, yaSePreguntoHoy: preguntado }))
        return null;
    const token = firmar({ rol: exports.ROL_CLIMA, id: p.colaboradorId, empresaId: p.empresaId, fecha: inicioDia.toISOString(), jti: (0, crypto_1.randomUUID)() });
    return { token, motivos: await motivosDeEmpresa(p.empresaId) };
}
