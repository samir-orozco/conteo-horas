import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import api from '../../lib/api';

// El interruptor del resumen semanal por correo (11 de octubre de 2026). Lo manda el backend los
// lunes a las 7 a. m. a los administradores (utils/envioResumenSemanal.ts). Encendido de fábrica:
// sin la clave guardada, está encendido. Solo lo ve y lo cambia un administrador.
const CLAVE = 'RESUMEN_SEMANAL_CORREO';

export default function ResumenSemanalCorreo() {
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
          <h3 id="resumen-semanal-titulo" className="font-semibold text-ink mb-1 flex items-center gap-2"><Mail size={17} /> Resumen semanal por correo</h3>
          <p className="text-sm text-muted">
            Cada lunes a las 7 a. m. les llega a los administradores cómo fue la semana: horas, extras, llegadas
            tarde y lo que necesita atención. También queda en la campana.
          </p>
        </div>
        <button onClick={cambiar} disabled={!cargado} role="switch" aria-checked={encendido} aria-labelledby="resumen-semanal-titulo"
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${encendido ? 'bg-primary' : 'bg-gray-200'}`}>
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${encendido ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-3">No pudimos guardar el cambio. Intenta de nuevo.</p>}
    </div>
  );
}
