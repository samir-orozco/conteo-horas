"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRECIOS_DEFECTO = exports.DIAS_GRACIA_MORA = exports.DIAS_PRUEBA = void 0;
exports.obtenerPrecios = obtenerPrecios;
exports.calcularTarifaMensual = calcularTarifaMensual;
exports.tarifaEmpresa = tarifaEmpresa;
exports.finDeMes = finDeMes;
exports.prorrateo = prorrateo;
exports.estadoEfectivo = estadoEfectivo;
exports.diasDeMora = diasDeMora;
exports.sincronizarEstado = sincronizarEstado;
exports.accesoPermitido = accesoPermitido;
exports.calcularCobro = calcularCobro;
exports.aplicarPagoAprobado = aplicarPagoAprobado;
const planes_1 = require("./planes");
exports.DIAS_PRUEBA = 7;
exports.DIAS_GRACIA_MORA = 5;
const DIA_MS = 24 * 60 * 60 * 1000;
const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000; // UTC-5, sin horario de verano
exports.PRECIOS_DEFECTO = { precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 };
async function obtenerPrecios(prisma) {
    const cfg = await prisma.configuracionPlataforma.findUnique({ where: { id: 1 } });
    return cfg ?? exports.PRECIOS_DEFECTO;
}
// Tarifa escalonada de mes completo: tramo 1 a precio pleno, el resto a precio reducido
function calcularTarifaMensual(colaboradores, p) {
    const tramo1 = Math.min(colaboradores, p.limiteTramo1) * p.precioTramo1;
    const tramo2 = Math.max(0, colaboradores - p.limiteTramo1) * p.precioTramo2;
    return tramo1 + tramo2;
}
// Tarifa mensual efectiva de una empresa según su plan (o precio fijo a la medida).
// El precio ya no depende del número de colaboradores; es plano por plan.
// `planes` opcional: los planes ya resueltos desde config (si no, usa los del código).
function tarifaEmpresa(_colaboradores, _global, s, exentaPago = false, planes) {
    return (0, planes_1.precioMensualDe)(s, exentaPago, planes);
}
// ===== Mes calendario (Bogotá): todos los cobros van hasta fin de mes =====
function fechaBogota(ahora = new Date()) {
    return new Date(ahora.getTime() - OFFSET_BOGOTA_MS);
}
// Primer día del mes siguiente a las 00:00 de Bogotá
function finDeMes(ahora = new Date()) {
    const b = fechaBogota(ahora);
    return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 1, 5, 0, 0));
}
// Prorrateo por días restantes del mes en curso (incluye el día de hoy)
function prorrateo(ahora = new Date()) {
    const b = fechaBogota(ahora);
    const diasMes = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate();
    const diasRestantes = diasMes - b.getUTCDate() + 1;
    return { diasMes, diasRestantes, factor: diasRestantes / diasMes };
}
// ===== Estados =====
// Estado real de la suscripción según fechas, sin importar lo persistido.
// Ciclo: PRUEBA (7 días) → ACTIVA (mes calendario pagado)
//        → EN_MORA (vencida, hasta 5 días) → SUSPENDIDA
function estadoEfectivo(s, ahora = new Date()) {
    if (s.estado === 'CANCELADA')
        return 'CANCELADA';
    const vencimiento = s.pagadoHasta ?? s.finPrueba;
    if (!s.pagadoHasta && ahora <= s.finPrueba)
        return 'PRUEBA';
    if (s.pagadoHasta && ahora <= s.pagadoHasta)
        return 'ACTIVA';
    const finGracia = new Date(vencimiento.getTime() + exports.DIAS_GRACIA_MORA * DIA_MS);
    return ahora <= finGracia ? 'EN_MORA' : 'SUSPENDIDA';
}
function diasDeMora(s, ahora = new Date()) {
    const vencimiento = s.pagadoHasta ?? s.finPrueba;
    if (ahora <= vencimiento)
        return 0;
    return Math.floor((ahora.getTime() - vencimiento.getTime()) / DIA_MS);
}
// Persiste el estado calculado si cambió (transición perezosa al consultar)
async function sincronizarEstado(prisma, s) {
    const efectivo = estadoEfectivo(s);
    if (efectivo === s.estado)
        return s;
    return prisma.suscripcion.update({
        where: { id: s.id },
        data: {
            estado: efectivo,
            suspendidaEn: efectivo === 'SUSPENDIDA' ? new Date() : null,
        },
    });
}
// Acceso permitido a la operación del negocio (registrar, marcar, reportes)
function accesoPermitido(estado) {
    return estado === 'PRUEBA' || estado === 'ACTIVA' || estado === 'EN_MORA';
}
async function calcularCobro(prisma, empresaId, precios, ahora = new Date()) {
    const [empresa, activos, susc, planes] = await Promise.all([
        prisma.empresa.findUnique({ where: { id: empresaId } }),
        prisma.colaborador.count({ where: { empresaId, activo: true } }),
        prisma.suscripcion.findUnique({ where: { empresaId }, include: { pagos: true } }),
        (0, planes_1.obtenerPlanes)(prisma),
    ]);
    const { diasMes, diasRestantes, factor } = prorrateo(ahora);
    const tarifaMesCompleto = tarifaEmpresa(activos, precios, susc, empresa?.exentaPago ?? false, planes);
    const cubreHasta = finDeMes(ahora);
    // Empresa exenta (acceso ilimitado): nunca debe nada
    if (empresa?.exentaPago) {
        return {
            tipo: 'AL_DIA', colaboradoresActivos: activos, colaboradoresFacturados: activos,
            tarifaMesCompleto, monto: 0, diasMes, diasRestantes, cubreHasta,
        };
    }
    const alDia = Boolean(susc?.pagadoHasta && susc.pagadoHasta > ahora);
    if (!alDia) {
        return {
            tipo: 'MES', colaboradoresActivos: activos, colaboradoresFacturados: 0,
            tarifaMesCompleto, monto: Math.round(tarifaMesCompleto * factor),
            diasMes, diasRestantes, cubreHasta,
        };
    }
    // Mes pagado: solo se cobra la diferencia por colaboradores agregados después
    const facturados = Math.max(0, ...susc.pagos.filter(p => p.periodoFin >= ahora && p.estado === 'APROBADO').map(p => p.colaboradoresFacturados));
    const delta = activos - facturados;
    if (delta <= 0) {
        return {
            tipo: 'AL_DIA', colaboradoresActivos: activos, colaboradoresFacturados: facturados,
            tarifaMesCompleto, monto: 0, diasMes, diasRestantes, cubreHasta: susc.pagadoHasta,
        };
    }
    const diferencia = tarifaMesCompleto - tarifaEmpresa(facturados, precios, susc, empresa?.exentaPago ?? false, planes);
    return {
        tipo: 'ADICIONAL', colaboradoresActivos: activos, colaboradoresFacturados: facturados,
        tarifaMesCompleto, monto: Math.round(diferencia * factor),
        diasMes, diasRestantes, cubreHasta: susc.pagadoHasta,
    };
}
// Registra un pago aprobado. El período siempre cierra a fin de mes calendario.
// Idempotente por wompiTransaccionId (webhook y confirmación manual pueden coincidir).
async function aplicarPagoAprobado(prisma, empresaId, datos) {
    const susc = await prisma.suscripcion.findUnique({ where: { empresaId } });
    if (!susc)
        return null;
    if (datos.wompiTransaccionId) {
        const existente = await prisma.pago.findUnique({ where: { wompiTransaccionId: datos.wompiTransaccionId } });
        if (existente)
            return existente;
    }
    const ahora = new Date();
    const colaboradores = await prisma.colaborador.count({ where: { empresaId, activo: true } });
    // Si ya tenía el mes (u otro futuro) pagado, se conserva la vigencia mayor
    const periodoFin = susc.pagadoHasta && susc.pagadoHasta > finDeMes(ahora) ? susc.pagadoHasta : finDeMes(ahora);
    const [pago] = await prisma.$transaction([
        prisma.pago.create({
            data: {
                suscripcionId: susc.id,
                monto: datos.monto,
                colaboradoresFacturados: colaboradores,
                periodoInicio: ahora,
                periodoFin,
                metodo: datos.metodo,
                estado: 'APROBADO',
                wompiTransaccionId: datos.wompiTransaccionId,
                nota: datos.nota,
                comprobanteBase64: datos.comprobanteBase64,
                registradoPor: datos.registradoPor,
            },
        }),
        prisma.suscripcion.update({
            where: { id: susc.id },
            data: { estado: 'ACTIVA', pagadoHasta: periodoFin, suspendidaEn: null },
        }),
    ]);
    return pago;
}
