import { useState, useEffect } from 'react';
import { Send, Check, Plug, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useMiPlan } from '../../lib/plan';
import FuncionBloqueada from '../../components/FuncionBloqueada';

// Conexiones de la empresa con servicios externos: Telegram (alertas) y Siigo (próximamente).
export default function TabConexiones() {
  const { plan } = useMiPlan();
  const [cargado, setCargado] = useState(false);
  const [alertasTarde, setAlertasTarde] = useState(false);
  const [chatId, setChatId] = useState('');
  const [guardandoTg, setGuardandoTg] = useState(false);
  const [probandoTg, setProbandoTg] = useState(false);
  const [msgTg, setMsgTg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    api.get('/configuracion').then(r => {
      setAlertasTarde(r.data.TELEGRAM_ALERTAS_TARDE === '1');
      setChatId(r.data.TELEGRAM_CHAT_ID || '');
      setCargado(true);
    });
  }, []);

  const toggleAlertas = async () => {
    const nuevo = !alertasTarde;
    setAlertasTarde(nuevo);
    await api.put('/configuracion', { TELEGRAM_ALERTAS_TARDE: nuevo ? '1' : '0' });
  };

  const guardarChat = async () => {
    setGuardandoTg(true); setMsgTg(null);
    try {
      await api.put('/configuracion', { TELEGRAM_CHAT_ID: chatId.trim() });
      setMsgTg({ tipo: 'ok', texto: 'Chat guardado.' });
    } catch {
      setMsgTg({ tipo: 'error', texto: 'No pudimos guardar el chat.' });
    } finally { setGuardandoTg(false); }
  };

  const enviarPrueba = async () => {
    setProbandoTg(true); setMsgTg(null);
    try {
      await api.post('/configuracion/telegram/prueba', { chatId: chatId.trim() });
      setMsgTg({ tipo: 'ok', texto: '¡Enviado! Revisa tu Telegram; debería llegar el mensaje de prueba.' });
    } catch (e: any) {
      setMsgTg({ tipo: 'error', texto: e.response?.data?.error ?? 'No pudimos enviar la prueba.' });
    } finally { setProbandoTg(false); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Conexiones</h1>
        <p className="text-sm text-muted">Integra HoraPro con otros servicios que ya usas.</p>
      </div>

      <div className="columns-1 xl:columns-2 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
        {/* Telegram */}
        {plan && !plan.features.telegram ? (
          <FuncionBloqueada titulo="Telegram — alertas de llegada tarde"
            descripcion="Recibe un aviso apenas un colaborador marque entrada tarde. Disponible desde el plan Profesional." />
        ) : (
        <div className="bg-white rounded-card border border-gray-200 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-ink mb-1 flex items-center gap-2"><Send size={17} className="text-[#229ED9]" /> Telegram — alertas de llegada tarde</p>
              <p className="text-sm text-muted">
                Recibe un mensaje apenas un colaborador marque <b>entrada tarde</b> (según su horario y tolerancia).
              </p>
            </div>
            <button onClick={toggleAlertas} disabled={!cargado} role="switch" aria-checked={alertasTarde}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${alertasTarde ? 'bg-primary' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${alertasTarde ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {alertasTarde && cargado && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-muted space-y-1.5">
                <p className="font-semibold text-ink">Cómo conectar (fácil)</p>
                <p>1. En Telegram, busca <b>@HoraPro_bot</b> y presiona <b>Iniciar</b> (o agrégalo a un grupo del equipo).</p>
                <p>2. Escribe <b><code>/id</code></b>. El bot te responde el <b>ID del chat</b>.</p>
                <p>3. Pega ese ID abajo, <b>Guarda</b> y presiona <b>Enviar prueba</b>.</p>
              </div>

              <label className="block text-xs font-medium text-muted mb-1">ID del chat de Telegram</label>
              <input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Ej: -1001234567890"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

              <div className="flex flex-wrap gap-3">
                <button onClick={guardarChat} disabled={guardandoTg || !chatId.trim()}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
                  {guardandoTg ? 'Guardando...' : 'Guardar chat'}
                </button>
                <button onClick={enviarPrueba} disabled={probandoTg || !chatId.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60">
                  <Send size={14} /> {probandoTg ? 'Enviando...' : 'Enviar prueba'}
                </button>
              </div>

              {msgTg && (
                <p className={`flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 ${msgTg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {msgTg.tipo === 'ok' && <Check size={15} />}{msgTg.texto}
                </p>
              )}
            </div>
          )}
        </div>
        )}

        {/* Siigo — próximamente */}
        <div className="bg-white rounded-card border border-gray-200 p-6 space-y-3 opacity-90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-ink mb-1 flex items-center gap-2"><Plug size={17} className="text-emerald-600" /> Siigo — contabilidad y nómina</p>
              <p className="text-sm text-muted">
                Exporta horas y novedades directo a Siigo para liquidar nómina sin doble digitación.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full shrink-0">
              <Clock size={12} /> Próximamente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
