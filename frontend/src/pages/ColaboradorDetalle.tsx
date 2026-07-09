import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft, Edit2, Fingerprint, Plus, X, CalendarOff, LogIn, LogOut, BadgeDollarSign, AlarmClock,
} from 'lucide-react';
import api from '../lib/api';
import { formatearMiles, parsearMiles } from './Colaboradores';

type Horario = { id: string; nombre: string; horaEntrada: string; horaSalida: string; toleranciaMin: number };
type Colaborador = {
  id: string; nombre: string; apellido: string; cedula: string; cargo?: string;
  email?: string; telefono?: string; fechaNacimiento?: string | null; salarioMensual: number; activo: boolean;
  horarioId?: string | null; horario?: Horario | null;
};
type Tardanzas = {
  sinHorario: boolean;
  detalle: { fecha: string; horaEsperada: string; horaLlegada: string; minutosTarde: number }[];
  totalMinutos: number; diasTarde: number;
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);
type Registro = { id: string; fecha: string; entrada?: string; salida?: string; tipo: string; observacion?: string };
type Permiso = { id: string; fechaInicio: string; fechaFin: string; tipo: string; descripcion?: string; aprobado: boolean };
type Liquidacion = {
  liquidacion: { codigo: string; nombre: string; horas: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number }[];
  salarioBase: number; totalRecargos: number; totalExtra: number; totalAdicional: number;
  totalPagar: number; jornadaSemanal: number; horasMes: number;
};

const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const TIPO_PERMISO_LABEL: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  INCAPACIDAD_EPS: 'Incapacidad (EPS)',
  INCAPACIDAD_ARL: 'Incapacidad laboral (ARL)',
  LICENCIA_MATERNIDAD: 'Licencia de maternidad',
  LICENCIA_PATERNIDAD: 'Licencia de paternidad',
  LICENCIA_LUTO: 'Licencia por luto',
  CALAMIDAD: 'Calamidad doméstica',
  MEDICO: 'Cita médica',
  PERSONAL: 'Permiso personal',
  NO_REMUNERADO: 'Permiso no remunerado',
  OTRO: 'Otro',
};

const EMPTY_NOVEDAD = { tipo: 'VACACIONES', fechaInicio: '', fechaFin: '', descripcion: '', aprobado: true };

