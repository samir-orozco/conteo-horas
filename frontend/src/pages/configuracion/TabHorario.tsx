import { useState, useEffect } from 'react';
import { Scale, CalendarClock, Clock3, Plus, Trash2, X, Pencil, AlertTriangle, Lock, Timer, Check, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useMiPlan } from '../../lib/plan';

export type Franja = { dias: string[]; horaEntrada: string; horaSalida: string; tieneAlmuerzo?: boolean; almuerzoInicio?: string | null; almuerzoFin?: string | null };
export type Horario = {
  id: string; nombre: string; toleranciaMin: number; almuerzoMin?: number;
  toleranciaSalidaMin?: number; ajustaEntrada?: boolean;
  franjas: Franja[]; _count?: { colaboradores: number };
};

// Minutos de "HH:MM"; si la salida es menor o igual, cruza medianoche.
const aMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
// Vuelta a "HH:MM". Da la vuelta al día para que un almuerzo de madrugada no
// termine en "25:00".
const aHHMM = (min: number) => {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const duracionFranjaMin = (f: Franja) => { let fin = aMin(f.horaSalida); const ini = aMin(f.horaEntrada); if (fin <= ini) fin += 1440; return fin - ini; };
// Duración de la ventana de almuerzo, si está configurada. Es la que manda sobre
// los minutos sueltos: el admin pone las horas y el sistema calcula el tiempo.
const minutosVentana = (f: Franja): number => {
  if (!f.almuerzoInicio || !f.almuerzoFin) return 0;
  let fin = aMin(f.almuerzoFin); const ini = aMin(f.almuerzoInicio);
  if (fin <= ini) fin += 1440;
  return fin - ini;
};

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIA_CORTO: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom',
};

