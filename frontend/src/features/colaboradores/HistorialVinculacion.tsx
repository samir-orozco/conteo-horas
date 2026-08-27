import { useEffect, useState } from 'react';
import { History, LogIn, LogOut, Undo2, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../../lib/api';
import { ETIQUETA_MOTIVO } from './motivos';

export type Evento = {
  id: string;
  tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO';
  fecha: string;
  motivo: string | null;
  nota: string | null;
  documentoTipo: string | null;
  documentoNombre: string | null;
};

const ASPECTO = {
  INGRESO:   { icono: LogIn,  texto: 'Ingresó',    color: 'bg-green-100 text-green-800' },
  RETIRO:    { icono: LogOut, texto: 'Se retiró',  color: 'bg-gray-200 text-gray-700' },
  REINGRESO: { icono: Undo2,  texto: 'Reingresó',  color: 'bg-blue-100 text-blue-800' },
};

const dLarga = (s: string) =>
  new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

// Historia de vinculación: entró, salió, volvió.
//
// Existe porque el estado de hoy solo recuerda el último retiro. Quien renuncia,
// vuelve y se va otra vez borraba el primero, y esa primera salida es
// exactamente la que se necesita para liquidar bien o para responder por qué
// alguien tiene dos períodos con la empresa.
export default function HistorialVinculacion({ colaboradorId, onVerDocumento }: {
  colaboradorId: string;
  onVerDocumento: (url: string, nombre: string | null) => void;
}) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);

  useEffect(() => {
    api.get(`/colaboradores/${colaboradorId}/vinculacion`)
      .then(r => setEventos(r.data))
      .catch(() => setEventos([]));
  }, [colaboradorId]);

  // Mientras carga no se pinta nada: un esqueleto que aparece y desaparece en
  // 200ms molesta más que el vacío.
  if (!eventos) return null;

  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink flex items-center gap-2 mb-1">
        <History size={16} /> Historia con la empresa
      </p>
      <p className="text-xs text-muted mb-4">
        Cada entrada y cada salida, en orden. Se conserva completa aunque la persona
        vuelva a entrar.
      </p>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted">Sin movimientos registrados.</p>
      ) : (
      <div className="relative">
        {/* La línea vertical que une los hitos. Va detrás de los puntos. */}
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
        <ol className="space-y-4">
          {eventos.map(e => {
            const a = ASPECTO[e.tipo];
            const Icono = a.icono;
            return (
              <li key={e.id} className="relative flex gap-3">
                <span className={`w-[27px] h-[27px] rounded-full flex items-center justify-center shrink-0 z-10 ${a.color}`}>
                  <Icono size={14} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm text-ink">
                    <b>{a.texto}</b> el {dLarga(e.fecha)}
                    {e.motivo && <span className="text-muted"> · {ETIQUETA_MOTIVO[e.motivo] ?? e.motivo}</span>}
                  </p>
                  {e.nota && <p className="text-[11px] text-muted mt-0.5 leading-tight">{e.nota}</p>}
                  {e.documentoTipo && (
                    <button
                      onClick={() => onVerDocumento(`/colaboradores/vinculacion/${e.id}/documento`, e.documentoNombre)}
                      className="mt-1.5 inline-flex items-center gap-1.5 max-w-full pl-1 pr-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        e.documentoTipo === 'application/pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {e.documentoTipo === 'application/pdf' ? <FileText size={12} /> : <ImageIcon size={12} />}
                      </span>
                      <span className="text-[11px] font-medium text-ink truncate">
                        {e.documentoNombre || 'Ver soporte'}
                      </span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      )}
    </div>
  );
}
