import { PauseCircle } from 'lucide-react';

// El kiosco pausado por falta de pago (4 de octubre de 2026): se pausa 10 días después de la
// suspensión. El mensaje es neutro a propósito, decisión del dueño: lo leen los trabajadores, y
// no es a ellos a quienes hay que decirles que la empresa no pagó. El mismo texto lo manda el
// servidor (mensajeKioscoPausado) cuando alguien intenta entrar o marcar.
export default function PantallaKioscoPausado({ empresa }: { empresa: string | null }) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <PauseCircle size={40} className="mx-auto mb-4 text-white/40" />
        <h1 className="text-xl font-bold text-white mb-2">{empresa ? `El kiosco de ${empresa} está pausado` : 'El kiosco está pausado'}</h1>
        <p className="text-sm text-white/50">Avísale al administrador de tu empresa.</p>
      </div>
    </div>
  );
}