export default function ColaboradorDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [col, setCol] = useState<Colaborador | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [liq, setLiq] = useState<Liquidacion | null>(null);
  const [tardanzas, setTardanzas] = useState<Tardanzas | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [modalEditar, setModalEditar] = useState(false);
  const [formEdit, setFormEdit] = useState<any>(null);
  const [modalNovedad, setModalNovedad] = useState(false);
  const [novedad, setNovedad] = useState(EMPTY_NOVEDAD);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const cargar = useCallback(() => {
    if (!id) return;
    api.get(`/colaboradores/${id}`).then(r => setCol(r.data));
    api.get('/registros', { params: { colaboradorId: id, desde: iso(hace30), hasta: iso(hoy) } }).then(r => setRegistros(r.data));
    api.get('/permisos', { params: { colaboradorId: id } }).then(r => setPermisos(r.data));
    api.get('/reportes/liquidacion', { params: { colaboradorId: id, desde: iso(inicioMes), hasta: iso(hoy) } }).then(r => setLiq(r.data));
    api.get('/reportes/tardanzas', { params: { colaboradorId: id, desde: iso(inicioMes), hasta: iso(hoy) } }).then(r => setTardanzas(r.data));
    api.get('/horarios').then(r => setHorarios(r.data));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put(`/colaboradores/${id}`, { ...formEdit, horarioId: formEdit.horarioId || null });
    setModalEditar(false);
    cargar();
  };

  const guardarNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/permisos', { ...novedad, colaboradorId: id });
    setModalNovedad(false);
    setNovedad(EMPTY_NOVEDAD);
    cargar();
  };

  if (!col) return <div className="p-8 text-muted">Cargando...</div>;

  // Kardex: registros y novedades entrelazados por fecha, más reciente primero
  const kardex = [
    ...registros.map(r => ({ fecha: r.entrada ?? r.fecha, tipo: 'REGISTRO' as const, registro: r, permiso: undefined as Permiso | undefined })),
    ...permisos.map(p => ({ fecha: p.fechaInicio, tipo: 'NOVEDAD' as const, registro: undefined as Registro | undefined, permiso: p })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 25);

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/app/colaboradores')} className="p-2 rounded-lg hover:bg-gray-100 text-muted"><ArrowLeft size={18} /></button>
        <div className="bg-primary rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold text-ink">
          {col.nombre[0]}{col.apellido[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink">{col.nombre} {col.apellido}</h1>
          <p className="text-sm text-muted">{col.cargo || 'Sin cargo'} · CC {col.cedula}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${col.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {col.activo ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Datos */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-ink">Datos</p>
            <button
              onClick={() => { setFormEdit({ nombre: col.nombre, apellido: col.apellido, cedula: col.cedula, cargo: col.cargo || '', email: col.email || '', telefono: col.telefono || '', fechaNacimiento: col.fechaNacimiento ? new Date(col.fechaNacimiento).toISOString().slice(0, 10) : '', salarioMensual: col.salarioMensual, horarioId: col.horarioId || '' }); setModalEditar(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary/40 hover:bg-primary px-2.5 py-1.5 rounded-lg">
              <Edit2 size={13} /> Editar
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Cédula</dt><dd className="text-ink font-medium">{col.cedula}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Email</dt><dd className="text-ink font-medium truncate">{col.email || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Teléfono</dt><dd className="text-ink font-medium">{col.telefono || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Horario</dt><dd className="text-ink font-medium">{col.horario ? `${col.horario.nombre} · ${col.horario.horaEntrada}—${col.horario.horaSalida}` : 'Sin asignar'}</dd></div>
            <div className="flex justify-between gap-2 border-t border-gray-100 pt-2"><dt className="text-muted">Salario</dt><dd className="text-ink font-bold">{cop(col.salarioMensual)}</dd></div>
          </dl>
        </div>

        {/* Resumen del mes: adicional al salario (recargos + extras) */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><BadgeDollarSign size={16} /> Adicional al salario · este mes</p>
          <p className="text-xs text-muted mb-3">Recargos y horas extra que se pagan además del salario base</p>
          {liq && liq.liquidacion.length > 0 ? (
            <>
              <div className="space-y-1.5 text-sm max-h-36 overflow-y-auto">
                {liq.liquidacion.map(l => (
                  <div key={l.codigo} className="flex justify-between gap-2">
                    <span className="text-muted">{l.codigo} · {l.horas}h{l.esExtra ? ' · extra' : ''}</span>
                    <span className="text-ink font-medium">{l.factorPagado === 0 ? <span className="text-xs text-muted">en salario</span> : cop(l.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="font-semibold text-ink">Total adicional</span>
                <span className="font-bold text-ink">{cop(liq.totalAdicional)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Sin horas registradas este mes.</p>
          )}
        </div>

        {/* Llegadas tarde del mes */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2">
            <AlarmClock size={16} className={tardanzas && tardanzas.diasTarde > 0 ? 'text-orange-500' : 'text-green-600'} /> Llegadas tarde
          </p>
          {!tardanzas || tardanzas.sinHorario ? (
            <p className="text-sm text-muted">Asigna un horario para controlar las llegadas tarde.</p>
          ) : tardanzas.diasTarde === 0 ? (
            <p className="text-sm text-green-700">Sin llegadas tarde este mes ✓</p>
          ) : (
            <>
              <p className="text-sm text-orange-700 font-semibold mb-2">
                {tardanzas.diasTarde} día{tardanzas.diasTarde === 1 ? '' : 's'} · {fmtMin(tardanzas.totalMinutos)} en total
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto text-xs">
                {tardanzas.detalle.map(t => (
                  <div key={t.fecha} className="flex justify-between text-muted">
                    <span>{format(new Date(t.fecha + 'T12:00:00'), 'd MMM', { locale: es })} · llegó {t.horaLlegada}</span>
                    <span className="text-orange-600 font-medium">{fmtMin(t.minutosTarde)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Huella */}
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col">
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><Fingerprint size={16} /> Huella dactilar</p>
          <p className="text-xs text-muted mb-4 flex-1">Cuando llegue el lector, aquí registrarás la huella para que marque sin digitar la cédula.</p>
          <button disabled title="Disponible próximamente"
            className="w-full border-2 border-gray-200 text-gray-400 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed">
            <Fingerprint size={16} /> Registrar huella
            <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded-full uppercase">Pronto</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Novedades: vacaciones, incapacidades, licencias, permisos */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-ink flex items-center gap-2"><CalendarOff size={16} /> Novedades</p>
            <button onClick={() => setModalNovedad(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-2.5 py-1.5 rounded-lg">
              <Plus size={13} /> Agregar
            </button>
          </div>
          <p className="text-xs text-muted mb-3">Vacaciones, incapacidades, licencias y permisos. Los días con novedad no cuentan como ausencia.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {permisos.length === 0 && <p className="text-sm text-muted">Sin novedades registradas.</p>}
            {permisos.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{TIPO_PERMISO_LABEL[p.tipo] ?? p.tipo}</p>
                  <p className="text-xs text-muted">
                    {format(new Date(p.fechaInicio), 'd MMM', { locale: es })} → {format(new Date(p.fechaFin), 'd MMM yyyy', { locale: es })}
                    {p.descripcion ? ` · ${p.descripcion}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {p.aprobado ? 'APROBADA' : 'PENDIENTE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kardex */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3">Kardex — últimos 30 días</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {kardex.length === 0 && <p className="text-sm text-muted">Sin movimientos recientes.</p>}
            {kardex.map((m, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {m.tipo === 'REGISTRO' ? (
                  <>
                    <span className={`p-1.5 rounded-lg ${m.registro!.salida ? 'bg-gray-100 text-muted' : 'bg-green-100 text-green-700'}`}>
                      {m.registro!.salida ? <LogOut size={14} /> : <LogIn size={14} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium capitalize">
                        {format(new Date(m.fecha), "EEE d 'de' MMMM", { locale: es })}
                        {m.registro!.tipo === 'FESTIVO' && <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">FESTIVO</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {m.registro!.entrada ? `Entrada ${format(new Date(m.registro!.entrada), 'HH:mm')}` : ''}
                        {m.registro!.salida ? ` · Salida ${format(new Date(m.registro!.salida), 'HH:mm')}` : ' · turno abierto'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="p-1.5 rounded-lg bg-primary/40 text-ink"><CalendarOff size={14} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium">{TIPO_PERMISO_LABEL[m.permiso!.tipo] ?? m.permiso!.tipo}</p>
                      <p className="text-xs text-muted">
                        {format(new Date(m.permiso!.fechaInicio), 'd MMM', { locale: es })} → {format(new Date(m.permiso!.fechaFin), 'd MMM', { locale: es })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal editar datos */}
      {modalEditar && formEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">Editar datos</h3>
              <button onClick={() => setModalEditar(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarEdicion} className="grid grid-cols-2 gap-4">
              {(['nombre', 'apellido', 'cedula', 'cargo', 'email', 'telefono'] as const).map(field => (
                <div key={field} className={field === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-muted mb-1 capitalize">{field}</label>
                  <input value={formEdit[field]} onChange={e => setFormEdit((p: any) => ({ ...p, [field]: e.target.value }))}
                    className={input} required={['nombre', 'apellido', 'cedula'].includes(field)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Fecha de nacimiento</label>
                <input type="date" value={formEdit.fechaNacimiento || ''}
                  onChange={e => setFormEdit((p: any) => ({ ...p, fechaNacimiento: e.target.value }))} className={input} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Horario de trabajo</label>
                <select value={formEdit.horarioId || ''} onChange={e => setFormEdit((p: any) => ({ ...p, horarioId: e.target.value }))} className={input}>
                  <option value="">Sin horario (no controla llegadas tarde)</option>
                  {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre} · {h.horaEntrada}—{h.horaSalida}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Salario mensual (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input type="text" inputMode="numeric" value={formatearMiles(formEdit.salarioMensual)}
                    onChange={e => setFormEdit((p: any) => ({ ...p, salarioMensual: parsearMiles(e.target.value) }))}
                    className={`${input} pl-7`} required />
                </div>
              </div>
              <div className="col-span-2 flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModalEditar(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nueva novedad */}
      {modalNovedad && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">Nueva novedad</h3>
              <button onClick={() => setModalNovedad(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarNovedad} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Tipo</label>
                <select value={novedad.tipo} onChange={e => setNovedad(p => ({ ...p, tipo: e.target.value }))} className={input}>
                  {Object.entries(TIPO_PERMISO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Desde</label>
                  <input type="date" value={novedad.fechaInicio} onChange={e => setNovedad(p => ({ ...p, fechaInicio: e.target.value }))} required className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Hasta</label>
                  <input type="date" value={novedad.fechaFin} onChange={e => setNovedad(p => ({ ...p, fechaFin: e.target.value }))} required className={input} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Descripción (opcional)</label>
                <input value={novedad.descripcion} onChange={e => setNovedad(p => ({ ...p, descripcion: e.target.value }))} className={input} placeholder="Ej: vacaciones anuales" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-ink">
                <input type="checkbox" checked={novedad.aprobado} onChange={e => setNovedad(p => ({ ...p, aprobado: e.target.checked }))} className="rounded" />
                Aprobada
              </label>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModalNovedad(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
