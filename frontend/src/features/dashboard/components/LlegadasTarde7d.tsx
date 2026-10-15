import { useState } from 'react';
import { AlarmClock, ChevronDown } from 'lucide-react';
import AvatarMini from '../../../components/AvatarMini';
import { filasDeLlegadas, totalDeLlegadas, type FilaDeLlegadas } from '../semana';
import type { Dash } from '../types';

// Las llegadas tarde de los últimos 7 días en el Inicio (15 de octubre de 2026). Decisión del dueño:
// una fila por día, el largo es la suma de los minutos, las fotos chicas de quién, y al tocar un día su
// lista. Reemplaza a la lista «Llegadas tarde hoy»; por eso la fila de hoy abre sola, y lo que esa lista
// mostraba sigue a la vista.
//
// En CLARO, como las demás tarjetas de datos (el dueño, el mismo día: la tarjeta grafito «chilla»; el
// fondo oscuro se queda para «Primeros pasos», que sí pide atención). La barra amarilla sobre gris se
// distingue poco, y por eso no carga sola el dato: los minutos van escritos al lado de cada día.

// El color acompaña al texto (`textoDeFila` en semana.ts), que es el que dice qué pasó ese día.
const CLASE_SIN_TARDE: Record<Exclude<FilaDeLlegadas['estado'], 'TARDE'>, string> = {
  A_TIEMPO: 'text-green-700',
  SIN_TARDES: 'text-green-700',
  NADIE: 'text-red-700',
  AUN_NO: 'text-muted',
  CON_NOVEDAD: 'text-amber-700',
  SIN_TURNOS: 'text-gray-400',
  FESTIVO: 'text-muted',
};

function Barra({ f }: { f: FilaDeLlegadas }) {
  return (
    <span aria-hidden className="flex-1 min-w-0 h-8 rounded-full bg-gray-100 relative overflow-hidden">
      {f.ancho > 0 && <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${f.ancho}%` }} />}
      {f.estado === 'TARDE' ? (
        <span className="absolute inset-y-0 left-1 flex items-center -space-x-2">
          {f.caras.map(c => {
            const [nombre, ...resto] = c.nombre.split(' ');
            return <AvatarMini key={c.id} nombre={nombre} apellido={resto.join(' ')} foto={c.foto} chica decorativa />;
          })}
          {f.mas > 0 && <span className="ml-3 text-[10px] font-bold text-white bg-ink rounded-full px-1.5 py-0.5">+{f.mas}</span>}
        </span>
      ) : (
        <span className={`absolute inset-0 flex items-center px-3 text-xs ${CLASE_SIN_TARDE[f.estado]}`}>{f.texto}</span>
      )}
    </span>
  );
}

export default function LlegadasTarde7d({ dias, personas }: NonNullable<Dash['llegadasTarde7d']>) {
  const filas = filasDeLlegadas(dias, personas);
  const hoy = filas.find(f => f.esHoy && f.estado === 'TARDE');
  const [abierto, setAbierto] = useState<string | null>(hoy?.clave ?? null);

  return (
    <section className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="font-semibold text-ink flex items-center gap-2"><AlarmClock size={16} className="text-orange-500" /> Llegadas tarde</p>
        <span className="text-xs text-muted">últimos 7 días</span>
      </div>
      <ul className="space-y-2">
        {filas.map(f => {
          const etiqueta = <span aria-hidden className={`w-12 shrink-0 text-xs ${f.esHoy ? 'font-bold text-ink' : 'text-muted'}`}>{f.etiqueta}</span>;
          const minutos = <span aria-hidden className="w-16 shrink-0 text-right text-xs font-semibold text-ink tabular-nums">{f.minutos}</span>;
          if (f.estado !== 'TARDE') {
            return (
              <li key={f.clave} className="flex items-center gap-3">
                <span className="sr-only">{f.nombreAccesible}</span>
                {etiqueta}<Barra f={f} />{minutos}
                {/* El lugar de la flecha, para que todas las barras terminen en el mismo punto. */}
                <span aria-hidden className="w-[14px] shrink-0" />
              </li>
            );
          }
          const esteAbierto = abierto === f.clave;
          return (
            <li key={f.clave}>
              <button aria-expanded={esteAbierto} onClick={() => setAbierto(esteAbierto ? null : f.clave)}
                className="w-full flex items-center gap-3 text-left rounded-full hover:bg-gray-50 transition-colors">
                <span className="sr-only">{f.nombreAccesible}</span>
                {etiqueta}<Barra f={f} />{minutos}
                <ChevronDown aria-hidden size={14} className={`shrink-0 text-muted transition-transform ${esteAbierto ? 'rotate-180' : ''}`} />
              </button>
              {esteAbierto && (
                <ul className="mt-2 mb-1 ml-14 space-y-1">
                  {f.detalle.map(p => (
                    <li key={p.id} className="text-sm">
                      <span className="font-medium text-ink">{p.nombre}</span>
                      <span className="block text-xs text-muted">{p.texto}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">{`Total: ${totalDeLlegadas(dias)} · después de la tolerancia`}</p>
    </section>
  );
}
