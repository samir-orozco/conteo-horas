import { useEffect, useState } from 'react';
import { Camera, X, Info } from 'lucide-react';
import ModalShell from './ModalShell';
import { getFotos } from '../api';
import { fmtHora } from '../helpers';
import type { Salida } from '../types';

// Fotos de verificación facial de una salida (entrada y salida).
export default function ModalFotos({ salida, onClose }: { salida: Salida; onClose: () => void }) {
  const [fotos, setFotos] = useState<{ fotoEntrada: string | null; fotoSalida: string | null } | null>(null);

  useEffect(() => { getFotos(salida.registroId).then(setFotos); }, [salida.registroId]);

  return (
    <ModalShell onClose={onClose} inner="rounded-2xl p-6 w-full max-w-lg">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-lg text-ink flex items-center gap-2"><Camera size={18} /> Verificación facial</h3>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <p className="text-sm text-muted mb-4">{salida.nombre} · salida {fmtHora(salida.salida)}</p>
      {!fotos ? (
        <p className="text-sm text-muted py-8 text-center">Cargando fotos...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[{ foto: fotos.fotoEntrada, label: 'Entrada', hora: fmtHora(salida.entrada) },
            { foto: fotos.fotoSalida, label: 'Salida', hora: fmtHora(salida.salida) }].map(({ foto, label, hora }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted uppercase mb-1.5">{label} · {hora}</p>
              {foto ? (
                <img src={foto} alt={`Foto de ${label.toLowerCase()}`} className="w-full rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
              ) : (
                <div className="w-full aspect-[4/3] rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 text-center px-3">
                  Sin foto (marcó con cédula o fue registro manual)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted mt-4 flex items-center gap-1.5">
        <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
      </p>
    </ModalShell>
  );
}
