import type { ReactNode } from 'react';

// Backdrop + contenedor centrado reutilizable para los modales del dashboard.
// `inner` recibe las clases exactas del contenedor (ancho, padding, etc.).
export default function ModalShell({
  onClose, inner, backdrop = 'bg-black/50', zIndex = 'z-50', children,
}: {
  onClose: () => void; inner: string; backdrop?: string; zIndex?: string; children: ReactNode;
}) {
  return (
    <div className={`fixed inset-0 !mt-0 ${backdrop} flex items-center justify-center ${zIndex} p-4`} onClick={onClose}>
      <div className={`hp-pop bg-white shadow-xl ${inner}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
