import { MapPin, RotateCw } from 'lucide-react';
import logoSimplificado from '../../../assets/logo-simplificado.svg';
import type { MensajeGeo } from '../geo';

type Props = {
  empresa: string | null;
  errorUbic: MensajeGeo | null;
  activarUbicacion: () => void;
  buscandoUbic: boolean;
};

// Gate de ubicación: se pide al entrar (antes de la cámara/login). Si el GPS falla
// o niegan el permiso, muestra la guía para resolverlo dentro de la misma pantalla.
export default function PantallaUbicacion({ empresa, errorUbic, activarUbicacion, buscandoUbic }: Props) {
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
            <h1 className="text-xl font-bold text-white">Marca desde la empresa</h1>
            <p className="text-sm text-white/60 mt-2 mb-6 leading-relaxed">
              {empresa} verifica tu <b className="text-white/90">ubicación</b> al marcar. Toca el botón y
              <b className="text-white/90"> permite el acceso</b> cuando el navegador lo pregunte.
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
      </div>
    </div>
  );
}
