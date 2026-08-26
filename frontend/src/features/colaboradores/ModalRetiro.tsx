import { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { MOTIVOS } from './motivos';

// Registrar el retiro de un colaborador.
//
// Se llama "retirar" y no "eliminar" porque eso es lo que hace: nada se borra.
// El botón anterior decía Eliminar y el backend inactivaba, así que quien lo
// usaba no sabía si estaba perdiendo el historial, y quien no lo usaba dejaba
// gente que ya no está ocupando cupo del plan.
export default function ModalRetiro({ colaborador, onCerrar, onListo }: {
  colaborador: { id: string; nombre: string; apellido: string };
  onCerrar: () => void;
  onListo: () => void;
}) {
  // Por defecto hoy, en la zona de Bogotá y no la del navegador.
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const [fecha, setFecha] = useState(hoy);
  const [motivo, setMotivo] = useState('RENUNCIA');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const elegido = MOTIVOS.find(m => m.valor === motivo);
  const enElFuturo = fecha > hoy;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      await api.post(`/colaboradores/${colaborador.id}/retirar`, { fecha, motivo });
      onListo();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'No pudimos registrar el retiro.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <form onSubmit={enviar} onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-lg text-ink flex items-center gap-2">
            <LogOut size={18} /> Registrar retiro
          </h3>
          <p className="text-sm text-muted mt-1">
            <b className="text-ink">{colaborador.nombre} {colaborador.apellido}</b> sale de la operación.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Último día</label>
            <input type="date" required value={fecha} max={hoy} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Motivo</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {MOTIVOS.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
            </select>
          </div>
        </div>

        {elegido?.nota && <p className="text-[11px] text-muted -mt-1">{elegido.nota}</p>}

        {enElFuturo && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Esa fecha es futura. El retiro se registra de una vez, así que la persona deja de aparecer hoy.
          </p>
        )}

        {/* Se dice qué se conserva y qué cambia, porque el botón viejo decía
            "Eliminar" y la gente no sabía si estaba perdiendo el historial. */}
        <div className="text-xs text-muted bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
          <p><b className="text-ink">No se borra nada.</b> Sus marcaciones, novedades, contratos y reportes quedan igual, y puedes consultarlos cuando quieras.</p>
          <p>Deja de contar para el cupo de tu plan <b className="text-ink">hoy mismo</b>, así que puedes agregar al reemplazo de inmediato.</p>
          <p>Su contrato vigente queda cerrado y deja de generar avisos de vencimiento.</p>
          <p>Si vuelve, lo reingresas desde la pestaña de retirados y recupera su ficha completa.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60">
            {guardando ? 'Registrando...' : 'Registrar retiro'}
          </button>
        </div>
      </form>
    </div>
  );
}
