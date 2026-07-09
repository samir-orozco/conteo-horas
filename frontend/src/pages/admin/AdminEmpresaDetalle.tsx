import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, CreditCard, Users, Wallet, Link as LinkIcon, FileDown, Paperclip, TrendingUp,
} from 'lucide-react';
import api from '../../lib/api';
import Toast from '../../components/Toast';
import { copiarTexto } from '../../lib/clipboard';
import { descargarReciboPDF } from '../../lib/recibo';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fecha = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

type Pago = {
  id: string; monto: number; colaboradoresFacturados: number; periodoInicio: string; periodoFin: string;
  metodo: string; creadoEn: string; nota?: string | null; registradoPor?: string | null;
  wompiTransaccionId?: string | null; comprobanteBase64?: string | null;
};
type Empresa = {
  id: string; nombre: string; nit: string; email: string; telefono: string | null;
  marcadorToken: string; exentaPago: boolean; activa: boolean; creadoEn: string;
  colaboradoresActivos: number; tarifaMensual: number;
  usuarios: { id: string; email: string; nombre: string; rol: string; activo: boolean }[];
  suscripcion: {
    estadoEfectivo: string; diasMora: number; finPrueba: string; pagadoHasta: string | null; pagos: Pago[];
  } | null;
};

const ESTADO_CHIP: Record<string, string> = {
  PRUEBA: 'bg-primary/40 text-ink',
  ACTIVA: 'bg-green-100 text-green-800',
  EN_MORA: 'bg-orange-100 text-orange-800',
  SUSPENDIDA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-gray-100 text-gray-600',
  ILIMITADA: 'bg-purple-100 text-purple-800',
};
const METODO_LABEL: Record<string, string> = {
  TARJETA_RECURRENTE: 'Tarjeta', LINK_WOMPI: 'Wompi', MANUAL: 'Manual',
};

export default function AdminEmpresaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (id) api.get(`/admin/empresas/${id}`).then(r => setEmpresa(r.data));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  if (!empresa) return <div className="p-8 text-muted">Cargando...</div>;

  const estado = empresa.exentaPago ? 'ILIMITADA' : empresa.suscripcion?.estadoEfectivo ?? '—';
  const pagos = empresa.suscripcion?.pagos ?? [];
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const ultimoPago = pagos[0];

  const copiarLink = async () => {
    await copiarTexto(`${window.location.origin}/marcador/${empresa.marcadorToken}`);
    setToast('Link del marcador copiado con éxito');
  };

  const descargarRecibo = (p: Pago) => {
    descargarReciboPDF({ ...p, suscripcion: { empresa } });
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/empresas')} className="p-2 rounded-lg hover:bg-gray-100 text-muted"><ArrowLeft size={18} /></button>
        <div className="bg-primary rounded-2xl p-3">
          <Building2 size={24} className="text-ink" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink">{empresa.nombre}</h1>
          <p className="text-sm text-muted">NIT {empresa.nit} · cliente desde {fecha(empresa.creadoEn)}</p>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${ESTADO_CHIP[estado] ?? 'bg-gray-100 text-gray-600'}`}>{estado}</span>
          {!empresa.activa && <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-gray-200 text-gray-600">INACTIVA</span>}
        </div>
      </div>

      {/* Cards de información */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-2 flex items-center gap-1.5"><Building2 size={15} /> Contacto</p>
          <p className="text-sm font-medium text-ink truncate">{empresa.email}</p>
          <p className="text-sm text-muted mt-0.5">{empresa.telefono || 'Sin teléfono'}</p>
          <button onClick={copiarLink} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary/40 hover:bg-primary px-2.5 py-1.5 rounded-lg">
            <LinkIcon size={13} /> Copiar link del kiosco
          </button>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-2 flex items-center gap-1.5"><CreditCard size={15} /> Suscripción</p>
          <p className="text-xl font-bold text-ink">{empresa.exentaPago ? 'Gratis' : `${cop(empresa.tarifaMensual)}/mes`}</p>
          <p className="text-xs text-muted mt-1">
            {empresa.exentaPago
              ? 'Acceso ilimitado de cortesía'
              : empresa.suscripcion?.pagadoHasta
                ? `Pagado hasta el ${fecha(empresa.suscripcion.pagadoHasta)}`
                : empresa.suscripcion
                  ? `Prueba hasta el ${fecha(empresa.suscripcion.finPrueba)}`
                  : '—'}
            {(empresa.suscripcion?.diasMora ?? 0) > 0 && !empresa.exentaPago && ` · ${empresa.suscripcion!.diasMora} días de mora`}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-2 flex items-center gap-1.5"><Users size={15} /> Colaboradores</p>
          <p className="text-xl font-bold text-ink">{empresa.colaboradoresActivos}</p>
          <p className="text-xs text-muted mt-1">activos marcando en el kiosco</p>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-2 flex items-center gap-1.5"><TrendingUp size={15} /> Ingresos históricos</p>
          <p className="text-xl font-bold text-ink">{cop(totalPagado)}</p>
          <p className="text-xs text-muted mt-1">
            {pagos.length} pago{pagos.length === 1 ? '' : 's'}{ultimoPago ? ` · último el ${fecha(ultimoPago.creadoEn)}` : ''}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Usuarios del panel */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><Users size={16} /> Usuarios del panel</p>
          <div className="space-y-2">
            {empresa.usuarios.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-2.5">
                <div className="bg-primary/40 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-ink shrink-0">
                  {u.nombre[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{u.nombre}</p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{u.rol}</span>
              </div>
            ))}
            {empresa.usuarios.length === 0 && <p className="text-sm text-muted">Sin usuarios.</p>}
          </div>
        </div>

        {/* Historial de pagos */}
        <div className="bg-white rounded-card border border-gray-200 lg:col-span-2 overflow-x-auto">
          <p className="px-5 pt-4 font-semibold text-ink flex items-center gap-2"><Wallet size={16} /> Historial de pagos</p>
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-gray-100">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3">Cubre hasta</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Nota</th>
                <th className="px-5 py-3 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="px-5 py-3 text-muted">{fecha(p.creadoEn)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-ink">{cop(p.monto)}</td>
                  <td className="px-5 py-3 text-muted">{fecha(p.periodoFin)}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{METODO_LABEL[p.metodo] ?? p.metodo}</span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-40 truncate">{p.nota || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {p.comprobanteBase64 && (
                        <button onClick={() => setComprobante(p.comprobanteBase64!)} title="Ver comprobante"
                          className="p-1.5 rounded-lg text-muted hover:bg-primary/30 hover:text-ink">
                          <Paperclip size={15} />
                        </button>
                      )}
                      <button onClick={() => descargarRecibo(p)} title="Descargar recibo PDF"
                        className="p-1.5 rounded-lg text-muted hover:bg-primary/30 hover:text-ink">
                        <FileDown size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagos.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">Aún no hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visor de comprobante */}
      {comprobante && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setComprobante(null)}>
          <img src={comprobante} alt="comprobante" className="max-w-full max-h-full rounded-xl bg-white p-2" />
        </div>
      )}

      <Toast mensaje={toast} onClose={() => setToast(null)} />
    </div>
  );
}
