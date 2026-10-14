import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Gift, Lock } from 'lucide-react';
import api from '../../lib/api';
import { ultimoDiaCubierto } from '../../lib/fechas';
import FuncionBloqueada from '../../components/FuncionBloqueada';

// LA PRUEBA GRATIS DEL CLIMA EN SU PANTALLA (14 de octubre de 2026, PENDIENTES nº 39, fase 3).
//
// Sin el plan: el botón para empezarla, o, si la empresa ya la usó, cuándo terminó y la tarjeta de subir de plan.
// Con el clima por la prueba: hasta qué día. Si se puede pedir o no lo decide el servidor (utils/pruebaClima.ts del
// backend); aquí no se adivina nada: si el estado no llega, queda la tarjeta de siempre, sin el botón.

type Estado = { disponible: boolean; vigente: { hasta: string } | null; terminada: { hasta: string } | null; dias: number };

const DESCRIPCION = 'Tu equipo califica su día con una carita al marcar la salida, y tú ves cómo está el ánimo, por qué y quién necesita atención.';

export default function PruebaGratis({ sinPlan, onEmpezada }: { sinPlan: boolean; onEmpezada: () => void }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargado, setCargado] = useState(false);
  const [empezando, setEmpezando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/clima/prueba')
      .then(r => setEstado(r.data))
      .catch(() => setEstado(null))
      .finally(() => setCargado(true));
  }, []);

  const empezar = async () => {
    setEmpezando(true);
    setError('');
    try {
      const r = await api.post('/clima/prueba');
      // El estado se arma aquí con lo que respondió: el plan se vuelve a leer en la página y esta tarjeta pasa a ser
      // el aviso de hasta cuándo sin otra ida al servidor.
      setEstado(e => ({ disponible: false, vigente: { hasta: r.data.hasta }, terminada: null, dias: e?.dias ?? 30 }));
      onEmpezada();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'No se pudo empezar la prueba. Intenta de nuevo.');
    } finally {
      setEmpezando(false);
    }
  };

  if (!sinPlan) {
    if (!estado?.vigente) return null;
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary bg-primary/15 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-ink">
          <Gift size={16} aria-hidden="true" />
          Estás probando el clima laboral gratis hasta el {ultimoDiaCubierto(estado.vigente.hasta)}.
        </p>
        <button type="button" onClick={() => navigate('/app/configuracion?tab=suscripcion')}
          className="flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
          Ver el plan Empresarial <ArrowUpRight size={15} />
        </button>
      </div>
    );
  }

  // Mientras llega el estado no se pinta nada: pintar la tarjeta de subir de plan y cambiarla un instante después
  // por la de la prueba es un parpadeo que confunde.
  if (!cargado) return null;

  if (!estado?.disponible) {
    const terminada = estado?.terminada;
    return (
      <FuncionBloqueada
        titulo="Clima laboral" plan="Empresarial"
        descripcion={terminada
          ? `Tu prueba gratis terminó el ${ultimoDiaCubierto(terminada.hasta)}. Tu equipo sigue calificando su día: con el plan Empresarial vuelves a ver cómo está el ánimo, por qué y quién necesita atención.`
          : DESCRIPCION}
      />
    );
  }

  return (
    <div className="bg-white rounded-card border border-dashed border-gray-300 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><Lock size={16} className="text-muted" /> Clima laboral</p>
          <p className="text-sm text-muted">{DESCRIPCION}</p>
          <p className="mt-2 text-sm text-ink">
            Pruébalo gratis: ves el panel completo durante {estado.dias} días, contando hoy. Es una sola vez por empresa.
          </p>
        </div>
        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full shrink-0">Plan Empresarial</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={empezar} disabled={empezando}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
          <Gift size={15} aria-hidden="true" /> Pruébalo gratis {estado.dias} días
        </button>
        <button type="button" onClick={() => navigate('/app/configuracion?tab=suscripcion')}
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          Ver planes <ArrowUpRight size={15} />
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
