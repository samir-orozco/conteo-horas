import { LogIn, LogOut } from 'lucide-react';
import { TIPO_PERMISO_LABEL } from '../../ColaboradorDetalle';
import { textosDelMotivo, type CasoMotivo } from '../motivoDeMarca';

type Props = {
  caso: CasoMotivo;
  novedadTipo: string;
  setNovedadTipo: (v: string) => void;
  novedadDesc: string;
  setNovedadDesc: (v: string) => void;
  onConfirmar: () => void;
  onVolver: () => void;
  enviando: boolean;
};

// Un icono por caso, con el tipo exhaustivo: un tercer motivo no compila hasta
// que alguien decida el suyo.
const ICONO: Record<CasoMotivo, typeof LogIn> = {
  SALIDA_TEMPRANA: LogOut,
  LLEGADA_TARDE: LogIn,
};

// El motivo se pide ANTES de marcar nada: al salir antes de hora y al llegar tarde.
//
// Antes, en la salida, se guardaba la marca y después se pedía el motivo con un
// "Omitir" al lado: irse temprano sin decir por qué salía gratis. Y con la marca
// ya escrita, quien se equivocaba de botón no tenía cómo volver atrás. La llegada
// tarde sigue la misma regla: sin motivo no se registra la entrada.
export default function PantallaMotivo({ caso, novedadTipo, setNovedadTipo, novedadDesc, setNovedadDesc, onConfirmar, onVolver, enviando }: Props) {
  const textos = textosDelMotivo(caso);
  const Icono = ICONO[caso];
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="bg-amber-400/90 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
          <Icono size={26} className="text-ink" />
        </div>
        <h2 className="text-lg font-bold text-white">{textos.titulo}</h2>
        <p className="text-sm text-white/50 mt-1 mb-5">{textos.texto}</p>

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
              placeholder={textos.placeholder}
              className="hp-input-dark w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm resize-none" />
          </div>
        </div>

        <button onClick={onConfirmar} disabled={enviando}
          className="w-full mt-5 bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl text-base disabled:opacity-60 transition-colors">
          {enviando ? 'Registrando...' : textos.boton}
        </button>
        {/* Volver atrás, no omitir: nada se ha guardado todavía, así que quien se
            equivocó de botón sale de aquí sin haber marcado. */}
        <button onClick={onVolver} disabled={enviando}
          className="w-full mt-2 text-white/50 hover:text-white/80 text-sm font-medium py-1">
          Volver atrás
        </button>
      </div>
    </div>
  );
}
