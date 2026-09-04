import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import IconoDeAdjunto from './IconoDeAdjunto';
import { rotuloDeArchivo } from '../lib/archivos';

export type TonoHito = 'rojo' | 'verde' | 'azul' | 'ambar' | 'gris';

const TONO_PUNTO: Record<TonoHito, string> = {
  rojo:  'bg-red-100 text-red-700 ring-red-50',
  verde: 'bg-green-100 text-green-700 ring-green-50',
  azul:  'bg-blue-100 text-blue-700 ring-blue-50',
  ambar: 'bg-amber-100 text-amber-700 ring-amber-50',
  gris:  'bg-gray-100 text-gray-600 ring-gray-50',
};

const TONO_INSIGNIA: Record<TonoHito, string> = {
  rojo:  'bg-red-100 text-red-800',
  verde: 'bg-green-100 text-green-800',
  azul:  'bg-blue-100 text-blue-800',
  ambar: 'bg-amber-100 text-amber-800',
  gris:  'bg-gray-200 text-gray-600',
};

export type Hito = {
  id: string;
  icono: LucideIcon;
  tono: TonoHito;
  titulo: string;
  detalle?: ReactNode;
  insignia?: { texto: string; tono: TonoHito } | null;
  nota?: string | null;
  adjunto?: { nombre: string | null; tipo: string | null; onAbrir: () => void } | null;
  // Solo cuando dice algo: "HACE 3 DÍAS" sirve, "14 DE JULIO" repetido debajo
  // de la fecha que ya está arriba es ruido.
  rotulo?: string | null;
  autor?: string | null;
  onAbrir?: () => void;
};

// Cuántos se ven antes de pedir el resto. Cuatro alcanzan para el caso normal
// sin empujar el resto de la pantalla hacia abajo.
const VISIBLES = 4;

// Línea de tiempo: hitos unidos por una línea, cada uno con su punto de color.
//
// Vive aquí y no dentro de una pantalla porque la usan la historia de
// vinculación y las novedades. Son la misma forma de leer: qué pasó, cuándo, con
// qué soporte y quién lo registró. Tenerla dos veces significaba que arreglarle
// algo a una dejaba la otra atrás.
export default function LineaDeTiempo({ hitos, visibles = VISIBLES, sustantivo }: {
  hitos: Hito[];
  visibles?: number;
  // Cómo se llama lo que se oculta. "Ver 4 más" no dice más de qué.
  sustantivo?: { singular: string; plural: string };
}) {
  const [todos, setTodos] = useState(false);
  if (hitos.length === 0) return null;

  const ocultos = Math.max(0, hitos.length - visibles);
  const alaVista = todos ? hitos : hitos.slice(0, visibles);

  return (
    <>
      <ol className="px-5 py-5">
        {alaVista.map((h, i) => {
          const Icono = h.icono;
          const esUltimo = i === alaVista.length - 1;
          // Sin acción no se envuelve en un botón: prometer un clic que no hace
          // nada es peor que no ofrecerlo.
          const Envoltura = h.onAbrir ? 'button' : 'div';

          return (
            <li key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* La línea que une los hitos. No se pinta bajo el último:
                  colgaría hacia un vacío. */}
              {!esUltimo && (
                <span className="absolute left-[15px] top-9 -bottom-1 w-px bg-gray-200" aria-hidden="true" />
              )}
              <span className={`w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 ring-4 ${TONO_PUNTO[h.tono]}`}>
                <Icono size={15} />
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <Envoltura
                  {...(h.onAbrir ? { type: 'button' as const, onClick: h.onAbrir } : {})}
                  className={`block w-full text-left ${h.onAbrir ? 'group' : ''}`}
                >
                  <p className="text-sm font-bold text-ink leading-tight flex items-center gap-2 flex-wrap">
                    <span className={h.onAbrir ? 'group-hover:underline' : undefined}>{h.titulo}</span>
                    {h.insignia && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TONO_INSIGNIA[h.insignia.tono]}`}>
                        {h.insignia.texto}
                      </span>
                    )}
                  </p>
                  {h.detalle && <p className="text-sm text-muted mt-0.5">{h.detalle}</p>}
                </Envoltura>

                {h.nota && (
                  <p className="text-xs text-muted mt-1.5 leading-snug border-l-2 border-gray-200 pl-2.5">
                    {h.nota}
                  </p>
                )}

                {h.adjunto && (
                  <div className="mt-2.5 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
                    <button
                      onClick={h.adjunto.onAbrir}
                      className="flex items-center gap-2.5 max-w-full text-left rounded-lg px-1.5 py-1 hover:bg-white transition-colors">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100">
                        <IconoDeAdjunto tipo={h.adjunto.tipo} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-ink truncate">
                          {h.adjunto.nombre || 'Adjunto'}
                        </span>
                        <span className="block text-[11px] text-muted">{rotuloDeArchivo(h.adjunto.tipo)}</span>
                      </span>
                    </button>
                  </div>
                )}

                {(h.rotulo || h.autor) && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    {h.rotulo && <span className="font-semibold tracking-wide">{h.rotulo}</span>}
                    {h.rotulo && h.autor && <span> · </span>}
                    {h.autor && <span>{h.autor}</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {ocultos > 0 && !todos && (
        <button
          type="button"
          onClick={() => setTodos(true)}
          className="w-full px-5 py-3 border-t border-gray-100 text-sm font-semibold text-blue-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 rounded-b-card transition-colors">
          Ver {ocultos} {sustantivo ? (ocultos === 1 ? sustantivo.singular : sustantivo.plural) + ' ' : ''}más
          <ChevronDown size={15} />
        </button>
      )}
    </>
  );
}
