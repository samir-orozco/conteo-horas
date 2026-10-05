import { useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { ResumenClima } from './tipos';
import { fechaCortaSinAnio } from './panelClima';
import ChipDeEstado from './ChipDeEstado';

type Persona = ResumenClima['atencion'][number];

// Cuántas filas se ven de entrada. El bloque ocupaba media pantalla como una advertencia; ahora es una
// tarjeta compacta con un indicador arriba y el resto a un toque (4 de octubre de 2026).
const VISIBLES = 3;

// Quién lleva tres respuestas seguidas o más en Muy mal o Mal (decisión del dueño, en lugar de un
// ranking de personas). Mira cómo está cada uno HOY, no el período del filtro. Se habla de RESPUESTAS y
// no de días: los días sin respuesta no cortan la cuenta, así que no son días de calendario seguidos.
export default function NecesitanAtencion({ atencion, onRevisar }: { atencion: ResumenClima['atencion']; onRevisar: (p: Persona) => void }) {
  const [todas, setTodas] = useState(false);

  if (atencion.length === 0) {
    return (
      <div role="group" aria-label="Necesitan atención" className="bg-white rounded-card border border-gray-200 p-5 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-green-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold text-ink">Necesitan atención</p>
          <p className="text-sm text-muted">Nadie lleva tres respuestas negativas seguidas.</p>
        </div>
      </div>
    );
  }
  const visibles = todas ? atencion : atencion.slice(0, VISIBLES);
  return (
    <div role="group" aria-label="Necesitan atención" className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">Necesitan atención</p>
        <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
          {atencion.length === 1 ? '1 persona' : `${atencion.length} personas`}
        </span>
      </div>
      <p className="text-xs text-muted mb-3">Tres o más respuestas seguidas en Muy mal o Mal. Los días sin respuesta no cortan la cuenta.</p>
      <ul className="divide-y divide-gray-100">
        {visibles.map(a => (
          <li key={a.colaboradorId} className="py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink flex items-center gap-2 flex-wrap">
                {a.nombre}
                {a.seguimiento && <ChipDeEstado estado={a.seguimiento.estado} />}
              </p>
              <p className="text-xs text-muted">{[a.cargo, a.sedes.join(', ')].filter(Boolean).join(' · ')}</p>
              <p className="text-xs text-ink/80 mt-0.5">
                {`${a.dias} respuestas negativas consecutivas · desde el ${fechaCortaSinAnio(a.desde)}${a.motivo ? ` · Más repetido: ${a.motivo}` : ''}`}
              </p>
            </div>
            <button
              type="button" onClick={() => onRevisar(a)} aria-label={`Revisar a ${a.nombre}`}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gray-50"
            >
              Revisar <ChevronRight size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {atencion.length > VISIBLES && (
        <button type="button" onClick={() => setTodas(!todas)} className="mt-2 text-sm font-semibold text-ink underline decoration-primary decoration-2 underline-offset-2">
          {todas ? 'Ver menos' : `Ver las ${atencion.length}`}
        </button>
      )}
    </div>
  );
}
