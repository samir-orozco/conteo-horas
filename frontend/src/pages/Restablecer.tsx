import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import logoCompleto from '../assets/logo-completo.svg';

// Recuperación de contraseña, paso 2: crear la nueva con el token del correo
export default function Restablecer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmar) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      await api.post('/auth/restablecer', { token, password });
      setListo(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No pudimos restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <img src={logoCompleto} alt="HoraPro" className="h-10 mb-6" />

        {listo ? (
          <div className="text-center py-4">
            <div className="hp-pop w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">¡Contraseña actualizada!</h1>
            <p className="text-sm text-muted">Ya puedes entrar con tu nueva contraseña. Te llevamos al login...</p>
          </div>
        ) : !token ? (
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-ink mb-2">Link inválido</h1>
            <p className="text-sm text-muted">A este link le falta el código de recuperación. Pide uno nuevo.</p>
            <Link to="/olvide" className="inline-block mt-6 text-sm font-semibold text-ink underline">Solicitar link nuevo</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2"><KeyRound size={20} /> Nueva contraseña</h1>
            <p className="text-sm text-muted mt-1 mb-6">Crea la nueva contraseña para tu cuenta de HoraPro.</p>
            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input type={verPass ? 'text' : 'password'} required minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Confirmar contraseña</label>
                <input type={verPass ? 'text' : 'password'} required minLength={6} value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} placeholder="Repítela"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
