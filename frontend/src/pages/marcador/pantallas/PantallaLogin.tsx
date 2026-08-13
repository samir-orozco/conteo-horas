import { Check, ScanFace } from 'lucide-react';
import logoSimplificado from '../../../assets/logo-simplificado.svg';
import CamaraRostro from '../../../components/CamaraRostro';
import { horaBog } from '../helpers';

type Props = {
  empresa: string | null;
  permiteCedula: boolean;
  modoRostro: boolean;
  onModoCedula: () => void;
  onModoRostro: () => void;
  shake: boolean;
  capturaKey: number;
  loginConRostro: (descriptor: number[], foto: string) => void;
  onUsarCedula: (foto: string) => void;
  onReintentar: () => void;
  errorLogin: string;
  ahora: Date;
  fotoRostro: string | null;
  cedula: string;
  onCedulaChange: (v: string) => void;
  ingresar: (e: React.FormEvent) => void;
  loading: boolean;
};

// Login por cédula o rostro (con pestañas si la empresa permite ambos).
export default function PantallaLogin(p: Props) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className={`relative w-full rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 transition-all ${p.modoRostro ? 'max-w-md' : 'max-w-sm'} ${p.shake ? 'hp-shake ring-2 ring-red-400/60' : ''}`}>
        <div className="flex flex-col items-center mb-5">
          <img src={logoSimplificado} alt="HoraPro" className="w-14 h-14 mb-3" />
          <p className="text-white font-semibold text-sm">{p.empresa ?? 'Cargando...'}</p>
        </div>

        {p.permiteCedula ? (
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
              <button type="button" onClick={p.onModoCedula}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${!p.modoRostro ? 'bg-white text-ink' : 'text-white/50 hover:text-white/80'}`}>
                Cédula
              </button>
              <button type="button" onClick={p.onModoRostro}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${p.modoRostro ? 'bg-white text-ink' : 'text-white/50 hover:text-white/80'}`}>
                <ScanFace size={15} /> Rostro
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-white/50 text-sm font-medium mb-6 flex items-center justify-center gap-1.5">
            <ScanFace size={15} /> Reconocimiento facial
          </p>
        )}

        {p.modoRostro ? (
          <>
            <CamaraRostro key={p.capturaKey} modo="login" onCapturado={(descs, foto) => p.loginConRostro(descs[0], foto)} errorExterno={p.errorLogin || null}
              permiteFallbackCedula={p.permiteCedula}
              onUsarCedula={p.onUsarCedula} />
            {p.errorLogin && (
              <button onClick={p.onReintentar}
                className="w-full mt-4 bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-xl text-sm transition-colors">
                Reintentar
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-center text-4xl font-mono font-bold text-white my-4 tabular-nums">{horaBog(p.ahora)}</p>
            {p.fotoRostro && (
              <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-green-400">
                <Check size={14} /> Foto tomada · ingresa tu cédula para confirmar
              </p>
            )}
            <form onSubmit={p.ingresar} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={p.cedula}
                onChange={e => p.onCedulaChange(e.target.value.replace(/\D/g, ''))}
                placeholder="Número de cédula"
                required
                className={`hp-input-dark w-full border rounded-xl px-4 py-3 text-2xl text-center tracking-widest placeholder:text-white/25 focus:outline-none transition-colors ${p.errorLogin ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 focus:border-primary/60'}`}
              />
              {p.errorLogin && <p className="text-red-400 text-sm text-center font-medium">{p.errorLogin}</p>}
              <button type="submit" disabled={p.loading || !p.empresa}
                className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl text-base disabled:opacity-60 transition-colors">
                {p.loading ? 'Verificando...' : 'Continuar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
