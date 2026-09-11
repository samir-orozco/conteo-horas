import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export type ResumenEliminacion = {
  id: string;
  nombre: string;
  nit: string;
  colaboradores: number;
  registros: number;
  // Solo los APROBADO: son los que suma el reporte de ingresos.
  pagosAprobados: number;
  montoPagosAprobados: number;
  // Comisiones causadas a un afiliado por los pagos de esta empresa.
  comisiones: number;
  montoComisiones: number;
};

type Props = {
  nombre: string;
  // null mientras se pide el resumen: hasta que llegue no se sabe cuánto se
  // pierde, así que no se ofrece borrar.
  resumen: ResumenEliminacion | null;
  eliminando: boolean;
  error: string;
  onEliminar: (confirmacion: string) => void;
  onCancelar: () => void;
};

const numero = (n: number) => n.toLocaleString('es-CO');
const contar = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;
const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// El único diálogo del producto detrás del cual no hay vuelta atrás.
//
// DECISIÓN DEL DUEÑO (10 de septiembre de 2026): cualquier empresa se puede
// borrar. El diálogo no bloquea: advierte qué se pierde, incluida la plata, y
// pide escribir el NIT, que es lo que distingue haberle dado sin querer de
// haberlo decidido.
export default function EliminarEmpresaDialog({
  nombre, resumen, eliminando, error, onEliminar, onCancelar,
}: Props) {
  const [confirmacion, setConfirmacion] = useState('');

  // La misma comparación que hace el servidor, solo para habilitar el botón.
  // Si alguien la saltara desde la consola, la ruta rechaza igual.
  const coincide = !!resumen && confirmacion.trim() !== '' && confirmacion.trim() === resumen.nit.trim();
  const sinNit = !!resumen && resumen.nit.trim() === '';

  // Mientras borra no se puede cerrar: cerrar no detiene el borrado, y si
  // fallaba, el error se perdía o aparecía en el modal de otra empresa.
  const cerrar = () => { if (!eliminando) onCancelar(); };

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={cerrar}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="titulo-eliminar-empresa"
        className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <h3 id="titulo-eliminar-empresa" className="text-lg font-bold text-ink text-center">¿Eliminar empresa?</h3>
        <p className="text-sm text-muted text-center mt-1.5">{nombre}</p>

        {!resumen ? (
          error ? (
            // Sin resumen y con error (la empresa ya no existe, se cayó la red):
            // antes se quedaba en "Calculando…" sin botones y el error no se veía.
            <>
              <p className="text-sm text-red-600 text-center mt-5">{error}</p>
              <button
                onClick={onCancelar}
                className="w-full mt-6 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50">
                Cerrar
              </button>
            </>
          ) : (
            <p className="text-sm text-muted text-center mt-5">Calculando qué se va a eliminar…</p>
          )
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

            {/* La plata va aparte y en rojo: no bloquea, pero cambia números que otros miran. */}
            {(resumen.pagosAprobados > 0 || resumen.comisiones > 0) && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5">
                <ul className="text-sm text-red-800 space-y-1">
                  {resumen.pagosAprobados > 0 && (
                    <li>
                      {contar(resumen.pagosAprobados, 'pago aprobado', 'pagos aprobados')} por {pesos(resumen.montoPagosAprobados)}: el reporte de ingresos de esos meses baja en esa cifra.
                    </li>
                  )}
                  {resumen.comisiones > 0 && (
                    <li>
                      {contar(resumen.comisiones, 'comisión de afiliado', 'comisiones de afiliado')} por {pesos(resumen.montoComisiones)}: salen de la billetera del afiliado.
                    </li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-sm text-muted mt-4">
              Esta información no se puede recuperar. Si solo quieres quitarle el acceso, desactívala.
            </p>

            {sinNit && (
              <p className="text-sm text-red-600 mt-4">
                Esta empresa no tiene NIT guardado. Ponle uno desde su ficha para poder eliminarla.
              </p>
            )}

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
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50">
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
