import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MailCheck, Send } from 'lucide-react';
import api from '../lib/api';
import logoCompleto from '../assets/logo-completo.svg';

// Recuperación de contraseña, paso 1: pedir el link por correo
export default function Olvide() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/olvide-password', { email });
    } finally {
      // Siempre mostramos éxito: el backend no revela si el correo existe
      setEnviado(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <img src={logoCompleto} alt="HoraPro" className="h-10 mb-6" />

        {enviado ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <MailCheck size={26} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">Revisa tu correo</h1>
            <p className="text-sm text-muted">
              Si <b>{email}</b> está registrado en HoraPro, te enviamos un link para crear
              una nueva contraseña. Vence en 30 minutos.
            </p>
            <Link to="/login" className="inline-block mt-6 text-sm font-semibold text-ink underline">Volver al login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink">¿Olvidaste tu contraseña?</h1>
            <p className="text-sm text-muted mt-1 mb-6">
              Escribe el correo con el que entras a HoraPro y te enviaremos un link para crear una nueva.
            </p>
            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Correo electrónico</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@miempresa.co"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
                <Send size={16} /> {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mt-6">
              <ChevronLeft size={16} /> Volver al login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