const FRANJA_LV: Franja = { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true };
const HORARIO_VACIO = { nombre: '', toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 0, ajustaEntrada: false, franjas: [{ ...FRANJA_LV }] };

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
  const navigate = useNavigate();
  const { plan } = useMiPlan();
  const [legales, setLegales] = useState<Legales | null>(null);

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [modalHorario, setModalHorario] = useState(false);
  const [editandoHorario, setEditandoHorario] = useState<Horario | null>(null);
  const [formHorario, setFormHorario] = useState<{ nombre: string; toleranciaMin: number; almuerzoMin: number; toleranciaSalidaMin: number; ajustaEntrada: boolean; franjas: Franja[] }>(HORARIO_VACIO);
  const [errorHorario, setErrorHorario] = useState('');
  const [eliminandoHorario, setEliminandoHorario] = useState<Horario | null>(null);
  // Desde cuándo aplicó el último cambio. Sin decirlo, el administrador que le
  // cambia el horario a alguien que ya marcó cree que no se guardó — que es
  // justo lo que pasaba cuando el cambio aplicaba siempre desde mañana.
  const [avisoHorario, setAvisoHorario] = useState<{ hoy: number; diferidos: { id: string; nombre: string }[] } | null>(null);

  // Modo de cálculo de horas extra (SEMANAL por defecto)
  const [modoExtra, setModoExtra] = useState<'SEMANAL' | 'HORARIO'>('SEMANAL');
  const [modoExtraGuardado, setModoExtraGuardado] = useState(false);

  const cargarHorarios = () => api.get('/horarios').then(r => setHorarios(r.data));

  useEffect(() => {
    api.get('/configuracion/legales').then(r => setLegales(r.data));
    api.get('/configuracion').then(r => setModoExtra(r.data.HORAS_EXTRA_MODO === 'HORARIO' ? 'HORARIO' : 'SEMANAL'));
    cargarHorarios();
  }, []);

  const cambiarModoExtra = async (m: 'SEMANAL' | 'HORARIO') => {
    if (m === modoExtra) return;
    const anterior = modoExtra;
    setModoExtra(m);
    setModoExtraGuardado(false);
    try {
      await api.put('/configuracion', { HORAS_EXTRA_MODO: m });
      setModoExtraGuardado(true);
    } catch {
      setModoExtra(anterior); // revertir si falla
    }
  };

  const abrirHorario = (h?: Horario) => {
    setEditandoHorario(h ?? null);
    setErrorHorario('');
    setFormHorario(h
      ? { nombre: h.nombre, toleranciaMin: h.toleranciaMin, almuerzoMin: h.almuerzoMin ?? 0, toleranciaSalidaMin: h.toleranciaSalidaMin ?? 0, ajustaEntrada: h.ajustaEntrada ?? false, franjas: h.franjas.map(f => ({ dias: [...f.dias], horaEntrada: f.horaEntrada, horaSalida: f.horaSalida, tieneAlmuerzo: f.tieneAlmuerzo !== false, almuerzoInicio: f.almuerzoInicio ?? '', almuerzoFin: f.almuerzoFin ?? '' })) }
      : { ...HORARIO_VACIO, franjas: [{ ...FRANJA_LV, dias: [...FRANJA_LV.dias] }] });
    setModalHorario(true);
  };

  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHorario('');
    setAvisoHorario(null);
    if (formHorario.franjas.some(f => f.dias.length === 0)) {
      return setErrorHorario('Cada franja debe tener al menos un día seleccionado.');
    }
    try {
      if (editandoHorario) {
        const { data } = await api.put(`/horarios/${editandoHorario.id}`, formHorario);
        setAvisoHorario(data.regeneracion ?? null);
      } else {
        await api.post('/horarios', formHorario);
      }
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
      franjas: [...p.franjas, { dias: libres.length ? [libres[0]] : [], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false }],
    }));
  };

  const quitarFranja = (i: number) => {
    setFormHorario(p => ({ ...p, franjas: p.franjas.filter((_, j) => j !== i) }));
  };

  // ¿Los colaboradores marcan su almuerzo? Se DERIVA de las franjas en vez de
  // guardarse aparte: tener la ventana es lo que hace que el kiosco pregunte,
  // así que un interruptor propio podría acabar diciendo una cosa mientras los
  // datos dicen otra. Sin horas configuradas, nadie marca nada.
  const marcanAlmuerzo = formHorario.franjas.some(f => f.almuerzoInicio && f.almuerzoFin);

  const cambiarModoAlmuerzo = (marcan: boolean) => {
    setFormHorario(p => ({
      ...p,
      franjas: p.franjas.map(f => {
        // Solo se toca lo que descuenta almuerzo: el sábado corto sigue igual.
        if (f.tieneAlmuerzo === false) return { ...f, almuerzoInicio: '', almuerzoFin: '' };
        if (!marcan) return { ...f, almuerzoInicio: '', almuerzoFin: '' };
        if (f.almuerzoInicio && f.almuerzoFin) return f;
        // Punto de partida razonable: al mediodía y con la duración que ya
        // tenía configurada. El admin lo ajusta si su empresa almuerza a otra hora.
        const dur = p.almuerzoMin > 0 ? p.almuerzoMin : 60;
        return { ...f, almuerzoInicio: '12:00', almuerzoFin: aHHMM(12 * 60 + dur) };
      }),
    }));
  };

  const hoy = new Date();

  // Resumen en vivo del horario que se está editando (horas por semana/mes ya sin almuerzo)
  const semanaMin = formHorario.franjas.reduce(
    (s, f) => s + f.dias.length * Math.max(0, duracionFranjaMin(f) - (f.tieneAlmuerzo !== false ? (minutosVentana(f) || formHorario.almuerzoMin) : 0)),
    0
  );
  const semanaH = semanaMin / 60;
  const mesH = semanaH * (52 / 12);
  const norma = legales?.jornadaSemanal ?? 0;
  const cumpleNorma = norma <= 0 || semanaH <= norma + 0.001;
  const fmtH = (h: number) => Number.isInteger(h) ? `${h}` : h.toFixed(1);

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
          {plan && !plan.features.multiHorario && horarios.length >= 1 ? (
            <button onClick={() => navigate('/app/configuracion?tab=suscripcion')} title="Sube de plan para crear más horarios"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg">
              <Lock size={13} /> Varios horarios: sube de plan
            </button>
          ) : (
            <button onClick={() => abrirHorario()} className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg">
              <Plus size={14} /> Nuevo horario
            </button>
          )}
        </div>
        <p className="text-xs text-muted mb-4">
          Un horario puede tener varias franjas — por ejemplo lunes a viernes de 08:00 a 17:00
          y sábados de 08:00 a 12:00 — y se asigna completo a cada colaborador desde su perfil.
        </p>
        {avisoHorario && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-2.5 text-xs mb-4">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">
              {avisoHorario.hoy > 0 && (
                <>Aplicado <b>desde hoy</b> a {avisoHorario.hoy} {avisoHorario.hoy === 1 ? 'colaborador' : 'colaboradores'}. </>
              )}
              {avisoHorario.diferidos.length > 0 && (
                <>
                  A <b>{avisoHorario.diferidos.map(d => d.nombre).join(', ')}</b> le aplica{' '}
                  <b>desde mañana</b>, porque ya {avisoHorario.diferidos.length === 1 ? 'marcó' : 'marcaron'} hoy:
                  cambiarles el horario ahora movería una llegada que ya quedó registrada.
                </>
              )}
              {avisoHorario.hoy === 0 && avisoHorario.diferidos.length === 0
                && 'Ningún colaborador tiene este horario asignado todavía.'}
            </span>
            <button onClick={() => setAvisoHorario(null)} className="shrink-0 text-blue-400 hover:text-blue-700"><X size={14} /></button>
          </div>
        )}
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
                <p className="text-xs text-muted mt-2">Tolerancia {h.toleranciaMin} min{h.almuerzoMin ? ` · almuerzo ${h.almuerzoMin} min` : ''} · {h._count?.colaboradores ?? 0} colaborador{(h._count?.colaboradores ?? 0) === 1 ? '' : 'es'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cómo se calculan las horas extra */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Timer size={17} /> Cómo se calculan las horas extra</h3>
          {modoExtraGuardado && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><Check size={13} /> Guardado</span>
          )}
        </div>
        <p className="text-xs text-muted mb-4">
          Define qué se considera hora extra al liquidar. El tope legal semanal ({fmtH(norma || 42)} h) siempre se aplica encima.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            { v: 'SEMANAL', t: 'Por jornada semanal', d: `Es extra lo que supere la jornada legal (${fmtH(norma || 42)} h/semana). Es el modo estándar.` },
            { v: 'HORARIO', t: 'Fuera del horario asignado', d: 'Es extra lo trabajado fuera de la franja del colaborador (antes de entrar o después de salir), o en días no programados.' },
          ] as const).map(o => (
            <button key={o.v} type="button" onClick={() => cambiarModoExtra(o.v)}
              className={`text-left rounded-xl border p-4 transition-colors ${modoExtra === o.v ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink text-sm">{o.t}</p>
                {modoExtra === o.v && <Check size={16} className="text-primary-dark shrink-0" />}
              </div>
              <p className="text-xs text-muted mt-1">{o.d}</p>
            </button>
          ))}
        </div>
        {modoExtra === 'HORARIO' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5 mt-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Requiere que el colaborador tenga un <b>horario asignado</b>. Si no lo tiene, se liquida por jornada semanal. La <b>tolerancia</b> del horario evita marcar como extra unos minutos sueltos.</span>
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
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">{editandoHorario ? 'Editar horario' : 'Nuevo horario'}</h3>
              <button onClick={() => setModalHorario(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            {/* Hoy el horario no guarda historial: los reportes de meses pasados
                se recalculan con la configuración actual. Hasta que eso cambie,
                al menos que el admin sepa lo que está tocando. */}
            {editandoHorario && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Este cambio también afecta los <b>reportes de meses anteriores</b>: se recalculan
                  con el horario nuevo. Si el horario cambió en una fecha concreta, ten en cuenta que
                  las liquidaciones ya entregadas pueden mostrar otros números.
                </span>
              </div>
            )}

            <form onSubmit={guardarHorario} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nombre (ej: Oficina, Turno nocturno)</label>
                <input value={formHorario.nombre} onChange={e => setFormHorario(p => ({ ...p, nombre: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* Las dos tolerancias juntas: son la misma idea en los dos
                  extremos de la jornada. Separadas —una arriba del todo y otra
                  después del bloque del almuerzo— parecían cosas distintas. */}
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Tolerancia de llegada (min)</label>
                    <input type="number" min={0} max={60} value={formHorario.toleranciaMin}
                      onChange={e => setFormHorario(p => ({ ...p, toleranciaMin: Number(e.target.value) }))} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Tolerancia de salida (min)</label>
                    <input type="number" min={0} max={120} step={1} value={formHorario.toleranciaSalidaMin}
                      onChange={e => setFormHorario(p => ({ ...p, toleranciaSalidaMin: Math.max(0, Number(e.target.value) || 0) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-2 leading-relaxed">
                  <b>Llegada:</b> minutos de gracia antes de contar la entrada como tarde.
                  {' '}<b>Salida:</b>{' '}
                  {formHorario.toleranciaSalidaMin > 0 ? (
                    <>si se queda hasta <b>{formHorario.toleranciaSalidaMin} min</b> pasada su hora, se toma la
                    hora programada y no se paga como extra. Si se queda más, cuenta completo.</>
                  ) : (
                    <>en <b>0</b> no se aplica: cada minuto de más cuenta como extra.</>
                  )}
                </p>
                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={formHorario.ajustaEntrada}
                    onChange={e => setFormHorario(p => ({ ...p, ajustaEntrada: e.target.checked }))}
                    disabled={formHorario.toleranciaSalidaMin === 0}
                    className="mt-0.5 accent-primary disabled:opacity-40" />
                  <span className={`text-xs ${formHorario.toleranciaSalidaMin === 0 ? 'text-gray-400' : 'text-ink/80'}`}>
                    Aplicar también a las entradas tempranas
                    <span className="block text-[11px] text-muted">
                      Sin esto, la tolerancia solo juega a favor de la empresa: se recorta lo que trabaja de más al salir,
                      pero no lo que llega antes. Llegar tarde nunca se recorta.
                    </span>
                  </span>
                </label>
              </div>
              {/* Cómo se maneja el almuerzo: una elección explícita, no un modo
                  que se deduce de dos campos vacíos.
                  El estado se DERIVA de las franjas (¿alguna tiene horas?) en vez
                  de guardarse aparte: un interruptor propio podría acabar
                  diciendo una cosa mientras los datos dicen otra. */}
              <div className="border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-medium text-ink mb-2">¿Cómo se maneja el descanso?</p>
                <div className="space-y-2">
                  {[
                    {
                      valor: false as const,
                      titulo: 'Solo descontar el tiempo',
                      detalle: 'Los colaboradores marcan únicamente entrada y salida. El descanso se descuenta siempre, sin que nadie lo marque.',
                    },
                    {
                      valor: true as const,
                      titulo: 'Que marquen su descanso',
                      detalle: 'Al salir, el kiosco les ofrece salir a su descanso o terminar la jornada. Quien se va temprano deja de pagar un descanso que nunca tomó.',
                    },
                  ].map(op => (
                    <label key={String(op.valor)}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        marcanAlmuerzo === op.valor ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="modoAlmuerzo" checked={marcanAlmuerzo === op.valor}
                        onChange={() => cambiarModoAlmuerzo(op.valor)} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium text-ink">{op.titulo}</span>
                        <span className="block text-[11px] text-muted leading-relaxed">{op.detalle}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {!marcanAlmuerzo && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-muted mb-1">Minutos de descanso</label>
                    <input type="number" min={0} max={240} step={1} value={formHorario.almuerzoMin}
                      onChange={e => setFormHorario(p => ({ ...p, almuerzoMin: Math.max(0, Number(e.target.value) || 0) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                      {formHorario.almuerzoMin > 0 ? (
                        <>Se descuentan <b>{formHorario.almuerzoMin} min</b> a todo el que trabaje un día con almuerzo,
                        aunque se haya ido temprano. Es como funciona hoy.</>
                      ) : (
                        <>En <b>0</b> no se descuenta descanso en ningún día.</>
                      )}
                    </p>
                  </div>
                )}
                {marcanAlmuerzo && (
                  <p className="text-[11px] text-muted mt-3 leading-relaxed">
                    Las horas de cada día se ponen abajo, en cada franja: el sábado corto puede no tener
                    almuerzo y un turno nocturno almuerza en la madrugada.
                    <b> Empieza a aplicar mañana</b>, no hoy: el día en curso ya se guardó con la
                    configuración anterior y cambiarlo movería lo que ya se liquidó.
                  </p>
                )}
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
                    {f.horaEntrada && f.horaSalida && duracionFranjaMin(f) < 240 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>
                          Esta franja dura <b>{(duracionFranjaMin(f) / 60).toFixed(1)} h</b>. Según el <b>Art. 161 (lit. d) del Código Sustantivo del Trabajo</b> (Ley 2101 de 2021),
                          la jornada flexible debe ser de <b>mínimo 4 horas continuas</b>. Puedes guardarlo igual, es solo una advertencia.
                        </span>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input type="checkbox" checked={f.tieneAlmuerzo !== false}
                        onChange={e => setFranja(i, { tieneAlmuerzo: e.target.checked })} className="rounded" />
                      Descontar descanso en estos días
                      <span className="text-muted">— desmárcalo para días cortos (ej. sábado)</span>
                    </label>
                    {/* Ventana de almuerzo: convierte el almuerzo de "cuánto" en
                        "cuándo". Con ella, quien se va temprano deja de perder un
                        almuerzo que nunca tomó, y quien lo marca deja de pagarlo
                        dos veces. Vacía = como siempre. */}
                    {f.tieneAlmuerzo !== false && marcanAlmuerzo && (
                      <div className="border-t border-gray-100 pt-3 mt-1">
                        {/* Mismas proporciones que Entrada/Salida de arriba: los
                            campos de hora son del mismo tipo y deben verse igual.
                            "Quitar" sube al encabezado para no robarle ancho. */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted">Horario del descanso</p>
                          {(f.almuerzoInicio || f.almuerzoFin) && (
                            <button type="button" onClick={() => setFranja(i, { almuerzoInicio: '', almuerzoFin: '' })}
                              className="text-[11px] font-semibold text-red-500 hover:text-red-600 underline underline-offset-2">
                              Limpiar
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-muted mb-1">Desde</label>
                            <input type="time" value={f.almuerzoInicio ?? ''}
                              onChange={e => setFranja(i, { almuerzoInicio: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted mb-1">Hasta</label>
                            <input type="time" value={f.almuerzoFin ?? ''}
                              onChange={e => setFranja(i, { almuerzoFin: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                          {f.almuerzoInicio && f.almuerzoFin ? (
                            <>Descanso de <b>{minutosVentana(f)} min</b>. Solo se le descuenta a quien esté trabajando
                            entre esas horas: quien salga antes no lo paga, y quien lo marque no lo paga dos veces.</>
                          ) : (
                            <>Faltan las horas de este día. Mientras estén vacías se descuentan los
                            <b> {formHorario.almuerzoMin} min</b> fijos a todo el que trabaje, aunque se haya ido temprano,
                            y el kiosco no le preguntará nada a esta gente.</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={agregarFranja}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-primary text-muted hover:text-ink rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Plus size={15} /> Agregar franja (ej: sábados medio día)
                </button>
              </div>

              {/* Resumen calculado: jornada semanal/mensual y si cumple la norma */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <p className="text-xs text-muted">Jornada semanal</p>
                    <p className="text-lg font-bold text-ink tabular-nums">{fmtH(semanaH)} h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Aprox. mensual</p>
                    <p className="text-lg font-bold text-ink tabular-nums">{fmtH(mesH)} h</p>
                  </div>
                  {norma > 0 && (
                    <span className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-full ${cumpleNorma ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cumpleNorma
                        ? `✓ Cumple la jornada legal (${fmtH(norma)} h)`
                        : `Supera la jornada legal en ${fmtH(semanaH - norma)} h (se pagan como extra)`}
                    </span>
                  )}
                </div>
                {/* En modo "que marquen", cada franja descuenta lo que dure SU
                    ventana, así que citar un único número sería mentir en un
                    horario con franjas distintas. */}
                {marcanAlmuerzo ? (
                  <p className="text-[11px] text-muted mt-2">Ya se descontó el descanso de cada franja según sus horas.</p>
                ) : formHorario.almuerzoMin > 0 && (
                  <p className="text-[11px] text-muted mt-2">Ya se descontó {formHorario.almuerzoMin} min de almuerzo en las franjas marcadas.</p>
                )}
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
        subtitulo={eliminandoHorario
          ? `"${eliminandoHorario.nombre}" se eliminará y ${eliminandoHorario._count?.colaboradores ?? 0} colaborador${(eliminandoHorario._count?.colaboradores ?? 0) === 1 ? '' : 'es'} quedará${(eliminandoHorario._count?.colaboradores ?? 0) === 1 ? '' : 'n'} sin horario: dejan de tener control de tardanzas y sus reportes pasados dejarán de calcular el descuento por tiempo no trabajado.`
          : ''}
        textoContinuar="Sí, eliminar"
        onContinuar={eliminarHorario}
        onCancelar={() => setEliminandoHorario(null)}
      />
    </div>
  );
}
