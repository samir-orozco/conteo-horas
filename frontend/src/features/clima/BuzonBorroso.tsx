import { Lock } from 'lucide-react';
import type { ConteoBuzon } from './tipos';
import { etiquetaDeSemana } from './panelClima';

// EL BUZÓN SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4). Decisión del dueño: se ve cuántas notas hay,
// con las notas borrosas. OJO: lo borroso NO es el texto desenfocado, porque un desenfoque por CSS se quita desde el
// inspector. El texto ni siquiera llega (GET /clima/buzon/conteo trae números); lo que se dibuja son tarjetas de
// relleno, una por nota, con renglones grises de largos distintos.

// Los largos de los renglones de relleno, fijos para que la pantalla no cambie en cada dibujo.
const RENGLONES = [['92%', '64%'], ['78%'], ['85%', '88%', '40%'], ['70%', '52%']];

export default function BuzonBorroso({ conteo }: { conteo: ConteoBuzon }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-card border border-gray-200 p-5 flex gap-3">
        <Lock size={18} className="text-muted shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted">
          Estas observaciones las escribieron colaboradores que pidieron que su nombre no se viera.
          <span className="text-ink font-semibold"> Con el plan Empresarial lees lo que escribieron.</span>
        </p>
      </div>
      {conteo.semanas.length === 0 ? (
        <p className="text-sm text-muted px-1">No hay observaciones confidenciales en las últimas 12 semanas.</p>
      ) : conteo.semanas.map(s => (
        <section key={s.semana} aria-label={etiquetaDeSemana(s.semana)} className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h3 className="font-semibold text-ink">{etiquetaDeSemana(s.semana)}</h3>
            <span className="text-sm text-muted">{s.notas === 1 ? '1 nota' : `${s.notas} notas`}</span>
          </div>
          <ul className="space-y-2">
            {Array.from({ length: s.notas }, (_, i) => (
              <li key={i} role="img" aria-label="Nota confidencial oculta" className="rounded-xl bg-gray-50 px-4 py-3 select-none">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-2" aria-hidden="true">Confidencial</span>
                <span className="block space-y-1.5 blur-[2px]" aria-hidden="true">
                  {RENGLONES[i % RENGLONES.length].map((ancho, j) => (
                    <span key={j} className="block h-2.5 rounded-full bg-gray-300" style={{ width: ancho }} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
