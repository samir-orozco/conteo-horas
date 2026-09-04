import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, CreditCard, Users, Wallet, Link as LinkIcon, FileDown, Paperclip, TrendingUp, ListChecks, BadgeCheck,
} from 'lucide-react';
import api from '../../lib/api';
import Toast from '../../components/Toast';
import { copiarTexto } from '../../lib/clipboard';
import { descargarReciboPDF } from '../../lib/recibo';
import VistaDeAdjunto from '../../components/VistaDeAdjunto';
import { tipoDeDataUri } from '../../lib/archivos';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fecha = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

type Pago = {
  id: string; monto: number; colaboradoresFacturados: number; periodoInicio: string; periodoFin: string;
  metodo: string; creadoEn: string; nota?: string | null; registradoPor?: string | null;
  wompiTransaccionId?: string | null; comprobanteBase64?: string | null;
};
type Capacidades = {
  plan: string; nombrePlan: string; ciclo: string; limite: number; ilimitado: boolean;
  features: Record<string, boolean>; precioMensual: number; precioAnual: number;
};
type Empresa = {
  id: string; nombre: string; nit: string; email: string; telefono: string | null;
  marcadorToken: string; exentaPago: boolean; activa: boolean; creadoEn: string;
  colaboradoresActivos: number; tarifaMensual: number;
  capacidades: Capacidades;
  usuarios: { id: string; email: string; nombre: string; rol: string; activo: boolean; emailVerificado: boolean }[];
  suscripcion: {
    estadoEfectivo: string; diasMora: number; finPrueba: string; pagadoHasta: string | null; pagos: Pago[];
    plan: string; cicloPago: string; limiteOverride: number | null;
  } | null;
};

