import { UtensilsCrossed, Coffee, LogOut } from 'lucide-react';

type Ventana = { inicio: string; fin: string };
type Props = {
  // Cada pausa llega solo si hoy se puede tomar: con ventana y sin marcar todavía.
  almuerzo: Ventana | null;
  descanso: Ventana | null;
  onAlmuerzo: () => void;
  onDescanso: () => void;
  onFinJornada: () => void;
  onCancelar: () => void;
};

// Al salir, cuando el día tiene una pausa con ventana que todavía no se marcó
// —almuerzo, descanso no remunerado o las dos—, hay varias salidas posibles y el
// sistema no puede adivinar cuál es. Se pregunta.
//
// Preguntar no es un trámite de más: es la única forma de que el día quede bien
// partido. Si una pausa se guardara como fin de jornada, la vuelta abriría un
// turno nuevo y el día terminaría contando dos jornadas. Y si se guardara como
// la OTRA pausa, se descontaría como no pagada una hora que sí se paga, o al revés.
export default function ElegirTipoDeSalida({ almuerzo, descanso, onAlmuerzo, onDescanso, onFinJornada, onCancelar }: Props) {
  return (
    <div className="fixed inset-0 !mt-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancelar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-ink shadow-2xl p-8 text-center"
      >
        <h2 className="text-xl font-bold text-white">¿Qué salida vas a marcar?</h2>

        {almuerzo && (
          <>
            <button
              onClick={onAlmuerzo}
              className="w-full mt-6 flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-ink font-bold py-4 rounded-2xl text-base transition-colors"
            >
              <UtensilsCrossed size={20} /> Salgo a almorzar
            </button>
            <p className="text-xs text-white/40 mt-2">
              Tu almuerzo va de <b className="text-white/70">{almuerzo.inicio}</b> a <b className="text-white/70">{almuerzo.fin}</b>.
              Vuelves y marcas tu regreso.
            </p>
          </>
        )}

        {descanso && (
          <>
            <button
              onClick={onDescanso}
              className={`w-full ${almuerzo ? 'mt-4' : 'mt-6'} flex items-center justify-center gap-3 bg-sky-400 hover:bg-sky-300 text-ink font-bold py-4 rounded-2xl text-base transition-colors`}
            >
              <Coffee size={20} /> Salgo a mi descanso
            </button>
            <p className="text-xs text-white/40 mt-2">
              Tu descanso va de <b className="text-white/70">{descanso.inicio}</b> a <b className="text-white/70">{descanso.fin}</b>.
              Vuelves y marcas tu regreso.
            </p>
          </>
        )}

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
