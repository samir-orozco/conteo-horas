import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertTriangle, Clock, X, Receipt } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fecha = (s: string | Date) => new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

type Pago = { id: string; monto: number; colaboradoresFacturados: number; periodoFin: string; metodo: string; creadoEn: string };
type Cobro = {
  tipo: 'MES' | 'ADICIONAL' | 'AL_DIA';
  colaboradoresActivos: number; colaboradoresFacturados: number;
  tarifaMesCompleto: number; monto: number;
  diasMes: number; diasRestantes: number; cubreHasta: string;
};
type Cuenta = {
  estado: string; diasMora: number; finPrueba: string; pagadoHasta: string | null;
  colaboradoresActivos: number; tarifaMensual: number;
  cobro: Cobro;
  precios: { precioTramo1: number; limiteTramo1: number; precioTramo2: number };
  pagos: Pago[];
  wompiConfigurado: boolean;
  checkout: { url: string; publicKey: string; currency: string; amountInCents: number; reference: string; signature: string; verificacionDisponible: boolean } | null;
};

const esLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const ESTADO_UI: Record<string, { label: string; clase: string }> = {
  ILIMITADA: { label: 'Acceso ilimitado', clase: 'bg-purple-100 text-purple-800' },
  PRUEBA: { label: 'Período de prueba', clase: 'bg-primary/40 text-ink' },
  ACTIVA: { label: 'Activa', clase: 'bg-green-100 text-green-800' },
  EN_MORA: { label: 'En mora', clase: 'bg-orange-100 text-orange-800' },
  SUSPENDIDA: { label: 'Suspendida', clase: 'bg-red-100 text-red-800' },
  CANCELADA: { label: 'Cancelada', clase: 'bg-gray-100 text-gray-600' },
};

