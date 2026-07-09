import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoCompleto from '../assets/logo-completo.svg';

export default function Login() {
  const { login, usuario, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, no mostramos el login (evita volver aquí con "atrás")
  if (!authLoading && usuario) {
    return <Navigate to={usuario.rol === 'SUPER_ADMIN' ? '/admin' : '/app'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const usuario = await login(email, password);
      // replace: reemplaza /login en el historial, así "atrás" no regresa aquí
      navigate(usuario.rol === 'SUPER_ADMIN' ? '/admin' : '/app', { replace: true });
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logoCompleto} alt="HoraPro" className="h-16 mb-3" />
          <p className="text-muted text-sm">Control de horas laborales</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
