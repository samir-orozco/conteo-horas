import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

// Alerta emergente en la esquina inferior derecha (auto-desaparece)
export default function Toast({ mensaje, onClose }: { mensaje: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [mensaje, onClose]);

  if (!mensaje) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[80] hp-pop">
      <div className="bg-ink text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2.5 text-sm font-medium">
        <CheckCircle size={17} className="text-primary" /> {mensaje}
      </div>
    </div>
  );
}
