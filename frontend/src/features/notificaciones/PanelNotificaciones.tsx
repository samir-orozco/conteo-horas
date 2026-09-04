import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, AlarmClock, Clock, CalendarOff, Bell, X } from 'lucide-react';
import { rutaDeNotificacion } from './ruta';
import type { Notificacion } from './types';
import type { NotifState } from './useNotificaciones';

const ICONO: Record<string, typeof Bell> = {
  NO_MARCO_SALIDA: AlarmClock,
  LLEGADA_TARDE: Clock,
  NOVEDAD_PENDIENTE: CalendarOff,
};

// Dropdown compacto anclado al botón de la campana (emerge desde él).
export default function PanelNotificaciones({ notif, ancla, onClose }: {
  notif: NotifState; ancla: DOMRect | null; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'todas' | 'noleidas'>('todas');
  const { items, noLeidas, marcarLeida, marcarTodas } = notif;

  const abrir = (n: Notificacion) => {
    if (!n.leida) marcarLeida(n.id);
    // A dónde lleva cada aviso es una regla, y vive probada en ruta.ts. Los de
    // contrato abren la ficha directo en el tab de contratos.
    const destino = rutaDeNotificacion(n);
    if (destino) navigate(destino);
    onClose();
  };

  const visibles = tab === 'noleidas' ? items.filter(n => !n.leida) : items;

  // Posición: en escritorio, a la derecha del botón y a su misma altura; en móvil,
  // una hoja anclada arriba con márgenes. `dvh` para no desbordar en móvil.
  //
  // En móvil NO ocupa toda la altura: se queda en el 65% de la pantalla. Antes
  // llegaba casi de borde a borde y no dejaba nada afuera que tocar para cerrarlo
  // —el único gesto de cierre era justamente tocar afuera—, así que quedaba
  // atrapando al usuario. Ahora se ve la página debajo, se entiende que es un
  // panel encima, y además hay una X.
  const esMovil = typeof window !== 'undefined' && window.innerWidth < 768;
  const top = ancla ? ancla.top : 80;
  const estilo: CSSProperties = esMovil
    ? { top: 64, left: 12, right: 12, maxHeight: '65dvh' }
    : { top, left: (ancla ? ancla.right : 256) + 10, width: 380, maxHeight: `calc(100dvh - ${top}px - 16px)` };

  // Portal a document.body: el botón que lo abre vive dentro del <aside> del
  // sidebar, que es `position: sticky` y por eso crea su propio contexto de
  // apilamiento en CSS — ningún z-index interno puede escapar de ahí para
  // quedar por encima del contenido de <main> (tarjetas del inicio, calendario
  // de festivos, etc). Montarlo en el body evita el problema de raíz.
  return createPortal(
    <>
      {/* Captura de clics fuera para cerrar (sin oscurecer: es un menú).
          z-index muy alto: debe quedar por encima de TODO (toasts, bloqueo por mora, etc). */}
      <div className="fixed inset-0 !mt-0 z-[200]" onClick={onClose} />

      <div
        style={estilo}
        className="fixed z-[201] bg-white rounded-2xl shadow-2xl border border-gray-200/70 flex flex-col overflow-hidden hp-notif-pop"
      >
        {/* Encabezado con pestañas Todas / No leídas */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-gray-100">
          <h2 className="font-bold text-[15px] text-ink">Notificaciones</h2>
          <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
            {(['todas', 'noleidas'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  tab === t ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'todas' ? 'Todas' : 'No leídas'}
              </button>
            ))}
          </div>
          {/* Cierre explícito. Tocar afuera sigue funcionando, pero en un celular
              "afuera" es una franja de doce píxeles: no es un gesto que se pueda
              pedir. */}
          <button onClick={onClose} aria-label="Cerrar notificaciones"
            className="p-1.5 -mr-1 rounded-full text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {visibles.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted">
              <Bell size={26} className="mx-auto mb-2 text-gray-300" />
              {tab === 'noleidas' ? 'No tienes notificaciones sin leer.' : 'No tienes notificaciones.'}
            </div>
          ) : (
            visibles.map(n => {
              const Icon = ICONO[n.tipo] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className="w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.leida ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600'}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] leading-snug ${n.leida ? 'text-ink' : 'font-semibold text-ink'}`}>{n.titulo}</p>
                    {n.cuerpo && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.cuerpo}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}</p>
                  </div>
                  {/* Punto de "no leída": centrado verticalmente en la fila, al borde derecho */}
                  {!n.leida && <span className="shrink-0 self-center w-2.5 h-2.5 rounded-full bg-green-500" />}
                </button>
              );
            })
          )}
        </div>

        {/* Pie: marcar todas como leídas */}
        {noLeidas > 0 && (
          <button
            onClick={marcarTodas}
            className="border-t border-gray-100 px-4 py-2.5 text-xs font-medium text-primary-dark hover:bg-gray-50 flex items-center justify-center gap-1.5"
          >
            <CheckCheck size={14} /> Marcar todas como leídas
          </button>
        )}
      </div>
    </>,
    document.body
  );
}
