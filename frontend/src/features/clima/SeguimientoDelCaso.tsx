import { useState } from 'react';
import api from '../../lib/api';
import type { CasoDeSeguimiento, Responsable } from './tipos';
import { ESTADOS, NOMBRE_DE_ESTADO } from './estadoDeSeguimiento';
import { fechaYHora } from '../../lib/fechas';

// EL SEGUIMIENTO DE UN CASO, dentro del panel de «Revisar» (4 de octubre de 2026): el estado, el
// responsable y los comentarios. Los comentarios se pueden editar y borrar (decisión del dueño); borrar
// pide confirmación. Después de cada cambio se vuelve a leer el caso: lo que se ve es lo que quedó
// guardado, no lo que se tocó.
export default function SeguimientoDelCaso({ caso, responsables, onCambio }: {
  caso: CasoDeSeguimiento; responsables: Responsable[]; onCambio: () => void;
}) {
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const hacer = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      onCambio();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };
  const base = `/clima/seguimientos/${caso.id}`;

  return (
    <section role="group" aria-label="Seguimiento" className="rounded-xl border border-gray-200 p-4 mb-6">
      <p className="text-sm font-semibold text-ink mb-3">Seguimiento</p>

      <div className="flex rounded-lg border border-gray-200 p-0.5 mb-3">
        {ESTADOS.map(e => (
          <button
            key={e} type="button" aria-pressed={caso.estado === e} disabled={ocupado}
            onClick={() => caso.estado !== e && hacer(() => api.patch(base, { estado: e }))}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
              caso.estado === e ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-gray-50'}`}
          >
            {NOMBRE_DE_ESTADO[e]}
          </button>
        ))}
      </div>

      <label htmlFor="responsable-caso" className="block text-xs font-medium text-muted mb-1">Responsable</label>
      <select
        id="responsable-caso" value={caso.responsableId ?? ''} disabled={ocupado}
        onChange={ev => hacer(() => api.patch(base, { responsableId: ev.target.value === '' ? null : ev.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-4"
      >
        <option value="">Sin asignar</option>
        {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        {caso.responsableId && !responsables.some(r => r.id === caso.responsableId) && (
          <option value={caso.responsableId}>Usuario que ya no está</option>
        )}
      </select>

      <p className="text-xs font-medium text-muted mb-2">Comentarios del seguimiento</p>
      {caso.comentarios.length === 0 && <p className="text-sm text-muted mb-3">Todavía no hay comentarios.</p>}
      <ul className="space-y-3 mb-3">
        {caso.comentarios.map(k => (
          <li key={k.id} className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-[11px] text-muted">
              {`${k.autorNombre} · ${fechaYHora(k.creadoEn)}`}{k.editadoEn && ' · editado'}
            </p>
            {editando?.id === k.id ? (
              <div className="mt-1">
                <label htmlFor={`editar-${k.id}`} className="sr-only">Editar comentario</label>
                <textarea
                  id={`editar-${k.id}`} value={editando.texto} rows={3} maxLength={2000}
                  onChange={ev => setEditando({ id: k.id, texto: ev.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
                <div className="flex gap-3 mt-1">
                  <button type="button" disabled={ocupado || !editando.texto.trim()}
                    onClick={() => hacer(async () => { await api.put(`${base}/comentarios/${k.id}`, { texto: editando.texto }); setEditando(null); })}
                    className="text-xs font-semibold text-ink disabled:opacity-40">Guardar</button>
                  <button type="button" onClick={() => setEditando(null)} className="text-xs text-muted">Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink mt-0.5 whitespace-pre-line break-words">{k.texto}</p>
            )}
            {editando?.id !== k.id && (
              borrando === k.id ? (
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-red-700">¿Borrar este comentario?</span>
                  <button type="button" disabled={ocupado} onClick={() => hacer(async () => { await api.delete(`${base}/comentarios/${k.id}`); setBorrando(null); })}
                    className="font-semibold text-red-700">Sí, borrar</button>
                  <button type="button" onClick={() => setBorrando(null)} className="text-muted">No</button>
                </div>
              ) : (
                <div className="flex gap-3 mt-1 text-xs">
                  <button type="button" aria-label="Editar comentario" onClick={() => setEditando({ id: k.id, texto: k.texto })} className="text-muted hover:text-ink">Editar</button>
                  <button type="button" aria-label="Borrar comentario" onClick={() => setBorrando(k.id)} className="text-muted hover:text-red-700">Borrar</button>
                </div>
              )
            )}
          </li>
        ))}
      </ul>

      <label htmlFor="comentario-nuevo" className="sr-only">Nuevo comentario</label>
      <textarea
        id="comentario-nuevo" value={nuevo} rows={2} maxLength={2000} placeholder="Escribe qué se hizo o qué sigue…"
        onChange={ev => setNuevo(ev.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
      />
      <button
        type="button" aria-label="Agregar comentario" disabled={ocupado || !nuevo.trim()}
        onClick={() => hacer(async () => { await api.post(`${base}/comentarios`, { texto: nuevo }); setNuevo(''); })}
        className="mt-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary-dark text-ink disabled:opacity-50"
      >
        Agregar
      </button>
      {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
    </section>
  );
}
