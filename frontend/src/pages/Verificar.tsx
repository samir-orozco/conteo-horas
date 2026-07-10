import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logoCompleto from '../assets/logo-completo.svg';

// Destino del link "Confirma tu correo" enviado al registrarse
export default function Verificar() {
  const [params] = useSearchParams();
  const { usuario, refrescarUsuario } = useAuth();
  const token = params.get('token') ?? '';
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'error'>('verificando');
  const [error, setError] = useState('');
  const yaEjecutado = useRef(false);

  useEffect(() => {
    if (yaEjecutado.current) return; // StrictMode monta dos veces; el token es de un solo uso
    yaEjecutado.current = true;
    if (!token) {
      setEstado('error');
      setError('A este link le falta el código de verificación.');
      return;
    }
    api.post('/auth/verificar-email', { token })
      .then(async () => {
        setEstado('ok');
        if (usuario) await refrescarUsuario(); // si está logueado, desbloquea el panel ya
      })
      .catch(err => {
        setEstado('error');
        setError(err.response?.data?.error ?? 'No pudimos verificar el correo.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <img src={logoCompleto} alt="HoraPro" className="h-10 mx-auto mb-6" />

        {estado === 'verificando' && <p className="text-muted py-6">Verificando tu correo...</p>}

        {estado === 'ok' && (
          <>
            <div className="hp-pop w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">¡Correo confirmado!</h1>
            <p className="text-sm text-muted mb-6">Tu cuenta quedó activa. Ya puedes usar tu panel de HoraPro.</p>
            <Link to={usuario ? '/app' : '/login'}
              className="inline-block bg-primary hover:bg-primary-dark text-ink font-bold px-6 py-3 rounded-xl">
              {usuario ? 'Ir a mi panel' : 'Iniciar sesión'}
            </Link>
          </>
        )}

        {estado === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">Link inválido</h1>
            <p className="text-sm text-muted mb-6">{error} Si ya habías confirmado antes, simplemente inicia sesión.</p>
            <Link to="/login" className="inline-block bg-primary hover:bg-primary-dark text-ink font-bold px-6 py-3 rounded-xl">
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
