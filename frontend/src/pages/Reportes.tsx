import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, FileText } from 'lucide-react';
import api from '../lib/api';

type Colaborador = { id: string; nombre: string; apellido: string; salarioMensual: number };
type LineaLiquidacion = { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; subtotal: number };
type Reporte = { colaborador: Colaborador; desde: string; hasta: string; liquidacion: LineaLiquidacion[]; totalPagar: number; registrosCont: number };

export default function Reportes() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);

  const calcular = async () => {
    if (!colaboradorId) return;
    setLoading(true);
    const r = await api.get('/reportes/liquidacion', { params: { colaboradorId, desde, hasta } });
    setReporte(r.data);
    setLoading(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reportes y Liquidación</h2>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Liquidación de horas</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador</label>
            <select value={colaboradorId} onChange={e => setColaboradorId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48">
              <option value="">Seleccionar...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={calcular} disabled={loading || !colaboradorId}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <Search size={16} />{loading ? 'Calculando...' : 'Calcular'}
          </button>
        </div>
      </div>

      {reporte && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{reporte.colaborador.nombre} {reporte.colaborador.apellido}</h3>
              <p className="text-sm text-gray-500">Período: {format(new Date(reporte.desde), 'dd/MM/yyyy')} - {format(new Date(reporte.hasta), 'dd/MM/yyyy')}</p>
              <p className="text-sm text-gray-500">Registros analizados: {reporte.registrosCont}</p>
            </div>
            <FileText className="text-gray-400" size={24} />
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo de hora</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-right">Valor hora</th>
                  <th className="px-3 py-2 text-right">Factor</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reporte.liquidacion.map(l => (
                  <tr key={l.codigo}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800">{l.nombre}</p>
                      <p className="text-xs text-gray-400">{l.codigo}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{l.horas}h</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(l.valorHora)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">×{l.recargo}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="px-3 py-3 font-bold text-gray-800">TOTAL A PAGAR</td>
                  <td className="px-3 py-3 text-right font-bold text-blue-800 text-lg">{fmt(reporte.totalPagar)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {reporte.liquidacion.length === 0 && (
            <p className="text-center text-gray-400 py-4">No hay registros completos (con entrada y salida) en este período</p>
          )}
        </div>
      )}
    </div>
  );
}
