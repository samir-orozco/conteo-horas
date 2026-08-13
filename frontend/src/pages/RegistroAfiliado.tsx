import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Check, BadgePercent } from 'lucide-react';
import api from '../lib/api';
import logoCompleto from '../assets/logo-completo.svg';
import GeoArt from '../components/GeoArt';
import CreditoKrumlab from '../components/CreditoKrumlab';

const METODOS = [
  { v: 'NEQUI', t: 'Nequi' }, { v: 'BANCOLOMBIA', t: 'Bancolombia' },
  { v: 'DAVIPLATA', t: 'Daviplata' }, { v: 'OTRO', t: 'Otro banco' },
];

type Invitacion = { valido: boolean; yaRegistrado: boolean; nombre: string; porcentaje: number; duracionMeses: number | null };

export default function RegistroAfiliado() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [inv, setInv] = useState<Invitacion | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'invalida'>('cargando');
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '',
    pagoMetodo: '', pagoBanco: '', pagoTipoCuenta: 'AHORROS', pagoNumero: '', pagoTitular: '', pagoDocumento: '',
  });
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setEstado('invalida'); return; }
    api.get('/auth/invitacion-afiliado', { params: { token } })
      .then(r => { setInv(r.data); setForm(f => ({ ...f, nombre: r.data.nombre || '' })); setEstado('ok'); })
      .catch(() => setEstado('invalida'));
  }, [token]);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const esBanco = form.pagoMetodo === 'BANCOLOMBIA' || form.pagoMetodo === 'OTRO';
  const input = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/registro-afiliado', { ...form, token });
      localStorage.setItem('token', data.token);
      window.location.href = '/afiliado'; // recarga para que la sesión enrute al panel
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No pudimos completar tu registro.');
      setLoading(false);
    }
  };

  if (estado === 'cargando') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }
  if (estado === 'invalida' || !inv?.valido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <img src={logoCompleto} alt="HoraPro" className="h-9 mb-6" />
        <h1 className="text-xl font-bold text-ink">Invitación no válida</h1>
        <p className="text-sm text-muted mt-2 max-w-sm">El enlace no es válido o ya venció. Pídele al equipo de HoraPro que te envíe uno nuevo.</p>
        <Link to="/login" className="mt-6 text-sm font-semibold text-ink underline">Ir a iniciar sesión</Link>
      </div>
    );
  }
  if (inv.yaRegistrado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <img src={logoCompleto} alt="HoraPro" className="h-9 mb-6" />
        <h1 className="text-xl font-bold text-ink">Esta invitación ya fue usada</h1>
        <p className="text-sm text-muted mt-2 max-w-sm">Ya creaste tu cuenta con este enlace. Entra con tu correo y contraseña.</p>
        <Link to="/login" className="mt-6 text-sm font-semibold text-ink underline">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Panel decorativo */}
      <div className="hidden lg:flex w-[42%] bg-[#f6f6f4] relative overflow-hidden flex-col justify-between p-10">
        <GeoArt className="absolute inset-0" />
        <div className="relative z-10"><img src={logoCompleto} alt="HoraPro" className="h-9" /></div>
        <div className="relative z-10 bg-white/80 backdrop-blur rounded-2xl p-6 max-w-sm">
          <p className="text-xl font-bold text-ink leading-snug">Bienvenido al programa de afiliados de HoraPro.</p>
          <div className="mt-4 space-y-2 text-sm text-ink/80">
            <div className="flex items-center gap-2"><BadgePercent size={16} className="text-green-600" /> Ganas {inv.porcentaje}% de cada pago{inv.duracionMeses == null ? '' : ` por ${inv.duracionMeses} meses`}</div>
            <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Tu propio link para compartir</div>
            <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Billetera con tus comisiones</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Crea tu cuenta de afiliado</h1>
          <p className="text-muted mt-1.5 text-sm">Ganas <b className="text-ink">{inv.porcentaje}%</b> de comisión{inv.duracionMeses == null ? '' : <> durante <b className="text-ink">{inv.duracionMeses} meses</b></>}.</p>

          <form onSubmit={enviar} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tu nombre</label>
              <input className={input} required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Correo</label>
                <input className={input} type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@correo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Teléfono <span className="text-gray-400">(opcional)</span></label>
                <input className={input} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="3001234567" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Contraseña</label>
              <div className="relative">
                <input className={`${input} pr-10`} type={verPass ? 'text' : 'password'} required minLength={6}
                  value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">¿Cómo quieres recibir tus comisiones?</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Método</label>
                  <select className={input} value={form.pagoMetodo} onChange={e => set('pagoMetodo', e.target.value)}>
                    <option value="">— Elige —</option>
                    {METODOS.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
                  </select>
                </div>
                {form.pagoMetodo === 'OTRO' && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Banco</label>
                    <input className={input} value={form.pagoBanco} onChange={e => set('pagoBanco', e.target.value)} placeholder="Davivienda, BBVA…" />
                  </div>
                )}
                {esBanco && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Tipo de cuenta</label>
                    <select className={input} value={form.pagoTipoCuenta} onChange={e => set('pagoTipoCuenta', e.target.value)}>
                      <option value="AHORROS">Ahorros</option>
                      <option value="CORRIENTE">Corriente</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{form.pagoMetodo === 'NEQUI' || form.pagoMetodo === 'DAVIPLATA' ? 'Celular' : 'Número de cuenta'}</label>
                  <input className={input} value={form.pagoNumero} onChange={e => set('pagoNumero', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Titular</label>
                  <input className={input} value={form.pagoTitular} onChange={e => set('pagoTitular', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Documento</label>
                  <input className={input} value={form.pagoDocumento} onChange={e => set('pagoDocumento', e.target.value)} placeholder="Cédula / NIT" />
                </div>
              </div>
              <p className="text-[11px] text-muted mt-2">Puedes cambiar estos datos luego desde tu perfil.</p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
              {loading ? 'Creando cuenta...' : <>Crear mi cuenta <ArrowRight size={17} /></>}
            </button>
          </form>

          <CreditoKrumlab className="mt-8 text-center" />
        </div>
      </div>
    </div>
  );
}
