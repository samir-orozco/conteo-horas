import crypto from 'crypto';

// Configuración Wompi — ambiente de pruebas por defecto.
// Llaves de prueba (pub_test_*, test_integrity_*, test_events_*) se obtienen
// en comercios.wompi.co con el comercio en modo sandbox.
export const WOMPI_API_URL = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
export const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
export const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || '';
export const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || '';
export const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';
export const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || '';

export function wompiConfigurado(): boolean {
  return Boolean(WOMPI_PUBLIC_KEY && WOMPI_INTEGRITY_SECRET);
}

// Referencia determinística por período: HP-<empresaId>-P<vencimiento>.
// Estable hasta que entra un pago (cambia el vencimiento), lo que permite
// verificar el pago por referencia sin depender del redirect de Wompi.
export function referenciaPago(empresaId: string, vencimiento: Date): string {
  return `HP-${empresaId}-P${vencimiento.getTime()}`;
}

export function empresaIdDeReferencia(reference: string): string | null {
  const partes = reference.split('-');
  if (partes[0] !== 'HP' || partes.length < 3) return null;
  return partes[1];
}

// Referencia de un pago de cambio de plan: codifica el plan destino para
// aplicarlo cuando el pago quede aprobado. HP-<empresaId>-U<PLAN>-P<venc>
export function referenciaUpgrade(empresaId: string, plan: string, vencimiento: Date): string {
  return `HP-${empresaId}-U${plan}-P${vencimiento.getTime()}`;
}
export function planDeReferencia(reference: string): string | null {
  const seg = reference.split('-').find(p => /^U[A-Z]+$/.test(p));
  return seg ? seg.slice(1) : null;
}

// Firma de integridad del Web Checkout: SHA256(<ref><monto><moneda><secreto>)
export function firmaIntegridad(reference: string, amountInCents: number, currency = 'COP'): string {
  return crypto
    .createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`)
    .digest('hex');
}

export type WompiTransaccion = {
  id: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'VOIDED';
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
};

// Consulta una transacción en el API de Wompi (sandbox o producción según env)
export async function consultarTransaccion(id: string): Promise<WompiTransaccion | null> {
  const res = await fetch(`${WOMPI_API_URL}/transactions/${id}`, {
    headers: WOMPI_PUBLIC_KEY ? { Authorization: `Bearer ${WOMPI_PUBLIC_KEY}` } : undefined,
  });
  if (!res.ok) return null;
  const body: any = await res.json();
  return body?.data ?? null;
}

// Busca transacciones por referencia — requiere la llave privada
export async function consultarPorReferencia(reference: string): Promise<WompiTransaccion[]> {
  if (!WOMPI_PRIVATE_KEY) return [];
  const res = await fetch(`${WOMPI_API_URL}/transactions?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${WOMPI_PRIVATE_KEY}` },
  });
  if (!res.ok) return [];
  const body: any = await res.json();
  return body?.data ?? [];
}
