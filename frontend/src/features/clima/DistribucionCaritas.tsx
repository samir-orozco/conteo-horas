import type { ResumenClima } from './tipos';
import { IMAGEN_DE_CARITA } from './caritas';
import { NOMBRE_DE_CARITA } from './ventanaClima';
import { COLOR_DE_CARITA } from './panelClima';

// Cuántas veces se escogió cada carita. La carita y su nombre van debajo de cada barra: el color ayuda,
// pero nunca es lo único que dice cuál es (ver la nota de COLOR_DE_CARITA).
export default function DistribucionCaritas({ distribucion, total }: { distribucion: ResumenClima['distribucion']; total: number }) {
  const max = Math.max(1, ...Object.values(distribucion));
  return (
    <div role="group" aria-label="Cómo se sintieron" className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink">Cómo se sintieron</p>
      <p className="text-xs text-muted mb-3">Cuántas veces se escogió cada carita</p>
      <div className="flex items-end justify-around gap-2 h-40">
        {([1, 2, 3, 4, 5] as const).map(n => {
          const cantidad = distribucion[n];
          const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
          return (
            <div key={n} className="flex-1 h-full flex flex-col items-center justify-end" title={`${NOMBRE_DE_CARITA[n]}: ${cantidad} (${pct} %)`}>
              <span className="text-sm font-semibold text-ink tabular-nums mb-1">{cantidad}</span>
              <div className="w-6 rounded-t" style={{ height: `${Math.max(cantidad > 0 ? 4 : 2, (cantidad / max) * 100)}%`, background: cantidad > 0 ? COLOR_DE_CARITA[n] : '#ececea' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-around gap-2 mt-2 border-t border-gray-100 pt-2">
        {([1, 2, 3, 4, 5] as const).map(n => (
          <div key={n} className="flex-1 flex flex-col items-center">
            <img src={IMAGEN_DE_CARITA[n]} alt="" className="w-7 h-7" />
            <span className="text-[11px] text-muted mt-1 text-center leading-tight">{NOMBRE_DE_CARITA[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
