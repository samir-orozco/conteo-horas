import { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import api from '../lib/api';

type TipoHora = { id: string; nombre: string; codigo: string; horaInicio: number; horaFin: number; recargo: number; aplica: string[]; activo: boolean };

export default function Configuracion() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [tiposHora, setTiposHora] = useState<TipoHora[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api.get('/configuracion').then(r => setConfig(r.data));
    api.get('/configuracion/tipos-hora').then(r => setTiposHora(r.data));
  }, []);

  const guardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    await api.put('/configuracion', config);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };

  const actualizarTipoHora = async (tipo: TipoHora) => {
    await api.put(`/configuracion/tipos-hora/${tipo.id}`, tipo);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración</h2>

      {/* Config general */}
      <form onSubmit={guardarConfig}>
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Configuración General</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la empresa</label>
              <input value={config.EMPRESA_NOMBRE || ''} onChange={e => setConfig(p => ({ ...p, EMPRESA_NOMBRE: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Horas base por mes
                <span className="ml-1 text-blue-600 cursor-help" title="En Colombia la jornada es 46h/sem = ~200h/mes (Ley 2101/2021)">
                  <Info size={12} className="inline" />
                </span>
              </label>
              <input type="number" value={config.HORAS_MES || '200'} onChange={e => setConfig(p => ({ ...p, HORAS_MES: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Jornada semanal (horas)
                <span className="ml-1 text-blue-600" title="Ley 2101/2021: 46h en 2023, bajando a 42h en 2026">
                  <Info size={12} className="inline" />
                </span>
              </label>
              <input type="number" value={config.JORNADA_SEMANAL || '46'} onChange={e => setConfig(p => ({ ...p, JORNADA_SEMANAL: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Inicio jornada diurna (hora, 0-23)</label>
              <input type="number" min={0} max={23} value={config.HORA_INICIO_DIURNA || '6'} onChange={e => setConfig(p => ({ ...p, HORA_INICIO_DIURNA: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin jornada diurna (hora, 0-23)</label>
              <input type="number" min={0} max={23} value={config.HORA_FIN_DIURNA || '21'} onChange={e => setConfig(p => ({ ...p, HORA_FIN_DIURNA: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <strong>Normativa colombiana:</strong> Según la Ley 2101 de 2021, la jornada máxima es de 46h/semana (en reducción gradual a 42h para 2026). La hora diurna va de 6:00 a 21:00 y la nocturna de 21:00 a 6:00 (Art. 160 CST).
          </div>
        </div>

        <button type="submit" disabled={guardando} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium mb-6 disabled:opacity-60">
          <Save size={16} />{guardando ? 'Guardando...' : ok ? '¡Guardado!' : 'Guardar configuración'}
        </button>
      </form>

      {/* Tipos de hora */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Tipos de Hora y Recargos</h3>
        <p className="text-xs text-gray-500 mb-4">Según el Código Sustantivo del Trabajo (CST) y sus modificaciones</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-center">Hora inicio</th>
                <th className="px-3 py-2 text-center">Hora fin</th>
                <th className="px-3 py-2 text-center">Recargo (%)</th>
                <th className="px-3 py-2 text-center">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiposHora.map(tipo => (
                <tr key={tipo.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{tipo.nombre}</p>
                    <p className="text-xs text-gray-400">{tipo.codigo}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" min={0} max={23} defaultValue={tipo.horaInicio}
                      onChange={e => { tipo.horaInicio = Number(e.target.value); }}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-xs" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" min={0} max={23} defaultValue={tipo.horaFin}
                      onChange={e => { tipo.horaFin = Number(e.target.value); }}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-xs" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" step="0.01" defaultValue={tipo.recargo}
                      onChange={e => { tipo.recargo = Number(e.target.value); }}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-xs" />
                    <p className="text-xs text-gray-400 mt-0.5">×{tipo.recargo} = {((tipo.recargo - 1) * 100).toFixed(0)}% extra</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => actualizarTipoHora(tipo)} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs font-medium">
                      <Save size={12} className="inline mr-1" />Guardar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
