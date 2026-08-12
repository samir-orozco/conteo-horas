import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, X, AlarmClock } from 'lucide-react';
import api from '../lib/api';

type Fila = { colaboradorId: string; nombre: string; apellido: string; sinHorario: boolean; diasTarde: number; totalMinutos: number; montoTardanzas: number };
type DetalleTardanza = { fecha: string; horaEsperada: string; horaLlegada: string; minutosTarde: number };
type Drill = {
  colaborador: { nombre: string; apellido: string };
  sinHorario: boolean; horario?: { nombre: string; toleranciaMin: number };
  // La tolerancia que se APLICÓ en el período, que sale de los días
  // materializados. No es la de `horario`: esa es la de hoy, y si el admin la
  // cambió después mostraría un número que no se usó para calcular nada.
  toleranciaMin?: number;
  detalle: DetalleTardanza[]; totalMinutos: number; diasTarde: number;
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function ReporteLlegadasTarde() {
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

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);
  useEffect(() => { api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([])); }, []);

  const buscar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/reportes/tardanzas-resumen', { params: { desde, hasta, ...(sedeId ? { sedeId } : {}) } });
      setFilas(r.data.colaboradores);
    } catch {
      setError('No pudimos calcular el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Al abrir la página, siempre muestra a todos de una vez (con el período por defecto)
  useEffect(() => { buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(() => {
    if (!filas) return [];
    return colaboradorId ? filas.filter(f => f.colaboradorId === colaboradorId) : filas;
  }, [filas, colaboradorId]);

  const abrirDrill = async (f: Fila) => {
    if (f.sinHorario) return; // sin horario no hay detalle que ver
    setDrillLoading(true);
    setDrill({ colaborador: { nombre: f.nombre, apellido: f.apellido }, sinHorario: false, detalle: [], totalMinutos: 0, diasTarde: 0 });
    try {
      const r = await api.get('/reportes/tardanzas', { params: { colaboradorId: f.colaboradorId, desde, hasta } });
      setDrill({
        colaborador: { nombre: f.nombre, apellido: f.apellido }, sinHorario: r.data.sinHorario, horario: r.data.horario,
        toleranciaMin: r.data.toleranciaMin,
        detalle: r.data.detalle, totalMinutos: r.data.totalMinutos, diasTarde: r.data.diasTarde,
      });
    } catch {
      setDrill(null);
    } finally {
      setDrillLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Llegadas tarde</h2>
      <p className="text-sm text-muted mb-6">Tardanzas por colaborador, según su horario asignado.</p>

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
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador</th>
                  <th className="px-3 py-2 text-center">Días tarde</th>
                  <th className="px-3 py-2 text-right">Tiempo total</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map(f => (
                  <tr key={f.colaboradorId} className={f.sinHorario ? '' : 'hover:bg-gray-50 cursor-pointer'} onClick={() => abrirDrill(f)}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{f.nombre} {f.apellido}</td>
                    {f.sinHorario ? (
                      <td colSpan={3} className="px-3 py-2.5 text-center text-xs text-muted">Sin horario asignado</td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-center">
                          {f.diasTarde === 0
                            ? <span className="text-green-700 font-medium">0 ✓</span>
                            : <span className="text-orange-600 font-semibold">{f.diasTarde}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-ink">{f.diasTarde === 0 ? '—' : fmtMin(f.totalMinutos)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{f.diasTarde === 0 ? '—' : cop(f.montoTardanzas)}</td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-right text-primary-dark text-xs font-semibold">{f.sinHorario ? '' : 'Ver desglose →'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="px-3 py-3 font-bold text-ink">Total {colaboradorId ? '' : `(${visibles.length} colaboradores)`}</td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-700">{visibles.reduce((s, f) => s + f.diasTarde, 0)}</td>
                  <td className="px-3 py-3 text-right font-bold text-ink">{fmtMin(visibles.reduce((s, f) => s + f.totalMinutos, 0))}</td>
                  <td className="px-3 py-3 text-right font-bold text-ink">{cop(visibles.reduce((s, f) => s + (f.montoTardanzas ?? 0), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {visibles.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            El <b>valor</b> es de referencia: es lo que cuesta ese tiempo a la tarifa base. El descuento que
            realmente se aplica sale del <b>saldo del período</b> en el reporte diario, que ya incluye estos
            minutos y los cruza con el tiempo que el colaborador haya repuesto.
          </p>
        )}
      </div>

      {/* Drill-down: desglose de un colaborador */}
      {drill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDrill(null)}>
          <div className="hp-pop bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg text-ink">{drill.colaborador.nombre} {drill.colaborador.apellido}</h3>
                <p className="text-xs text-muted">
                  {format(new Date(desde), 'dd/MM/yyyy')} — {format(new Date(hasta), 'dd/MM/yyyy')}
                  {drill.horario && ` · Horario ${drill.horario.nombre}`}
                  {drill.toleranciaMin != null && ` (${drill.toleranciaMin} min de tolerancia)`}
                </p>
              </div>
              <button onClick={() => setDrill(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              {drillLoading ? (
                <p className="text-center text-gray-400 py-8">Cargando...</p>
              ) : drill.detalle.length === 0 ? (
                <p className="text-center text-green-700 py-8 flex items-center justify-center gap-2"><AlarmClock size={16} /> Sin llegadas tarde en este período ✓</p>
              ) : (
                <>
                  <p className="text-sm text-muted mb-4">
                    <b className="text-orange-600">{drill.diasTarde} día{drill.diasTarde === 1 ? '' : 's'} tarde · {fmtMin(drill.totalMinutos)} en total</b>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2 text-center">Hora esperada</th>
                          <th className="px-3 py-2 text-center">Hora de llegada</th>
                          <th className="px-3 py-2 text-right">Tiempo tarde</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {drill.detalle.map(t => (
                          <tr key={t.fecha}>
                            <td className="px-3 py-2 text-gray-700">{format(new Date(t.fecha + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{t.horaEsperada}</td>
                            <td className="px-3 py-2 text-center font-medium text-orange-600">{t.horaLlegada}</td>
                            <td className="px-3 py-2 text-right font-semibold text-orange-700">{fmtMin(t.minutosTarde)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
