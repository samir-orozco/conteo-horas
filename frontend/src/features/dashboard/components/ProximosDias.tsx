import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { cuando, diaDelEvento, textoDeEvento } from '../agenda';
import type { EventoDeAgenda } from '../types';

// «PRÓXIMOS DÍAS» EN EL INICIO (15 de octubre de 2026). Reemplaza a las tarjetas de festivos y cumpleaños: una sola
// lista, por fecha, de lo que viene en 30 días (backend: utils/agendaDelInicio.ts). Lo que pide hacer algo (un
// contrato, el pago) es un botón que lleva a donde se hace; lo demás solo se lee.

const VISIBLES = 6;

// El color de la fecha ayuda a distinguir, pero lo que es cada evento lo dice el texto de al lado.
function colorDeLaFecha(tipo: EventoDeAgenda['tipo']): string {
  switch (tipo) {
    case 'CUMPLEANOS': return 'bg-pink-100 text-pink-700';
    case 'CONTRATO_PREAVISO':
    case 'CONTRATO_SE_PRORROGA': return 'bg-orange-100 text-orange-800';
    case 'SUSCRIPCION_VENCE':
    case 'PRUEBA_CLIMA_TERMINA': return 'bg-ink text-white';
    case 'FESTIVO':
    default: return 'bg-primary/40 text-ink';
  }
}

export default function ProximosDias({ eventos }: { eventos: EventoDeAgenda[] }) {
  const navigate = useNavigate();
  const [todos, setTodos] = useState(false);
  const visibles = todos ? eventos : eventos.slice(0, VISIBLES);

  return (
    <section aria-labelledby="titulo-proximos-dias" className="bg-white rounded-card border border-gray-200 p-5">
      <h2 id="titulo-proximos-dias" className="font-semibold text-ink mb-3 flex items-center gap-2">
        <CalendarDays size={16} aria-hidden="true" /> Próximos días
      </h2>
      {eventos.length === 0 ? <p className="text-sm text-muted">Nada en los próximos 30 días.</p> : (
        <ul aria-label="Próximos días" className="space-y-2">
          {visibles.map((e, i) => {
            const t = textoDeEvento(e);
            const { dia, mes } = diaDelEvento(e.dia);
            const contenido = (
              <>
                <span className={`rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0 ${colorDeLaFecha(e.tipo)}`}>
                  <span className="text-sm font-bold leading-none">{dia}</span>
                  <span className="text-[10px] uppercase opacity-80">{mes}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{t.titulo}</span>
                  <span className={`block text-xs ${e.enDias === 0 ? 'text-ink font-semibold' : 'text-muted'}`}>
                    {t.detalle ? `${t.detalle} · ${cuando(e.enDias)}` : cuando(e.enDias)}
                  </span>
                </span>
              </>
            );
            return (
              // Con la posición: dos eventos pueden coincidir en tipo, día y nombre, y una llave repetida le hace
              // perder la cuenta a React. La lista no se reordena mientras está pintada.
              <li key={`${i}-${e.tipo}-${e.dia}`}>
                {t.destino ? (
                  <button type="button" onClick={() => navigate(t.destino!)}
                    className="w-full flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 text-left hover:bg-gray-100 transition-colors">
                    {contenido}
                    <ArrowRight size={14} className="text-muted shrink-0" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {eventos.length > VISIBLES && (
        <button type="button" onClick={() => setTodos(v => !v)} className="mt-3 text-sm font-semibold text-ink hover:underline">
          {todos ? 'Ver menos' : `Ver los ${eventos.length}`}
        </button>
      )}
    </section>
  );
}
