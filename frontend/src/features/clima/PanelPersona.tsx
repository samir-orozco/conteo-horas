import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../lib/api';
import type { HistorialPersona } from './tipos';
import { IMAGEN_DE_CARITA } from './caritas';
import { NOMBRE_DE_CARITA } from './ventanaClima';
import { fechaCortaSinAnio } from './panelClima';

// EL HISTORIAL DE UNA PERSONA, al tocar «Revisar» en «Necesitan atención» (4 de octubre de 2026): sus
// últimas respuestas con la carita, los motivos y sus observaciones DIRECTAS. Las confidenciales no
// están aquí, ni pueden estar: no se guardan con nombre.
//
// Se abre a la derecha, sobre el panel, y se cierra con su botón, con Escape o tocando por fuera.
export default function PanelPersona({ colaboradorId, nombre, onCerrar }: { colaboradorId: string; nombre: string; onCerrar: () => void }) {
  const [historial, setHistorial] = useState<HistorialPersona | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    api.get(`/clima/persona/${colaboradorId}`)
      .then(r => { if (vigente) setHistorial(r.data); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [colaboradorId]);

  const onCerrarRef = useRef(onCerrar);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrarRef.current(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  // De la más vieja a la más nueva, para leer la tendencia de izquierda a derecha.
  const tira = historial ? [...historial.respuestas].slice(0, 30).reverse() : [];

  return (
    <div className="fixed inset-0 !mt-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} aria-hidden="true" />
      <aside
        role="dialog" aria-modal="true" aria-label={nombre}
        className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-ink">{nombre}</h3>
            {historial && (
              <p className="text-xs text-muted">{[historial.cargo, historial.sedes.join(', ')].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p role="alert" className="text-sm text-red-700">No se pudo cargar el historial.</p>}
          {!historial && !error && <p className="text-sm text-muted">Cargando…</p>}
          {historial && historial.respuestas.length === 0 && <p className="text-sm text-muted">Todavía no ha calificado ningún día.</p>}
          {historial && historial.respuestas.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                {`Sus últimas ${tira.length} respuestas, de la más vieja a la más nueva`}
              </p>
              <div className="flex flex-wrap gap-1 mb-5" aria-hidden="true">
                {tira.map((r, i) => <img key={i} src={IMAGEN_DE_CARITA[r.carita]} alt="" className="w-5 h-5" title={`${fechaCortaSinAnio(r.fecha)}: ${NOMBRE_DE_CARITA[r.carita]}`} />)}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Respuestas</p>
              <ul className="divide-y divide-gray-100">
                {historial.respuestas.map(r => (
                  <li key={r.fecha} className="py-2.5 flex gap-3">
                    <img src={IMAGEN_DE_CARITA[r.carita]} alt={NOMBRE_DE_CARITA[r.carita]} className="w-7 h-7 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-ink">{NOMBRE_DE_CARITA[r.carita]}</span>
                        <span className="text-muted">{` · ${fechaCortaSinAnio(r.fecha)}`}</span>
                      </p>
                      {r.motivos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.motivos.map(m => <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-ink/80">{m}</span>)}
                        </div>
                      )}
                      {r.observacion && <p className="text-sm text-ink/80 mt-1 break-words">{`«${r.observacion}»`}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
