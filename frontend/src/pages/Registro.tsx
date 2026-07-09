import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoCompleto from '../assets/logo-completo.svg';
import GeoArt from '../components/GeoArt';

const EMPTY = { empresa: '', nit: '', nombre: '', email: '', password: '', telefono: '' };

export default function Registro() {
  const { registrar, usuario, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authLoading && usuario) {
    return <Navigate to={usuario.rol === 'SUPER_ADMIN' ? '/admin' : '/app'} replace />;
  }

  const set = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registrar(form);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No pudimos crear tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="min-h-screen flex bg-white">
      {/* Panel decorativo (izquierda) */}
      <div className="hidden lg:flex w-[42%] bg-[#f6f6f4] relative overflow-hidden flex-col justify-between p-10">
        <GeoArt className="absolute inset-0" />
        <div className="relative z-10">
          <img src={logoCompleto} alt="HoraPro" className="h-9" />
        </div>
        <div className="relative z-10 bg-white/80 backdrop-blur rounded-2xl p-6 max-w-sm">
          <p className="text-xl font-bold text-ink leading-snug">Liquida las horas de tu equipo sin hacer cuentas.</p>
          <div className="mt-4 space-y-2 text-sm text-ink/80">
            {['7 días gratis, sin tarjeta', 'Recargos y extras automáticos', 'Listo en minutos'].map(t => (
              <div key={t} className="flex items-center gap-2"><Check size={16} className="text-green-600" /> {t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario (derecha) */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8">
            <ChevronLeft size={16} /> Volver al inicio
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight">Crea tu cuenta</h1>
          <p className="text-muted mt-1.5 text-sm">
            Empieza tu prueba gratis · <Link to="/login" className="font-semibold text-ink underline">ya tengo cuenta</Link>
          </p>

          <form onSubmit={enviar} className="mt-7 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Nombre de la empresa</label>
                <input className={input} required value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Mi Empresa S.A.S" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">NIT</label>
                <input className={input} required value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="900123456-7" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Teléfono <span className="text-gray-400">(opcional)</span></label>
                <input className={input} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="3001234567" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tu nombre</label>
              <input className={input} required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ana López" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Correo electrónico</label>
              <input className={input} type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="ana@miempresa.co" />
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

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
              {loading ? 'Creando cuenta...' : <>Empezar prueba gratis <ArrowRight size={17} /></>}
            </button>
            <p className="text-xs text-muted text-center">Al crear la cuenta aceptas los términos de HoraPro. No se cobra durante la prueba.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
