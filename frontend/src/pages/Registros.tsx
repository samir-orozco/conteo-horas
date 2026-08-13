import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { Plus, Edit2, Trash2, X, Camera, Info } from 'lucide-react';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ModalJornada from './registros/ModalJornada';

const TZ = 'America/Bogota';
type Colaborador = { id: string; nombre: string; apellido: string };
type Registro = {
  id: string; colaboradorId: string; colaborador: Colaborador; fecha: string;
  entrada: string | null; salida: string | null; tipo: string; observacion?: string;
  // null = sin horario asignado o día que no aplica; 0 = a tiempo; >0 = minutos tarde
  minutosTarde: number | null;
  tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
  // El sistema cerró el turno (la persona no marcó salida): la hora es estimada y hay que revisarla
  salidaEstimada?: boolean;
  salidaAlmuerzo?: boolean;
  // El almuerzo es del DÍA: viaja repetido en cada fila de ese día, pero se
  // pinta en una sola (la ancla) para que nadie lo lea dos veces.
  almuerzo: Almuerzo | null;
  almuerzoEnEstaFila: boolean;
};
type Almuerzo = {
  estado: 'SIN_VENTANA' | 'MARCADO' | 'ABIERTO' | 'NO_MARCADO';
  ventana: { inicio: string; fin: string } | null;
  salida: string | null;
  regreso: string | null;
  minutos: number | null;      // lo que se tomó de verdad
  minutosDescontados: number;  // lo que le cuesta al día
  regresoEstimado: boolean;
  seExcedio: boolean;
  minutosDeMas: number;
};
type Fotos = { fotoEntrada: string | null; fotoSalida: string | null };

// "1 h", "45 min", "1 h 25 min"
const enHoras = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

