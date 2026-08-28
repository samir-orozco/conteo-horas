import { History, LogIn, LogOut, Undo2, AlertTriangle } from 'lucide-react';
import { ETIQUETA_MOTIVO } from './motivos';
import { tiempoRelativo } from './tiempoRelativo';
import { fechaLarga } from '../../lib/fechas';
import LineaDeTiempo, { type Hito, type TonoHito } from '../../components/LineaDeTiempo';

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

const ASPECTO: Record<Evento['tipo'], { icono: typeof LogIn; texto: string; tono: TonoHito }> = {
  INGRESO:   { icono: LogIn,  texto: 'Ingresó',   tono: 'verde' },
  RETIRO:    { icono: LogOut, texto: 'Se retiró', tono: 'rojo' },
  REINGRESO: { icono: Undo2,  texto: 'Reingresó', tono: 'azul' },
};

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
  const hitos: Hito[] = eventos.map(e => {
    const a = ASPECTO[e.tipo];
    return {
      id: e.id,
      icono: a.icono,
      tono: a.tono,
      titulo: a.texto,
      detalle: <>{e.motivo && <>{ETIQUETA_MOTIVO[e.motivo] ?? e.motivo} · </>}{fechaLarga(e.fecha)}</>,
      nota: e.nota,
      adjunto: e.documentoTipo
        ? {
            // "Soporte" y no el genérico "Adjunto": aquí el archivo es la
            // carta de renuncia o el acta, y así se llama en el resto de la ficha.
            nombre: e.documentoNombre || 'Soporte',
            tipo: e.documentoTipo,
            onAbrir: () => onVerDocumento(`/colaboradores/vinculacion/${e.id}/documento`, e.documentoNombre),
          }
        : null,
      rotulo: tiempoRelativo(new Date(e.fecha), hoy),
      autor: e.usuarioNombre ? `Registrado por ${e.usuarioNombre}` : null,
    };
  });

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
        <LineaDeTiempo hitos={hitos} sustantivo={{ singular: 'movimiento', plural: 'movimientos' }} />
      )}
    </div>
  );
}
