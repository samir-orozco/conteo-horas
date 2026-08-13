import { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Video demo/guía del sistema (se muestra una sola vez en el primer ingreso).
const VIDEO_ID = 'Xr63JjeOUvI';

// `forzado` la abre desde el botón de ayuda del menú, sin importar que el
// usuario ya la haya visto: cerrar el modal sin querer no puede significar
// perder la guía para siempre.
export default function GuiaBienvenida({ forzado = false, onCerrar }: { forzado?: boolean; onCerrar?: () => void }) {
  const { usuario } = useAuth();
  const [cerradoAqui, setCerradoAqui] = useState(false);

  const primeraVez = !!usuario
    && usuario.rol !== 'SUPER_ADMIN'
    && !localStorage.getItem(`horapro_guia_vista_${usuario.id}`);
  const abierto = !cerradoAqui && (forzado || primeraVez);

  const cerrar = () => {
    if (usuario) localStorage.setItem(`horapro_guia_vista_${usuario.id}`, '1');
    setCerradoAqui(true);
    onCerrar?.();
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={cerrar}>
      <div className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              <PlayCircle size={20} className="text-ink" /> Te damos la bienvenida a HoraPro
            </h3>
            <p className="text-sm text-muted mt-0.5">Mira esta guía rápida para sacarle el máximo al sistema.</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="shrink-0 mt-1"><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="relative w-full aspect-video bg-ink">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1`}
            title="Guía de HoraPro"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="px-6 py-4 flex justify-end">
          <button onClick={cerrar} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-ink font-semibold text-sm">
            Empezar a usar HoraPro
          </button>
        </div>
      </div>
    </div>
  );
}
