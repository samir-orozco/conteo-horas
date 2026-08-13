import { Check, RotateCcw } from 'lucide-react';
import type { PasoEnrolar } from './rostroCliente';

// Preview del enrolamiento: revisa las tomas y acepta o repite.
export default function PreviewEnrolamiento({ tomas, pasos, onAceptar, onRepetir }: {
  tomas: string[]; pasos: PasoEnrolar[]; onAceptar: () => void; onRepetir: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm font-medium text-ink text-center">Revisa las tomas de tu rostro</p>
      <div className="flex flex-wrap justify-center gap-2">
        {tomas.map((f, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <img src={f} alt={pasos[i]?.etiqueta ?? `Toma ${i + 1}`}
              className="w-20 h-20 object-cover rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
            <span className="text-[11px] text-muted">{pasos[i]?.etiqueta ?? `Toma ${i + 1}`}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 w-full max-w-md">
        <button onClick={onRepetir}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <RotateCcw size={15} /> Repetir
        </button>
        <button onClick={onAceptar}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
          <Check size={16} /> Aceptar y guardar
        </button>
      </div>
    </div>
  );
}
