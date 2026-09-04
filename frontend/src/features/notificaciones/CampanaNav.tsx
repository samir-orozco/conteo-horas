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

  // `onNav` cierra el menú móvil, y el panel vive DENTRO de este componente, que
  // vive dentro de ese menú. Llamarlo al abrir desmontaba el panel en el mismo
  // instante en que se montaba: en el celular, tocar "Notificaciones" no hacía
  // nada visible. En escritorio no se notaba porque ahí `onNav` no existe.
  //
  // Se llama al CERRAR: el panel se abre sobre el menú (es un portal al body con
  // z-201, así que lo tapa), y cuando se cierra —o cuando navega a una
  // notificación— se lleva el menú con él.
  const abrir = () => {
    if (btnRef.current) setAncla(btnRef.current.getBoundingClientRect());
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
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
      {abierto && <PanelNotificaciones notif={notif} ancla={ancla} onClose={cerrar} />}
    </>
  );
}
