import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import {
  Users, UserCheck, Clock, TrendingUp, AlarmClock, UserX, CalendarOff, CalendarDays,
  AlertTriangle, PartyPopper, ArrowRight, Cake, LogOut, Camera, X, Info,
  Paperclip, FileText, Image as ImageIcon, Download, ArrowUpRight,
} from 'lucide-react';

const TZ = 'America/Bogota';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
import api from '../lib/api';
import { TIPO_PERMISO_LABEL } from './ColaboradorDetalle';

type Dash = {
  fecha: string;
  hoyEsFestivo: boolean;
  totales: { colaboradoresActivos: number; enPlanta: number; horasSemana: number; horasExtraMes: number };
  enPlanta: { id: string; nombre: string; cargo: string | null; desde: string }[];
  salidasRecientes: { registroId: string; id: string; nombre: string; cargo: string | null; entrada: string | null; salida: string; tieneFotoEntrada: boolean; tieneFotoSalida: boolean }[];
  llegadasTardeHoy: { id: string; nombre: string; horaLlegada: string; minutosTarde: number }[];
  sinMarcarHoy: { id: string; nombre: string; cargo: string | null; horario: string; horaEntrada: string; novedad: string | null }[];
  turnosOlvidados: { id: string; colaborador: string; fecha: string; entrada: string }[];
  novedadesHoy: { id: string; colaboradorId: string; colaborador: string; tipo: string; descripcion: string | null; aprobado: boolean; fechaInicio: string; fechaFin: string; evidenciaTipo: string | null; evidenciaNombre: string | null }[];
  proximosFestivos: { nombre: string; fecha: string; propio: boolean }[];
  cumpleanos: { id: string; nombre: string; cargo: string | null; dia: number; mes: number; esHoy: boolean }[];
};
type Salida = Dash['salidasRecientes'][number];

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);

