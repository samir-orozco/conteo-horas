import { UtensilsCrossed, Clock } from 'lucide-react';
import { horaBog } from '../helpers';

type Props = {
  salida: string;    // cuándo salió a su descanso
  sugerido: string;  // fin de su horario de descanso
  ahora: Date;
  onConfirmar: (regresoA?: string) => void;
  onCancelar: () => void;
  marcando: boolean;
};

// Salió a su descanso y se le olvidó marcar el regreso. Lo notamos porque está
// marcando mucho después de que ese descanso terminó.
//
// Se le pregunta a ELLA, que es la única que lo sabe. El sistema no puede
// deducirlo: quien volvió y no marcó deja exactamente el mismo rastro que quien
// se fue para la casa. Y si nadie lo corrige, esa tarde no se cuenta ni se paga.
export default function RegresoOlvidado({ salida, sugerido, ahora, onConfirmar, onCancelar, marcando }: Props) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="bg-amber-400/90 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
          <UtensilsCrossed size={26} className="text-ink" />
        </div>
        <h2 className="text-lg font-bold text-white">No marcaste tu regreso</h2>
        <p className="text-sm text-white/60 mt-2 mb-6 leading-relaxed">
          Saliste a tu descanso a las <b className="text-white/90">{horaBog(salida, 'HH:mm')}</b> y
          no marcaste cuando volviste. <b className="text-white/90">¿A qué hora regresaste?</b>
        </p>

        <button onClick={() => onConfirmar(sugerido)} disabled={marcando}
          className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-ink font-bold py-4 rounded-2xl text-base disabled:opacity-60 transition-colors">
          <Clock size={20} /> A las {horaBog(sugerido, 'HH:mm')}
        </button>
        <p className="text-xs text-white/40 mt-2">Es la hora en que terminaba tu descanso</p>

        <button onClick={() => onConfirmar()} disabled={marcando}
          className="w-full mt-5 flex items-center justify-center gap-3 border border-white/15 hover:bg-white/5 text-white font-semibold py-3.5 rounded-2xl text-base disabled:opacity-60 transition-colors">
          Estoy volviendo ahora ({horaBog(ahora)})
        </button>

        <button onClick={onCancelar} disabled={marcando} className="mt-4 text-sm text-white/40 hover:text-white/70">
          Cancelar
        </button>
      </div>
    </div>
  );
}
