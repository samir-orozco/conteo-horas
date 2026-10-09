import TarjetaResena from '../landing/TarjetaResena';
import type { ResenaAdmin } from './api';
import { tarjetaDeVistaPrevia } from './adminResenas';

// Lo que sale en la landing si el dueño confirma (R25). Es LA tarjeta de la landing, no una copia
// que se le parece (CLAUDE.md §13), y con la firma armada igual que la arma el servidor: si la reseña
// es anónima, aquí tampoco aparece quién la escribió.

type Props = {
  resena: ResenaAdmin;
  enviando: boolean;
  onPublicar: () => void;
  onCancelar: () => void;
};

export default function AdminVistaPrevia({ resena, enviando, onPublicar, onCancelar }: Props) {
  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Vista previa"
        className="hp-pop bg-gray-50 rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-ink">Así se verá en la landing</h2>
          <p className="text-sm text-muted">Al publicarla, esta tarjeta entra al carrusel de inmediato.</p>
        </div>
        <TarjetaResena {...tarjetaDeVistaPrevia(resena)} />
        <div className="flex gap-3">
          <button onClick={onCancelar}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl bg-white hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onPublicar} disabled={enviando}
            className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-primary hover:bg-primary-dark text-ink disabled:opacity-50">
            Sí, publicar
          </button>
        </div>
      </div>
    </div>
  );
}
