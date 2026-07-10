import { useState } from 'react';
import { MailCheck, Send, RefreshCw, LogOut } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Bloquea el panel hasta que el usuario confirme su correo (cuentas nuevas).
// Mismo patrón que BloqueoPago: overlay a pantalla completa dentro del Layout.
export default function VerificarCorreo() {
  const { usuario, logout, refrescarUsuario } = useAuth();
  const [reenviado, setReenviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  if (!usuario || usuario.emailVerificado !== false) return null;

  const reenviar = async () => {
    setOcupado(true);
    try {
      await api.post('/auth/reenviar-verificacion');
      setReenviado(true);
      // Si el servidor lo verificó directo (sin SMTP), refleja el cambio ya
      await refrescarUsuario();
    } finally {
      setOcupado(false);
    }
  };

  const yaConfirme = async () => {
    setOcupado(true);
    try {
      await refrescarUsuario();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="hp-pop bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-primary px-6 py-5 flex items-center gap-3">
          <MailCheck size={26} className="text-ink" />
          <div>
            <p className="font-bold text-ink text-lg leading-tight">Confirma tu correo</p>
            <p className="text-ink/70 text-sm">Un paso más y quedas listo.</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted">
            Te enviamos un link de confirmación a <b className="text-ink">{usuario.email}</b>.
            Ábrelo para activar tu panel. Revisa también la carpeta de spam.
          </p>
          <div className="mt-5 space-y-2">
            <button onClick={yaConfirme} disabled={ocupado}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
              <RefreshCw size={16} /> Ya lo confirmé
            </button>
            <button onClick={reenviar} disabled={ocupado || reenviado}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-ink font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
              <Send size={15} /> {reenviado ? 'Correo reenviado ✓' : 'Reenviar el correo'}
            </button>
          </div>
          <button onClick={logout} className="mt-4 w-full text-xs text-gray-400 hover:text-muted underline flex items-center justify-center gap-1">
            <LogOut size={12} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
