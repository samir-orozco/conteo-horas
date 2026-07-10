import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, FileText, AlarmClock, Info } from 'lucide-react';
import api from '../lib/api';

type Colaborador = { id: string; nombre: string; apellido: string; salarioMensual: number };
type LineaLiquidacion = { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number };
type Reporte = {
  colaborador: Colaborador; desde: string; hasta: string; liquidacion: LineaLiquidacion[];
  salarioBase: number; totalRecargos: number; totalExtra: number; totalAdicional: number;
  totalPagar: number; registrosCont: number;
};
type Tardanzas = {
  sinHorario: boolean;
  horario?: { nombre: string; toleranciaMin: number };
  detalle: { fecha: string; horaEsperada: string; horaLlegada: string; minutosTarde: number }[];
  totalMinutos: number;
  diasTarde: number;
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);

const BADGE: Record<string, string> = {
  HOD:  'bg-blue-50 text-blue-700',
  HON:  'bg-indigo-50 text-indigo-700',
  HED:  'bg-orange-50 text-orange-700',
  HEN:  'bg-red-50 text-red-700',
  HDD:  'bg-purple-50 text-purple-700',
  HND:  'bg-pink-50 text-pink-700',
  HEDD: 'bg-yellow-50 text-yellow-800',
  HEND: 'bg-rose-50 text-rose-700',
};

export default function Reportes() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [tardanzas, setTardanzas] = useState<Tardanzas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);

  const calcular = async () => {
    if (!colaboradorId) return;
    setLoading(true);
    setError('');
    try {
      const [liq, tar] = await Promise.all([
        api.get('/reportes/liquidacion', { params: { colaboradorId, desde, hasta } }),
        api.get('/reportes/tardanzas', { params: { colaboradorId, desde, hasta } }),
      ]);
      setReporte(liq.data);
      setTardanzas(tar.data);
    } catch {
      setError('Error al calcular la liquidación');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const totalHoras = reporte?.liquidacion.reduce((s, l) => s + l.horas, 0) ?? 0;

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reportes y Liquidación</h2>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Liquidación de horas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador</label>
            <select value={colaboradorId} onChange={e => setColaboradorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
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
            <button onClick={calcular} disabled={loading || !colaboradorId}
              className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Search size={16} />{loading ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {reporte && (
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-xl text-gray-800">{reporte.colaborador.nombre} {reporte.colaborador.apellido}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Período: {format(new Date(reporte.desde), 'dd/MM/yyyy')} — {format(new Date(reporte.hasta), 'dd/MM/yyyy')}
              </p>
              <p className="text-sm text-gray-500">{reporte.registrosCont} días analizados · {totalHoras.toFixed(1)}h totales</p>
            </div>
            <FileText className="text-gray-300 hidden sm:block" size={28} />
          </div>

          {/* Aviso del modelo de pago */}
          <div className="bg-primary/20 border border-primary/40 rounded-xl px-4 py-3 mb-5 flex items-start gap-2 text-sm text-ink">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>El <b>salario base</b> ya cubre las horas ordinarias del mes. Aquí se calcula lo que se paga <b>además</b> del salario: recargos (nocturno, dominical/festivo) y horas extra.</span>
          </div>

          {/* Tabla detalle */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo de hora</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-right">Valor/hora</th>
                  <th className="px-3 py-2 text-right">Se paga</th>
                  <th className="px-3 py-2 text-right">Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reporte.liquidacion.map(l => (
                  <tr key={l.codigo} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${BADGE[l.codigo] ?? 'bg-gray-100 text-gray-600'}`}>{l.codigo}</span>
                      <span className="text-gray-700">{l.nombre}</span>
                      {l.esExtra && <span className="ml-1.5 text-[10px] font-bold text-orange-600">EXTRA</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{l.horas}h</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmt(l.valorHora)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">
                      {l.factorPagado === 0 ? '—' : `×${l.factorPagado}`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">
                      {l.factorPagado === 0 ? <span className="text-xs font-normal text-muted">en salario</span> : fmt(l.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de pago */}
          <div className="mt-5 border-t border-gray-200 pt-4 space-y-2 max-w-sm ml-auto text-sm">
            <div className="flex justify-between text-muted">
              <span>Recargos del período</span><span className="text-ink font-medium">{fmt(reporte.totalRecargos)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Horas extra del período</span><span className="text-ink font-medium">{fmt(reporte.totalExtra)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-ink font-medium">Subtotal (adicional al salario)</span>
              <span className="text-ink font-semibold">{fmt(reporte.totalAdicional)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Salario base mensual</span><span className="text-ink font-medium">{fmt(reporte.salarioBase)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold text-ink">Total a pagar</span>
              <span className="font-bold text-ink text-lg">{fmt(reporte.salarioBase + reporte.totalAdicional)}</span>
            </div>
          </div>

          {reporte.liquidacion.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay registros completos (con entrada y salida) en este período</p>
          )}
        </div>
      )}

      {/* Llegadas tarde del período */}
      {reporte && tardanzas && (
        <div className="bg-white rounded-xl shadow p-4 md:p-6 mt-6">
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
            <AlarmClock size={17} className={tardanzas.diasTarde > 0 ? 'text-orange-500' : 'text-green-600'} />
            Llegadas tarde
          </h3>
          {tardanzas.sinHorario ? (
            <p className="text-sm text-muted mt-2">
              Este colaborador no tiene horario asignado, así que no se controlan llegadas tarde.
              Asígnale uno desde su perfil o en Configuración → Horarios.
            </p>
          ) : tardanzas.diasTarde === 0 ? (
            <p className="text-sm text-green-700 mt-2">
              Sin llegadas tarde en el período ✓ (horario {tardanzas.horario?.nombre}, {tardanzas.horario?.toleranciaMin} min de tolerancia)
            </p>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">
                Horario {tardanzas.horario?.nombre} ({tardanzas.horario?.toleranciaMin} min de tolerancia sobre la hora de cada día):{' '}
                <b className="text-orange-600">{tardanzas.diasTarde} día{tardanzas.diasTarde === 1 ? '' : 's'} tarde · {fmtMin(tardanzas.totalMinutos)} en total</b>
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
                    {tardanzas.detalle.map(t => (
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
      )}
    </div>
  );
}
