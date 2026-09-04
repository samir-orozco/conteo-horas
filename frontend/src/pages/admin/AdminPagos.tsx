import { useEffect, useState } from 'react';
import { X, FileDown, Paperclip, Receipt } from 'lucide-react';
import api from '../../lib/api';
import { descargarReciboPDF, type PagoRecibo } from '../../lib/recibo';
import VistaDeAdjunto from '../../components/VistaDeAdjunto';
import { tipoDeDataUri } from '../../lib/archivos';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type PagoRow = {
  id: string; monto: number; colaboradoresFacturados: number;
  periodoInicio: string; periodoFin: string; metodo: string; estado: string; creadoEn: string;
  nota?: string | null; registradoPor?: string | null; tieneComprobante: boolean;
  suscripcion: { empresa: { nombre: string; nit: string; email: string } };
};
type PagoDetalle = PagoRecibo & { comprobanteBase64?: string | null };

const METODO_LABEL: Record<string, string> = {
  TARJETA_RECURRENTE: 'Tarjeta (recurrente)',
  LINK_WOMPI: 'Wompi',
  MANUAL: 'Manual',
};

export default function AdminPagos() {
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [detalle, setDetalle] = useState<PagoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => { api.get('/admin/pagos').then(r => setPagos(r.data)); }, []);

  const abrirDetalle = async (id: string) => {
    setCargandoDetalle(true);
    try {
      const r = await api.get(`/admin/pagos/${id}`);
      setDetalle(r.data);
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pagos</h1>
        <p className="text-sm text-muted">Historial de pagos · haz clic en un pago para ver el detalle y descargar el recibo</p>
      </div>

      <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-gray-100">
              <th className="px-5 py-3.5">Fecha</th>
              <th className="px-5 py-3.5">Empresa</th>
              <th className="px-5 py-3.5 text-right">Monto</th>
              <th className="px-5 py-3.5 text-center">Colaboradores</th>
              <th className="px-5 py-3.5">Período cubierto</th>
              <th className="px-5 py-3.5">Método</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {pagos.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => abrirDetalle(p.id)}>
                <td className="px-5 py-3.5 text-muted">{new Date(p.creadoEn).toLocaleDateString('es-CO')}</td>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-ink">{p.suscripcion.empresa.nombre}</p>
                  <p className="text-xs text-muted">{p.suscripcion.empresa.nit}</p>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-ink">{cop(p.monto)}</td>
                <td className="px-5 py-3.5 text-center text-muted">{p.colaboradoresFacturados}</td>
                <td className="px-5 py-3.5 text-muted text-xs">
                  {new Date(p.periodoInicio).toLocaleDateString('es-CO')} → {new Date(p.periodoFin).toLocaleDateString('es-CO')}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {METODO_LABEL[p.metodo] ?? p.metodo}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {p.tieneComprobante && <Paperclip size={14} className="inline text-muted" />}
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">Aún no hay pagos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {cargandoDetalle && (
        <div className="fixed inset-0 !mt-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 text-sm text-muted shadow-lg">Cargando pago...</div>
        </div>
      )}

      {/* Detalle del pago (invoice) */}
      {detalle && (
        <div className="fixed inset-0 !mt-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="hp-pop bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-ink px-6 py-4 flex items-center justify-between sticky top-0">
              <p className="text-white font-bold flex items-center gap-2">
                <Receipt size={17} /> Recibo HP-{detalle.id.slice(-8).toUpperCase()}
              </p>
              <button onClick={() => setDetalle(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="text-center mb-5">
                <p className="text-sm text-muted">{detalle.suscripcion.empresa.nombre}</p>
                <p className="text-4xl font-extrabold text-ink mt-1">{cop(detalle.monto)}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(detalle.creadoEn).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted">Cliente</span><span className="text-ink font-medium">{detalle.suscripcion.empresa.nombre}</span></div>
                <div className="flex justify-between"><span className="text-muted">NIT</span><span className="text-ink font-medium">{detalle.suscripcion.empresa.nit}</span></div>
                <div className="flex justify-between"><span className="text-muted">Email</span><span className="text-ink font-medium">{detalle.suscripcion.empresa.email}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2"><span className="text-muted">Colaboradores</span><span className="text-ink font-medium">{detalle.colaboradoresFacturados}</span></div>
                <div className="flex justify-between"><span className="text-muted">Período</span><span className="text-ink font-medium">{new Date(detalle.periodoInicio).toLocaleDateString('es-CO')} → {new Date(detalle.periodoFin).toLocaleDateString('es-CO')}</span></div>
                <div className="flex justify-between"><span className="text-muted">Método</span><span className="text-ink font-medium">{METODO_LABEL[detalle.metodo] ?? detalle.metodo}</span></div>
                {detalle.wompiTransaccionId && <div className="flex justify-between"><span className="text-muted">Transacción</span><span className="text-ink font-medium text-xs">{detalle.wompiTransaccionId}</span></div>}
                {detalle.nota && <div className="flex justify-between gap-3"><span className="text-muted shrink-0">Nota</span><span className="text-ink font-medium text-right">{detalle.nota}</span></div>}
                {detalle.registradoPor && <div className="flex justify-between"><span className="text-muted">Registrado por</span><span className="text-ink font-medium">{detalle.registradoPor}</span></div>}
              </div>

              {detalle.comprobanteBase64 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Comprobante adjunto</p>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-1 flex flex-col [&_img]:max-h-64 [&_iframe]:min-h-[16rem]">
                    <VistaDeAdjunto data={detalle.comprobanteBase64} tipo={tipoDeDataUri(detalle.comprobanteBase64)} nombre="Comprobante" />
                  </div>
                </div>
              )}

              <button onClick={() => descargarReciboPDF(detalle)}
                className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <FileDown size={17} /> Descargar recibo PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
