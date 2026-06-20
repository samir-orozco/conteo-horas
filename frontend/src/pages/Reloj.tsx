import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { LogIn, LogOut, Clock } from 'lucide-react';
import api from '../lib/api';

const TZ = 'America/Bogota';

type Colaborador = { id: string; nombre: string; apellido: string; cedula: string };

export default function Reloj() {
  const [hora, setHora] = useState(new Date());
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [seleccionado, setSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get('/colaboradores').then(r => setColaboradores(r.data));
  }, []);

  const registrar = async (tipo: 'entrada' | 'salida') => {
    if (!seleccionado) return setMensaje({ tipo: 'error', texto: 'Selecciona un colaborador' });
    setLoading(true);
    setMensaje(null);
    try {
      await api.post(`/registros/${tipo}`, { colaboradorId: seleccionado });
      const col = colaboradores.find(c => c.id === seleccionado);
      setMensaje({ tipo: 'ok', texto: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada para ${col?.nombre} ${col?.apellido}` });
      setSeleccionado('');
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al registrar' });
    } finally {
      setLoading(false);
    }
  };

  const bogotaTime = toZonedTime(hora, TZ);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
          <Clock size={24} />
          <span className="font-semibold">Reloj de Marcación</span>
        </div>

        <div className="my-6">
          <p className="text-5xl font-bold text-gray-800 tabular-nums">
            {format(bogotaTime, 'HH:mm:ss')}
          </p>
          <p className="text-gray-500 mt-2 capitalize">
            {format(bogotaTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        <div className="mb-6">
          <select value={seleccionado} onChange={e => setSeleccionado(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Selecciona tu nombre --</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellido} - {c.cedula}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => registrar('entrada')} disabled={loading}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
            <LogIn size={20} />Entrada
          </button>
          <button onClick={() => registrar('salida')} disabled={loading}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
            <LogOut size={20} />Salida
          </button>
        </div>

        {mensaje && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>
    </div>
  );
}
