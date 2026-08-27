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
  return (
    <div role="tablist" aria-label="Secciones del colaborador"
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
      {TABS.map(t => {
        const esActivo = t.clave === activo;
        const n = contadores[t.clave];
        return (
          <button
            key={t.clave}
            role="tab"
            type="button"
            aria-selected={esActivo}
            onClick={() => onCambiar(t.clave)}
            className={`relative shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
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
