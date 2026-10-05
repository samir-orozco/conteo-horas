import type { ResumenClima } from './tipos';

// Por qué no fue un buen día: cada motivo, en cuántos de los días calificados Muy mal, Mal o Normal
// apareció. Una persona puede marcar varios, así que los porcentajes no suman 100.
export default function BarrasMotivos({ motivos }: { motivos: ResumenClima['motivos'] }) {
  return (
    <div role="group" aria-label="Por qué no fue un buen día" className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink">Por qué no fue un buen día</p>
      <p className="text-xs text-muted mb-4">Sobre los días calificados Muy mal, Mal o Normal. Se pueden marcar varios.</p>
      {motivos.length === 0 ? (
        <p className="text-sm text-muted">Nadie marcó un motivo en este período.</p>
      ) : (
        <ul className="space-y-3">
          {motivos.map(m => (
            <li key={m.motivo} title={`${m.motivo}: ${m.veces} ${m.veces === 1 ? 'vez' : 'veces'}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">{m.motivo}</span>
                <span className="font-semibold text-ink tabular-nums">{`${m.porcentaje} %`}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.max(2, m.porcentaje)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