// Celda de almuerzo. Se pinta una sola vez por día (en la fila ancla); las demás
// filas del mismo día apuntan a ella en vez de repetir el número, porque son
// minutos de plata y repetidos invitan a sumarlos.
function CeldaAlmuerzo({ r, ancla }: { r: Registro; ancla: Registro | undefined }) {
  const a = r.almuerzo;
  const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '';

  if (!a || (a.estado === 'SIN_VENTANA' && a.minutosDescontados === 0)) {
    return <span className="text-gray-300">—</span>;
  }
  if (!r.almuerzoEnEstaFila) {
    // Sin tooltip: en la tablet de recepción los tooltips no existen.
    return (
      <span className="text-[11px] text-gray-400">
        {ancla?.entrada ? `ver ${hhmm(ancla.entrada)}` : 'ver arriba'}
      </span>
    );
  }

  // Una sola etiqueta por fila. El detalle —cuánto se descuenta, por qué, si el
  // regreso lo puso el sistema— vive en el modal, a un clic. En una tabla de
  // cuarenta personas, dos renglones por celda es ruido que nadie lee.
  if (a.estado === 'ABIERTO') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 whitespace-nowrap">
        Sin regreso
      </span>
    );
  }

  if (a.estado === 'MARCADO') {
    return (
      <span className={`font-mono text-xs whitespace-nowrap ${a.seExcedio ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
        {hhmm(a.salida)} → {hhmm(a.regreso)}
      </span>
    );
  }

  if (a.estado === 'SIN_VENTANA') {
    // Sin ventana pero con descuento: el caso de la mayoría. Ese descuento
    // existe todos los días y hasta ahora no se veía en ninguna pantalla.
    return <span className="text-xs text-gray-600 whitespace-nowrap">−{enHoras(a.minutosDescontados)}</span>;
  }

  // NO_MARCADO
  return <span className="text-xs text-gray-500">No marcó</span>;
}

export default function Registros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Registro | null>(null);
  const [form, setForm] = useState({ colaboradorId: '', fecha: '', entrada: '', salida: '', tipo: 'NORMAL', observacion: '' });
  const [fotosDe, setFotosDe] = useState<Registro | null>(null);
  const [fotos, setFotos] = useState<Fotos | null>(null);
  const [eliminarId, setEliminarId] = useState<string | null>(null);
  // Detalle de una marcación. La fila de la tabla no se explica sola: el
  // almuerzo vive en el hueco entre dos filas y la tardanza solo se mide en la
  // primera entrada del día.
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  // Otros registros que ya existen en el día que se está creando/editando. La
  // tardanza solo se evalúa sobre la PRIMERA entrada del día, así que si ya hay
  // una anterior, la que se está agregando no va a mostrar minutos tarde. Sin
  // este aviso el usuario cree que el cálculo falló.
  const [otrosDelDia, setOtrosDelDia] = useState<Registro[]>([]);

  useEffect(() => {
    if (!modal || !form.colaboradorId || !form.fecha) { setOtrosDelDia([]); return; }
    let vigente = true;
    api.get('/registros', { params: { colaboradorId: form.colaboradorId, desde: form.fecha, hasta: form.fecha } })
      .then(r => {
        if (!vigente) return;
        const otros = (r.data as Registro[]).filter(x => x.id !== editando?.id && x.entrada);
        setOtrosDelDia(otros.sort((a, b) => (a.entrada! < b.entrada! ? -1 : 1)));
      })
      .catch(() => { if (vigente) setOtrosDelDia([]); });
    return () => { vigente = false; };
  }, [modal, form.colaboradorId, form.fecha, editando?.id]);

  const cargar = () => {
    const params: any = { desde, hasta };
    if (filtroColaborador) params.colaboradorId = filtroColaborador;
    api.get('/registros', { params }).then(r => setRegistros(r.data));
  };

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);
  useEffect(() => { cargar(); }, [desde, hasta, filtroColaborador]);

  const abrir = (reg?: Registro) => {
    setEditando(reg || null);
    setForm(reg ? {
      colaboradorId: reg.colaboradorId,
      fecha: format(toZonedTime(new Date(reg.fecha), TZ), 'yyyy-MM-dd'),
      entrada: reg.entrada ? format(toZonedTime(new Date(reg.entrada), TZ), "HH:mm") : '',
      salida: reg.salida ? format(toZonedTime(new Date(reg.salida), TZ), "HH:mm") : '',
      tipo: reg.tipo, observacion: reg.observacion || '',
    } : { colaboradorId: '', fecha: format(new Date(), 'yyyy-MM-dd'), entrada: '', salida: '', tipo: 'NORMAL', observacion: '' });
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const fecha = new Date(`${form.fecha}T00:00:00`);
    const entrada = form.entrada ? new Date(`${form.fecha}T${form.entrada}:00`) : null;
    const salida = form.salida ? new Date(`${form.fecha}T${form.salida}:00`) : null;
    const data = { ...form, fecha, entrada, salida };
    if (editando) await api.put(`/registros/${editando.id}`, data);
    else await api.post('/registros', data);
    setModal(false);
    cargar();
  };

  const confirmarEliminar = async () => {
    if (!eliminarId) return;
    await api.delete(`/registros/${eliminarId}`);
    setEliminarId(null);
    cargar();
  };

  // La columna de Almuerzo aparece cuando ese día descuenta almuerzo, tenga o no
  // ventana horaria. La mayoría de horarios hoy dicen "descontar almuerzo: sí,
  // 60 min" sin decir de qué hora a qué hora: exigir la ventana escondería la
  // columna justo donde el descuento es invisible.
  const hayAlmuerzo = registros.some(r => r.almuerzo && (r.almuerzo.estado !== 'SIN_VENTANA' || r.almuerzo.minutosDescontados > 0));

  // Fila de cada día donde se pinta el almuerzo, para que las demás la señalen.
  const anclaPorDia = useMemo(() => {
    const m = new Map<string, Registro>();
    for (const r of registros) {
      if (r.almuerzoEnEstaFila) m.set(`${r.colaboradorId}|${format(toZonedTime(new Date(r.fecha), TZ), 'yyyy-MM-dd')}`, r);
    }
    return m;
  }, [registros]);
  const anclaDe = (r: Registro) =>
    anclaPorDia.get(`${r.colaboradorId}|${format(toZonedTime(new Date(r.fecha), TZ), 'yyyy-MM-dd')}`);

  const fmtHora = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '-';
  const duracion = (entrada: string | null, salida: string | null) => {
    if (!entrada || !salida) return '-';
    const mins = (new Date(salida).getTime() - new Date(entrada).getTime()) / 60000;
    return `${Math.floor(mins / 60)}h ${(mins % 60).toFixed(1)}m`;
  };

  const verFotos = async (r: Registro) => {
    setFotosDe(r);
    setFotos(null);
    const resp = await api.get(`/registros/${r.id}/fotos`);
    setFotos(resp.data);
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registros de Asistencia</h2>
        <button onClick={() => abrir()} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />Agregar manual
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3">
        <select value={filtroColaborador} onChange={e => setFiltroColaborador(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los colaboradores</option>
          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-2.5 text-xs mb-4">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Las fotos de verificación facial se conservan durante <b>2 meses</b> y luego se eliminan automáticamente para no sobrecargar el servidor.</span>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Colaborador</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-center">Entrada</th>
              <th className="px-4 py-3 text-center">Salida</th>
              {hayAlmuerzo && <th className="px-4 py-3 text-center">Almuerzo</th>}
              <th className="px-4 py-3 text-center">Llegada</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Duración</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Tipo</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setJornadaId(r.id)}>
                <td className="px-4 py-3 font-medium text-gray-800">{r.colaborador.nombre} {r.colaborador.apellido}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{format(toZonedTime(new Date(r.fecha), TZ), "d MMM yyyy", { locale: es })}</td>
                <td className="px-4 py-3 text-center text-green-700 font-mono">{fmtHora(r.entrada)}</td>
                <td className="px-4 py-3 text-center">
                  {r.salidaEstimada ? (
                    <span title="El sistema cerró el turno porque no marcó salida. Revisa la hora."
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
                      No marcó salida{r.salida ? ` · ~${fmtHora(r.salida)}` : ''}
                    </span>
                  ) : (
                    <span className="text-red-600 font-mono">{fmtHora(r.salida)}</span>
                  )}
                </td>
                {hayAlmuerzo && (
                  <td className="px-4 py-3 text-center"><CeldaAlmuerzo r={r} ancla={anclaDe(r)} /></td>
                )}
                <td className="px-4 py-3 text-center">
                  {r.minutosTarde === null ? (
                    <span className="text-gray-300">—</span>
                  ) : r.minutosTarde > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                      Tarde +{r.minutosTarde} min
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">A tiempo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-600 hidden md:table-cell">{duracion(r.entrada, r.salida)}</td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.tipo === 'NORMAL' ? 'bg-blue-50 text-blue-700' : r.tipo === 'PERMISO' ? 'bg-yellow-50 text-yellow-700' : 'bg-purple-50 text-purple-700'}`}>{r.tipo}</span>
                </td>
                <td className="px-4 py-3">
                  {/* Los botones tienen su propia acción: sin esto, tocarlos
                      dispararía además el modal de la fila. */}
                  <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                    {(r.tieneFotoEntrada || r.tieneFotoSalida) && (
                      <button onClick={() => verFotos(r)} title="Ver fotos de verificación facial"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Camera size={15} /></button>
                    )}
                    <button onClick={() => abrir(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={15} /></button>
                    <button onClick={() => setEliminarId(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {registros.length === 0 && <p className="text-center text-gray-400 py-8">No hay registros para el período seleccionado</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editando ? 'Editar registro' : 'Nuevo registro'}</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador</label>
                <select value={form.colaboradorId} onChange={e => setForm(p => ({ ...p, colaboradorId: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entrada</label>
                  <input type="time" value={form.entrada} onChange={e => setForm(p => ({ ...p, entrada: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Salida</label>
                  <input type="time" value={form.salida} onChange={e => setForm(p => ({ ...p, salida: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="NORMAL">Normal</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="FESTIVO">Festivo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observación</label>
                <input value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* La tardanza se evalúa solo sobre la primera entrada del día (para
                  que volver del almuerzo no cuente como llegar tarde). Si ya hay
                  una anterior, este registro no va a mostrar minutos tarde, y sin
                  avisarlo parece que el cálculo falló. */}
              {otrosDelDia.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Ese día ya tiene {otrosDelDia.length === 1 ? 'un registro' : `${otrosDelDia.length} registros`} con entrada
                    a las <b>{otrosDelDia.map(o => fmtHora(o.entrada)).join(', ')}</b>.
                    {form.entrada && fmtHora(otrosDelDia[0].entrada) < form.entrada ? (
                      <> La llegada tarde se calcula sobre la primera entrada del día,
                      así que <b>este registro no mostrará minutos tarde</b>. Si vas a corregir la
                      hora de llegada, edita el registro de las {fmtHora(otrosDelDia[0].entrada)}.</>
                    ) : (
                      <> La llegada tarde se calcula sobre la primera entrada del día.</>
                    )}
                  </span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-800 text-white rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fotos de verificación facial del registro */}
      {fotosDe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setFotosDe(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><Camera size={18} /> Verificación facial</h3>
              <button onClick={() => setFotosDe(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-muted mb-4">
              {fotosDe.colaborador.nombre} {fotosDe.colaborador.apellido} · {format(toZonedTime(new Date(fotosDe.fecha), TZ), "d 'de' MMMM", { locale: es })}
            </p>
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

      {jornadaId && (
        <ModalJornada
          key={jornadaId}
          registroId={jornadaId}
          onCerrar={() => setJornadaId(null)}
          onEditar={reg => abrir(reg as Registro)}
          // El detalle se cierra al eliminar: si no, queda encima mostrando una
          // marcación que ya no existe y el siguiente clic falla con un 404.
          onEliminar={id => { setJornadaId(null); setEliminarId(id); }}
        />
      )}

      <ConfirmDialog
        abierto={eliminarId !== null}
        titulo="¿Eliminar este registro?"
        subtitulo="Esta acción no se puede deshacer."
        textoContinuar="Eliminar"
        peligro
        onContinuar={confirmarEliminar}
        onCancelar={() => setEliminarId(null)}
      />
    </div>
  );
}
