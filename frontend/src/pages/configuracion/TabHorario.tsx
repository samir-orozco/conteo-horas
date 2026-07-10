import { useState, useEffect } from 'react';
import { Scale, CalendarClock, Clock3, Plus, Trash2, X, Pencil } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';

export type Franja = { dias: string[]; horaEntrada: string; horaSalida: string };
export type Horario = {
  id: string; nombre: string; toleranciaMin: number;
  franjas: Franja[]; _count?: { colaboradores: number };
};

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIA_CORTO: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom',
};

const FRANJA_LV: Franja = { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00' };
const HORARIO_VACIO = { nombre: '', toleranciaMin: 10, franjas: [{ ...FRANJA_LV }] };

type TipoHora = {
  id: string; nombre: string; codigo: string; horaInicio: number; horaFin: number;
  recargo: number; aplica: string[]; vigenteDesde: string; vigenteHasta: string | null;
};
type Legales = {
  fechaReferencia: string;
  jornadaSemanal: number;
  horasMes: number;
  tiposHoraVigentes: TipoHora[];
  calendarioJornadas: { id: string; vigenteDesde: string; horasSemanales: number }[];
};

const fmtFecha = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TabHorario() {
  const [legales, setLegales] = useState<Legales | null>(null);

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [modalHorario, setModalHorario] = useState(false);
  const [editandoHorario, setEditandoHorario] = useState<Horario | null>(null);
  const [formHorario, setFormHorario] = useState<{ nombre: string; toleranciaMin: number; franjas: Franja[] }>(HORARIO_VACIO);
  const [errorHorario, setErrorHorario] = useState('');
  const [eliminandoHorario, setEliminandoHorario] = useState<Horario | null>(null);

  const cargarHorarios = () => api.get('/horarios').then(r => setHorarios(r.data));

  useEffect(() => {
    api.get('/configuracion/legales').then(r => setLegales(r.data));
    cargarHorarios();
  }, []);

  const abrirHorario = (h?: Horario) => {
    setEditandoHorario(h ?? null);
    setErrorHorario('');
    setFormHorario(h
      ? { nombre: h.nombre, toleranciaMin: h.toleranciaMin, franjas: h.franjas.map(f => ({ dias: [...f.dias], horaEntrada: f.horaEntrada, horaSalida: f.horaSalida })) }
      : { ...HORARIO_VACIO, franjas: [{ ...FRANJA_LV, dias: [...FRANJA_LV.dias] }] });
    setModalHorario(true);
  };

  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHorario('');
    if (formHorario.franjas.some(f => f.dias.length === 0)) {
      return setErrorHorario('Cada franja debe tener al menos un día seleccionado.');
    }
    try {
      if (editandoHorario) await api.put(`/horarios/${editandoHorario.id}`, formHorario);
      else await api.post('/horarios', formHorario);
      setModalHorario(false);
      cargarHorarios();
    } catch (err: any) {
      setErrorHorario(err.response?.data?.error ?? 'No pudimos guardar el horario');
    }
  };

  const eliminarHorario = async () => {
    if (!eliminandoHorario) return;
    await api.delete(`/horarios/${eliminandoHorario.id}`);
    setEliminandoHorario(null);
    cargarHorarios();
  };

  const setFranja = (i: number, cambio: Partial<Franja>) => {
    setFormHorario(p => ({ ...p, franjas: p.franjas.map((f, j) => (j === i ? { ...f, ...cambio } : f)) }));
  };

  const toggleDia = (i: number, dia: string) => {
    const f = formHorario.franjas[i];
    setFranja(i, { dias: f.dias.includes(dia) ? f.dias.filter(d => d !== dia) : [...f.dias, dia] });
  };

  const agregarFranja = () => {
    // Sugerencia útil: la segunda franja suele ser el sábado medio día
    const usados = new Set(formHorario.franjas.flatMap(f => f.dias));
    const libres = DIAS_SEMANA.filter(d => !usados.has(d));
    setFormHorario(p => ({
      ...p,
      franjas: [...p.franjas, { dias: libres.length ? [libres[0]] : [], horaEntrada: '08:00', horaSalida: '12:00' }],
    }));
  };

  const quitarFranja = (i: number) => {
    setFormHorario(p => ({ ...p, franjas: p.franjas.filter((_, j) => j !== i) }));
  };

  const hoy = new Date();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Horario</h1>
        <p className="text-sm text-muted">Turnos de trabajo y jornada laboral vigente.</p>
      </div>

      {/* Horarios de trabajo */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Clock3 size={17} /> Horarios de trabajo</h3>
          <button onClick={() => abrirHorario()} className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg">
            <Plus size={14} /> Nuevo horario
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          Un horario puede tener varias franjas — por ejemplo lunes a viernes de 08:00 a 17:00
          y sábados de 08:00 a 12:00 — y se asigna completo a cada colaborador desde su perfil.
        </p>
        {horarios.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay horarios. Crea el primero, por ejemplo "Oficina" L-V 08:00-17:00 y Sáb 08:00-12:00.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {horarios.map(h => (
              <div key={h.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{h.nombre}</p>
                  <div className="flex gap-1">
                    <button onClick={() => abrirHorario(h)} className="p-1.5 text-muted hover:bg-primary/30 hover:text-ink rounded-lg"><Pencil size={13} /></button>
                    <button onClick={() => setEliminandoHorario(h)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="mt-1 space-y-0.5">
                  {h.franjas.map((f, i) => (
                    <p key={i} className="text-xs text-ink">
                      <span className="text-muted">{f.dias.map(d => DIA_CORTO[d]).join(' · ')}</span>
                      {' '}<span className="font-medium">{f.horaEntrada} — {f.horaSalida}</span>
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2">Tolerancia {h.toleranciaMin} min · {h._count?.colaboradores ?? 0} colaborador{(h._count?.colaboradores ?? 0) === 1 ? '' : 'es'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jornada legal con vigencias */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
          <CalendarClock size={17} /> Jornada laboral legal
        </h3>
        <p className="text-xs text-muted mb-4">Ley 2101 de 2021 — la plataforma aplica automáticamente la jornada vigente en cada fecha</p>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-primary/30 rounded-xl px-4 py-3">
            <p className="text-xs text-ink/70">Jornada vigente hoy</p>
            <p className="text-xl font-bold text-ink">{legales?.jornadaSemanal ?? '—'} h/semana</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-muted">Divisor valor hora</p>
            <p className="text-xl font-bold text-ink">{legales?.horasMes ?? '—'} h/mes</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {legales?.calendarioJornadas.map(j => {
            const activa = new Date(j.vigenteDesde) <= hoy &&
              !legales.calendarioJornadas.some(o => new Date(o.vigenteDesde) > new Date(j.vigenteDesde) && new Date(o.vigenteDesde) <= hoy);
            return (
              <span key={j.id} className={`text-xs px-3 py-1.5 rounded-full font-medium ${activa ? 'bg-primary text-ink' : 'bg-gray-100 text-muted'}`}>
                {j.horasSemanales}h desde {fmtFecha(j.vigenteDesde)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tipos de hora vigentes (solo lectura) */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
          <Scale size={17} /> Tipos de hora y recargos vigentes
        </h3>
        <p className="text-xs text-muted mb-4">
          CST + Ley 2466 de 2025. Los recargos los actualiza HoraPro según los cambios de ley (nocturno desde las 7 p.m.; dominical/festivo sube gradualmente hasta 100% en 2027).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-muted uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-center">Franja</th>
                <th className="px-3 py-2 text-center">Recargo</th>
                <th className="px-3 py-2 text-center">Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {legales?.tiposHoraVigentes.map(tipo => (
                <tr key={tipo.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{tipo.nombre}</p>
                    <p className="text-xs text-gray-400">{tipo.codigo}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted">
                    {String(tipo.horaInicio).padStart(2, '0')}:00 – {String(tipo.horaFin).padStart(2, '0')}:00
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-semibold text-ink">×{tipo.recargo.toFixed(2)}</span>
                    <p className="text-xs text-gray-400">{((tipo.recargo - 1) * 100).toFixed(0)}% extra</p>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted">
                    desde {fmtFecha(tipo.vigenteDesde)}{tipo.vigenteHasta ? ` hasta ${fmtFecha(tipo.vigenteHasta)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal horario */}
      {modalHorario && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">{editandoHorario ? 'Editar horario' : 'Nuevo horario'}</h3>
              <button onClick={() => setModalHorario(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarHorario} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1">Nombre (ej: Oficina, Turno nocturno)</label>
                  <input value={formHorario.nombre} onChange={e => setFormHorario(p => ({ ...p, nombre: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Tolerancia (min)</label>
                  <input type="number" min={0} max={60} value={formHorario.toleranciaMin}
                    onChange={e => setFormHorario(p => ({ ...p, toleranciaMin: Number(e.target.value) }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Franjas del horario</p>
                {formHorario.franjas.map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {DIAS_SEMANA.map(d => (
                          <button type="button" key={d} onClick={() => toggleDia(i, d)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${f.dias.includes(d) ? 'bg-primary text-ink' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}>
                            {DIA_CORTO[d]}
                          </button>
                        ))}
                      </div>
                      {formHorario.franjas.length > 1 && (
                        <button type="button" onClick={() => quitarFranja(i)} title="Quitar franja"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Entrada</label>
                        <input type="time" value={f.horaEntrada} onChange={e => setFranja(i, { horaEntrada: e.target.value })} required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Salida</label>
                        <input type="time" value={f.horaSalida} onChange={e => setFranja(i, { horaSalida: e.target.value })} required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={agregarFranja}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-primary text-muted hover:text-ink rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Plus size={15} /> Agregar franja (ej: sábados medio día)
                </button>
              </div>

              {errorHorario && <p className="text-red-600 text-sm">{errorHorario}</p>}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModalHorario(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        abierto={!!eliminandoHorario}
        peligro
        titulo="¿Eliminar horario?"
        subtitulo={eliminandoHorario ? `"${eliminandoHorario.nombre}" se eliminará y los colaboradores que lo tienen quedarán sin horario asignado (sin control de tardanzas).` : ''}
        textoContinuar="Sí, eliminar"
        onContinuar={eliminarHorario}
        onCancelar={() => setEliminandoHorario(null)}
      />
    </div>
  );
}
