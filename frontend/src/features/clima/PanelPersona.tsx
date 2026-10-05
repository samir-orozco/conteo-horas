import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../lib/api';
import type { HistorialPersona } from './tipos';
import { IMAGEN_DE_CARITA } from './caritas';
import { NOMBRE_DE_CARITA } from './ventanaClima';
import { fechaCortaSinAnio } from './panelClima';
import SeguimientoDelCaso from './SeguimientoDelCaso';

// EL HISTORIAL DE UNA PERSONA, al tocar «Revisar» en «Necesitan atención» (4 de octubre de 2026): sus
// últimas respuestas con la carita, los motivos y sus observaciones DIRECTAS. Las confidenciales no
// están aquí, ni pueden estar: no se guardan con nombre.
//
// Se abre a la derecha, sobre el panel, y se cierra con su botón, con Escape o tocando por fuera.
// `onCambio`: el seguimiento cambió (estado, responsable o comentarios), para que quien abrió el panel
// vuelva a leer sus listas.
export default function PanelPersona({ colaboradorId, nombre, onCerrar, onCambio }: {
  colaboradorId: string; nombre: string; onCerrar: () => void; onCambio?: () => void;
}) {
  const [historial, setHistorial] = useState<HistorialPersona | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    api.get(`/clima/persona/${colaboradorId}`)
      .then(r => { if (vigente) setHistorial(r.data); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [colaboradorId, version]);

  const onCerrarRef = useRef(onCerrar);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrarRef.current(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  // Cuántas veces escogió cada carita en sus últimas respuestas. Antes era una tira de treinta caritas
  // seguidas, y el dueño la encontró invasiva (4 de octubre de 2026): la secuencia ya la cuenta la lista
  // de abajo, día por día.
  const veces = [1, 2, 3, 4, 5].map(n => historial?.respuestas.filter(r => r.carita === n).length ?? 0);

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
          {historial?.seguimiento && (
            <SeguimientoDelCaso
              caso={historial.seguimiento} responsables={historial.responsables ?? []}
              onCambio={() => { setVersion(v => v + 1); onCambio?.(); }}
            />
          )}
          {historial && historial.respuestas.length === 0 && <p className="text-sm text-muted">Todavía no ha calificado ningún día.</p>}
          {historial && historial.respuestas.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted mb-3">
                {historial.respuestas.length === 1 ? 'Su única respuesta' : `Sus últimas ${historial.respuestas.length} respuestas`}
              </p>
              <ul aria-label="Cuántas veces escogió cada carita" className="flex justify-between gap-2 mb-6 px-1">
                {veces.map((n, i) => (
                  <li key={i} aria-label={`${NOMBRE_DE_CARITA[i + 1]}: ${n === 0 ? 'ninguna' : n === 1 ? '1 vez' : `${n} veces`}`} className="relative">
                    <img src={IMAGEN_DE_CARITA[i + 1]} alt="" className={`w-10 h-10 ${n === 0 ? 'opacity-25' : ''}`} />
                    {n > 0 && (
                      <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center tabular-nums ring-2 ring-white">
                        {n}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-muted mb-1">Respuestas, de la más nueva a la más vieja</p>
              <ul aria-label="Respuestas" className="divide-y divide-gray-100">
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
