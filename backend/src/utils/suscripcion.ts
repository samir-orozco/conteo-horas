import { PrismaClient, Suscripcion, EstadoSuscripcion } from '@prisma/client';
import { precioMensualDe, obtenerPlanes } from './planes';

export const DIAS_PRUEBA = 7;
export const DIAS_GRACIA_MORA = 5;
const DIA_MS = 24 * 60 * 60 * 1000;
const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000; // UTC-5, sin horario de verano

// ===== Precios (editables por el super admin, fila única en BD) =====

export type Precios = { precioTramo1: number; limiteTramo1: number; precioTramo2: number };
export const PRECIOS_DEFECTO: Precios = { precioTramo1: 10000, limiteTramo1: 15, precioTramo2: 2000 };

export async function obtenerPrecios(prisma: PrismaClient): Promise<Precios> {
  const cfg = await prisma.configuracionPlataforma.findUnique({ where: { id: 1 } });
  return cfg ?? PRECIOS_DEFECTO;
}

// Tarifa escalonada de mes completo: tramo 1 a precio pleno, el resto a precio reducido
export function calcularTarifaMensual(colaboradores: number, p: Precios): number {
  const tramo1 = Math.min(colaboradores, p.limiteTramo1) * p.precioTramo1;
  const tramo2 = Math.max(0, colaboradores - p.limiteTramo1) * p.precioTramo2;
  return tramo1 + tramo2;
}

// Tarifa mensual efectiva de una empresa según su plan (o precio fijo a la medida).
// El precio ya no depende del número de colaboradores; es plano por plan.
// `planes` opcional: los planes ya resueltos desde config (si no, usa los del código).
export function tarifaEmpresa(_colaboradores: number, _global: Precios, s: any, exentaPago = false, planes?: any): number {
  return precioMensualDe(s, exentaPago, planes);
}

// ===== Mes calendario (Bogotá): todos los cobros van hasta fin de mes =====

function fechaBogota(ahora = new Date()): Date {
  return new Date(ahora.getTime() - OFFSET_BOGOTA_MS);
}

// Primer día del mes siguiente a las 00:00 de Bogotá
export function finDeMes(ahora = new Date()): Date {
  const b = fechaBogota(ahora);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 1, 5, 0, 0));
}

// Prorrateo por días restantes del mes en curso (incluye el día de hoy)
export function prorrateo(ahora = new Date()): { diasMes: number; diasRestantes: number; factor: number } {
  const b = fechaBogota(ahora);
  const diasMes = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate();
  const diasRestantes = diasMes - b.getUTCDate() + 1;
  return { diasMes, diasRestantes, factor: diasRestantes / diasMes };
}

// ===== Estados =====

// Estado real de la suscripción según fechas, sin importar lo persistido.
// Ciclo: PRUEBA (7 días) → ACTIVA (mes calendario pagado)
//        → EN_MORA (vencida, hasta 5 días) → SUSPENDIDA
export function estadoEfectivo(s: Suscripcion, ahora = new Date()): EstadoSuscripcion {
  if (s.estado === 'CANCELADA') return 'CANCELADA';

  const vencimiento = s.pagadoHasta ?? s.finPrueba;
  if (!s.pagadoHasta && ahora <= s.finPrueba) return 'PRUEBA';
  if (s.pagadoHasta && ahora <= s.pagadoHasta) return 'ACTIVA';

  const finGracia = new Date(vencimiento.getTime() + DIAS_GRACIA_MORA * DIA_MS);
  return ahora <= finGracia ? 'EN_MORA' : 'SUSPENDIDA';
}

export function diasDeMora(s: Suscripcion, ahora = new Date()): number {
  const vencimiento = s.pagadoHasta ?? s.finPrueba;
  if (ahora <= vencimiento) return 0;
  return Math.floor((ahora.getTime() - vencimiento.getTime()) / DIA_MS);
}

// Persiste el estado calculado si cambió (transición perezosa al consultar)
export async function sincronizarEstado(prisma: PrismaClient, s: Suscripcion): Promise<Suscripcion> {
  const efectivo = estadoEfectivo(s);
  if (efectivo === s.estado) return s;
  return prisma.suscripcion.update({
    where: { id: s.id },
    data: {
      estado: efectivo,
      suspendidaEn: efectivo === 'SUSPENDIDA' ? new Date() : null,
    },
  });
}

// Acceso permitido a la operación del negocio (registrar, marcar, reportes)
export function accesoPermitido(estado: EstadoSuscripcion): boolean {
  return estado === 'PRUEBA' || estado === 'ACTIVA' || estado === 'EN_MORA';
}

// ===== Cobro del período =====

