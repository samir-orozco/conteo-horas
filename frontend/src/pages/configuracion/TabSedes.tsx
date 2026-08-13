import { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Lock, Crosshair, Users, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useMiPlan } from '../../lib/plan';

export type Sede = {
  id: string; nombre: string; direccion: string | null;
  lat: number | null; lng: number | null; radio: number;
  _count?: { colaboradores: number };
};

const VACIA = { nombre: '', direccion: '', lat: '', lng: '', radio: '150', exigeUbicacion: false };

export default function TabSedes() {
  const navigate = useNavigate();
  const { plan } = useMiPlan();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Sede | null>(null);
  const [form, setForm] = useState(VACIA);
  const [error, setError] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const [eliminando, setEliminando] = useState<Sede | null>(null);

  const cargar = () => api.get('/sedes').then(r => setSedes(r.data));
  useEffect(() => { cargar(); }, []);

  // La segunda sede en adelante exige plan Empresarial. La primera siempre se
  // permite: es la que hereda la geocerca que la empresa ya tenía.
  const bloqueado = !!plan && !plan.features.multiSede && sedes.length >= 1;

  const abrir = (s?: Sede) => {
    setEditando(s ?? null);
    setError('');
    setForm(s
      ? { nombre: s.nombre, direccion: s.direccion ?? '', lat: s.lat?.toString() ?? '', lng: s.lng?.toString() ?? '', radio: String(s.radio), exigeUbicacion: s.lat !== null && s.lng !== null }
      : VACIA);
    setModal(true);
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return setError('Tu navegador no permite obtener la ubicación.');
    setUbicando(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        setUbicando(false);
      },
      () => { setError('No pudimos leer tu ubicación. Revisa los permisos del navegador.'); setUbicando(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // El interruptor manda: apagado, la sede se guarda SIN coordenadas y no
    // exige nada. Encendido, las coordenadas son obligatorias — guardar una
    // geocerca activada y a medias dejaría una sede imposible de cumplir.
    if (form.exigeUbicacion && (form.lat === '' || form.lng === '')) {
      return setError('Fija la ubicación con "Usar mi ubicación actual" o escribe latitud y longitud.');
    }
    const cuerpo = {
      nombre: form.nombre, direccion: form.direccion,
      lat: form.exigeUbicacion ? Number(form.lat) : null,
      lng: form.exigeUbicacion ? Number(form.lng) : null,
      radio: Number(form.radio) || 150,
    };
    try {
      if (editando) await api.put(`/sedes/${editando.id}`, cuerpo);
      else await api.post('/sedes', cuerpo);
      setModal(false);
      cargar();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'No pudimos guardar la sede');
    }
  };

  const eliminar = async () => {
    if (!eliminando) return;
    await api.delete(`/sedes/${eliminando.id}`);
    setEliminando(null);
    cargar();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Sedes</h1>
        <p className="text-sm text-muted">Cada local con su propia ubicación. Los colaboradores marcan solo en las suyas.</p>
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2"><MapPin size={17} /> Sedes de la empresa</h3>
          {bloqueado ? (
            <button onClick={() => navigate('/app/configuracion?tab=suscripcion')} title="Sube a Empresarial para manejar varias sedes"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg">
              <Lock size={13} /> Varias sedes: sube de plan
            </button>
          ) : (
            <button onClick={() => abrir()}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:brightness-95 px-3 py-2 rounded-lg">
              <Plus size={14} /> Nueva sede
            </button>
          )}
        </div>

        {sedes.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">Todavía no hay sedes.</p>
        ) : (
          <div className="space-y-2">
            {sedes.map(s => (
              <div key={s.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{s.nombre}</p>
                  {s.direccion && <p className="text-xs text-muted">{s.direccion}</p>}
                  <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {s.lat !== null && s.lng !== null ? (
                      <span className="flex items-center gap-1"><Crosshair size={12} /> {s.lat.toFixed(5)}, {s.lng.toFixed(5)} · radio {s.radio} m</span>
                    ) : (
                      <span className="text-amber-700">No exige ubicación: pueden marcar desde cualquier lugar</span>
                    )}
                    <span className="flex items-center gap-1"><Users size={12} /> {s._count?.colaboradores ?? 0}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrir(s)} className="p-2 text-gray-400 hover:text-ink" title="Editar"><Pencil size={15} /></button>
                  <button onClick={() => setEliminando(s)} className="p-2 text-gray-400 hover:text-red-500" title="Eliminar"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          Cada sede decide si exige ubicación. Fíjala <b>desde el celular y parado en el sitio</b>: el
          computador ubica por wifi o por IP y suele errar por mucho.
        </p>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <form onSubmit={guardar} onClick={e => e.stopPropagation()}
            className="hp-pop bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">{editando ? 'Editar sede' : 'Nueva sede'}</h3>
              <button type="button" onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nombre (ej: El Poblado, Bodega norte)</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Dirección (opcional)</label>
                <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* Exigir ubicación es una DECISIÓN, no la ausencia de un dato. Antes
                  se apagaba dejando las coordenadas en blanco, y nadie podía
                  saber si eso era a propósito o un campo sin llenar. */}
              <div className="border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Exigir ubicación para marcar</p>
                    <p className="text-xs text-muted mt-0.5">
                      {form.exigeUbicacion
                        ? 'Solo podrán marcar dentro del radio de esta sede.'
                        : 'Podrán marcar desde cualquier lugar.'}
                    </p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.exigeUbicacion}
                    onClick={() => setForm(p => ({ ...p, exigeUbicacion: !p.exigeUbicacion }))}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${form.exigeUbicacion ? 'bg-primary' : 'bg-gray-200'}`}>
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${form.exigeUbicacion ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {form.exigeUbicacion && (
                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-amber-900 leading-relaxed flex items-start gap-1.5">
                        <Smartphone size={13} className="mt-0.5 shrink-0" />
                        <span>
                          <b>Hazlo desde el celular, parado en la sede.</b> El computador ubica por wifi o por IP
                          y puede fallar por kilómetros; el celular usa el GPS real. Si la fijas mal, nadie va a
                          poder marcar.
                        </span>
                      </p>
                    </div>

                    <button type="button" onClick={usarMiUbicacion} disabled={ubicando}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-ink bg-gray-100 hover:bg-gray-200 px-2.5 py-2 rounded-lg disabled:opacity-60">
                      <Crosshair size={13} /> {ubicando ? 'Buscando...' : 'Usar mi ubicación actual'}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Latitud</label>
                        <input value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} placeholder="6.208700"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Longitud</label>
                        <input value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))} placeholder="-75.567400"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Radio permitido (metros)</label>
                      <input type="number" min={20} max={5000} value={form.radio}
                        onChange={e => setForm(p => ({ ...p, radio: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      <p className="text-[11px] text-muted mt-1">
                        Recomendado <b>100–150 m</b>. Ni el mejor GPS es exacto, y un radio muy corto deja a
                        gente honesta sin poder marcar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 text-sm font-semibold text-ink bg-primary hover:brightness-95 rounded-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {eliminando && (
        <ConfirmDialog
          abierto
          titulo={`Eliminar ${eliminando.nombre}`}
          subtitulo="Los colaboradores asignados quedarán sin esta sede. Las marcaciones que ya se hicieron ahí conservan su registro histórico."
          textoContinuar="Eliminar"
          peligro
          onContinuar={eliminar}
          onCancelar={() => setEliminando(null)}
        />
      )}
    </div>
  );
}
