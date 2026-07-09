import { AlertTriangle } from 'lucide-react';

type Props = {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  textoContinuar?: string;
  peligro?: boolean;
  onContinuar: () => void;
  onCancelar: () => void;
};

// Modal de confirmación propio del sistema (reemplaza el confirm() del navegador)
export default function ConfirmDialog({
  abierto, titulo, subtitulo, textoContinuar = 'Continuar', peligro = false, onContinuar, onCancelar,
}: Props) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCancelar}>
      <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${peligro ? 'bg-red-100' : 'bg-primary/40'}`}>
          <AlertTriangle size={22} className={peligro ? 'text-red-600' : 'text-ink'} />
        </div>
        <h3 className="text-lg font-bold text-ink text-center">{titulo}</h3>
        {subtitulo && <p className="text-sm text-muted text-center mt-1.5">{subtitulo}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onCancelar}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onContinuar}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl ${peligro ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-primary hover:bg-primary-dark text-ink'}`}>
            {textoContinuar}
          </button>
        </div>
      </div>
    </div>
  );
}
