import { useState } from 'react';
import { MailCheck, Send, LogOut, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EntradaCodigo from './EntradaCodigo';

// Bloquea el panel hasta que el usuario confirme su correo con el código de
// 6 dígitos que le llega al registrarse. Mismo patrón que BloqueoPago: overlay
// a pantalla completa dentro del Layout.
export default function VerificarCorreo() {
  const { usuario, logout, refrescarUsuario } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [error, setError] = useState('');
  const [reenviado, setReenviado] = useState(false);

  if (!usuario || usuario.emailVerificado !== false) return null;

  const verificar = async (valor: string) => {
    if (valor.length < 6 || verificando) return;
    setVerificando(true);
    setError('');
    try {
      await api.post('/auth/verificar-email', { codigo: valor });
      await refrescarUsuario();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No pudimos verificar el código');
      setCodigo('');
    } finally {
      setVerificando(false);
    }
  };

  const cambiarCodigo = (valor: string) => {
    setCodigo(valor);
    setError('');
    if (valor.length === 6) verificar(valor);
  };

  const reenviar = async () => {
    setReenviando(true);
    setError('');
    try {
      await api.post('/auth/reenviar-verificacion');
      setReenviado(true);
      setCodigo('');
      await refrescarUsuario(); // si no había SMTP, el backend ya lo verificó directo
      setTimeout(() => setReenviado(false), 4000);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="hp-pop bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/30 flex items-center justify-center mx-auto mb-5">
          <MailCheck size={30} className="text-ink" />
        </div>
        <h1 className="text-xl font-bold text-ink">Verifica tu correo</h1>
        <p className="text-sm text-muted mt-1.5 mb-6">
          Enviamos un código a <b className="text-ink">{usuario.email}</b>. Escríbelo aquí para activar tu panel.
        </p>

        <EntradaCodigo valor={codigo} onChange={cambiarCodigo} error={!!error} autoFocus />

        <div className="h-6 mt-3 flex items-center justify-center">
          {verificando ? (
            <p className="text-sm text-muted flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Verificando...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <button onClick={reenviar} disabled={reenviando}
          className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold text-ink hover:underline disabled:opacity-60">
          <Send size={14} /> {reenviado ? 'Código reenviado ✓' : reenviando ? 'Enviando...' : '¿No te llegó? Reenviar código'}
        </button>

        <button onClick={logout} className="mt-5 text-xs text-gray-400 hover:text-muted underline flex items-center justify-center gap-1 mx-auto">
          <LogOut size={12} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
