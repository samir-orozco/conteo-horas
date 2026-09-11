import { UtensilsCrossed, Coffee, Clock, type LucideIcon } from 'lucide-react';
import { horaBog } from '../helpers';
import type { Pausa } from '../tipos';

type Props = {
  pausa: Pausa;      // de qué pausa está volviendo
  salida: string;    // cuándo salió a esa pausa
  sugerido: string;  // fin de la ventana de esa pausa
  ahora: Date;
  onConfirmar: (regresoA?: string) => void;
  onCancelar: () => void;
  marcando: boolean;
};

const DE_LA_PAUSA: Record<Pausa, { nombre: string; Icono: LucideIcon }> = {
  ALMUERZO: { nombre: 'almuerzo', Icono: UtensilsCrossed },
  DESCANSO: { nombre: 'descanso', Icono: Coffee },
};

// Salió a una pausa y se le olvidó marcar el regreso. Lo notamos porque está
// marcando mucho después de que esa pausa terminó.
//
// Se le pregunta a ELLA, que es la única que lo sabe. El sistema no puede
// deducirlo: quien volvió y no marcó deja exactamente el mismo rastro que quien
// se fue para la casa. Y si nadie lo corrige, esa tarde no se cuenta ni se paga.
export default function RegresoOlvidado({ pausa, salida, sugerido, ahora, onConfirmar, onCancelar, marcando }: Props) {
  const { nombre, Icono } = DE_LA_PAUSA[pausa];
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="bg-amber-400/90 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
          <Icono size={26} className="text-ink" />
        </div>
        <h2 className="text-lg font-bold text-white">No marcaste tu regreso</h2>
        <p className="text-sm text-white/60 mt-2 mb-6 leading-relaxed">
          Saliste a tu {nombre} a las <b className="text-white/90">{horaBog(salida, 'HH:mm')}</b> y
          no marcaste cuando volviste. <b className="text-white/90">¿A qué hora regresaste?</b>
        </p>

        <button onClick={() => onConfirmar(sugerido)} disabled={marcando}
          className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-ink font-bold py-4 rounded-2xl text-base disabled:opacity-60 transition-colors">
          <Clock size={20} /> A las {horaBog(sugerido, 'HH:mm')}
        </button>
        <p className="text-xs text-white/40 mt-2">Es la hora en que terminaba tu {nombre}</p>

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
