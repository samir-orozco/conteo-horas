import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

// EL MENÚ DE LOS TRES PUNTOS.
//
// Existe para que una fila de tabla lleve dos íconos y no cuatro: el de ver, que
// es lo que se hace casi siempre, y este, que guarda lo que se hace poco y lo que
// es peligroso. Borrar no debería estar a un clic accidental de distancia del
// ojo, que es el botón que más se toca.
//
// POR QUÉ SE PINTA EN UN PORTAL. Las tablas del producto viven dentro de un
// contenedor con desplazamiento horizontal, y un menú absoluto dentro de él se
// corta en las últimas filas: se ve media opción de «Eliminar». Pintado en el
// `body` con posición fija no lo corta nada. El precio es que no sigue al botón
// si la página se desplaza, así que se cierra al desplazar o redimensionar.
//
// Y LOS CLICS NO SE ESCAPAN A LA FILA. En esta tabla tocar la fila abre el
// detalle. Un portal saca el menú del DOM de la fila, pero React sigue burbujeando
// sus eventos por el árbol de componentes, así que sin detenerlos, elegir
// «Editar» abriría además el detalle por debajo.

export type Accion = {
  clave: string;
  texto: string;
  icono?: ReactNode;
  // Rojo. Para lo que no se puede deshacer.
  peligro?: boolean;
  onElegir: () => void;
};

const ANCHO_MENU = 176;
const ALTO_OPCION = 40;

export default function MenuAcciones({ acciones, etiqueta = 'Más acciones' }: {
  acciones: Accion[];
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // La posición se calcula AL ABRIR, en el manejador del clic, y no en un efecto:
  // es un dato del gesto, no algo que haya que sincronizar después de pintar.
  const abrir = () => {
    const r = boton.current?.getBoundingClientRect();
    if (r) {
      const alto = acciones.length * ALTO_OPCION + 12;
      const abajo = r.bottom + 6;
      // Si no cabe hacia abajo (última fila, pegada al borde), se abre hacia arriba.
      const top = abajo + alto <= window.innerHeight ? abajo : Math.max(8, r.top - 6 - alto);
      const left = Math.max(8, Math.min(r.right - ANCHO_MENU, window.innerWidth - ANCHO_MENU - 8));
      setPos({ top, left });
    }
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const cerrar = () => setAbierto(false);
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    // Fuera es fuera, llegue como llegue: con el mouse o con el teclado. Activar
    // un botón con Enter no produce mousedown, así que mirando solo el mouse,
    // abrir con el teclado el menú de otra fila dejaba los dos abiertos.
    const siEsFuera = (e: Event) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || boton.current?.contains(t)) return;
      setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    document.addEventListener('mousedown', siEsFuera);
    document.addEventListener('focusin', siEsFuera);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.removeEventListener('mousedown', siEsFuera);
      document.removeEventListener('focusin', siEsFuera);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        title={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={e => { e.stopPropagation(); if (abierto) setAbierto(false); else abrir(); }}
        className={`p-1.5 rounded text-gray-500 hover:bg-gray-100 ${abierto ? 'bg-gray-100 text-ink' : ''}`}
      >
        <MoreHorizontal size={15} />
      </button>
      {abierto && createPortal(
        <div
          ref={menu}
          role="menu"
          aria-label={etiqueta}
          onClick={e => e.stopPropagation()}
          style={{ top: pos.top, left: pos.left, width: ANCHO_MENU }}
          className="fixed z-[60] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
        >
          {acciones.map(a => (
            <button
              key={a.clave}
              type="button"
              role="menuitem"
              onClick={() => { setAbierto(false); a.onElegir(); }}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium ${
                a.peligro ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-gray-50'}`}
            >
              {a.icono}
              {a.texto}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
