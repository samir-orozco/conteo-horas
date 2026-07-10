import { useState, useEffect } from 'react';
import { IdCard, ScanFace, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

// Métodos de marcación del kiosco. El reconocimiento facial siempre está
// disponible; la cédula se puede desactivar para exigir verificación biométrica.
export default function TabMarcacion() {
  const [permiteCedula, setPermiteCedula] = useState(true);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    api.get('/configuracion').then(r => {
      setPermiteCedula(r.data.KIOSCO_PERMITE_CEDULA !== '0');
      setCargado(true);
    });
  }, []);

  const toggleCedula = async () => {
    const nuevo = !permiteCedula;
    setPermiteCedula(nuevo);
    await api.put('/configuracion', { KIOSCO_PERMITE_CEDULA: nuevo ? '1' : '0' });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-ink">Marcación</h1>
        <p className="text-sm text-muted">Cómo se identifican tus colaboradores en el kiosco.</p>
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><IdCard size={17} /> Marcación con cédula</p>
            <p className="text-sm text-muted">
              El colaborador digita su número de cédula para marcar. Si la desactivas,
              el kiosco solo aceptará reconocimiento facial.
            </p>
          </div>
          <button onClick={toggleCedula} disabled={!cargado} role="switch" aria-checked={permiteCedula}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${permiteCedula ? 'bg-primary' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${permiteCedula ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {!permiteCedula && cargado && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Solo podrán marcar los colaboradores con el <b>rostro registrado</b>.
              Verifica que todos lo tengan en su perfil (Colaboradores → Reconocimiento facial).
            </span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><ScanFace size={17} /> Reconocimiento facial</p>
            <p className="text-sm text-muted">
              Siempre disponible para quienes tengan su rostro registrado. La verificación
              incluye prueba de vida (parpadeo) y guarda una foto como evidencia de cada marcación.
            </p>
          </div>
          <span className="text-xs font-bold bg-green-100 text-green-800 px-3 py-1.5 rounded-full shrink-0">Siempre activo</span>
        </div>
      </div>
    </div>
  );
}
