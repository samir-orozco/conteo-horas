import { useState } from 'react';
import { History, LogIn, LogOut, Undo2, FileText, Image as ImageIcon, ChevronDown, AlertTriangle } from 'lucide-react';
import { ETIQUETA_MOTIVO } from './motivos';
import { tiempoRelativo } from './tiempoRelativo';
import { fechaLarga } from '../../lib/fechas';

export type Evento = {
  id: string;
  tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO';
  fecha: string;
  motivo: string | null;
  nota: string | null;
  documentoTipo: string | null;
  documentoNombre: string | null;
  usuarioNombre: string | null;
};

const ASPECTO = {
  INGRESO:   { icono: LogIn,  texto: 'Ingresó',   color: 'bg-green-100 text-green-700 ring-green-50' },
  RETIRO:    { icono: LogOut, texto: 'Se retiró', color: 'bg-red-100 text-red-700 ring-red-50' },
  REINGRESO: { icono: Undo2,  texto: 'Reingresó', color: 'bg-blue-100 text-blue-700 ring-blue-50' },
};

// Cuántos se ven antes de pedir el resto. Cuatro alcanzan para el caso normal
// (entró, salió, volvió, se fue) sin empujar el tab fuera de la pantalla.
const VISIBLES = 4;

// Historia de vinculación: entró, salió, volvió.
//
// Existe porque el estado de hoy solo recuerda el último retiro. Quien renuncia,
// vuelve y se va otra vez borraba el primero, y esa primera salida es
// exactamente la que se necesita para liquidar bien o para responder por qué
// alguien tiene dos períodos con la empresa.
export default function HistorialVinculacion({ eventos, error, onVerDocumento, onReintentar }: {
  eventos: Evento[] | null;
  error: boolean;
  onVerDocumento: (url: string, nombre: string | null) => void;
  onReintentar: () => void;
}) {
  const [todos, setTodos] = useState(false);

  // Un fallo de red no es una historia vacía. Decir "sin movimientos" cuando
  // en realidad no se pudo preguntar es afirmar algo falso sobre el historial
  // legal de una persona.
  if (error) {
    return (
      <div className="bg-white rounded-card border border-gray-200 p-5">
        <p className="font-semibold text-ink flex items-center gap-2 mb-1">
          <History size={16} /> Historia con la empresa
        </p>
        <p className="text-sm text-muted flex items-start gap-2 mt-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          No pudimos cargar la historia. Sus movimientos siguen guardados.
        </p>
        <button type="button" onClick={onReintentar}
          className="mt-3 text-sm font-semibold text-ink border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg">
          Reintentar
        </button>
      </div>
    );
  }

  // Mientras carga no se pinta nada: un esqueleto que aparece y desaparece en
  // 200ms molesta más que el vacío.
  if (!eventos) return null;

  const hoy = new Date();
  const ocultos = Math.max(0, eventos.length - VISIBLES);
  const alaVista = todos ? eventos : eventos.slice(0, VISIBLES);

  return (
    <div className="bg-white rounded-card border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="font-semibold text-ink flex items-center gap-2">
          <History size={16} /> Historia con la empresa
        </p>
        <p className="text-xs text-muted mt-1">
          Cada entrada y cada salida, en orden. Se conserva completa aunque la persona
          vuelva a entrar.
        </p>
      </div>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted px-5 py-6">Sin movimientos registrados.</p>
      ) : (
        <>
          <ol className="px-5 py-5">
            {alaVista.map((e, i) => {
              const a = ASPECTO[e.tipo];
              const Icono = a.icono;
              const esUltimo = i === alaVista.length - 1;
              const esPdf = e.documentoTipo === 'application/pdf';
              const rotulo = tiempoRelativo(new Date(e.fecha), hoy);
              return (
                <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* La línea que une los hitos. No se pinta bajo el último:
                      colgaría hacia un vacío. */}
                  {!esUltimo && (
                    <span className="absolute left-[15px] top-9 -bottom-1 w-px bg-gray-200" aria-hidden="true" />
                  )}
                  <span className={`w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 ring-4 ${a.color}`}>
                    <Icono size={15} />
                  </span>

                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm font-bold text-ink leading-tight">{a.texto}</p>
                    <p className="text-sm text-muted mt-0.5">
                      {e.motivo && <>{ETIQUETA_MOTIVO[e.motivo] ?? e.motivo} · </>}
                      {fechaLarga(e.fecha)}
                    </p>
                    {e.nota && (
                      <p className="text-xs text-muted mt-1.5 leading-snug border-l-2 border-gray-200 pl-2.5">
                        {e.nota}
                      </p>
                    )}

                    {e.documentoTipo && (
                      <div className="mt-2.5 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
                        <button
                          onClick={() => onVerDocumento(`/colaboradores/vinculacion/${e.id}/documento`, e.documentoNombre)}
                          className="flex items-center gap-2.5 max-w-full text-left rounded-lg px-1.5 py-1 hover:bg-white transition-colors">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            esPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {esPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-ink truncate">
                              {e.documentoNombre || 'Soporte'}
                            </span>
                            <span className="block text-[11px] text-muted">
                              {esPdf ? 'PDF' : 'Imagen'}
                            </span>
                          </span>
                        </button>
                      </div>
                    )}

                    {(rotulo || e.usuarioNombre) && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        {rotulo && <span className="font-semibold tracking-wide">{rotulo}</span>}
                        {rotulo && e.usuarioNombre && <span> · </span>}
                        {e.usuarioNombre && <span>Registrado por {e.usuarioNombre}</span>}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {ocultos > 0 && !todos && (
            <button
              type="button"
              onClick={() => setTodos(true)}
              className="w-full px-5 py-3 border-t border-gray-100 text-sm font-semibold text-blue-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 rounded-b-card transition-colors">
              Ver {ocultos} movimiento{ocultos === 1 ? '' : 's'} más
              <ChevronDown size={15} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
