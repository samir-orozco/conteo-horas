import { useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';

export type GrupoFiltro = {
  clave: string;
  titulo: string;
  opciones: { valor: string; texto: string }[];
};

export type Seleccion = Record<string, string[]>;

// Menú de filtros por casillas, agrupadas.
//
// Vive aquí y no dentro de una pantalla porque lo usan los registros y la lista
// de colaboradores. Es el mismo gesto en los dos sitios: marcar lo que se
// quiere ver. Tenerlo dos veces significaba que arreglarle algo a uno dejaba el
// otro atrás.
export default function MenuFiltros({ grupos, seleccion, onCambiar }: {
  grupos: GrupoFiltro[];
  seleccion: Seleccion;
  onCambiar: (nueva: Seleccion) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  // Un grupo sin opciones no se pinta: un título suelto no dice nada. Pasa con
  // "Sede" en una empresa que solo tiene una oficina.
  const conOpciones = grupos.filter(g => g.opciones.length > 0);
  const cuantos = Object.values(seleccion).reduce((n, v) => n + v.length, 0);

  const alternar = (clave: string, valor: string) => {
    const actual = seleccion[clave] ?? [];
    onCambiar({
      ...seleccion,
      [clave]: actual.includes(valor) ? actual.filter(v => v !== valor) : [...actual, valor],
    });
  };

  return (
    <div className="relative">
      {/* El contador dice que hay un filtro puesto sin tener que abrir el menú:
          una tabla filtrada que parece completa hace sacar conclusiones sobre
          datos que no están. */}
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        aria-expanded={abierto}
        className={`relative flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          cuantos > 0 ? 'border-primary bg-primary/10 text-ink' : 'border-gray-300 text-ink hover:bg-gray-50'}`}>
        <SlidersHorizontal size={15} />
        Filtros
        {cuantos > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
            {cuantos}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <button type="button" aria-label="Cerrar los filtros" tabIndex={-1}
            onClick={() => setAbierto(false)} className="fixed inset-0 !mt-0 z-30 cursor-default" />
          <div className="absolute top-full mt-1 left-0 z-40 w-60 max-h-[60dvh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 py-1.5">
            {conOpciones.map((g, i) => (
              <div key={g.clave} className={i > 0 ? 'mt-1.5 pt-1.5 border-t border-gray-100' : ''}>
                <p className="px-3.5 pb-1.5 text-xs font-semibold text-muted">{g.titulo}</p>
                {g.opciones.map(op => {
                  const activo = (seleccion[g.clave] ?? []).includes(op.valor);
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => alternar(g.clave, op.valor)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                        activo ? 'bg-green-50 text-green-700 font-semibold' : 'text-ink hover:bg-gray-50'}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        activo ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                        {activo && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 truncate">{op.texto}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {cuantos > 0 && (
              <button type="button"
                onClick={() => { onCambiar({}); setAbierto(false); }}
                className="w-full mt-1.5 pt-2 border-t border-gray-100 px-3.5 pb-1 text-sm font-semibold text-red-500 hover:text-red-600 text-left">
                Limpiar filtros
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
