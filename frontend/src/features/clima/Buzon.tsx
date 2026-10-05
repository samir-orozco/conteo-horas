import { Lock } from 'lucide-react';
import type { BuzonClima } from './tipos';
import { etiquetaDeSemana } from './panelClima';

// EL BUZÓN CONFIDENCIAL (decisión del dueño, 3 y 4 de octubre de 2026). Solo el texto: ni nombre, ni
// hora, ni carita, ni sede. Las notas aparecen al día siguiente, juntas por semana y en un orden que no
// es el de llegada, para que nadie pueda saber quién fue por la hora en que apareció.
export default function Buzon({ buzon }: { buzon: BuzonClima }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-card border border-gray-200 p-5 flex gap-3">
        <Lock size={18} className="text-muted shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted">
          Estas observaciones las escribieron colaboradores que pidieron que su nombre no se viera. Por eso aparecen al día
          siguiente, juntas por semana y sin nombre, hora ni carita.
        </p>
      </div>
      {buzon.semanas.length === 0 ? (
        <p className="text-sm text-muted px-1">No hay observaciones confidenciales en las últimas 12 semanas.</p>
      ) : buzon.semanas.map(s => (
        <section key={s.semana} aria-label={etiquetaDeSemana(s.semana)} className="bg-white rounded-card border border-gray-200 p-5">
          <h3 className="font-semibold text-ink mb-3">{etiquetaDeSemana(s.semana)}</h3>
          <ul className="space-y-2">
            {s.notas.map((texto, i) => (
              <li key={i} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-ink break-words">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">Confidencial</span>
                {`«${texto}»`}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
