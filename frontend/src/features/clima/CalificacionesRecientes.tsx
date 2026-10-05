import type { ResumenClima } from './tipos';
import { IMAGEN_DE_CARITA } from './caritas';
import { NOMBRE_DE_CARITA } from './ventanaClima';
import { fechaCortaSinAnio } from './panelClima';

// Las últimas calificaciones del período, CON nombre (decisión del dueño): la carita, los motivos y la
// observación directa. Las confidenciales nunca salen aquí: van al buzón.
export default function CalificacionesRecientes({ recientes }: { recientes: ResumenClima['recientes'] }) {
  return (
    <div role="group" aria-label="Calificaciones recientes" className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink mb-3">Calificaciones recientes</p>
      <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto pr-1">
        {recientes.map((c, i) => (
          <li key={`${c.colaboradorId}-${c.fecha}-${i}`} className="py-2.5 flex gap-3">
            <img src={IMAGEN_DE_CARITA[c.carita]} alt={NOMBRE_DE_CARITA[c.carita]} className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold text-ink">{c.nombre}</span>
                <span className="text-muted">{` · ${fechaCortaSinAnio(c.fecha)}`}</span>
              </p>
              {c.motivos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.motivos.map(m => <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-ink/80">{m}</span>)}
                </div>
              )}
              {c.observacion && <p className="text-sm text-ink/80 mt-1 break-words">{`«${c.observacion}»`}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
