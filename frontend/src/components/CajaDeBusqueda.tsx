import { Search, X } from 'lucide-react';

// La caja de búsqueda de una lista de personas (4 de octubre de 2026).
//
// Está aquí y no dentro de una pantalla porque la usan Colaboradores y Revisión
// de marcaciones, y dos cajas que se ven y se comportan distinto en la misma
// aplicación se notan. El criterio de qué coincide es aparte, en
// `lib/busqueda.ts`.
//
// El rótulo va en `aria-label` además del `placeholder`: un placeholder
// desaparece al escribir, así que por sí solo no nombra el campo.

export default function CajaDeBusqueda({
  valor, onCambiar, rotulo, className,
}: { valor: string; onCambiar: (v: string) => void; rotulo: string; className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        type="text" value={valor} aria-label={rotulo} placeholder={rotulo}
        onChange={ev => onCambiar(ev.target.value)}
        className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {/* Borrar con un toque: en una lista filtrada, volver a verla entera es lo
          siguiente que se quiere hacer, y seleccionar y borrar a mano cuesta más
          de lo que parece en un portátil. */}
      {valor !== '' && (
        <button type="button" onClick={() => onCambiar('')} aria-label="Borrar la búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted hover:text-ink hover:bg-gray-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
