export const METODOS_PAGO = ['NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'OTRO'];
export const TIPOS_CUENTA = ['AHORROS', 'CORRIENTE'];

// Normaliza los datos de pago del afiliado según el método (Nequi/Daviplata no
// llevan tipo de cuenta; solo BANCOLOMBIA/OTRO). Compartido por el CRUD del admin,
// el auto-registro y el perfil del afiliado.
export function limpiarPago(b: any) {
  const metodo = METODOS_PAGO.includes(b.pagoMetodo) ? b.pagoMetodo : null;
  const esBanco = metodo === 'BANCOLOMBIA' || metodo === 'OTRO';
  return {
    pagoMetodo: metodo,
    pagoBanco: metodo === 'OTRO' ? (b.pagoBanco?.trim() || null) : null,
    pagoTipoCuenta: esBanco && TIPOS_CUENTA.includes(b.pagoTipoCuenta) ? b.pagoTipoCuenta : null,
    pagoNumero: b.pagoNumero?.trim() || null,
    pagoTitular: b.pagoTitular?.trim() || null,
    pagoDocumento: b.pagoDocumento?.trim() || null,
  };
}

// Cálculo del saldo de la billetera del afiliado, compartido por el panel del
// afiliado, el detalle del super admin y la validación de solicitudes de retiro.
type ComisionLike = { monto: number; estado: string };
type RetiroLike = { monto: number; estado: string };

export function calcularBilletera(comisiones: ComisionLike[], retiros: RetiroLike[]) {
  const totalComision = comisiones.filter(c => c.estado === 'CAUSADA').reduce((s, c) => s + c.monto, 0);
  const totalRetirado = retiros.filter(r => r.estado === 'PAGADO').reduce((s, r) => s + r.monto, 0);
  // Los retiros solicitados/aprobados (aún no pagados) reservan saldo.
  const enProceso = retiros.filter(r => r.estado === 'SOLICITADO' || r.estado === 'APROBADO').reduce((s, r) => s + r.monto, 0);
  return { totalComision, totalRetirado, enProceso, disponible: totalComision - totalRetirado - enProceso };
}
