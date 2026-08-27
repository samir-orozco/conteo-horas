import { useEffect, useRef } from 'react';
import { TABS, type ClaveTab } from './tabs';

export type Contadores = Partial<Record<ClaveTab, number>>;

// Barra de tabs de la ficha del colaborador.
//
// Usa los roles de accesibilidad de verdad (tablist, tab, aria-selected) y no
// una fila de botones que se ven como tabs: quien navega con teclado o con
// lector de pantalla necesita saber que esto es un grupo y cuál está abierto.
export default function TabsFicha({ activo, onCambiar, contadores }: {
  activo: ClaveTab;
  onCambiar: (t: ClaveTab) => void;
  contadores: Contadores;
}) {
  const activoRef = useRef<HTMLButtonElement>(null);

  // En una pantalla angosta los cinco tabs no caben y la barra se desplaza.
  // Sin esto se aterriza en un enlace directo a "Historia" viendo "Resumen" a
  // la izquierda y el tab abierto fuera de la pantalla.
  //
  // Depende también de los contadores: llegan con los datos, después del primer
  // pintado, y ensanchan la barra justo lo que falta para cortar el último tab.
  // Se comparan por valor porque el objeto se recrea en cada render.
  const anchos = TABS.map(t => contadores[t.clave] ?? '').join(',');
  useEffect(() => {
    activoRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activo, anchos]);

  return (
    <div role="tablist" aria-label="Secciones del colaborador"
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
      {TABS.map(t => {
        const esActivo = t.clave === activo;
        const n = contadores[t.clave];
        return (
          <button
            key={t.clave}
            ref={esActivo ? activoRef : undefined}
            role="tab"
            type="button"
            aria-selected={esActivo}
            onClick={() => onCambiar(t.clave)}
            className={`relative shrink-0 px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-semibold border-b-2 transition-colors ${
              esActivo
                ? 'border-ink text-ink'
                : 'border-transparent text-muted hover:text-ink hover:border-gray-300'
            }`}
          >
            {t.etiqueta}
            {/* Un cero al lado del nombre se lee como un error, no como
                "ninguno". Y sin dato todavía no se sabe, así que tampoco. */}
            {typeof n === 'number' && n > 0 && (
              <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                esActivo ? 'bg-primary text-ink' : 'bg-gray-100 text-muted'}`}>
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
