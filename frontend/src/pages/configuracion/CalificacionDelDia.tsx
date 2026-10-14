import { useEffect, useState } from 'react';
import { Smile } from 'lucide-react';
import api from '../../lib/api';

// El interruptor «Calificación del día» (14 de octubre de 2026, PENDIENTES nº 39). Decide si el kiosco le
// pregunta a cada trabajador «¿Cómo te fue hoy?» al marcar la salida. Es para todos los planes y viene
// encendido de fábrica: sin la clave guardada, está encendido, igual que lo lee el kiosco. Los resultados
// completos se ven en Clima laboral con el plan Empresarial. Solo lo ve y lo cambia un administrador.
const CLAVE = 'CLIMA_CALIFICACION_DIA';

export default function CalificacionDelDia() {
  const [encendido, setEncendido] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/configuracion').then(r => {
      setEncendido(r.data[CLAVE] !== '0');
      setCargado(true);
    });
  }, []);

  const cambiar = async () => {
    const nuevo = !encendido;
    setEncendido(nuevo); setError(false);
    try {
      await api.put('/configuracion', { [CLAVE]: nuevo ? '1' : '0' });
    } catch {
      setEncendido(!nuevo); setError(true);
    }
  };

  return (
    <div className="bg-white rounded-card border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="calificacion-dia-titulo" className="font-semibold text-ink mb-1 flex items-center gap-2"><Smile size={17} /> Calificación del día</h3>
          <p className="text-sm text-muted">
            Al marcar la salida, el kiosco le pregunta a cada colaborador cómo le fue hoy. Los resultados se ven en
            Clima laboral.
          </p>
        </div>
        <button onClick={cambiar} disabled={!cargado} role="switch" aria-checked={encendido} aria-labelledby="calificacion-dia-titulo"
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${encendido ? 'bg-primary' : 'bg-gray-200'}`}>
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${encendido ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-3">No pudimos guardar el cambio. Intenta de nuevo.</p>}
    </div>
  );
}