export default function Suscripcion() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [recibo, setRecibo] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  const cargar = useCallback(() => api.get('/suscripcion').then(r => setCuenta(r.data)), []);
  useEffect(() => { cargar(); }, [cargar]);

  // Al volver del checkout Wompi llega ?id=<transacción>: confirmamos contra el API
  useEffect(() => {
    const txId = params.get('id');
    if (!txId) return;
    setConfirmando(true);
    api.post('/suscripcion/confirmar', { transaccionId: txId })
      .then(r => {
        if (r.data.estado === 'APPROVED') setResultado({ ok: true, msg: '¡Pago aprobado! Tu suscripción quedó activa.' });
        else setResultado({ ok: false, msg: `El pago quedó en estado ${r.data.estado}. Si pagaste, se reflejará en unos minutos.` });
        cargar();
      })
      .catch(() => setResultado({ ok: false, msg: 'No pudimos verificar la transacción. Intenta de nuevo.' }))
      .finally(() => { setConfirmando(false); setParams({}, { replace: true }); });
  }, []);

  // El Web Checkout de Wompi lee los parámetros por GET (query string).
  // Su firewall rechaza redirect-url hacia localhost, así que en desarrollo
  // se abre en otra pestaña y el pago se confirma con "Verificar pago".
  const irAWompi = () => {
    if (!cuenta?.checkout) return;
    const c = cuenta.checkout;
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = c.url;
    const campos: Record<string, string> = {
      'public-key': c.publicKey,
      currency: c.currency,
      'amount-in-cents': String(c.amountInCents),
      reference: c.reference,
      'signature:integrity': c.signature,
      ...(esLocalhost ? {} : { 'redirect-url': `${window.location.origin}/suscripcion` }),
    };
    for (const [name, value] of Object.entries(campos)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    if (esLocalhost) form.target = '_blank';
    document.body.appendChild(form);
    form.submit();
    if (esLocalhost) setRecibo(false);
  };

  // Confirmación manual por referencia (necesaria en desarrollo, donde Wompi no redirige)
  const verificarPago = async () => {
    setConfirmando(true);
    setResultado(null);
    try {
      const r = await api.post('/suscripcion/verificar');
      if (r.data.estado === 'APPROVED') setResultado({ ok: true, msg: '¡Pago verificado! Tu suscripción quedó activa.' });
      else setResultado({ ok: false, msg: r.data.mensaje ?? 'Aún no encontramos un pago aprobado.' });
      cargar();
    } catch (err: any) {
      setResultado({ ok: false, msg: err.response?.data?.error ?? 'No pudimos verificar el pago.' });
    } finally {
      setConfirmando(false);
    }
  };

  if (!cuenta) return <div className="p-8 text-muted">Cargando...</div>;

  const ui = ESTADO_UI[cuenta.estado] ?? ESTADO_UI.CANCELADA;
  const { cobro, precios } = cuenta;
  const base = Math.min(cobro.colaboradoresActivos, precios.limiteTramo1);
  const extra = Math.max(0, cobro.colaboradoresActivos - precios.limiteTramo1);
  const mesNombre = new Date().toLocaleDateString('es-CO', { month: 'long' });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Suscripción</h1>
        <p className="text-sm text-muted">Estado de cuenta de tu empresa en HoraPro · facturación por mes calendario</p>
      </div>

      {confirmando && (
        <div className="bg-primary/30 rounded-card px-4 py-3 text-sm text-ink flex items-center gap-2">
          <Clock size={16} /> Verificando el pago con Wompi...
        </div>
      )}
      {resultado && (
        <div className={`rounded-card px-4 py-3 text-sm flex items-center gap-2 ${resultado.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
          {resultado.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {resultado.msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-2">Estado</p>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${ui.clase}`}>{ui.label}</span>
          <p className="text-xs text-muted mt-3">
            {cuenta.pagadoHasta
              ? `Mes pagado hasta el ${fecha(cuenta.pagadoHasta)}`
              : `Prueba gratis hasta el ${fecha(cuenta.finPrueba)}`}
            {cuenta.diasMora > 0 && ` · ${cuenta.diasMora} día${cuenta.diasMora === 1 ? '' : 's'} de mora`}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="text-sm text-muted mb-1">Tarifa de mes completo</p>
          <p className="text-2xl font-bold text-ink">{cop(cobro.tarifaMesCompleto)}</p>
          <p className="text-xs text-muted mt-1">
            {base} colaborador{base === 1 ? '' : 'es'} × {cop(precios.precioTramo1)}
            {extra > 0 && <> + {extra} × {cop(precios.precioTramo2)}</>}
          </p>
        </div>
      </div>

      {cuenta.wompiConfigurado ? (
        cobro.monto > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setRecibo(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-6 py-3 rounded-xl">
              <CreditCard size={18} />
              {cobro.tipo === 'ADICIONAL'
                ? `Pagar ${cop(cobro.monto)} por colaboradores nuevos`
                : `Pagar ${cop(cobro.monto)} con Wompi`}
            </button>
            <button onClick={verificarPago} disabled={confirmando}
              className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-ink font-semibold px-4 py-3 rounded-xl text-sm disabled:opacity-60">
              <CheckCircle size={16} /> Verificar pago
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-card px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <CheckCircle size={16} /> Estás al día: {cobro.colaboradoresFacturados} colaboradores cubiertos hasta el {fecha(cobro.cubreHasta)}.
          </div>
        )
      ) : (
        <div className="bg-primary/30 border border-primary rounded-card px-4 py-3 text-sm text-ink flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>El pago en línea aún no está habilitado (faltan las llaves de Wompi en el servidor). Mientras tanto, HoraPro registra tus pagos manualmente.</span>
        </div>
      )}

      <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
        <p className="px-5 pt-4 font-semibold text-ink">Historial de pagos</p>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-gray-100">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3 text-right">Monto</th>
              <th className="px-5 py-3 text-center">Colaboradores</th>
              <th className="px-5 py-3">Cubre hasta</th>
              <th className="px-5 py-3">Método</th>
            </tr>
          </thead>
          <tbody>
            {cuenta.pagos.map(p => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="px-5 py-3 text-muted">{new Date(p.creadoEn).toLocaleDateString('es-CO')}</td>
                <td className="px-5 py-3 text-right font-medium text-ink">{cop(p.monto)}</td>
                <td className="px-5 py-3 text-center text-muted">{p.colaboradoresFacturados}</td>
                <td className="px-5 py-3 text-muted">{new Date(p.periodoFin).toLocaleDateString('es-CO')}</td>
                <td className="px-5 py-3 text-muted text-xs">{p.metodo === 'LINK_WOMPI' ? 'Wompi' : p.metodo === 'MANUAL' ? 'Manual' : 'Tarjeta'}</td>
              </tr>
            ))}
            {cuenta.pagos.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Aún no hay pagos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recibo previo al pago: resumen tipo factura antes de ir a Wompi */}
      {recibo && cuenta.checkout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRecibo(false)}>
          <div className="hp-pop bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-ink px-6 py-4 flex items-center justify-between">
              <p className="text-white font-bold flex items-center gap-2"><Receipt size={17} /> Resumen de tu pago</p>
              <button onClick={() => setRecibo(false)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="text-center mb-5">
                <p className="text-sm text-muted">{usuario?.empresaNombre}</p>
                <p className="text-4xl font-extrabold text-ink mt-1">{cop(cobro.monto)}</p>
                <p className="text-xs text-muted mt-1">
                  {cobro.tipo === 'ADICIONAL' ? 'Colaboradores nuevos · resto del mes' : `Suscripción HoraPro · ${mesNombre}`}
                </p>
              </div>
              <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-2 text-sm">
                {cobro.tipo === 'ADICIONAL' ? (
                  <div className="flex justify-between">
                    <span className="text-muted">{cobro.colaboradoresActivos - cobro.colaboradoresFacturados} colaborador(es) nuevo(s)</span>
                    <span className="text-ink font-medium">{cop(cobro.monto)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">{base} colaborador{base === 1 ? '' : 'es'} × {cop(precios.precioTramo1)}</span>
                      <span className="text-ink font-medium">{cop(base * precios.precioTramo1)}</span>
                    </div>
                    {extra > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted">{extra} adicional{extra === 1 ? '' : 'es'} × {cop(precios.precioTramo2)}</span>
                        <span className="text-ink font-medium">{cop(extra * precios.precioTramo2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-muted">Días del mes por cubrir</span>
                  <span className="text-ink font-medium">{cobro.diasRestantes} de {cobro.diasMes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Cubre hasta</span>
                  <span className="text-ink font-medium">{fecha(cobro.cubreHasta)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-semibold text-ink">Total a pagar hoy</span>
                  <span className="font-bold text-ink">{cop(cobro.monto)}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-3 text-center">Ref. {cuenta.checkout.reference}</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setRecibo(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={irAWompi}
                  className="flex-1 px-4 py-2.5 text-sm font-bold bg-primary hover:bg-primary-dark text-ink rounded-xl flex items-center justify-center gap-2">
                  <CreditCard size={15} /> Pagar en Wompi
                </button>
              </div>
              <p className="text-[11px] text-muted mt-3 text-center">En Wompi eliges el método: tarjeta, PSE o Nequi.</p>
              {esLocalhost && (
                <p className="text-[11px] text-orange-600 mt-2 text-center">
                  Ambiente local: Wompi se abre en otra pestaña. Al terminar, vuelve aquí y presiona "Verificar pago".
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
