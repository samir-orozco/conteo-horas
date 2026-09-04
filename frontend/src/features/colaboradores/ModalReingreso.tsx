import { useState } from 'react';
import { Undo2, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import type { MiPlan } from '../../lib/plan';

// Confirmación de reingreso.
//
// Existe porque reingresar era un botón suelto de un solo clic, y no es una
// acción neutra: ocupa un cupo del plan. Con el cupo lleno, el clic terminaba en
// un error del servidor sin que nadie hubiera avisado antes de qué se trataba.
// Aquí se dice cuánto cupo hay ANTES de intentarlo, y qué pasa si se sigue.
export default function ModalReingreso({ persona, plan, onCerrar, onListo }: {
  persona: { id: string; nombre: string; apellido: string; fechaRetiro?: string | null };
  plan: MiPlan | null;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const ilimitado = plan?.ilimitado || plan?.limite == null;
  const usados = plan?.colaboradores ?? 0;
  const limite = plan?.limite ?? null;
  // Reingresar suma un activo: lo que importa no es el cupo de ahora, es el de
  // después. Si ya está lleno, el servidor lo va a rechazar y hay que decirlo
  // antes, no después del clic.
  const quedariaEn = usados + 1;
  const noCabe = !ilimitado && limite != null && quedariaEn > limite;

  const reingresar = async () => {
    setGuardando(true); setError('');
    try {
      await api.post(`/colaboradores/${persona.id}/reingresar`);
      onListo();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'No pudimos reingresarlo.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCerrar}>
      <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-bold text-lg text-ink flex items-center gap-2">
            <Undo2 size={18} /> ¿Reingresar a {persona.nombre}?
          </h3>
          <p className="text-sm text-muted mt-1">
            {persona.nombre} {persona.apellido} vuelve a la operación con su ficha completa:
            su historial, su horario y su rostro registrado.
          </p>
        </div>

        {/* El cupo, dicho con números y no con un "puede que no quepa". */}
        <div className={`rounded-lg px-3 py-2.5 text-sm ${noCabe ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-gray-50 text-muted'}`}>
          {ilimitado ? (
            <p>Tu plan <b className="text-ink">{plan?.nombrePlan ?? 'actual'}</b> no tiene límite de colaboradores, así que puedes reingresar sin problema.</p>
          ) : noCabe ? (
            <>
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} />No hay cupo disponible</p>
              <p className="mt-0.5">
                Tu plan {plan?.nombrePlan} permite {limite} colaboradores y ya usas {usados}.
                Para reingresar a {persona.nombre} tendrías que retirar a alguien más o subir de plan.
              </p>
            </>
          ) : (
            <p>
              Tu plan <b className="text-ink">{plan?.nombrePlan}</b> permite <b className="text-ink">{limite}</b> colaboradores.
              Ahora usas <b className="text-ink">{usados}</b>, y con este quedarías en <b className="text-ink">{quedariaEn}</b>.
            </p>
          )}
        </div>

        <div className="text-xs text-muted bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
          <p>Vuelve a aparecer en el kiosco, en los reportes y en el marcador.</p>
          <p>Su registro de retiro y el soporte adjunto se borran, porque dejan de aplicar.</p>
          <p><b className="text-ink">Es reversible:</b> puedes volver a registrar su retiro cuando quieras.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={reingresar} disabled={guardando || noCabe}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {guardando ? 'Reingresando...' : 'Sí, reingresar'}
          </button>
        </div>
      </div>
    </div>
  );
}
