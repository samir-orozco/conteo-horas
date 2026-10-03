import { AlertTriangle, LogIn } from 'lucide-react';
import { horaBog } from '../helpers';
import { MS_CONFIRMAR_REFORZADA } from '../confirmacion';
import BotonSostenido from './BotonSostenido';

type Props = {
  turno: { entrada: string; salida: string };
  // El nombre de pila de la persona reconocida: el aviso dice a nombre de quién está.
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  onNoSoy: () => void;
};

// Confirmación antes de abrir un turno nuevo cuando el día ya tiene uno completo.
// Evita la entrada duplicada de quien cree que su salida no quedó registrada.
//
// Y desde el 2 de octubre de 2026, también la de quien NO hizo esas marcas. El 1 de
// octubre Lina pasó por aquí a las 08:56 —«entrada 08:49 y salida 08:52»— y
// oprimió «Sí, registrar otra entrada», cuando la entrada de las 08:49 era de otra
// persona. El aviso no decía a nombre de quién. Ahora lo dice, la nueva entrada
// pide el sostenido reforzado (algo ya no cuadra) y hay
// «No soy».
export default function ConfirmarNuevaEntrada({ turno, nombre, onConfirmar, onCancelar, onNoSoy }: Props) {
  return (
    <div className="fixed inset-0 !mt-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancelar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-ink shadow-2xl p-8 text-center"
      >
        <div className="bg-amber-400/90 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-ink" />
        </div>
        <h2 className="text-xl font-bold text-white">{nombre}, ya registraste tu jornada de hoy</h2>
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
        <BotonSostenido
          ms={MS_CONFIRMAR_REFORZADA}
          onConfirmar={onConfirmar}
          className="w-full mt-2 rounded-xl border border-white/15 text-white/70 hover:text-white text-sm font-semibold py-2.5"
        >
          <LogIn size={16} /> Soy {nombre}, registrar otra entrada
        </BotonSostenido>
        <button
          onClick={onNoSoy}
          className="w-full mt-2 text-white/60 hover:text-white text-sm font-semibold py-2.5"
        >
          No soy {nombre}
        </button>
      </div>
    </div>
  );
}
