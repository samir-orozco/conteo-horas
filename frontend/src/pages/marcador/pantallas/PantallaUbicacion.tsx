import { MapPin, RotateCw } from 'lucide-react';
import logoSimplificado from '../../../assets/logo-simplificado.svg';
import type { MensajeGeo } from '../geo';

type Props = {
  empresa: string | null;
  errorUbic: MensajeGeo | null;
  activarUbicacion: () => void;
  buscandoUbic: boolean;
  // Seguir sin dar la ubicación. Este botón ES el mecanismo del "deja pasar":
  // sin un control visible que continúe, la pantalla sigue siendo un muro por
  // más que la condición de arriba haya cambiado.
  onContinuar: () => void;
};

// Se OFRECE la ubicación al entrar, antes de la cámara y del login. No se exige:
// aquí todavía no se sabe quién va a marcar, y a quien trabaja fuera de la
// empresa no se le mira la ubicación. Quien decide bloquear es el servidor,
// después del login.
export default function PantallaUbicacion({ empresa, errorUbic, activarUbicacion, buscandoUbic, onContinuar }: Props) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <img src={logoSimplificado} alt="HoraPro" className="w-14 h-14 mx-auto mb-4" />
        <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${errorUbic ? 'bg-amber-400/90' : 'bg-primary'}`}>
          <MapPin size={28} className="text-ink" />
        </div>
        {errorUbic ? (
          <>
            <h1 className="text-xl font-bold text-white">{errorUbic.titulo}</h1>
            <p className="text-sm text-white/60 mt-2 mb-6 leading-relaxed">{errorUbic.ayuda}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">Activa tu ubicación</h1>
            <p className="text-sm text-white/60 mt-2 mb-6 leading-relaxed">
              {empresa} usa tu <b className="text-white/90">ubicación</b> para registrar desde qué sede marcas.
              Toca el botón y <b className="text-white/90">permite el acceso</b> cuando el navegador lo pregunte.
              Si trabajas fuera de la empresa, puedes continuar sin ella.
            </p>
          </>
        )}
        <button onClick={activarUbicacion} disabled={buscandoUbic}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold py-3.5 rounded-xl text-base transition-colors disabled:opacity-60">
          {errorUbic ? <RotateCw size={18} /> : <MapPin size={18} />} {buscandoUbic ? 'Buscando...' : errorUbic ? 'Reintentar' : 'Activar ubicación'}
        </button>
        {errorUbic && (
          <button onClick={() => window.location.reload()}
            className="w-full mt-2 text-white/50 hover:text-white/80 text-sm font-medium py-1">
            Ya la activé en Ajustes · Recargar página
          </button>
        )}
        <button onClick={onContinuar}
          className="w-full mt-2 text-white/50 hover:text-white/80 text-sm font-medium py-1">
          Continuar sin ubicación
        </button>
      </div>
    </div>
  );
}
