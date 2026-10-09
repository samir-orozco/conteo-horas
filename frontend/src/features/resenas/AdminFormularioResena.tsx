import { useEffect, useState, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import api from '../../lib/api';
import { mensajeDeError } from '../../lib/errores';
import { fechaCorta } from '../../lib/fechas';
import { diaEnBogota } from '../reportes/detalleDelPeriodo';
import { crearResenaManual, editarResenaManual, NOMBRE_ANONIMO, type ResenaAdmin } from './api';
import { cuerpoDelFormulario, formularioDe, formularioNuevo, type FormularioManual } from './adminResenas';

// «Nueva reseña» y «Editar» de una manual (docs/RESENAS.md, 4.3): las que llegan por WhatsApp, por
// Google o por una llamada. Arriba lo que se publica; abajo, separado, lo que solo ve el super admin.

type EmpresaOpcion = { id: string; nombre: string };

type Props = {
  // null para una nueva.
  resena: ResenaAdmin | null;
  // Las empresas que ya tienen su reseña: es una por empresa (D1), y el servidor respondería 409.
  empresasConResena: ReadonlySet<string>;
  onGuardada: (aviso: string) => void;
  onCancelar: () => void;
};

// Los canales más comunes. Uno que no esté (por ejemplo «Landing anterior», el de los tres testimonios
// que entraron con el SQL) se agrega a la lista para que editar no lo borre sin querer.
const CANALES = ['WhatsApp', 'Google', 'Llamada', 'Correo', 'En persona', 'Otro'];

const claseInput = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amarillo/40 disabled:bg-gray-50 disabled:text-muted';
const TEXTO_MAXIMO = 500;

// La etiqueta envuelve el control y no lleva nada más adentro, para que su nombre sea exactamente el
// que se ve. La ayuda va debajo, fuera de la etiqueta.
function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="block text-xs font-semibold text-muted">{etiqueta}</span>
        {children}
      </label>
      {ayuda && <p className="text-xs text-muted">{ayuda}</p>}
    </div>
  );
}

