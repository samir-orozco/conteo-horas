import { FileText, Image as ImageIcon, File } from 'lucide-react';
import { claseDeArchivo } from '../lib/archivos';

// El iconito que dice de qué es un adjunto.
//
// Estaba escrito seis veces como `tipo === 'application/pdf' ? PDF : imagen`,
// y ese `else` es el que hace que un .docx aparezca con cara de foto.
export default function IconoDeAdjunto({ tipo, size = 16 }: { tipo?: string | null; size?: number }) {
  switch (claseDeArchivo(tipo)) {
    case 'pdf': return <FileText size={size} className="text-red-500" />;
    case 'word': return <FileText size={size} className="text-blue-600" />;
    case 'imagen': return <ImageIcon size={size} className="text-primary-dark" />;
    default: return <File size={size} className="text-gray-400" />;
  }
}
