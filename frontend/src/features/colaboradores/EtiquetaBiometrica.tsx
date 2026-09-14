import { ScanFace } from 'lucide-react';
import { estadoBiometrico, ETIQUETA_BIOMETRICA } from './biometria';

// La etiqueta del registro facial, la misma en la ficha y en la tabla de colaboradores
// (14 de septiembre de 2026). Sin registro no pinta nada.
const TONO = {
  verde: 'bg-green-100 text-green-800',
  gris: 'bg-gray-200 text-gray-700',
} as const;

export default function EtiquetaBiometrica({ col }: { col: { rostroEnroladoEn?: string | null; rostroRechazadoEn?: string | null } }) {
  const etiqueta = ETIQUETA_BIOMETRICA[estadoBiometrico(col)];
  if (!etiqueta) return null;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TONO[etiqueta.tono]}`}>
      <ScanFace size={11} aria-hidden="true" />{etiqueta.texto}
    </span>
  );
}