export default function AdminFormularioResena({ resena, empresasConResena, onGuardada, onCancelar }: Props) {
  const [f, setF] = useState<FormularioManual>(() =>
    resena ? formularioDe(resena) : formularioNuevo(diaEnBogota(new Date().toISOString())));
  const [empresas, setEmpresas] = useState<EmpresaOpcion[]>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get<EmpresaOpcion[]>('/admin/empresas')
      .then(r => setEmpresas([...r.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
      .catch(() => setEmpresas([]));
  }, []);

  const cambiar = (cambios: Partial<FormularioManual>) => setF(actual => ({ ...actual, ...cambios }));
  // «Quitar el nombre» no se deshace (R23): editar no puede ser la puerta de atrás, y el servidor
  // también lo rechaza.
  const nombreRetirado = resena?.nombreRetiradoEn ?? null;
  const canales = f.canal && !CANALES.includes(f.canal) ? [f.canal, ...CANALES] : CANALES;

  const guardar = async () => {
    const cuerpo = cuerpoDelFormulario(f);
    if ('error' in cuerpo) { setError(cuerpo.error); return; }
    setGuardando(true);
    setError('');
    try {
      if (resena) await editarResenaManual(resena.id, cuerpo);
      else await crearResenaManual(cuerpo);
      onGuardada(resena ? 'Reseña actualizada.' : 'Reseña creada. Quedó «Por revisar».');
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo guardar la reseña.'));
      setGuardando(false);
    }
  };

  const titulo = resena ? 'Editar reseña' : 'Nueva reseña';

  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={titulo}
        className="hp-pop bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-bold text-ink">{titulo}</h2>

        <div className="space-y-1">
          <span className="block text-xs font-semibold text-muted">Estrellas</span>
          <div className="flex flex-wrap items-center gap-4">
            <div role="radiogroup" aria-label="Estrellas" className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => {
                const llena = !f.sinCalificacion && f.estrellas != null && n <= f.estrellas;
                return (
                  <label key={n} className={`rounded has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amarillo/60 ${f.sinCalificacion ? 'opacity-40' : 'cursor-pointer'}`}>
                    <input type="radio" name="estrellas" className="sr-only" checked={f.estrellas === n}
                      disabled={f.sinCalificacion} onChange={() => cambiar({ estrellas: n })}
                      aria-label={n === 1 ? '1 estrella' : `${n} estrellas`} />
                    <Star size={24} aria-hidden="true" className={llena ? 'fill-primary text-primary' : 'text-gray-300'} />
                  </label>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={f.sinCalificacion} onChange={e => cambiar({ sinCalificacion: e.target.checked })} />
              La fuente no traía calificación
            </label>
          </div>
          <p className="text-xs text-muted">Sin calificación, la tarjeta no muestra estrellas: no se pone un 5 que nadie dio.</p>
        </div>

        <Campo etiqueta="Texto" ayuda={`${Array.from(f.texto).length}/${TEXTO_MAXIMO}. Literal, como lo dijo la persona.`}>
          <textarea value={f.texto} onChange={e => cambiar({ texto: e.target.value })} rows={4} className={claseInput} />
        </Campo>

        <div className="grid sm:grid-cols-2 gap-3">
          <Campo etiqueta="Nombre" ayuda={nombreRetirado ? undefined : `Sin nombre sale como «${NOMBRE_ANONIMO}».`}>
            <input value={f.nombrePublico} onChange={e => cambiar({ nombrePublico: e.target.value })}
              disabled={Boolean(nombreRetirado)} className={claseInput} />
          </Campo>
          <Campo etiqueta="Cargo y empresa">
            <input value={f.cargoPublico} onChange={e => cambiar({ cargoPublico: e.target.value })}
              disabled={Boolean(nombreRetirado)} className={claseInput} />
          </Campo>
        </div>
        {nombreRetirado && (
          <p className="text-xs text-muted">
            El nombre se quitó el {fechaCorta(nombreRetirado)} a pedido de la persona, y no se puede volver a poner.
          </p>
        )}

        <Campo etiqueta="Es cliente de HoraPro (opcional)"
          ayuda="Si es de una empresa cliente, cuenta como la única reseña de esa empresa y a ella no le sale la ventana.">
          <select value={f.empresaId} onChange={e => cambiar({ empresaId: e.target.value })} className={claseInput}>
            <option value="">No es de una empresa cliente</option>
            {empresas.map(e => {
              const ocupada = empresasConResena.has(e.id) && e.id !== resena?.empresaId;
              return (
                <option key={e.id} value={e.id} disabled={ocupada}>
                  {ocupada ? `${e.nombre} (ya tiene su reseña)` : e.nombre}
                </option>
              );
            })}
          </select>
        </Campo>

        <div className="pt-2 border-t border-gray-100 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Solo para el super admin, nunca se publica</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo etiqueta="Canal">
              <select value={f.canal} onChange={e => cambiar({ canal: e.target.value })} className={claseInput}>
                <option value="">Sin indicar</option>
                {canales.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Fecha de la opinión">
              <input type="date" value={f.fechaOpinion} onChange={e => cambiar({ fechaOpinion: e.target.value })} className={claseInput} />
            </Campo>
          </div>
          <Campo etiqueta="Dónde quedó" ayuda="Un enlace o una descripción: «chat de WhatsApp del 19/07 con Mateo».">
            <input value={f.referencia} onChange={e => cambiar({ referencia: e.target.value })} className={claseInput} />
          </Campo>
          <Campo etiqueta="Cómo autorizó" ayuda="Con nombre, no se puede publicar sin esto ni sin «Dónde quedó».">
            <input value={f.autorizacion} onChange={e => cambiar({ autorizacion: e.target.value })} className={claseInput} />
          </Campo>
        </div>

        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onCancelar}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="bg-primary hover:bg-primary-dark text-ink rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
