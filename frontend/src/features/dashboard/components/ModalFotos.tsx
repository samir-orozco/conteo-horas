import { Camera, X } from 'lucide-react';
import ModalShell from './ModalShell';
import FotosJornada from '../../../components/FotosJornada';
import { fmtHora } from '../helpers';
import type { Salida } from '../types';

// Fotos de verificación facial del día de esa salida.
//
// Antes pedía el par de fotos de UNA marcación y las rotulaba "Entrada" y
// "Salida" a ciegas. En un día con almuerzo eso mentía dos veces: la "entrada"
// del tramo de la tarde es en realidad el regreso del descanso.
export default function ModalFotos({ salida, onClose }: { salida: Salida; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} inner="rounded-2xl p-6 w-full max-w-lg">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-lg text-ink flex items-center gap-2"><Camera size={18} /> Verificación facial</h3>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <p className="text-sm text-muted mb-4">{salida.nombre} · salida {fmtHora(salida.salida)}</p>
      <FotosJornada registroId={salida.registroId} />
    </ModalShell>
  );
}
