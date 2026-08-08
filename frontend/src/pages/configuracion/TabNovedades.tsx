import { useEffect, useState } from 'react';
import { CalendarOff, Lock, Check, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { TIPO_PERMISO_LABEL } from '../../constants/permisos';
import { useAuth } from '../../context/AuthContext';

type Politica = {
  remuneradosPorLey: string[];
  nuncaRemunerados: string[];
  configurables: string[];
  remunerados: string[];
  configurado: boolean;
};

// Qué novedades se pagan y cuáles descuentan tiempo. Los tipos definidos por ley
// se muestran bloqueados: el backend también los rechaza, no basta con ocultarlos.
export default function TabNovedades() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';
  const [pol, setPol] = useState<Politica | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/configuracion/permisos-remunerados').then(r => setPol(r.data)).catch(() => setError('No pudimos cargar la configuración'));
  }, []);

  const alternar = async (tipo: string) => {
    if (!pol || !esAdmin) return;
    const activo = pol.remunerados.includes(tipo);
    const siguiente = activo ? pol.remunerados.filter(t => t !== tipo) : [...pol.remunerados, tipo];
    const previo = pol.remunerados;
    setPol({ ...pol, remunerados: siguiente, configurado: true }); // optimista
    setGuardando(true);
    setError('');
    try {
      await api.put('/configuracion', { PERMISOS_REMUNERADOS: siguiente.join(',') });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e: any) {
      setPol({ ...pol, remunerados: previo }); // rollback
      setError(e.response?.data?.error ?? 'No pudimos guardar el cambio');
    } finally {
      setGuardando(false);
    }
  };

  if (!pol) {
    return <div className="p-6 md:p-8"><p className="text-sm text-muted">{error || 'Cargando…'}</p></div>;
  }

  const Fila = ({ tipo, estado, bloqueado }: { tipo: string; estado: boolean; bloqueado: boolean }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-ink text-sm">{TIPO_PERMISO_LABEL[tipo] ?? tipo}</p>
        {bloqueado && (
          <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
            <Lock size={11} /> {estado ? 'Remunerado por ley' : 'Por definición no se remunera'}
          </p>
        )}
      </div>
      {bloqueado ? (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${estado ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {estado ? 'Se paga' : 'No se paga'}
        </span>
      ) : (
        <button
          onClick={() => alternar(tipo)}
          disabled={guardando || !esAdmin}
          role="switch"
          aria-checked={estado}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${estado ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${estado ? 'left-6' : 'left-1'}`} />
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-5">
      <div>
        <h3 className="font-bold text-ink flex items-center gap-2"><CalendarOff size={18} /> Novedades remuneradas</h3>
        <p className="text-sm text-muted mt-1">
          Cuando una novedad <b>no</b> es remunerada, ese tiempo queda como saldo pendiente del colaborador.
          Si no lo repone dentro del período, se descuenta en el reporte.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {!esAdmin && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-muted">
          Solo el administrador puede cambiar esta configuración, porque afecta los descuentos de nómina.
        </div>
      )}

      <div className="bg-white rounded-card border border-gray-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Definido por la ley</p>
        <p className="text-xs text-muted mb-2">No se puede cambiar.</p>
        {pol.remuneradosPorLey.map(t => <Fila key={t} tipo={t} estado bloqueado />)}
        {pol.nuncaRemunerados.map(t => <Fila key={t} tipo={t} estado={false} bloqueado />)}
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Lo decide tu empresa</p>
          {guardado && (
            <span className="text-[11px] font-semibold text-green-700 flex items-center gap-1"><Check size={12} /> Guardado</span>
          )}
        </div>
        <p className="text-xs text-muted mb-2">
          La ley no obliga a pagarlos. Actívalos si en tu empresa se pagan igual.
          {!pol.configurado && ' Hoy están todos activos por defecto.'}
        </p>
        {pol.configurables.map(t => (
          <Fila key={t} tipo={t} estado={pol.remunerados.includes(t)} bloqueado={false} />
        ))}
      </div>
    </div>
  );
}
