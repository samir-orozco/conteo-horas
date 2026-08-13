import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rutaInicio } from '../lib/rutas';
import logoCompleto from '../assets/logo-completo.svg';
import GeoArt from '../components/GeoArt';
import CreditoKrumlab from '../components/CreditoKrumlab';

export default function Login() {
  const { login, usuario, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, no mostramos el login (evita volver aquí con "atrás")
  if (!authLoading && usuario) {
    return <Navigate to={rutaInicio(usuario.rol)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const usuario = await login(email, password);
      // replace: reemplaza /login en el historial, así "atrás" no regresa aquí
      navigate(rutaInicio(usuario.rol), { replace: true });
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="min-h-screen flex bg-white">
      {/* Formulario (izquierda) */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-8">
            <ChevronLeft size={16} /> Volver al inicio
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-muted mt-1.5 text-sm">
            Ingresa a tu cuenta · <Link to="/registro" className="font-semibold text-ink underline">crear cuenta</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Correo electrónico</label>
              <input className={input} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@miempresa.co" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Contraseña</label>
              <div className="relative">
                <input className={`${input} pr-10`} type={verPass ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
                <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
              {loading ? 'Entrando...' : <>Iniciar sesión <ArrowRight size={17} /></>}
            </button>

            <p className="text-center">
              <Link to="/olvide" className="text-sm text-muted hover:text-ink underline">¿Olvidaste tu contraseña?</Link>
            </p>
          </form>

          <CreditoKrumlab className="mt-12 text-center" />
        </div>
      </div>

      {/* Panel decorativo (derecha) */}
      <div className="hidden lg:flex w-[42%] bg-[#f6f6f4] relative overflow-hidden flex-col justify-between p-10">
        <GeoArt className="absolute inset-0 [transform:scaleX(-1)]" />
        <div className="relative z-10 flex justify-end">
          <img src={logoCompleto} alt="HoraPro" className="h-9" />
        </div>
        <div className="relative z-10 bg-white/80 backdrop-blur rounded-2xl p-6 max-w-sm self-end text-right">
          <p className="text-xl font-bold text-ink leading-snug">El control de horas de tu equipo, en un solo lugar.</p>
          <p className="mt-4 text-sm text-ink/80">Marcación, recargos y nómina calculados automáticamente cada mes.</p>
        </div>
      </div>
    </div>
  );
}
