import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export type ResumenEliminacion = {
  id: string;
  nombre: string;
  nit: string;
  colaboradores: number;
  registros: number;
  pagosAprobados: number;
  comisiones: number;
  // Lo que impide borrar pase lo que pase. El texto lo escribe el servidor,
  // para que el modal no pueda decir una razón y la ruta rechazar por otra.
  bloqueo: { motivo: string; mensaje: string } | null;
};

type Props = {
  nombre: string;
  // null mientras se pide el resumen: hasta que llegue no se sabe cuánto se
  // pierde ni si está bloqueada, así que no se ofrece borrar.
  resumen: ResumenEliminacion | null;
  eliminando: boolean;
  error: string;
  onEliminar: (confirmacion: string) => void;
  onCancelar: () => void;
};

const numero = (n: number) => n.toLocaleString('es-CO');
const contar = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;

// El único diálogo del producto detrás del cual no hay vuelta atrás. No basta
// con un "¿Seguro?": hay que escribir el NIT, que es lo que distingue haberle
// dado sin querer de haberlo decidido.
export default function EliminarEmpresaDialog({
  nombre, resumen, eliminando, error, onEliminar, onCancelar,
}: Props) {
  const [confirmacion, setConfirmacion] = useState('');

  // La misma comparación que hace el servidor, solo para habilitar el botón.
  // Si alguien la saltara desde la consola, la ruta rechaza igual.
  const coincide = !!resumen && confirmacion.trim() === resumen.nit.trim();
  const bloqueo = resumen?.bloqueo ?? null;

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onCancelar}>
      <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-ink text-center">¿Eliminar empresa?</h3>
        <p className="text-sm text-muted text-center mt-1.5">{nombre}</p>

        {!resumen ? (
          <p className="text-sm text-muted text-center mt-5">Calculando qué se va a eliminar…</p>
        ) : bloqueo ? (
          <>
            <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-3.5">
              <p className="text-sm text-red-800">{bloqueo.mensaje}</p>
            </div>
            <button
              onClick={onCancelar}
              className="w-full mt-6 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50">
              Entendido
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-3.5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Se eliminará para siempre</p>
              <ul className="text-sm text-ink space-y-1">
                <li>{contar(resumen.colaboradores, 'colaborador', 'colaboradores')}, con sus contratos e historial</li>
                <li>{contar(resumen.registros, 'marcación', 'marcaciones')}</li>
                <li>Los usuarios, horarios, sedes y la configuración de la empresa</li>
              </ul>
            </div>

            <p className="text-sm text-muted mt-4">
              Esta acción no se puede deshacer. Si solo quieres quitarle el acceso, desactívala.
            </p>

            <label htmlFor="confirmar-nit" className="block text-sm text-ink mt-4">
              Para confirmar, escribe el NIT: <strong className="font-semibold">{resumen.nit}</strong>
            </label>
            <input
              id="confirmar-nit"
              type="text"
              value={confirmacion}
              onChange={e => setConfirmacion(e.target.value)}
              autoComplete="off"
              className="w-full mt-1.5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancelar}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => onEliminar(confirmacion.trim())}
                disabled={!coincide || eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-200 disabled:text-muted">
                {eliminando ? 'Eliminando…' : 'Eliminar empresa'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
