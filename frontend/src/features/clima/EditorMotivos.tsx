import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import api from '../../lib/api';
import type { MotivosClima } from './tipos';

// Los motivos que ve la persona en el kiosco cuando su día no fue bueno (decisión del dueño): todas las
// empresas arrancan con los mismos cinco, y cada una los puede cambiar por otros del catálogo o por los
// suyos, con máximo cinco. «Otro» va siempre al final y no se puede quitar. Lo ya respondido conserva el
// motivo con el nombre que tenía: cambiar uno aquí no reescribe el pasado.
export default function EditorMotivos({ inicial, onGuardado }: { inicial: MotivosClima; onGuardado: (motivos: string[]) => void }) {
  const [motivos, setMotivos] = useState(inicial.motivos);
  const [propio, setPropio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const lleno = motivos.length >= inicial.maximo;
  const tiene = (m: string) => motivos.some(x => x.toLocaleLowerCase('es') === m.trim().toLocaleLowerCase('es'));

  const agregar = (m: string) => {
    const limpio = m.trim();
    if (!limpio || lleno || tiene(limpio)) return;
    setMotivos([...motivos, limpio]);
    setMensaje(null);
  };
  const quitar = (m: string) => { setMotivos(motivos.filter(x => x !== m)); setMensaje(null); };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await api.put('/clima/motivos', { motivos });
      onGuardado(r.data.motivos);
      setMensaje({ ok: true, texto: 'Motivos guardados.' });
    } catch (err) {
      const texto = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'No se pudieron guardar los motivos.';
      setMensaje({ ok: false, texto });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <div className="bg-white rounded-card border border-gray-200 p-5">
        <p className="font-semibold text-ink">Motivos de tu empresa</p>
        <p className="text-xs text-muted mb-4">
          {`Salen en el kiosco con Muy mal, Mal y Normal. Hasta ${inicial.maximo}. «${inicial.otro}» va siempre al final y abre la observación.`}
        </p>
        <ul aria-label="Motivos de la empresa" className="space-y-2">
          {motivos.map(m => (
            <li key={m} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-ink">
              {m}
              <button type="button" onClick={() => quitar(m)} aria-label={`Quitar «${m}»`} className="text-muted hover:text-ink">
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-sm text-muted">{inicial.otro}</p>

        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <label htmlFor="motivo-propio" className="sr-only">Motivo propio</label>
            <input
              id="motivo-propio" value={propio} maxLength={40} placeholder="Escribe un motivo propio" disabled={lleno}
              onChange={e => setPropio(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { agregar(propio); setPropio(''); } }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
          <button
            type="button" disabled={lleno || !propio.trim() || tiene(propio)} onClick={() => { agregar(propio); setPropio(''); }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-ink text-white disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
        {lleno && <p className="text-xs text-muted mt-2">{`Ya tienes ${inicial.maximo}. Quita uno para agregar otro.`}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button" onClick={guardar} disabled={guardando || motivos.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary-dark text-ink disabled:opacity-50"
          >
            Guardar motivos
          </button>
          <button
            type="button" onClick={() => { setMotivos(inicial.predeterminados); setMensaje(null); }}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Volver a los predeterminados
          </button>
        </div>
        {mensaje && <p role="status" className={`text-sm mt-3 ${mensaje.ok ? 'text-green-700' : 'text-red-700'}`}>{mensaje.texto}</p>}
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-5">
        <p className="font-semibold text-ink">Catálogo</p>
        <p className="text-xs text-muted mb-4">Toca uno para agregarlo.</p>
        <div className="space-y-4">
          {inicial.catalogo.map(t => (
            <div key={t.tema}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">{t.tema}</p>
              <div className="flex flex-wrap gap-2">
                {t.motivos.map(m => {
                  const yaEsta = tiene(m);
                  return (
                    <button
                      key={m} type="button" disabled={yaEsta || lleno} onClick={() => agregar(m)}
                      aria-label={yaEsta ? `«${m}» ya está` : `Agregar «${m}»`}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        yaEsta ? 'border-primary bg-primary/25 text-ink' : 'border-gray-300 text-ink hover:bg-gray-50 disabled:opacity-40'}`}
                    >
                      {!yaEsta && <Plus size={13} aria-hidden="true" />}{m}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
