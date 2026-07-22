import { useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { AlarmClock, X } from 'lucide-react';
import ModalShell from './ModalShell';
import { cerrarRegistro } from '../api';
import { TZ } from '../helpers';
import type { TurnoOlvidado } from '../types';

export default function ModalCerrarTurno({ turno, onClose, onDone }: {
  turno: TurnoOlvidado; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState(() => {
    const z = toZonedTime(new Date(turno.entrada), TZ);
    return { fecha: format(z, 'yyyy-MM-dd'), entrada: format(z, 'HH:mm'), salida: '' };
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.salida) { setError('Indica la hora de salida.'); return; }
    // Hora de pared de Bogotá (UTC-5): así el instante no depende de la zona del navegador.
    const entrada = new Date(`${form.fecha}T${form.entrada}:00-05:00`);
    const salida = new Date(`${form.fecha}T${form.salida}:00-05:00`);
    if (salida <= entrada) { setError('La salida debe ser posterior a la entrada.'); return; }
    setGuardando(true);
    try {
      await cerrarRegistro(turno.id, { entrada, salida });
      onClose();
      onDone();
    } catch {
      setError('No pudimos guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell onClose={onClose} inner="rounded-2xl p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-lg text-ink flex items-center gap-2"><AlarmClock size={18} className="text-orange-500" /> Cerrar turno</h3>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <p className="text-sm text-muted mb-4">{turno.colaborador} · marcó entrada el {format(toZonedTime(new Date(turno.entrada), TZ), "d 'de' MMMM", { locale: es })} pero no registró salida.</p>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Fecha</label>
          <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Entrada</label>
            <input type="time" value={form.entrada} onChange={e => setForm(p => ({ ...p, entrada: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Salida</label>
            <input type="time" autoFocus value={form.salida} onChange={e => setForm(p => ({ ...p, salida: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Cerrar turno'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
