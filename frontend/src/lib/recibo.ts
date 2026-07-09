import { jsPDF } from 'jspdf';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const METODO_LABEL: Record<string, string> = {
  TARJETA_RECURRENTE: 'Tarjeta (cobro recurrente)',
  LINK_WOMPI: 'Wompi (link de pago)',
  MANUAL: 'Pago manual (transferencia/efectivo)',
};

export type PagoRecibo = {
  id: string;
  monto: number;
  colaboradoresFacturados: number;
  periodoInicio: string;
  periodoFin: string;
  metodo: string;
  creadoEn: string;
  nota?: string | null;
  registradoPor?: string | null;
  wompiTransaccionId?: string | null;
  suscripcion: { empresa: { nombre: string; nit: string; email: string; telefono?: string | null } };
};

// Recibo de pago (invoice) en PDF con la línea gráfica HoraPro
export function descargarReciboPDF(pago: PagoRecibo) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const empresa = pago.suscripcion.empresa;
  const numero = `HP-${pago.id.slice(-8).toUpperCase()}`;
  const fecha = new Date(pago.creadoEn).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDia = (s: string) => new Date(s).toLocaleDateString('es-CO');

  // Encabezado amarillo HoraPro
  doc.setFillColor(255, 216, 94);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(48, 48, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HoraPro', 16, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Control de horas laborales · horapro.co', 16, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RECIBO DE PAGO', 194, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`N° ${numero}`, 194, 22, { align: 'right' });
  doc.text(fecha, 194, 28, { align: 'right' });

  // Datos del cliente
  let y = 48;
  doc.setFontSize(9);
  doc.setTextColor(137, 137, 137);
  doc.text('CLIENTE', 16, y);
  doc.setDrawColor(226, 226, 226);
  doc.line(16, y + 2, 194, y + 2);
  y += 9;
  doc.setTextColor(48, 48, 48);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.nombre, 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 6;
  doc.text(`NIT: ${empresa.nit}`, 16, y);
  y += 5;
  doc.text(`Email: ${empresa.email}`, 16, y);
  if (empresa.telefono) { y += 5; doc.text(`Teléfono: ${empresa.telefono}`, 16, y); }

  // Detalle del pago
  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(137, 137, 137);
  doc.text('DETALLE DEL PAGO', 16, y);
  doc.line(16, y + 2, 194, y + 2);
  y += 10;
  doc.setTextColor(48, 48, 48);
  doc.setFontSize(10);

  const filas: [string, string][] = [
    ['Concepto', `Suscripción HoraPro · ${pago.colaboradoresFacturados} colaborador${pago.colaboradoresFacturados === 1 ? '' : 'es'}`],
    ['Período cubierto', `${fmtDia(pago.periodoInicio)} a ${fmtDia(pago.periodoFin)}`],
    ['Método de pago', METODO_LABEL[pago.metodo] ?? pago.metodo],
  ];
  if (pago.wompiTransaccionId) filas.push(['Transacción Wompi', pago.wompiTransaccionId]);
  if (pago.nota) filas.push(['Nota', pago.nota]);
  if (pago.registradoPor) filas.push(['Registrado por', pago.registradoPor]);

  for (const [k, v] of filas) {
    doc.setTextColor(137, 137, 137);
    doc.text(k, 16, y);
    doc.setTextColor(48, 48, 48);
    const lineas = doc.splitTextToSize(v, 120);
    doc.text(lineas, 70, y);
    y += 6 * lineas.length;
  }

  // Total
  y += 6;
  doc.setFillColor(246, 246, 244);
  doc.roundedRect(16, y, 178, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL PAGADO', 22, y + 11.5);
  doc.setFontSize(16);
  doc.text(cop(pago.monto), 188, y + 12, { align: 'right' });

  // Pie
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(137, 137, 137);
  doc.text('Gracias por confiar en HoraPro. Este recibo es constancia del pago de la suscripción.', 105, 285, { align: 'center' });

  doc.save(`recibo-${numero}.pdf`);
}
