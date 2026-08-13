import { UtensilsCrossed, LogOut } from 'lucide-react';

type Props = {
  ventana: { inicio: string; fin: string };
  onAlmuerzo: () => void;
  onFinJornada: () => void;
  onCancelar: () => void;
};

// Al salir, cuando el día tiene ventana de almuerzo y todavía no se marcó, hay
// dos salidas posibles y el sistema no puede adivinar cuál es. Se pregunta.
//
// Preguntar no es un trámite de más: es la única forma de que el día quede bien
// partido. Si un almuerzo se guardara como fin de jornada, la vuelta abriría un
// turno nuevo y el día terminaría contando dos jornadas.
export default function ElegirTipoDeSalida({ ventana, onAlmuerzo, onFinJornada, onCancelar }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancelar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-ink shadow-2xl p-8 text-center"
      >
        <h2 className="text-xl font-bold text-white">¿Qué salida vas a marcar?</h2>
        <p className="text-sm text-white/60 mt-2 leading-relaxed">
          Tu almuerzo va de <b className="text-white/90">{ventana.inicio}</b> a{' '}
          <b className="text-white/90">{ventana.fin}</b>.
        </p>

        <button
          onClick={onAlmuerzo}
          className="w-full mt-6 flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-ink font-bold py-4 rounded-2xl text-base transition-colors"
        >
          <UtensilsCrossed size={20} /> Salgo a almorzar
        </button>
        <p className="text-xs text-white/40 mt-2">Vuelves y marcas tu regreso</p>

        <button
          onClick={onFinJornada}
          className="w-full mt-5 flex items-center justify-center gap-3 border border-white/15 hover:bg-white/5 text-white font-semibold py-3.5 rounded-2xl text-base transition-colors"
        >
          <LogOut size={18} /> Termino mi jornada
        </button>

        <button onClick={onCancelar} className="mt-4 text-sm text-white/40 hover:text-white/70">
          Cancelar
        </button>
      </div>
    </div>
  );
}
