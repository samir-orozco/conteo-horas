import type { ResumenClima } from './tipos';
import { COLOR_DE_CARITA, decimal, POCAS_RESPUESTAS, sedeMasBaja } from './panelClima';

// El ánimo promedio de cada sede, con lo que hace falta para no sacar conclusiones de más: cuántas
// respuestas lo forman y qué parte de las jornadas respondió (4 de octubre de 2026). La sede más baja
// se destaca, pero solo entre las que tienen respuestas suficientes; las que no, llevan su aviso.
// Quien tiene dos sedes cuenta en las dos, como en los reportes.
export default function PorSede({ porSede }: { porSede: ResumenClima['porSede'] }) {
  const masBaja = sedeMasBaja(porSede);
  return (
    <div role="group" aria-label="Por sede" className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink">Por sede</p>
      <p className="text-xs text-muted mb-4">Ánimo promedio de 1 a 5</p>
      <ul className="space-y-4">
        {porSede.map(s => {
          const pocas = s.total < POCAS_RESPUESTAS;
          const destacada = masBaja !== undefined && s.sedeId === masBaja;
          return (
            <li key={s.sedeId ?? 'sin-sede'}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink flex items-center gap-2">
                  {s.nombre}
                  {destacada && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Más bajo</span>}
                </span>
                <span className="font-semibold text-ink tabular-nums">{decimal(s.promedio)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(s.promedio / 5) * 100}%`, background: pocas ? '#d4d3cf' : destacada ? COLOR_DE_CARITA[1] : '#303030' }}
                />
              </div>
              <p className="text-[11px] text-muted mt-1">
                {`${s.total.toLocaleString('es-CO')} ${s.total === 1 ? 'respuesta' : 'respuestas'}`}
                {s.participacion !== null && ` · ${s.participacion} % de participación`}
              </p>
              {pocas && <p className="text-[11px] font-semibold text-amber-700">Pocas respuestas</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
