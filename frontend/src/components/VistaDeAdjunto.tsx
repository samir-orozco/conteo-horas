import { FileText, Download } from 'lucide-react';
import { claseDeArchivo, nombreParaDescargar, rotuloDeArchivo } from '../lib/archivos';

// El cuerpo de un visor de adjuntos: el PDF en un iframe, la foto en un <img>,
// y Word con lo único que se puede hacer con él, que es bajarlo.
//
// Existe porque el mismo `tipo === 'application/pdf' ? <iframe> : <img>` está
// escrito en tres sitios (VisorDocumento, VisorEvidencia y un modal a mano
// dentro de Reportes) y los tres cascarones son distintos, así que unificar los
// modales enteros sería un cambio mucho más grande. Lo que se comparte es la
// decisión, que es donde estaba el defecto: ese `else` daba por hecho que todo
// lo que no es PDF es una imagen, y un .docx caía ahí y se pintaba roto.
export default function VistaDeAdjunto(
  { data, tipo, nombre }: { data: string; tipo?: string | null; nombre?: string | null },
) {
  const clase = claseDeArchivo(tipo);

  if (clase === 'pdf') {
    return (
      <iframe src={data} title={nombre || 'Documento'}
        className="w-full flex-1 min-h-[60vh] rounded-lg border border-gray-200" />
    );
  }

  if (clase === 'imagen') {
    return (
      <img src={data} alt={nombre || 'Documento'}
        className="w-full object-contain rounded-lg max-h-[75vh]" />
    );
  }

  // Word y cualquier otra cosa. Un .docx no se puede previsualizar en un
  // iframe, así que la descarga no es un extra: es la única forma de abrirlo.
  return (
    <div className="flex-1 min-h-[40vh] flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
        <FileText size={26} className="text-blue-600" />
      </div>
      <p className="text-sm font-semibold text-ink">{nombre || 'Documento'}</p>
      <p className="text-xs text-muted max-w-xs">
        Los documentos de {rotuloDeArchivo(tipo)} no se pueden ver aquí. Descárgalo para abrirlo.
      </p>
      <a href={data} download={nombreParaDescargar(nombre, tipo ?? '')}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-ink hover:brightness-95">
        <Download size={16} /> Descargar
      </a>
    </div>
  );
}
