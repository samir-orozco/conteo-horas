import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { Search, X, Clock3 } from 'lucide-react';
import api from '../lib/api';

const TZ = 'America/Bogota';

type Fila = {
  colaboradorId: string; nombre: string; apellido: string;
  totalRecargos: number; totalExtra: number; totalAdicional: number;
  sinHorario: boolean; minutosSaldo: number; montoSaldo: number; totalNeto: number;
};
type LineaLiquidacion = { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number };
type DetalleRegistro = { fecha: string; entrada: string; salida: string; filas: { codigo: string; nombre: string; horas: number; subtotal: number }[] };
export type SaldoTiempo = {
  sinHorario: boolean; minutosEsperados: number; minutosPermisoRemunerado: number;
  minutosPermisoNoRemunerado: number; minutosTrabajados: number; minutosSaldo: number;
  valorHora: number; montoSaldo: number;
};
type Drill = {
  colaborador: { nombre: string; apellido: string };
  liquidacion: LineaLiquidacion[]; totalRecargos: number; totalExtra: number; totalAdicional: number;
  detalleRegistros: DetalleRegistro[];
  saldo?: SaldoTiempo;
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

export default function ReporteExtras() {
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; apellido: string }[]>([]);
  const [colaboradorId, setColaboradorId] = useState(''); // '' = Todos
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [drill, setDrill] = useState<Drill | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);

  const buscar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/reportes/extras-resumen', { params: { desde, hasta } });
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

  const totalGeneral = visibles.reduce((s, f) => s + f.totalNeto, 0);
  const totalSaldo = visibles.reduce((s, f) => s + (f.montoSaldo ?? 0), 0);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador</label>
            <select value={colaboradorId} onChange={e => setColaboradorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
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
                  <th className="px-3 py-2 text-right">Saldo pendiente</th>
                  <th className="px-3 py-2 text-right">Neto a pagar</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map(f => (
                  <tr key={f.colaboradorId} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirDrill(f)}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{f.nombre} {f.apellido}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(f.totalRecargos)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(f.totalExtra)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {f.sinHorario
                        ? <span className="text-xs text-muted">sin horario</span>
                        : f.montoSaldo > 0
                          ? <span className="text-red-600 font-semibold">−{fmt(f.montoSaldo)}</span>
                          : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{fmt(f.totalNeto)}</td>
                    <td className="px-3 py-2.5 text-right text-primary-dark text-xs font-semibold">Ver desglose →</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="px-3 py-3 font-bold text-ink">Total {colaboradorId ? '' : `(${visibles.length} colaboradores)`}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(visibles.reduce((s, f) => s + f.totalRecargos, 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(visibles.reduce((s, f) => s + f.totalExtra, 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold text-red-600">{totalSaldo > 0 ? `−${fmt(totalSaldo)}` : '—'}</td>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDrill(null)}>
          <div className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg text-ink">{drill.colaborador.nombre} {drill.colaborador.apellido}</h3>
                <p className="text-xs text-muted">
                  {format(new Date(desde), 'dd/MM/yyyy')} — {format(new Date(hasta), 'dd/MM/yyyy')}
                </p>
              </div>
              <button onClick={() => setDrill(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              {drillLoading ? (
                <p className="text-center text-gray-400 py-8">Cargando...</p>
              ) : (
                <>
                  <div className="flex gap-4 mb-5 text-sm flex-wrap">
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5"><p className="text-xs text-muted">Recargos</p><p className="font-semibold text-ink">{fmt(drill.totalRecargos)}</p></div>
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5"><p className="text-xs text-muted">Extras</p><p className="font-semibold text-ink">{fmt(drill.totalExtra)}</p></div>
                    {drill.saldo && !drill.saldo.sinHorario && drill.saldo.montoSaldo > 0 && (
                      <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-xs text-red-700/80">Saldo pendiente</p><p className="font-semibold text-red-700">−{fmt(drill.saldo.montoSaldo)}</p></div>
                    )}
                    <div className="bg-primary/15 rounded-xl px-4 py-2.5"><p className="text-xs text-ink/70">Neto</p><p className="font-bold text-ink">{fmt(drill.totalAdicional - (drill.saldo?.montoSaldo ?? 0))}</p></div>
                  </div>

                  {drill.saldo && !drill.saldo.sinHorario && (
                    <div className="mb-5 border border-gray-100 rounded-xl px-4 py-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Tiempo del período</p>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                        <span className="text-muted">Debía trabajar</span>
                        <span className="text-right font-medium text-ink">{fmtMin(drill.saldo.minutosEsperados)}</span>
                        <span className="text-muted">Trabajó</span>
                        <span className="text-right font-medium text-ink">{fmtMin(drill.saldo.minutosTrabajados)}</span>
                        {drill.saldo.minutosPermisoRemunerado > 0 && (
                          <>
                            <span className="text-muted">Novedades pagadas (no se exigen)</span>
                            <span className="text-right text-gray-500">{fmtMin(drill.saldo.minutosPermisoRemunerado)}</span>
                          </>
                        )}
                        {drill.saldo.minutosPermisoNoRemunerado > 0 && (
                          <>
                            <span className="text-muted">Novedades no remuneradas</span>
                            <span className="text-right text-red-600">{fmtMin(drill.saldo.minutosPermisoNoRemunerado)}</span>
                          </>
                        )}
                        <span className="font-semibold text-ink border-t border-gray-100 pt-1">
                          {drill.saldo.minutosSaldo > 0 ? 'Queda debiendo' : 'Repuso todo'}
                        </span>
                        <span className={`text-right font-bold border-t border-gray-100 pt-1 ${drill.saldo.minutosSaldo > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {drill.saldo.minutosSaldo > 0 ? fmtMin(drill.saldo.minutosSaldo) : '✓'}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                    <Clock3 size={13} /> Desglose por día
                  </p>
                  {drill.detalleRegistros.length === 0 && (
                    <p className="text-center text-gray-400 py-6 text-sm">Sin horas extra ni recargos en este período.</p>
                  )}
                  <div className="space-y-1.5">
                    {drill.detalleRegistros.map((d, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-sm font-medium text-ink capitalize">
                            {format(toZonedTime(new Date(d.fecha), TZ), "EEE dd/MM/yyyy", { locale: es })}
                          </span>
                          <span className="text-xs text-muted font-mono">
                            <span className="text-green-700">{fmtHora(d.entrada)}</span> — <span className="text-red-600">{fmtHora(d.salida)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {d.filas.map(fl => (
                            <span key={fl.codigo} className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${BADGE[fl.codigo] ?? 'bg-gray-100 text-gray-600'}`}>
                              {fl.codigo} · {fl.horas}h · {fmt(fl.subtotal)}
                            </span>
                          ))}
                        </div>
                      </div>
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
