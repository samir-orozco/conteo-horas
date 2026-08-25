import { X, Download } from 'lucide-react';

export type DocumentoVisto = { data: string; tipo?: string | null; nombre?: string | null };

// Visor de un adjunto en base64: PDF en un iframe, imagen tal cual, y siempre
// con la opción de descargarlo.
//
// Vivía dentro de la ficha del colaborador para las evidencias de las novedades.
// Se sacó aquí al aparecer los contratos y sus prórrogas, que necesitan lo mismo:
// tres copias del mismo modal habrían terminado divergiendo.
export default function VisorDocumento({ doc, onCerrar }: { doc: DocumentoVisto; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 !mt-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onCerrar}>
      <div className="hp-pop bg-white rounded-2xl p-4 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm font-semibold text-ink truncate">{doc.nombre || 'Documento'}</p>
          <div className="flex items-center gap-1">
            <a href={doc.data} download={doc.nombre || 'documento'} title="Descargar"
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Download size={18} /></a>
            <button onClick={onCerrar} title="Cerrar"
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>
        {doc.tipo === 'application/pdf' ? (
          <iframe src={doc.data} title={doc.nombre || 'Documento'}
            className="w-full flex-1 min-h-[60vh] rounded-lg border border-gray-200" />
        ) : (
          <img src={doc.data} alt={doc.nombre || 'Documento'} className="w-full object-contain rounded-lg max-h-[75vh]" />
        )}
      </div>
    </div>
  );
}
