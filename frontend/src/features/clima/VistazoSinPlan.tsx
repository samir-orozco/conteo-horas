import { UserRoundSearch } from 'lucide-react';
import type { VistazoClima } from './tipos';
import { Tarjeta, TarjetaAnimo, TarjetaBuzon, TarjetaRespondieron } from './TarjetasDelClima';

// LO QUE VE DEL CLIMA UNA EMPRESA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4). Decisión del dueño:
// el ánimo promedio, la participación y CUÁNTAS personas necesitan atención, sin nombres; y cuántas notas hay en el
// buzón. Son las mismas tarjetas del panel completo, salvo la de atención, que aquí solo cuenta. Quiénes, por qué, los
// motivos y las respuestas de cada uno son del plan Empresarial, y el servidor ni siquiera los manda.

export default function VistazoSinPlan({ v, notasDelBuzon, onVerBuzon }: {
  v: VistazoClima; notasDelBuzon: number | null; onVerBuzon: () => void;
}) {
  if (v.total === 0) {
    return (
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <p className="text-sm text-ink font-semibold">Todavía nadie calificó su día en este período.</p>
        <p className="text-sm text-muted mt-1">La pregunta sale en el kiosco al marcar la salida que cierra la jornada.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <TarjetaAnimo promedio={v.promedio} variacion={v.variacion} />
      <TarjetaRespondieron total={v.total} jornadas={v.jornadas} />
      <Tarjeta
        rotulo="Necesitan atención"
        nota={v.atencion > 0 ? 'Con el plan Empresarial ves quiénes y por qué' : 'Nadie lleva tres respuestas malas seguidas'}
      >
        <UserRoundSearch size={22} className="text-muted" aria-hidden="true" />
        <span className="text-2xl font-bold text-ink">{v.atencion}</span>
        <span className="text-sm text-muted">{v.atencion === 1 ? 'persona' : 'personas'}</span>
      </Tarjeta>
      <TarjetaBuzon notas={notasDelBuzon} onVerBuzon={onVerBuzon} />
    </div>
  );
}
