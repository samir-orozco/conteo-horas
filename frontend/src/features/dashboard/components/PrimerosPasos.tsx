import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { pasosParaMostrar } from '../primerosPasos';

// La tarjeta «Primeros pasos» del Inicio de una empresa nueva (14 de octubre de 2026). Va en grafito, como
// la tarjeta oscura de tareas del ejemplo que trajo el dueño. Cada paso lleva a la pantalla donde se hace.
export default function PrimerosPasos({ pasos }: { pasos: { clave: string; hecho: boolean }[] }) {
  const navigate = useNavigate();
  const lista = pasosParaMostrar(pasos);
  if (lista.length === 0) return null;
  const hechos = lista.filter(p => p.hecho).length;

  return (
    <section className="bg-ink text-white rounded-card p-5 md:p-6 grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 lg:gap-8">
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Primeros pasos</h2>
          <p aria-hidden className="text-4xl font-bold tabular-nums leading-none">
            {hechos}<span className="text-white/40">/{lista.length}</span>
          </p>
        </div>
        <p className="text-sm text-white/60 mt-1">Deja tu cuenta lista para que tu equipo empiece a marcar.</p>
        <div className="mt-4 lg:mt-auto flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(hechos / lista.length) * 100}%` }} />
          </div>
          <span className="text-xs text-white/60 tabular-nums">{`${hechos} de ${lista.length}`}</span>
        </div>
      </div>

      <ol className="space-y-1">
        {lista.map((p, i) => (
          <li key={p.clave}>
            <button onClick={() => navigate(p.ruta)} aria-label={p.hecho ? `Hecho: ${p.texto}` : p.texto}
              className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-white/5 transition-colors">
              <span aria-hidden className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                p.hecho ? 'bg-primary text-ink' : 'border border-white/25 text-white/70'}`}>
                {p.hecho ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`flex-1 text-sm ${p.hecho ? 'text-white/50' : 'text-white'}`}>
                {p.texto}
              </span>
              {!p.hecho && <ArrowRight size={15} aria-hidden className="text-primary shrink-0" />}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
