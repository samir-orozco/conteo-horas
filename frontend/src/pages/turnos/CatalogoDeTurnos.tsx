import { useState, useEffect } from 'react';
import { Clock, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import ListaDeDescansos from '../configuracion/ListaDeDescansos';
import { MAX_DESCANSOS_POR_FRANJA, minutosEntre, type Ventana } from '../../lib/descansos';
import { COLORES_DE_TURNO, ETIQUETA_COLOR, CLASES_COLOR, normalizarColor } from '../../lib/coloresDeTurno';
import { cuerpoDeLaPlantilla, type FormularioDePlantilla } from './cuerpoDeLaPlantilla';

// EL CATÁLOGO DE TURNOS DE LA EMPRESA (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Un turno es una FRANJA SIN DÍAS: «Mañana 06:00-14:00», «Noche 22:00-06:00», «Descanso». Los días
// se los pone el planificador al pintar el calendario, y por eso el mismo turno sirve para
// cualquier persona en cualquier fecha.
//
// Qué vive aquí y qué no: el turno lleva las horas, la ventana de almuerzo y los descansos; las
// tolerancias y `ajustaEntrada` siguen en el Horario, porque son política de la empresa y no del
// turno. Por eso esta pestaña no repite nada de aquella.
//
// El editor de descansos es el MISMO de los horarios (`ListaDeDescansos`), no una copia.

type Plantilla = {
  id: string; nombre: string; color: string; esDescanso: boolean; sedeId: string | null;
  horaEntrada: string | null; horaSalida: string | null; tieneAlmuerzo: boolean;
  almuerzoInicio: string | null; almuerzoFin: string | null; descansos: Ventana[];
};

type Sede = { id: string; nombre: string };

const VACIO: FormularioDePlantilla = {
  nombre: '', color: 'grafito', esDescanso: false, sedeId: '',
  horaEntrada: '08:00', horaSalida: '17:00',
  tieneAlmuerzo: true, almuerzoInicio: '', almuerzoFin: '',
  descansos: [],
};

export default function CatalogoDeTurnos() {
  const [turnos, setTurnos] = useState<Plantilla[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [form, setForm] = useState<FormularioDePlantilla>(VACIO);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState<Plantilla | null>(null);
  const [aviso, setAviso] = useState('');

  const cargar = () => api.get('/plantillas-turno').then(r => setTurnos(r.data));
  useEffect(() => {
    cargar();
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([]));
  }, []);

  const abrir = (p?: Plantilla) => {
    setEditando(p ?? null);
    setError('');
    setForm(p
      ? {
        nombre: p.nombre, color: normalizarColor(p.color), esDescanso: p.esDescanso, sedeId: p.sedeId ?? '',
        horaEntrada: p.horaEntrada ?? '08:00', horaSalida: p.horaSalida ?? '17:00',
        tieneAlmuerzo: p.tieneAlmuerzo, almuerzoInicio: p.almuerzoInicio ?? '', almuerzoFin: p.almuerzoFin ?? '',
        descansos: p.descansos ?? [],
      }
      : VACIO);
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cuerpo = cuerpoDeLaPlantilla(form);
    try {
      if (editando) await api.put(`/plantillas-turno/${editando.id}`, cuerpo);
      else await api.post('/plantillas-turno', cuerpo);
      setModal(false);
      cargar();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'No pudimos guardar el turno');
    }
  };

  const eliminar = async () => {
    if (!eliminando) return;
    setAviso('');
    try {
      await api.delete(`/plantillas-turno/${eliminando.id}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setAviso(msg ?? 'No pudimos eliminar el turno');
    }
    setEliminando(null);
    cargar();
  };

  const duracion = minutosEntre(form.horaEntrada, form.horaSalida);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Turnos</h1>
        <p className="text-sm text-muted">
          Los turnos que existen en tu empresa. Definirlos aquí una vez es lo que después deja
          armar el calendario de cada persona sin volver a escribir horarios.
        </p>
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Clock size={17} /> Catálogo de turnos</h3>
          <button onClick={() => abrir()}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:brightness-95 px-3 py-2 rounded-lg">
            <Plus size={14} /> Nuevo turno
          </button>
        </div>

        {aviso && <p className="text-sm text-red-600 mb-3">{aviso}</p>}

        {turnos.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">Todavía no hay turnos.</p>
        ) : (
          <div className="space-y-2">
            {turnos.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CLASES_COLOR[normalizarColor(p.color)]}`}>
                      {p.nombre}
                    </span>
                  </p>
                  <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {/* Un día libre NO tiene horario, y decirlo importa: en blanco se leería como
                        «todavía sin configurar», que es otra cosa. */}
                    {p.esDescanso ? (
                      <span>Día libre: no se espera que marque</span>
                    ) : (
                      <span>De {p.horaEntrada} a {p.horaSalida}</span>
                    )}
                    {!p.esDescanso && p.almuerzoInicio && p.almuerzoFin && (
                      <span>Almuerzo {p.almuerzoInicio}–{p.almuerzoFin}</span>
                    )}
                    {!p.esDescanso && p.descansos?.length > 0 && (
                      <span>{p.descansos.length} descanso{p.descansos.length > 1 ? 's' : ''}</span>
                    )}
                    {p.sedeId && <span>{sedes.find(s => s.id === p.sedeId)?.nombre ?? 'Sede'}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrir(p)} className="p-2 text-gray-400 hover:text-ink" title="Editar"
                    aria-label={`Editar ${p.nombre}`}><Pencil size={15} /></button>
                  <button onClick={() => setEliminando(p)} className="p-2 text-gray-400 hover:text-red-500" title="Eliminar"
                    aria-label={`Eliminar ${p.nombre}`}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          Un turno no se le asigna a nadie desde aquí: se usa para pintar el calendario. Las
          tolerancias siguen viviendo en <b>Horario</b>, porque son política de la empresa y no
          de cada turno.
        </p>
      </div>

      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <form onSubmit={guardar} onClick={e => e.stopPropagation()}
            className="hp-pop bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">{editando ? 'Editar turno' : 'Nuevo turno'}</h3>
              <button type="button" onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="turno-nombre" className="block text-xs font-medium text-muted mb-1">
                  Nombre (ej: Mañana, Noche, Descanso)
                </label>
                <input id="turno-nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <p className="block text-xs font-medium text-muted mb-1.5">Color en el calendario</p>
                <div className="flex flex-wrap gap-2">
                  {COLORES_DE_TURNO.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      aria-label={ETIQUETA_COLOR[c]} aria-pressed={form.color === c}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CLASES_COLOR[c]} ${form.color === c ? 'ring-2 ring-ink ring-offset-1' : ''}`}>
                      {ETIQUETA_COLOR[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Un día libre no tiene horario. Al marcarlo, el horario DESAPARECE en vez de
                  quedarse ahí apagado: dejarlo visible invitaría a escribir una contradicción. */}
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer border border-gray-200 rounded-xl px-3 py-2.5">
                <input type="checkbox" checked={form.esDescanso}
                  onChange={e => setForm(p => ({ ...p, esDescanso: e.target.checked }))} className="rounded" />
                Es un día de descanso
                <span className="text-xs text-muted">— sin horario</span>
              </label>

              {!form.esDescanso && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="turno-entrada" className="block text-xs font-medium text-muted mb-1">Hora de entrada</label>
                      <input id="turno-entrada" type="time" value={form.horaEntrada} required
                        onChange={e => setForm(p => ({ ...p, horaEntrada: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="turno-salida" className="block text-xs font-medium text-muted mb-1">Hora de salida</label>
                      <input id="turno-salida" type="time" value={form.horaSalida} required
                        onChange={e => setForm(p => ({ ...p, horaSalida: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  {duracion > 0 && (
                    <p className="text-[11px] text-muted -mt-2">
                      Dura <b>{(duracion / 60).toFixed(1)} h</b>{duracion > 0 && form.horaSalida <= form.horaEntrada ? ' y cruza la medianoche' : ''}.
                    </p>
                  )}

                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input type="checkbox" checked={form.tieneAlmuerzo}
                      onChange={e => setForm(p => ({ ...p, tieneAlmuerzo: e.target.checked }))} className="rounded" />
                    Descontar almuerzo en este turno
                    <span className="text-muted">— desmárcalo para turnos cortos</span>
                  </label>

                  {form.tieneAlmuerzo && (
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-muted">Horario del almuerzo (opcional)</p>
                        {(form.almuerzoInicio || form.almuerzoFin) && (
                          <button type="button" onClick={() => setForm(p => ({ ...p, almuerzoInicio: '', almuerzoFin: '' }))}
                            className="text-[11px] font-semibold text-red-500 hover:text-red-600 underline underline-offset-2">
                            Limpiar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="turno-almuerzo-desde" className="block text-xs font-medium text-muted mb-1">Desde</label>
                          <input id="turno-almuerzo-desde" type="time" value={form.almuerzoInicio}
                            onChange={e => setForm(p => ({ ...p, almuerzoInicio: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label htmlFor="turno-almuerzo-hasta" className="block text-xs font-medium text-muted mb-1">Hasta</label>
                          <input id="turno-almuerzo-hasta" type="time" value={form.almuerzoFin}
                            onChange={e => setForm(p => ({ ...p, almuerzoFin: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                        Dice a qué hora se almuerza, para que el kiosco lo ofrezca entonces. Cuánto se
                        descuenta no depende de esto: vacío, valen los minutos fijos del horario.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-muted mb-1">
                      Descansos no remunerados <span className="font-normal text-gray-400">(opcional)</span>
                    </p>
                    <ListaDeDescansos descansos={form.descansos} max={MAX_DESCANSOS_POR_FRANJA}
                      onCambiar={descansos => setForm(p => ({ ...p, descansos }))} />
                  </div>
                </>
              )}

              {sedes.length > 1 && (
                <div>
                  <label htmlFor="turno-sede" className="block text-xs font-medium text-muted mb-1">Sede (opcional)</label>
                  <select id="turno-sede" value={form.sedeId} onChange={e => setForm(p => ({ ...p, sedeId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Cualquier sede</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}

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
          subtitulo="El turno deja de aparecer para armar el calendario. Lo que ya esté planificado con él no se toca."
          textoContinuar="Eliminar"
          peligro
          onContinuar={eliminar}
          onCancelar={() => setEliminando(null)}
        />
      )}
    </div>
  );
}
