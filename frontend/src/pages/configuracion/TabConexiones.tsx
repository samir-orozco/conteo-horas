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
  // «No ha llegado» (11 de octubre de 2026): comparte el chat con el de llegadas tarde.
  const [noHaLlegado, setNoHaLlegado] = useState(false);
  // Novedades por aprobar (12 de octubre de 2026): sin tipo ni motivo, que pueden ser de salud.
  const [novedades, setNovedades] = useState(false);
  // Pausas sin volver (13 de octubre de 2026): almuerzo o descanso 15 minutos pasado su regreso.
  const [pausas, setPausas] = useState(false);
  // Turnos cerrados solos (13 de octubre de 2026): un mensaje cada mañana a las 7.
  const [turnosCerrados, setTurnosCerrados] = useState(false);
  const [chatId, setChatId] = useState('');
  const [guardandoTg, setGuardandoTg] = useState(false);
  const [probandoTg, setProbandoTg] = useState(false);
  const [msgTg, setMsgTg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    api.get('/configuracion').then(r => {
      setAlertasTarde(r.data.TELEGRAM_ALERTAS_TARDE === '1');
      setNoHaLlegado(r.data.TELEGRAM_NO_HA_LLEGADO === '1');
      setNovedades(r.data.TELEGRAM_NOVEDADES === '1');
      setPausas(r.data.TELEGRAM_PAUSAS === '1');
      setTurnosCerrados(r.data.TELEGRAM_TURNOS_CERRADOS === '1');
      setChatId(r.data.TELEGRAM_CHAT_ID || '');
      setCargado(true);
    });
  }, []);

  const [errorAviso, setErrorAviso] = useState(false);

  // Si el guardado falla, el interruptor vuelve a como estaba y se dice. Antes quedaba mostrando el
  // valor nuevo: se encontró en el navegador el 11 de octubre de 2026, con el aviso «apagado» en
  // pantalla y encendido en la base, que es justo lo que no puede pasar con algo que escribe a un grupo.
  const cambiarAviso = async (clave: string, actual: boolean, poner: (v: boolean) => void) => {
    const nuevo = !actual;
    poner(nuevo); setErrorAviso(false);
    try {
      await api.put('/configuracion', { [clave]: nuevo ? '1' : '0' });
    } catch {
      poner(actual); setErrorAviso(true);
    }
  };
  const toggleAlertas = () => cambiarAviso('TELEGRAM_ALERTAS_TARDE', alertasTarde, setAlertasTarde);
  const toggleNoHaLlegado = () => cambiarAviso('TELEGRAM_NO_HA_LLEGADO', noHaLlegado, setNoHaLlegado);
  const toggleNovedades = () => cambiarAviso('TELEGRAM_NOVEDADES', novedades, setNovedades);
  const togglePausas = () => cambiarAviso('TELEGRAM_PAUSAS', pausas, setPausas);
  const toggleTurnosCerrados = () => cambiarAviso('TELEGRAM_TURNOS_CERRADOS', turnosCerrados, setTurnosCerrados);

  // Los pasos del chat se ven con CUALQUIERA de los dos avisos encendido: lo comparten.
  const algunAviso = alertasTarde || noHaLlegado || novedades || pausas || turnosCerrados;

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
          <FuncionBloqueada titulo="Telegram — alertas de asistencia"
            descripcion="Recibe un aviso cuando alguien llega tarde o no ha llegado. Disponible desde el plan Profesional." />
        ) : (
        <div className="bg-white rounded-card border border-gray-200 p-6 space-y-5">
          <p className="font-semibold text-ink flex items-center gap-2"><Send size={17} className="text-[#229ED9]" /> Telegram — alertas de asistencia</p>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="tg-tarde" className="font-medium text-ink text-sm mb-0.5">Llegadas tarde</p>
              <p className="text-sm text-muted">
                Un mensaje apenas un colaborador marque <b>entrada tarde</b> (según su horario y tolerancia).
              </p>
            </div>
            <Interruptor encendido={alertasTarde} onClick={toggleAlertas} disabled={!cargado} etiqueta="tg-tarde" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="tg-no-llego" className="font-medium text-ink text-sm mb-0.5">Quién no ha llegado</p>
              <p className="text-sm text-muted">
                Si alguien con turno no marca entrada pasados <b>su tolerancia y 15 minutos</b>, llega un mensaje con
                la lista, y otro cuando la persona llega. También queda en la campana.
              </p>
            </div>
            <Interruptor encendido={noHaLlegado} onClick={toggleNoHaLlegado} disabled={!cargado} etiqueta="tg-no-llego" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="tg-pausas" className="font-medium text-ink text-sm mb-0.5">Quién no ha vuelto de su pausa</p>
              <p className="text-sm text-muted">
                Si alguien no marca su regreso del almuerzo o de un descanso <b>15 minutos</b> después de la hora,
                llega un mensaje con la lista, y otro cuando vuelve. También queda en la campana.
              </p>
            </div>
            <Interruptor encendido={pausas} onClick={togglePausas} disabled={!cargado} etiqueta="tg-pausas" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="tg-novedades" className="font-medium text-ink text-sm mb-0.5">Novedades por aprobar</p>
              <p className="text-sm text-muted">
                Cuando alguien reporta una novedad desde el kiosco, llega un aviso con el enlace para revisarla.
                No dice el tipo ni el motivo: pueden ser de salud, y el chat puede ser un grupo.
              </p>
            </div>
            <Interruptor encendido={novedades} onClick={toggleNovedades} disabled={!cargado} etiqueta="tg-novedades" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="tg-turnos-cerrados" className="font-medium text-ink text-sm mb-0.5">Turnos cerrados solos</p>
              <p className="text-sm text-muted">
                Cada mañana a las 7, si en la noche se cerró solo algún turno porque no marcaron la salida, llega la
                lista con la hora que se estimó, para revisarla.
              </p>
            </div>
            <Interruptor encendido={turnosCerrados} onClick={toggleTurnosCerrados} disabled={!cargado} etiqueta="tg-turnos-cerrados" />
          </div>

          {errorAviso && <p className="text-red-600 text-sm">No pudimos guardar el cambio. Intenta de nuevo.</p>}

          {algunAviso && cargado && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-muted space-y-1.5">
                <p className="font-semibold text-ink">Cómo conectar (fácil)</p>
                <p>1. En Telegram, busca <b>@HoraPro_bot</b> y presiona <b>Iniciar</b> (o agrégalo a un grupo del equipo).</p>
                <p>2. Escribe <b><code>/id</code></b>. El bot te responde el <b>ID del chat</b>.</p>
                <p>3. Pega ese ID abajo, <b>Guarda</b> y presiona <b>Enviar prueba</b>.</p>
              </div>

              <label htmlFor="tg-chat" className="block text-xs font-medium text-muted mb-1">ID del chat de Telegram</label>
              <input id="tg-chat" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Ej: -1001234567890"
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

function Interruptor({ encendido, onClick, disabled, etiqueta }: { encendido: boolean; onClick: () => void; disabled: boolean; etiqueta: string }) {
  return (
    <button onClick={onClick} disabled={disabled} role="switch" aria-checked={encendido} aria-labelledby={etiqueta}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${encendido ? 'bg-primary' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${encendido ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
