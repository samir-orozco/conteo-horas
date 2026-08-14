import { AlertTriangle, LogIn } from 'lucide-react';
import { horaBog } from '../helpers';

type Props = {
  turno: { entrada: string; salida: string };
  onConfirmar: () => void;
  onCancelar: () => void;
};

// Confirmación antes de abrir un turno nuevo cuando el día ya tiene uno completo.
// Evita la entrada duplicada de quien cree que su salida no quedó registrada.
export default function ConfirmarNuevaEntrada({ turno, onConfirmar, onCancelar }: Props) {
  return (
    <div className="fixed inset-0 !mt-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancelar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-ink shadow-2xl p-8 text-center"
      >
        <div className="bg-amber-400/90 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-ink" />
        </div>
        <h2 className="text-xl font-bold text-white">Ya registraste tu jornada de hoy</h2>
        <p className="text-sm text-white/60 mt-3 leading-relaxed">
          Hoy marcaste <b className="text-white/90">entrada {horaBog(turno.entrada, 'HH:mm')}</b> y{' '}
          <b className="text-white/90">salida {horaBog(turno.salida, 'HH:mm')}</b>.
        </p>
        <p className="text-sm text-white/60 mt-3 leading-relaxed">
          Tu salida <b className="text-white/90">ya quedó guardada</b>. Si continúas se abrirá un
          <b className="text-white/90"> turno nuevo</b>.
        </p>

        <button
          onClick={onCancelar}
          className="w-full mt-6 bg-primary hover:bg-primary-dark text-ink font-bold py-3.5 rounded-xl text-base transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          className="w-full mt-2 flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm font-semibold py-2.5"
        >
          <LogIn size={16} /> Sí, registrar otra entrada
        </button>
      </div>
    </div>
  );
}