export type Cobro = {
  // MES: se debe el mes en curso (prorrateado a hoy). ADICIONAL: el mes está
  // pagado pero hay colaboradores nuevos por cubrir. AL_DIA: nada por pagar.
  tipo: 'MES' | 'ADICIONAL' | 'AL_DIA';
  colaboradoresActivos: number;
  colaboradoresFacturados: number; // ya cubiertos por el pago vigente
  tarifaMesCompleto: number;
  monto: number; // lo que se debe pagar hoy (prorrateado)
  diasMes: number;
  diasRestantes: number;
  cubreHasta: Date;
};

export async function calcularCobro(prisma: PrismaClient, empresaId: string, precios: Precios, ahora = new Date()): Promise<Cobro> {
  const [empresa, activos, susc, planes] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId } }),
    prisma.colaborador.count({ where: { empresaId, activo: true } }),
    prisma.suscripcion.findUnique({ where: { empresaId }, include: { pagos: true } }),
    obtenerPlanes(prisma),
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
  const facturados = Math.max(0, ...susc!.pagos.filter(p => p.periodoFin >= ahora && p.estado === 'APROBADO').map(p => p.colaboradoresFacturados));
  const delta = activos - facturados;
  if (delta <= 0) {
    return {
      tipo: 'AL_DIA', colaboradoresActivos: activos, colaboradoresFacturados: facturados,
      tarifaMesCompleto, monto: 0, diasMes, diasRestantes, cubreHasta: susc!.pagadoHasta!,
    };
  }
  const diferencia = tarifaMesCompleto - tarifaEmpresa(facturados, precios, susc, empresa?.exentaPago ?? false, planes);
  return {
    tipo: 'ADICIONAL', colaboradoresActivos: activos, colaboradoresFacturados: facturados,
    tarifaMesCompleto, monto: Math.round(diferencia * factor),
    diasMes, diasRestantes, cubreHasta: susc!.pagadoHasta!,
  };
}

// Registra un pago aprobado. El período siempre cierra a fin de mes calendario.
// Idempotente por wompiTransaccionId (webhook y confirmación manual pueden coincidir).
export async function aplicarPagoAprobado(
  prisma: PrismaClient,
  empresaId: string,
  datos: {
    monto: number;
    metodo: 'TARJETA_RECURRENTE' | 'LINK_WOMPI' | 'MANUAL';
    wompiTransaccionId?: string;
    nota?: string;
    comprobanteBase64?: string;
    registradoPor?: string;
  }
) {
  const susc = await prisma.suscripcion.findUnique({ where: { empresaId } });
  if (!susc) return null;

  if (datos.wompiTransaccionId) {
    const existente = await prisma.pago.findUnique({ where: { wompiTransaccionId: datos.wompiTransaccionId } });
    if (existente) return existente;
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

  // Comisión de afiliado (si la empresa vino por un referido). Nunca debe tumbar
  // el registro del pago: si falla, se registra y sigue.
  try {
    await causarComisionAfiliado(prisma, empresaId, pago);
  } catch (e) {
    console.error('Error causando comisión de afiliado:', e);
  }
  return pago;
}

// Causa la comisión del afiliado por un pago aprobado, si la empresa tiene un
// afiliado activo y el pago cae dentro de la ventana de duración del trato.
// Idempotente: la FK única pagoId evita duplicar la comisión de un mismo pago.
export async function causarComisionAfiliado(
  prisma: PrismaClient,
  empresaId: string,
  pago: { id: string; monto: number; creadoEn: Date }
) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      afiliadoId: true,
      primerPagoComisionEn: true,
      afiliado: { select: { activo: true, porcentaje: true, duracionMeses: true } },
    },
  });
  if (!empresa?.afiliadoId || !empresa.afiliado?.activo) return;

  if (await prisma.comision.findUnique({ where: { pagoId: pago.id } })) return; // ya comisionado

  // La duración cuenta desde el primer pago que comisionó. En ese primer pago se
  // fija el ancla; los siguientes solo comisionan dentro de la ventana.
  const fechaPago = pago.creadoEn;
  const ancla = empresa.primerPagoComisionEn ?? fechaPago;
  if (empresa.afiliado.duracionMeses != null) {
    const fin = new Date(ancla);
    fin.setMonth(fin.getMonth() + empresa.afiliado.duracionMeses);
    if (fechaPago > fin) return; // fuera de la ventana → no comisiona
  }

  const porcentaje = empresa.afiliado.porcentaje;
  const monto = Math.round((pago.monto * porcentaje) / 100);

  await prisma.$transaction([
    prisma.comision.create({
      data: {
        afiliadoId: empresa.afiliadoId,
        empresaId,
        pagoId: pago.id,
        montoBase: pago.monto,
        porcentaje,
        monto,
        estado: 'CAUSADA',
      },
    }),
    ...(empresa.primerPagoComisionEn
      ? []
      : [prisma.empresa.update({ where: { id: empresaId }, data: { primerPagoComisionEn: fechaPago } })]),
  ]);
}
