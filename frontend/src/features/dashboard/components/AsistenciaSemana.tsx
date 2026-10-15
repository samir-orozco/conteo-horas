import { CalendarCheck } from 'lucide-react';
import { columnasDeAsistencia } from '../semana';
import type { Dash } from '../types';

// La asistencia de la semana en el Inicio (15 de octubre de 2026): de lunes a domingo, cuántos llegaron
// de los que debían venir. La barra va en tinta sobre gris, con el número escrito debajo: el amarillo
// sobre blanco no se distingue lo suficiente (1,38:1) para cargar sola el dato. Hoy se marca con la
// palabra «Hoy» y un fondo, no solo con color.
export default function AsistenciaSemana({ dias }: { dias: NonNullable<Dash['asistenciaSemana']>['dias'] }) {
  const columnas = columnasDeAsistencia(dias);
  const hoy = columnas.find(c => c.esHoy);
  return (
    <section className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink mb-4 flex items-center gap-2">
        <CalendarCheck size={16} className="text-green-600" /> Asistencia de la semana
      </p>
      <ul aria-label="Asistencia de lunes a domingo" className="grid grid-cols-7 gap-1 sm:gap-2">
        {columnas.map(c => (
          <li key={c.clave} aria-label={c.nombreAccesible} title={c.nota ?? undefined}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-2 ${c.esHoy ? 'bg-primary-light' : ''}`}>
            <div aria-hidden className={`h-24 w-full max-w-[28px] rounded-md flex items-end overflow-hidden ${
              c.estado === 'FUTURO' ? 'border border-dashed border-gray-300' : 'bg-gray-100'}`}>
              {c.alto > 0 && <div className="w-full bg-ink rounded-md" style={{ height: `${c.alto}%` }} />}
            </div>
            {/* En un teléfono cada columna mide unos 40 px: «5 de 5» y «mar 13» van en una línea, y solo
                lo largo («4 con turno») se parte. */}
            <span aria-hidden className={`text-[10px] sm:text-[11px] leading-tight text-center font-semibold text-ink tabular-nums ${
              c.estado === 'DATOS' ? 'whitespace-nowrap' : ''}`}>{c.cifra}</span>
            <span aria-hidden className={`text-[10px] sm:text-[11px] whitespace-nowrap ${c.esHoy ? 'font-bold text-ink' : 'text-muted'}`}>{c.etiqueta}</span>
          </li>
        ))}
      </ul>
      {hoy?.nota && <p className="mt-3 text-xs text-muted">Hoy: {hoy.nota}</p>}
    </section>
  );
}
