import { LogOut } from 'lucide-react';
import { TIPO_PERMISO_LABEL } from '../../ColaboradorDetalle';

type Props = {
  novedadTipo: string;
  setNovedadTipo: (v: string) => void;
  novedadDesc: string;
  setNovedadDesc: (v: string) => void;
  enviarNovedadTemprana: () => void;
  onVolver: () => void;
  enviandoNovedad: boolean;
};

// Salida antes del horario: se pide el motivo ANTES de marcar nada.
//
// Antes se guardaba la salida y luego se pedía el motivo, con un "Omitir" al
// lado: irse temprano sin decir por qué salía gratis, que es justo lo que esta
// pantalla existe para evitar. Y con la salida ya escrita, quien se equivocaba de
// botón no tenía cómo volver atrás.
export default function PantallaSalidaTemprana({ novedadTipo, setNovedadTipo, novedadDesc, setNovedadDesc, enviarNovedadTemprana, onVolver, enviandoNovedad }: Props) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="bg-amber-400/90 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
          <LogOut size={26} className="text-ink" />
        </div>
        <h2 className="text-lg font-bold text-white">Salida antes del horario</h2>
        <p className="text-sm text-white/50 mt-1 mb-5">Cuéntanos por qué te vas antes. Tu salida se registra al confirmar.</p>

        <div className="text-left space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Motivo</label>
            <select value={novedadTipo} onChange={e => setNovedadTipo(e.target.value)}
              className="hp-input-dark w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm">
              {Object.entries(TIPO_PERMISO_LABEL).map(([k, v]) => <option key={k} value={k} className="text-ink">{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Descripción</label>
            <textarea value={novedadDesc} onChange={e => setNovedadDesc(e.target.value)} rows={3}
              placeholder="Describe el motivo de tu salida temprana..."
              className="hp-input-dark w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm resize-none" />
          </div>
        </div>

        <button onClick={enviarNovedadTemprana} disabled={enviandoNovedad}
          className="w-full mt-5 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl text-base disabled:opacity-60 transition-colors">
          {enviandoNovedad ? 'Registrando...' : 'Registrar mi salida'}
        </button>
        {/* Volver atrás, no omitir: nada se ha guardado todavía, así que quien se
            equivocó de botón sale de aquí sin haber cerrado su jornada. */}
        <button onClick={onVolver} disabled={enviandoNovedad}
          className="w-full mt-2 text-white/50 hover:text-white/80 text-sm font-medium py-1">
          Volver atrás
        </button>
      </div>
    </div>
  );
}
