import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { Search, X, Clock3, Camera, ArrowLeft, ImageOff } from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas, MESES_RETENCION_FOTOS } from '../lib/retencionFotos';

const TZ = 'America/Bogota';

type Fila = {
  colaboradorId: string; nombre: string; apellido: string;
  totalRecargos: number; totalExtra: number; totalAdicional: number;
};
type LineaLiquidacion = { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number };
type DetalleRegistro = { id: string; fecha: string; entrada: string; salida: string; filas: { codigo: string; nombre: string; horas: number; subtotal: number }[] };
// Vista de fotos DENTRO del mismo modal: se guarda el día que se está mirando
// para poder volver al desglose sin perder el contexto.
type VistaFotos = { dia: DetalleRegistro; cargando: boolean; entrada: string | null; salida: string | null; error: boolean };
type Drill = {
  colaborador: { nombre: string; apellido: string };
  liquidacion: LineaLiquidacion[]; totalRecargos: number; totalExtra: number; totalAdicional: number;
  detalleRegistros: DetalleRegistro[];
};

const BADGE: Record<string, string> = {
  HOD: 'bg-blue-50 text-blue-700', HON: 'bg-indigo-50 text-indigo-700',
  HED: 'bg-orange-50 text-orange-700', HEN: 'bg-red-50 text-red-700',
  HDD: 'bg-purple-50 text-purple-700', HND: 'bg-pink-50 text-pink-700',
  HEDD: 'bg-yellow-50 text-yellow-800', HEND: 'bg-rose-50 text-rose-700',
};

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtMin = (m: number) => {
  const t = Math.round(Math.abs(m));
  return t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}min` : `${t} min`;
};
const fmtHora = (s: string) => format(toZonedTime(new Date(s), TZ), 'HH:mm');

// Una foto del par entrada/salida. Cuando no hay imagen explica POR QUÉ, que es
// lo que de verdad necesita saber quien audita: no es lo mismo "marcó con
// cédula" que "la foto existió y ya se borró".
function Foto({ titulo, src, expirada }: { titulo: string; src: string | null; expirada: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted mb-1.5">{titulo}</p>
      {src ? (
        <img src={src} alt={titulo} className="w-full rounded-xl border border-gray-200 bg-gray-50" />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <ImageOff size={22} className="mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-muted leading-relaxed">
            {expirada
              ? <>Las fotos se eliminan automáticamente a los <b>{MESES_RETENCION_FOTOS} meses</b> para no sobrecargar el servidor.</>
              : <>Sin foto: la marcación se hizo <b>con cédula</b>, no con reconocimiento facial.</>}
          </p>
        </div>
      )}
    </div>
  );
}

function PanelFotos({ vista }: { vista: VistaFotos }) {
  if (vista.cargando) return <p className="text-center text-gray-400 py-10 text-sm">Cargando fotos...</p>;
  if (vista.error) return <p className="text-center text-red-500 py-10 text-sm">No pudimos cargar las fotos de esta marcación.</p>;

  const expirada = fotosExpiradas(vista.dia.fecha);
  return (
    <>
      <div className="flex items-center justify-center gap-2 text-xs text-muted font-mono mb-4">
        <span className="text-green-700">{fmtHora(vista.dia.entrada)}</span> — <span className="text-red-600">{fmtHora(vista.dia.salida)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Foto titulo="Entrada" src={vista.entrada} expirada={expirada} />
        <Foto titulo="Salida" src={vista.salida} expirada={expirada} />
      </div>
    </>
  );
}

export default function ReporteExtras() {
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; apellido: string }[]>([]);
  const [colaboradorId, setColaboradorId] = useState(''); // '' = Todos
  const [sedeId, setSedeId] = useState(''); // '' = todas las sedes
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [drill, setDrill] = useState<Drill | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [vistaFotos, setVistaFotos] = useState<VistaFotos | null>(null);

  // Abre las fotos de un día sin salir del modal. Se piden al momento y no con
  // el reporte: son base64 pesados y la mayoría de las veces nadie las mira.
  const abrirFotos = async (dia: DetalleRegistro) => {
    setVistaFotos({ dia, cargando: true, entrada: null, salida: null, error: false });
    try {
      const r = await api.get(`/registros/${dia.id}/fotos`);
      setVistaFotos({ dia, cargando: false, entrada: r.data.fotoEntrada, salida: r.data.fotoSalida, error: false });
    } catch {
      setVistaFotos({ dia, cargando: false, entrada: null, salida: null, error: true });
    }
  };

  const cerrarDrill = () => { setDrill(null); setVistaFotos(null); };

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);
  useEffect(() => { api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([])); }, []);

  const buscar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/reportes/extras-resumen', { params: { desde, hasta, ...(sedeId ? { sedeId } : {}) } });
      setFilas(r.data.colaboradores);
    } catch {
      setError('No pudimos calcular el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Al abrir la página, siempre muestra a todos de una vez (con el período por defecto)
  useEffect(() => { buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // El filtro de colaborador no vuelve a pedir al servidor: filtra en el navegador
  // sobre lo ya cargado para ese período.
  const visibles = useMemo(() => {
    if (!filas) return [];
    return colaboradorId ? filas.filter(f => f.colaboradorId === colaboradorId) : filas;
  }, [filas, colaboradorId]);

  // Este reporte es solo lo que se PAGA además del salario. El saldo de tiempo
  // no remunerado es un descuento sobre el salario y vive en el reporte diario,
  // que es donde el salario está a la vista y la resta tiene sentido.
  const totalGeneral = visibles.reduce((s, f) => s + f.totalAdicional, 0);

  const abrirDrill = async (f: Fila) => {
    setDrillLoading(true);
    setDrill({ colaborador: { nombre: f.nombre, apellido: f.apellido }, liquidacion: [], totalRecargos: 0, totalExtra: 0, totalAdicional: 0, detalleRegistros: [] });
    try {
      const r = await api.get('/reportes/liquidacion', { params: { colaboradorId: f.colaboradorId, desde, hasta } });
      setDrill({
        colaborador: r.data.colaborador, liquidacion: r.data.liquidacion,
        totalRecargos: r.data.totalRecargos, totalExtra: r.data.totalExtra, totalAdicional: r.data.totalAdicional,
        detalleRegistros: r.data.detalleRegistros,
      });
    } catch {
      setDrill(null);
    } finally {
      setDrillLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Extras y recargos</h2>
      <p className="text-sm text-muted mb-6">Valor a pagar por horas extra y recargos, por colaborador.</p>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador</label>
            <select value={colaboradorId} onChange={e => setColaboradorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          {sedes.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sede</label>
              <select value={sedeId} onChange={e => setSedeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={buscar} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Search size={16} />{loading ? 'Calculando...' : 'Buscar'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Tabla resumen */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6">
        <div className="overflow-x-auto">
          {visibles.length === 0 ? (
            <p className="text-center text-gray-400 py-8">{loading ? 'Calculando...' : 'Sin datos para este período.'}</p>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador</th>
                  <th className="px-3 py-2 text-right">Recargos</th>
                  <th className="px-3 py-2 text-right">Extras</th>
                  <th className="px-3 py-2 text-right">Total a pagar</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map(f => (
                  <tr key={f.colaboradorId} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirDrill(f)}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{f.nombre} {f.apellido}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(f.totalRecargos)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(f.totalExtra)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{fmt(f.totalAdicional)}</td>
                    <td className="px-3 py-2.5 text-right text-primary-dark text-xs font-semibold">Ver desglose →</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="px-3 py-3 font-bold text-ink">Total {colaboradorId ? '' : `(${visibles.length} colaboradores)`}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(visibles.reduce((s, f) => s + f.totalRecargos, 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(visibles.reduce((s, f) => s + f.totalExtra, 0))}</td>
                  <td className="px-3 py-3 text-right font-bold text-ink text-base">{fmt(totalGeneral)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Drill-down: desglose de un colaborador */}
      {drill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cerrarDrill}>
          <div className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* En la vista de fotos, el botón de volver reemplaza al avatar del
                    encabezado: se regresa al desglose sin cerrar el modal. */}
                {vistaFotos && (
                  <button onClick={() => setVistaFotos(null)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary-dark hover:underline shrink-0">
                    <ArrowLeft size={15} /> Volver
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-ink truncate">
                    {vistaFotos
                      ? format(toZonedTime(new Date(vistaFotos.dia.fecha), TZ), "EEEE dd 'de' MMMM", { locale: es })
                      : `${drill.colaborador.nombre} ${drill.colaborador.apellido}`}
                  </h3>
                  <p className="text-xs text-muted">
                    {vistaFotos
                      ? 'Fotos de verificación facial'
                      : `${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
                  </p>
                </div>
              </div>
              <button onClick={cerrarDrill}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              {vistaFotos ? (
                <PanelFotos vista={vistaFotos} />
              ) : drillLoading ? (
                <p className="text-center text-gray-400 py-8">Cargando...</p>
              ) : (
                <>
                  {/* Las tres tarjetas reparten el ancho completo del modal en
                      lugar de quedar apiladas a la izquierda. */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-sm">
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5"><p className="text-xs text-muted">Recargos</p><p className="font-semibold text-ink">{fmt(drill.totalRecargos)}</p></div>
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5"><p className="text-xs text-muted">Extras</p><p className="font-semibold text-ink">{fmt(drill.totalExtra)}</p></div>
                    <div className="bg-primary/15 rounded-xl px-4 py-2.5"><p className="text-xs text-ink/70">Total a pagar</p><p className="font-bold text-ink">{fmt(drill.totalAdicional)}</p></div>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                    <Clock3 size={13} /> Desglose por día
                  </p>
                  {drill.detalleRegistros.length === 0 && (
                    <p className="text-center text-gray-400 py-6 text-sm">Sin horas extra ni recargos en este período.</p>
                  )}
                  <div className="space-y-1.5">
                    {drill.detalleRegistros.map((d, i) => (
                      <button key={i} type="button" onClick={() => abrirFotos(d)}
                        className="w-full text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-primary/50 hover:bg-gray-50/60 transition-colors">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-sm font-medium text-ink capitalize flex items-center gap-1.5">
                            {format(toZonedTime(new Date(d.fecha), TZ), "EEE dd/MM/yyyy", { locale: es })}
                            <Camera size={13} className="text-muted" />
                          </span>
                          <span className="text-xs text-muted font-mono">
                            <span className="text-green-700">{fmtHora(d.entrada)}</span> — <span className="text-red-600">{fmtHora(d.salida)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {d.filas.map(fl => (
                            <span key={fl.codigo} className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${BADGE[fl.codigo] ?? 'bg-gray-100 text-gray-600'}`}>
                              {fl.codigo} · {fmtMin(fl.horas * 60)} · {fmt(fl.subtotal)}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
