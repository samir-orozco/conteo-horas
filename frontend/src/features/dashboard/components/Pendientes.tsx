import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { fechaYHora } from '../../../lib/fechas';
import { chipsDePendientes, detalleDeContrato, fechasDeNovedad, tipoDeNovedad, type ClavePendiente } from '../pendientes';
import type { Dash, TurnoOlvidado } from '../types';

// La franja «Pendientes por resolver» del Inicio (14 de octubre de 2026). Cada aviso se abre en su lista,
// y cada fila lleva a donde se resuelve. Reemplaza al recuadro naranja de «Turnos sin cerrar», que ahora
// es uno de los avisos: su explicación y su modal siguen iguales.

const EXPLICACION: Record<ClavePendiente, string> = {
  TURNOS: 'Estos colaboradores marcaron entrada en días anteriores pero no registraron salida. Corrige el registro para que la liquidación sea correcta.',
  NOVEDADES: 'Se aprueban en la ficha de cada persona, en la pestaña Novedades.',
  CONTRATOS: 'Un contrato a término fijo se prorroga solo si no se avisa por escrito 30 días antes de que venza.',
};

function Fila({ titulo, detalle, onClick }: { titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 bg-white border border-orange-200 rounded-xl px-3.5 py-2.5 text-left hover:border-orange-400 transition-colors">
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-ink truncate">{titulo}</span>
        <span className="block text-xs text-orange-700">{detalle}</span>
      </span>
      <ArrowRight size={14} className="text-orange-500 shrink-0" />
    </button>
  );
}

export default function Pendientes({ turnos, pendientes, onCerrarTurno }: {
  turnos: TurnoOlvidado[];
  pendientes: Dash['pendientes'];
  onCerrarTurno: (t: TurnoOlvidado) => void;
}) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState<ClavePendiente | null>(null);
  const chips = chipsDePendientes(turnos.length, pendientes);

  if (chips.length === 0) {
    // Un servidor anterior no manda `pendientes`: sin ese dato no se puede decir que no hay nada.
    if (!pendientes) return null;
    return (
      <p className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle2 size={16} /> Nada pendiente por resolver
      </p>
    );
  }

  // Si el aviso abierto se resolvió (cerrar un turno recarga el Inicio), deja de estar abierto.
  const visible = chips.some(c => c.clave === abierto) ? abierto : null;
  const aLaFicha = (colaboradorId: string, tab: 'novedades' | 'contratos') => () => navigate(`/app/colaboradores/${colaboradorId}?tab=${tab}`);

  return (
    <section aria-label="Pendientes por resolver" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink mr-1">Pendientes por resolver</span>
        {chips.map(c => {
          const esteAbierto = visible === c.clave;
          return (
            <button key={c.clave} aria-expanded={esteAbierto} onClick={() => setAbierto(esteAbierto ? null : c.clave)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                esteAbierto ? 'bg-orange-100 border-orange-400 text-orange-900' : 'bg-orange-50 border-orange-200 text-orange-800 hover:border-orange-400'}`}>
              {c.texto}
              <ChevronDown size={14} className={`transition-transform ${esteAbierto ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>

      {visible && (
        <div className="bg-orange-50 border border-orange-200 rounded-card p-4">
          <p className="text-sm text-orange-800 mb-3">{EXPLICACION[visible]}</p>
          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {visible === 'TURNOS' && turnos.map(t => (
              <Fila key={t.id} titulo={t.colaborador} detalle={`Entró el ${fechaYHora(t.entrada)}`} onClick={() => onCerrarTurno(t)} />
            ))}
            {visible === 'NOVEDADES' && pendientes?.novedades.map(n => (
              <Fila key={n.id} titulo={n.colaborador} detalle={`${tipoDeNovedad(n.tipo)} · ${fechasDeNovedad(n)}`}
                onClick={aLaFicha(n.colaboradorId, 'novedades')} />
            ))}
            {visible === 'CONTRATOS' && pendientes?.contratos.map(c => (
              <Fila key={c.colaboradorId} titulo={c.colaborador} detalle={detalleDeContrato(c)}
                onClick={aLaFicha(c.colaboradorId, 'contratos')} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
