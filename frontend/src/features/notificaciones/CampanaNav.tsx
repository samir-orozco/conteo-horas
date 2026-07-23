import { useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import PanelNotificaciones from './PanelNotificaciones';
import type { NotifState } from './useNotificaciones';

// Ítem del menú (bajo Inicio) con la campana + contador. No navega: abre el panel,
// que emerge desde este mismo botón (le pasamos su posición en pantalla).
export default function CampanaNav({ notif, onNav }: { notif: NotifState; onNav?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const abrir = () => {
    if (btnRef.current) setAncla(btnRef.current.getBoundingClientRect());
    setAbierto(true);
    onNav?.();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={abrir}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-gray-100 hover:text-ink transition-colors"
      >
        <span className="relative">
          <Bell size={18} />
          {notif.noLeidas > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {notif.noLeidas > 9 ? '9+' : notif.noLeidas}
            </span>
          )}
        </span>
        Notificaciones
      </button>
      {abierto && <PanelNotificaciones notif={notif} ancla={ancla} onClose={() => setAbierto(false)} />}
    </>
  );
}