const PLANES_OPC = [
  { id: 'ESENCIAL', nombre: 'Esencial', limite: 10 },
  { id: 'PROFESIONAL', nombre: 'Profesional', limite: 30 },
  { id: 'EMPRESARIAL', nombre: 'Empresarial', limite: 150 },
];
const FEATURES = [
  { key: 'gps', label: 'Marcación por GPS / geocerca' },
  { key: 'telegram', label: 'Alertas por Telegram' },
  { key: 'evidencia', label: 'Evidencia en novedades' },
  { key: 'exportar', label: 'Exportar reportes' },
  { key: 'multiDispositivo', label: 'Varios dispositivos de kiosco' },
  { key: 'multiHorario', label: 'Varios horarios' },
  { key: 'siigo', label: 'Integración Siigo' },
];

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

  // Edición de plan / funciones
  const [plan, setPlan] = useState('PROFESIONAL');
  const [ciclo, setCiclo] = useState('MENSUAL');
  const [limite, setLimite] = useState(30);
  const [feats, setFeats] = useState<Record<string, boolean>>({});
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [verificando, setVerificando] = useState('');

  const cargar = useCallback(() => {
    if (id) api.get(`/admin/empresas/${id}`).then(r => {
      setEmpresa(r.data);
      const c: Capacidades = r.data.capacidades;
      setPlan(r.data.suscripcion?.plan ?? 'PROFESIONAL');
      setCiclo(r.data.suscripcion?.cicloPago ?? 'MENSUAL');
      setLimite(Number.isFinite(c?.limite) ? c.limite : 150);
      setFeats({ ...(c?.features ?? {}) });
    });
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  // Defaults por plan (deben coincidir con el backend)
  const PLAN_FEATS: Record<string, string[]> = {
    ESENCIAL: [],
    PROFESIONAL: ['gps', 'telegram', 'evidencia', 'exportar', 'multiDispositivo', 'multiHorario'],
    EMPRESARIAL: ['gps', 'telegram', 'evidencia', 'exportar', 'multiDispositivo', 'multiHorario', 'siigo'],
  };
  // Al cambiar de plan, se reinician funciones y límite a lo que trae ese plan
  const cambiarPlan = (nuevo: string) => {
    setPlan(nuevo);
    const opc = PLANES_OPC.find(p => p.id === nuevo);
    setLimite(opc?.limite ?? 30);
    const on = new Set(PLAN_FEATS[nuevo] ?? []);
    setFeats(Object.fromEntries(FEATURES.map(f => [f.key, on.has(f.key)])));
  };

  const verificarUsuario = async (usuarioId: string) => {
    setVerificando(usuarioId);
    try {
      const r = await api.put(`/admin/usuarios/${usuarioId}/verificar`);
      if (r.data?.id) setEmpresa(r.data); // devuelve la ficha actualizada
      else cargar();
      setToast('Usuario verificado · ya puede entrar (que recargue o vuelva a iniciar sesión)');
    } catch {
      setToast('No pudimos verificar el usuario');
    } finally { setVerificando(''); }
  };

  const guardarPlan = async () => {
    if (!id) return;
    setGuardandoPlan(true);
    const opc = PLANES_OPC.find(p => p.id === plan);
    const defaultOn = new Set(PLAN_FEATS[plan] ?? []);
    // Solo mandamos como override lo que difiere del plan
    const funcionesOverride: Record<string, boolean> = {};
    for (const f of FEATURES) {
      if (!!feats[f.key] !== defaultOn.has(f.key)) funcionesOverride[f.key] = !!feats[f.key];
    }
    try {
      await api.put(`/admin/empresas/${id}/plan`, {
        plan, cicloPago: ciclo,
        limiteOverride: limite === (opc?.limite ?? 30) ? null : limite,
        funcionesOverride: Object.keys(funcionesOverride).length ? funcionesOverride : null,
      });
      setToast('Plan actualizado');
      cargar();
    } finally { setGuardandoPlan(false); }
  };

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
          <p className="text-sm text-muted mb-2 flex items-center gap-1.5"><CreditCard size={15} /> Suscripción · {empresa.capacidades?.nombrePlan ?? '—'}</p>
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

      {/* Plan y funciones */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks size={18} className="text-ink" />
          <h2 className="font-bold text-ink">Plan y funciones</h2>
        </div>
        {empresa.exentaPago ? (
          <p className="text-sm text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 mt-3">
            Esta empresa tiene <b>acceso ilimitado</b> (cortesía): sin límite de colaboradores y con todas las funciones. Quita el acceso ilimitado para asignarle un plan.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">Asigna el plan, ajusta el cupo de colaboradores y activa funciones extra para este cliente.</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Plan</label>
                <select value={plan} onChange={e => cambiarPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {PLANES_OPC.map(p => <option key={p.id} value={p.id}>{p.nombre} · {cop((p.id === 'ESENCIAL' ? 99900 : p.id === 'PROFESIONAL' ? 169900 : 299900))}/mes</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Ciclo</label>
                <select value={ciclo} onChange={e => setCiclo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="MENSUAL">Mensual</option>
                  <option value="ANUAL">Anual (2 meses gratis)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Cupo de colaboradores</label>
                <input type="number" min={1} value={limite} onChange={e => setLimite(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Funciones activas</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-5">
              {FEATURES.map(f => {
                const activa = !!feats[f.key];
                const extra = activa && !(PLAN_FEATS[plan] ?? []).includes(f.key);
                return (
                  <label key={f.key} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer text-sm ${activa ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={activa} onChange={e => setFeats(p => ({ ...p, [f.key]: e.target.checked }))} className="rounded" />
                    <span className="flex-1 text-ink">{f.label}</span>
                    {extra && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">EXTRA</span>}
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={guardarPlan} disabled={guardandoPlan}
                className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
                {guardandoPlan ? 'Guardando...' : 'Guardar plan'}
              </button>
              <span className="text-xs text-muted">Las funciones marcadas como <b className="text-emerald-700">EXTRA</b> van por encima del plan (a la medida).</span>
            </div>
          </>
        )}
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
                  <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                    {u.nombre}
                    {u.emailVerificado && (
                      <BadgeCheck size={15} className="text-amber-500 shrink-0" aria-label="Correo verificado" />
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>
                {u.emailVerificado ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">{u.rol}</span>
                ) : (
                  <button onClick={() => verificarUsuario(u.id)} disabled={verificando === u.id}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60 shrink-0">
                    {verificando === u.id ? 'Verificando...' : 'Verificar'}
                  </button>
                )}
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
        <div className="fixed inset-0 !mt-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setComprobante(null)}>
          {/* Sin stopPropagation a proposito: este visor no tiene boton de
              cerrar, y la unica forma de salir siempre fue el clic. Detener la
              propagacion aqui lo dejaria sin salida. */}
          <div className="max-w-2xl w-full max-h-full overflow-auto rounded-xl bg-white p-2 flex flex-col">
            <VistaDeAdjunto data={comprobante} tipo={tipoDeDataUri(comprobante)} nombre="Comprobante" />
          </div>
        </div>
      )}

      <Toast mensaje={toast} onClose={() => setToast(null)} />
    </div>
  );
}