function haceCuanto(desde: string): string {
  const min = Math.floor((Date.now() - new Date(desde).getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h}h ${min % 60}min`;
}

function diasHasta(fecha: string): string {
  const dias = Math.round((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

function Kpi({ icon: Icon, titulo, valor, detalle, acento }: { icon: any; titulo: string; valor: string; detalle: string; acento?: string }) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-muted text-sm mb-2">
        <Icon size={16} className={acento} />{titulo}
      </div>
      <p className="text-2xl font-bold text-ink">{valor}</p>
      <p className="text-xs text-muted mt-1">{detalle}</p>
    </div>
  );
}

export default function DashboardEmpresa() {
  const navigate = useNavigate();
  const [d, setD] = useState<Dash | null>(null);
  const [fotosDe, setFotosDe] = useState<Salida | null>(null);
  const [fotos, setFotos] = useState<{ fotoEntrada: string | null; fotoSalida: string | null } | null>(null);

  // Cierre rápido de un turno olvidado (poner la salida sin salir del dashboard)
  type TurnoOlvidado = Dash['turnosOlvidados'][number];
  const [cerrarTurno, setCerrarTurno] = useState<TurnoOlvidado | null>(null);
  const [formCierre, setFormCierre] = useState({ fecha: '', entrada: '', salida: '' });
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const [errorCierre, setErrorCierre] = useState('');

  // Detalle de una novedad del día (al hacer clic)
  type Novedad = Dash['novedadesHoy'][number];
  const [verNovedad, setVerNovedad] = useState<Novedad | null>(null);
  const [evidenciaVer, setEvidenciaVer] = useState<{ data: string; tipo: string; nombre?: string | null } | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState(false);

  const verEvidencia = async (permisoId: string) => {
    setCargandoEvidencia(true);
    try {
      const r = await api.get(`/permisos/${permisoId}/evidencia`);
      setEvidenciaVer({ data: r.data.evidencia, tipo: r.data.evidenciaTipo, nombre: r.data.evidenciaNombre });
    } catch { /* sin evidencia */ } finally { setCargandoEvidencia(false); }
  };

  const cargar = () => api.get('/dashboard/empresa').then(r => setD(r.data));
  useEffect(() => { cargar(); }, []);

  const abrirCierre = (t: TurnoOlvidado) => {
    const zEnt = toZonedTime(new Date(t.entrada), TZ);
    setFormCierre({
      fecha: format(zEnt, 'yyyy-MM-dd'),
      entrada: format(zEnt, 'HH:mm'),
      salida: '',
    });
    setErrorCierre('');
    setCerrarTurno(t);
  };

  const guardarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cerrarTurno) return;
    setErrorCierre('');
    const entrada = new Date(`${formCierre.fecha}T${formCierre.entrada}:00`);
    const salida = new Date(`${formCierre.fecha}T${formCierre.salida}:00`);
    if (!formCierre.salida) { setErrorCierre('Indica la hora de salida.'); return; }
    if (salida <= entrada) { setErrorCierre('La salida debe ser posterior a la entrada.'); return; }
    setGuardandoCierre(true);
    try {
      await api.put(`/registros/${cerrarTurno.id}`, { entrada, salida });
      setCerrarTurno(null);
      await cargar();
    } catch {
      setErrorCierre('No pudimos guardar. Intenta de nuevo.');
    } finally {
      setGuardandoCierre(false);
    }
  };

  const fmtHora = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '-';
  const verFotos = async (s: Salida) => {
    setFotosDe(s);
    setFotos(null);
    const resp = await api.get(`/registros/${s.registroId}/fotos`);
    setFotos(resp.data);
  };

  if (!d) return <div className="p-8 text-muted">Cargando...</div>;

  const hora = new Date(d.fecha).getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{saludo}</h1>
          <p className="text-sm text-muted capitalize">{format(new Date(d.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        {d.hoyEsFestivo && (
          <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
            <PartyPopper size={15} /> Hoy es festivo
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={UserCheck} titulo="En planta ahora" valor={String(d.totales.enPlanta)} acento="text-green-600"
          detalle={`de ${d.totales.colaboradoresActivos} colaboradores`} />
        <Kpi icon={Users} titulo="Colaboradores" valor={String(d.totales.colaboradoresActivos)} detalle="activos en la empresa" />
        <Kpi icon={Clock} titulo="Horas esta semana" valor={`${d.totales.horasSemana}h`} detalle="trabajadas por el equipo" />
        <Kpi icon={TrendingUp} titulo="Horas extra del mes" valor={`${d.totales.horasExtraMes}h`} acento="text-orange-500"
          detalle="acumuladas en el equipo" />
      </div>

      {/* Alerta de turnos sin cerrar */}
      {d.turnosOlvidados.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-card p-5">
          <p className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={17} /> Turnos sin cerrar ({d.turnosOlvidados.length})
          </p>
          <p className="text-sm text-orange-700 mb-3">
            Estos colaboradores marcaron entrada en días anteriores pero no registraron salida. Corrige el registro para que la liquidación sea correcta.
          </p>
          <div className="flex flex-wrap gap-2">
            {d.turnosOlvidados.map(t => (
              <button key={t.id} onClick={() => abrirCierre(t)}
                className="flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm hover:border-orange-400">
                <span className="font-medium text-ink">{t.colaborador}</span>
                <span className="text-xs text-orange-700">{format(new Date(t.entrada), "d MMM · HH:mm", { locale: es })}</span>
                <ArrowRight size={13} className="text-orange-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* En planta ahora */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><UserCheck size={16} className="text-green-600" /> En planta ahora</p>
          {d.enPlanta.length === 0 ? (
            <p className="text-sm text-muted">Nadie tiene un turno abierto en este momento.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {d.enPlanta.map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-3.5 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 hp-ripple" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{e.nombre}</p>
                    <p className="text-xs text-muted">{e.cargo || 'Sin cargo'}</p>
                  </div>
                  <span className="text-xs text-green-700 font-medium">{haceCuanto(e.desde)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salidas de hoy */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><LogOut size={16} className="text-red-500" /> Salidas de hoy</p>
          {d.salidasRecientes.length === 0 ? (
            <p className="text-sm text-muted">Nadie ha marcado salida hoy todavía.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {d.salidasRecientes.map(s => (
                <button
                  key={s.registroId}
                  onClick={() => verFotos(s)}
                  className="w-full flex items-center gap-3 bg-red-50 hover:bg-red-100 rounded-xl px-3.5 py-2.5 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{s.nombre}</p>
                    <p className="text-xs text-muted">{s.cargo || 'Sin cargo'}</p>
                  </div>
                  {s.tieneFotoSalida && <Camera size={14} className="text-red-400 shrink-0" />}
                  <span className="text-xs text-red-700 font-medium font-mono">{fmtHora(s.salida)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Llegadas tarde hoy */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><AlarmClock size={16} className="text-orange-500" /> Llegadas tarde hoy</p>
          {d.llegadasTardeHoy.length === 0 ? (
            <p className="text-sm text-green-700">Nadie ha llegado tarde hoy ✓</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {d.llegadasTardeHoy.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-orange-50 rounded-xl px-3.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.nombre}</p>
                    <p className="text-xs text-muted">Llegó a las {t.horaLlegada}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-700">{fmtMin(t.minutosTarde)} tarde</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sin marcar hoy */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><UserX size={16} className="text-red-500" /> Aún no han marcado entrada</p>
          {d.sinMarcarHoy.length === 0 ? (
            <p className="text-sm text-muted">Todos los que debían entrar ya marcaron.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {d.sinMarcarHoy.map(s => (
                <div key={s.id} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${s.novedad ? 'bg-amber-50' : 'bg-red-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{s.nombre}</p>
                    <p className="text-xs text-muted">{s.horario} · entrada {s.horaEntrada}</p>
                  </div>
                  {s.novedad ? (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">
                      {TIPO_PERMISO_LABEL[s.novedad] ?? 'En novedad'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-600 shrink-0">sin entrada</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Novedades de hoy */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><CalendarOff size={16} /> Novedades de hoy</p>
          {d.novedadesHoy.length === 0 ? (
            <p className="text-sm text-muted">Sin vacaciones, incapacidades ni licencias hoy.</p>
          ) : (
            <div className="space-y-2">
              {d.novedadesHoy.map((n, i) => (
                <button key={i} onClick={() => setVerNovedad(n)}
                  className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-3.5 py-2.5 text-left transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{n.colaborador}</p>
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      {TIPO_PERMISO_LABEL[n.tipo] ?? n.tipo}
                      {n.evidenciaTipo && <Paperclip size={11} className="text-primary-dark" />}
                      {!n.aprobado && <span className="text-orange-600 font-semibold">· pendiente</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted shrink-0">hasta {format(new Date(n.fechaFin), 'd MMM', { locale: es })}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Próximos festivos */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><CalendarDays size={16} /> Próximos festivos</p>
          {d.proximosFestivos.length === 0 ? (
            <p className="text-sm text-muted">No hay festivos en los próximos 45 días.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {d.proximosFestivos.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="bg-primary/40 rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-ink leading-none">{format(new Date(f.fecha), 'd')}</span>
                    <span className="text-[10px] text-ink/70 uppercase">{format(new Date(f.fecha), 'MMM', { locale: es })}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{f.nombre}</p>
                    <p className="text-xs text-muted">{diasHasta(f.fecha)}{f.propio ? ' · propio' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumpleaños del mes */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2"><Cake size={16} className="text-pink-500" /> Cumpleaños del mes</p>
          {d.cumpleanos.length === 0 ? (
            <p className="text-sm text-muted">Nadie cumple años este mes (o falta registrar la fecha de nacimiento).</p>
          ) : (
            <div className="space-y-2">
              {d.cumpleanos.map(c => (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${c.esHoy ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50'}`}>
                  <div className="bg-pink-100 rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-pink-700 leading-none">{c.dia}</span>
                    <span className="text-[10px] text-pink-600 uppercase">{MESES[c.mes]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{c.nombre}</p>
                    <p className="text-xs text-muted">{c.cargo || 'Sin cargo'}</p>
                  </div>
                  {c.esHoy && <span className="flex items-center gap-1 text-xs font-bold text-pink-700"><Cake size={13} /> ¡Hoy!</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cierre rápido de un turno olvidado */}
      {cerrarTurno && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCerrarTurno(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><AlarmClock size={18} className="text-orange-500" /> Cerrar turno</h3>
              <button onClick={() => setCerrarTurno(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-muted mb-4">{cerrarTurno.colaborador} · marcó entrada el {format(toZonedTime(new Date(cerrarTurno.entrada), TZ), "d 'de' MMMM", { locale: es })} pero no registró salida.</p>
            <form onSubmit={guardarCierre} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha</label>
                <input type="date" value={formCierre.fecha} onChange={e => setFormCierre(p => ({ ...p, fecha: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Entrada</label>
                  <input type="time" value={formCierre.entrada} onChange={e => setFormCierre(p => ({ ...p, entrada: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Salida</label>
                  <input type="time" autoFocus value={formCierre.salida} onChange={e => setFormCierre(p => ({ ...p, salida: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              {errorCierre && <p className="text-sm text-red-600">{errorCierre}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCerrarTurno(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardandoCierre}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
                  {guardandoCierre ? 'Guardando...' : 'Cerrar turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle de una novedad del día */}
      {verNovedad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setVerNovedad(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink">{TIPO_PERMISO_LABEL[verNovedad.tipo] ?? verNovedad.tipo}</h3>
              <button onClick={() => setVerNovedad(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4 ${verNovedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {verNovedad.aprobado ? 'APROBADA' : 'PENDIENTE'}
            </span>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted">Colaborador</p>
                <p className="text-ink font-medium">{verNovedad.colaborador}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Fechas</p>
                <p className="text-ink font-medium">
                  {format(new Date(verNovedad.fechaInicio), "d 'de' MMMM yyyy", { locale: es })}
                  {' → '}{format(new Date(verNovedad.fechaFin), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Descripción / motivo</p>
                <p className="text-ink whitespace-pre-wrap">{verNovedad.descripcion || <span className="text-muted">Sin descripción.</span>}</p>
              </div>
              {verNovedad.evidenciaTipo && (
                <div>
                  <p className="text-xs text-muted mb-1">Evidencia</p>
                  <button onClick={() => verEvidencia(verNovedad.id)} disabled={cargandoEvidencia}
                    className="flex items-center gap-2 text-sm font-medium text-primary-dark border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                    {verNovedad.evidenciaTipo === 'application/pdf' ? <FileText size={16} className="text-red-500" /> : <ImageIcon size={16} />}
                    {cargandoEvidencia ? 'Abriendo...' : (verNovedad.evidenciaNombre || 'Ver evidencia')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setVerNovedad(null)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cerrar</button>
              <button onClick={() => navigate(`/app/colaboradores/${verNovedad.colaboradorId}`)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
                Ver ficha <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de evidencia */}
      {evidenciaVer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setEvidenciaVer(null)}>
          <div className="hp-pop bg-white rounded-2xl p-4 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-semibold text-ink truncate">{evidenciaVer.nombre || 'Evidencia'}</p>
              <div className="flex items-center gap-1">
                <a href={evidenciaVer.data} download={evidenciaVer.nombre || 'evidencia'} title="Descargar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Download size={18} /></a>
                <button onClick={() => setEvidenciaVer(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            {evidenciaVer.tipo === 'application/pdf' ? (
              <iframe src={evidenciaVer.data} title="Evidencia PDF" className="w-full flex-1 min-h-[60vh] rounded-lg border border-gray-200" />
            ) : (
              <img src={evidenciaVer.data} alt="Evidencia" className="w-full object-contain rounded-lg max-h-[75vh]" />
            )}
          </div>
        </div>
      )}

      {/* Fotos de verificación facial de la salida */}
      {fotosDe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setFotosDe(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><Camera size={18} /> Verificación facial</h3>
              <button onClick={() => setFotosDe(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-muted mb-4">{fotosDe.nombre} · salida {fmtHora(fotosDe.salida)}</p>
            {!fotos ? (
              <p className="text-sm text-muted py-8 text-center">Cargando fotos...</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[{ foto: fotos.fotoEntrada, label: 'Entrada', hora: fmtHora(fotosDe.entrada) },
                  { foto: fotos.fotoSalida, label: 'Salida', hora: fmtHora(fotosDe.salida) }].map(({ foto, label, hora }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-muted uppercase mb-1.5">{label} · {hora}</p>
                    {foto ? (
                      <img src={foto} alt={`Foto de ${label.toLowerCase()}`} className="w-full rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 text-center px-3">
                        Sin foto (marcó con cédula o fue registro manual)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted mt-4 flex items-center gap-1.5">
              <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
