import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const esLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

type Cuenta = {
  estado: string; diasMora: number; tarifaMensual: number; colaboradoresActivos: number;
  cobro: { monto: number; diasRestantes: number; diasMes: number; cubreHasta: string; tarifaMesCompleto: number };
  checkout: { url: string; publicKey: string; currency: string; amountInCents: number; reference: string; signature: string } | null;
};

// Modal bloqueante cuando la suscripción está vencida (EN_MORA o SUSPENDIDA):
// no se puede cerrar ni navegar; solo pagar, verificar el pago o cerrar sesión.
// El kiosco de marcación NO se bloquea — las horas se siguen registrando.
export default function BloqueoPago() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [msg, setMsg] = useState('');

  const bloqueado = usuario?.estadoSuscripcion === 'EN_MORA' || usuario?.estadoSuscripcion === 'SUSPENDIDA';

  useEffect(() => {
    if (bloqueado) api.get('/suscripcion').then(r => setCuenta(r.data)).catch(() => {});
  }, [bloqueado]);

  if (!bloqueado) return null;

  const pagar = () => {
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
      ...(esLocalhost ? {} : { 'redirect-url': `${window.location.origin}/app/suscripcion` }),
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
  };

  const verificar = async () => {
    setVerificando(true);
    setMsg('');
    try {
      const r = await api.post('/suscripcion/verificar');
      if (r.data.estado === 'APPROVED') {
        window.location.reload(); // refresca /me y desbloquea
      } else {
        setMsg(r.data.mensaje ?? 'Aún no encontramos un pago aprobado.');
      }
    } catch (err: any) {
      setMsg(err.response?.data?.error ?? 'No pudimos verificar el pago.');
    } finally {
      setVerificando(false);
    }
  };

  const suspendida = usuario?.estadoSuscripcion === 'SUSPENDIDA';

  return (
    <div className="fixed inset-0 z-[100] bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="hp-pop bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className={`px-6 py-5 ${suspendida ? 'bg-red-600' : 'bg-orange-500'}`}>
          <div className="flex items-center gap-3 text-white">
            <ShieldAlert size={26} />
            <div>
              <p className="font-bold text-lg leading-tight">
                {suspendida ? 'Suscripción suspendida' : 'Tu suscripción está en mora'}
              </p>
              <p className="text-white/85 text-sm">
                {suspendida
                  ? 'El acceso al panel se reactiva con el pago del mes.'
                  : `Llevas ${cuenta?.diasMora ?? '—'} día${(cuenta?.diasMora ?? 0) === 1 ? '' : 's'} de mora.`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted mb-4">
            Tus colaboradores <b className="text-ink">siguen marcando normalmente</b> en el kiosco y no se
            pierde ninguna hora. Para volver a usar el panel, realiza el pago del mes.
          </p>

          {cuenta && (
            <div className="border border-dashed border-gray-300 rounded-xl p-4 mb-5 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">{cuenta.colaboradoresActivos} colaboradores · mes completo</span>
                <span className="text-ink font-medium">{cop(cuenta.cobro.tarifaMesCompleto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Días por cubrir ({cuenta.cobro.diasRestantes} de {cuenta.cobro.diasMes})</span>
                <span className="font-bold text-ink">{cop(cuenta.cobro.monto)}</span>
              </div>
              <p className="text-[11px] text-muted">Cubre hasta el {new Date(cuenta.cobro.cubreHasta).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} — todos los pagos renuevan el día 1.</p>
            </div>
          )}

          <button onClick={pagar} disabled={!cuenta?.checkout}
            className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            <CreditCard size={18} /> Pagar {cuenta ? cop(cuenta.cobro.monto) : ''} con Wompi
          </button>
          <button onClick={verificar} disabled={verificando}
            className="w-full mt-2.5 border border-gray-300 hover:bg-gray-50 text-ink font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            <CheckCircle size={15} /> {verificando ? 'Verificando...' : 'Ya pagué, verificar'}
          </button>
          {msg && <p className="text-orange-600 text-xs text-center mt-2">{msg}</p>}
          {esLocalhost && (
            <p className="text-[11px] text-muted text-center mt-2">
              Wompi se abre en otra pestaña; al terminar vuelve y presiona "Ya pagué".
            </p>
          )}

          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full mt-4 text-xs text-gray-400 hover:text-muted flex items-center justify-center gap-1.5">
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
