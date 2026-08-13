import { X, Download } from 'lucide-react';
import ModalShell from './ModalShell';
import type { Evidencia } from '../types';

// Visor de una evidencia (imagen inline o PDF embebido) con descarga.
export default function VisorEvidencia({ evidencia, onClose }: { evidencia: Evidencia; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} backdrop="bg-black/70" zIndex="z-[60]" inner="rounded-2xl p-4 w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm font-semibold text-ink truncate">{evidencia.nombre || 'Evidencia'}</p>
        <div className="flex items-center gap-1">
          <a href={evidencia.data} download={evidencia.nombre || 'evidencia'} title="Descargar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Download size={18} /></a>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
      </div>
      {evidencia.tipo === 'application/pdf' ? (
        <iframe src={evidencia.data} title="Evidencia PDF" className="w-full flex-1 min-h-[60vh] rounded-lg border border-gray-200" />
      ) : (
        <img src={evidencia.data} alt="Evidencia" className="w-full object-contain rounded-lg max-h-[75vh]" />
      )}
    </ModalShell>
  );
}
