import { Inbox } from 'lucide-react';
import type { ResumenClima } from './tipos';
import { IMAGEN_DE_CARITA } from './caritas';
import { caritaDelPromedio, decimal, porcentajeNegativas, respondieron, variacion } from './panelClima';

// Las cuatro cifras de arriba del panel. Cada una es un `group` con su rótulo por nombre: así se
// encuentra por lo que dice ser, y no por su posición en la fila.
function Tarjeta({ rotulo, children, nota }: { rotulo: string; children: React.ReactNode; nota: React.ReactNode }) {
  return (
    <div role="group" aria-label={rotulo} className="bg-white rounded-card border border-gray-200 p-5">
      <p className="text-sm text-muted mb-2">{rotulo}</p>
      <div className="flex items-center gap-2">{children}</div>
      <p className="text-xs text-muted mt-1">{nota}</p>
    </div>
  );
}

export default function TarjetasDelClima({ r, notasDelBuzon, onVerBuzon }: { r: ResumenClima; notasDelBuzon: number | null; onVerBuzon: () => void }) {
  const carita = caritaDelPromedio(r.promedio);
  const v = variacion(r.variacion);
  const resp = respondieron(r.total, r.jornadas);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tarjeta
        rotulo="Ánimo promedio"
        nota={v ? <><span className={v.sube === true ? 'text-green-700 font-semibold' : v.sube === false ? 'text-red-700 font-semibold' : 'font-semibold'}>{v.texto}</span> frente al período anterior</> : 'Sin período anterior para comparar'}
      >
        {carita !== null && <img src={IMAGEN_DE_CARITA[carita]} alt="" className="w-8 h-8" />}
        <span className="text-2xl font-bold text-ink">{r.promedio !== null ? decimal(r.promedio) : '—'}</span>
        <span className="text-sm text-muted">de 5</span>
      </Tarjeta>
      <Tarjeta rotulo="Respondieron" nota={resp.porcentaje !== null ? resp.texto : 'Nadie cerró jornada en el kiosco en el período'}>
        <span className="text-2xl font-bold text-ink">{resp.porcentaje !== null ? `${resp.porcentaje} %` : '—'}</span>
      </Tarjeta>
      <Tarjeta rotulo="Respuestas negativas" nota={`${r.negativas.toLocaleString('es-CO')} ${r.negativas === 1 ? 'respuesta' : 'respuestas'}: Muy mal o Mal`}>
        <span className="text-2xl font-bold text-ink">{porcentajeNegativas(r.negativas, r.total) ?? '—'}</span>
      </Tarjeta>
      <Tarjeta
        rotulo="Buzón confidencial"
        nota={<><span>Esta semana y la anterior · </span><button type="button" onClick={onVerBuzon} className="font-semibold text-ink underline decoration-primary decoration-2 underline-offset-2">Ver el buzón</button></>}
      >
        <Inbox size={22} className="text-muted" aria-hidden="true" />
        <span className="text-2xl font-bold text-ink">{notasDelBuzon ?? '—'}</span>
        <span className="text-sm text-muted">{notasDelBuzon === 1 ? 'nota reciente' : 'notas recientes'}</span>
      </Tarjeta>
    </div>
  );
}
