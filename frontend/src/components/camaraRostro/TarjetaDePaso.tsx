import frenteConGafas from '../../assets/rostro/frente-con-gafas.svg';
import frenteSinGafas from '../../assets/rostro/frente-sin-gafas.svg';
import giraIzquierda from '../../assets/rostro/gira-izquierda.svg';
import giraDerecha from '../../assets/rostro/gira-derecha.svg';
import type { PasoGuiado, TarjetaPose } from './pasosEnrolar';

// La tarjeta del paso que toca en el registro facial guiado, debajo de la cámara (14 de septiembre de
// 2026). El dibujo muestra la pose como la persona se ve en la pantalla, que está espejada: su flecha
// apunta al mismo lado que la flecha que late sobre la cámara.
const DIBUJO: Record<TarjetaPose, { src: string; alt: string }> = {
  'frente-con-gafas': { src: frenteConGafas, alt: 'Dibujo de una persona de frente, con gafas' },
  'frente-sin-gafas': { src: frenteSinGafas, alt: 'Dibujo de una persona de frente, sin gafas' },
  'gira-izquierda': { src: giraIzquierda, alt: 'Dibujo de una persona que gira la cabeza hacia la flecha' },
  'gira-derecha': { src: giraDerecha, alt: 'Dibujo de una persona que gira la cabeza hacia la flecha' },
};

export default function TarjetaDePaso({ paso, numero, total }: { paso: PasoGuiado; numero: number; total: number }) {
  const dibujo = DIBUJO[paso.tarjeta];
  return (
    <div className="w-full max-w-md flex items-center gap-3 rounded-xl bg-gray-100 p-2 pr-3">
      <img src={dibujo.src} alt={dibujo.alt} width={96} height={108} className="w-24 h-[108px] shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Paso {numero} de {total}</p>
        <p className="text-sm font-semibold text-ink leading-snug">{paso.texto}</p>
      </div>
    </div>
  );
}
