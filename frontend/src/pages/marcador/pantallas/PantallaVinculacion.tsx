import logoSimplificado from '../../../assets/logo-simplificado.svg';

type Props = {
  empresa: string | null;
  vincular: (e: React.FormEvent) => void;
  codigoVinculo: string;
  setCodigoVinculo: (v: string) => void;
  setErrorVinculo: (v: string) => void;
  errorVinculo: string;
  vinculando: boolean;
};

// Autorizar este dispositivo con el código de 6 dígitos que genera el admin.
export default function PantallaVinculacion({ empresa, vincular, codigoVinculo, setCodigoVinculo, setErrorVinculo, errorVinculo, vinculando }: Props) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <img src={logoSimplificado} alt="HoraPro" className="w-16 h-16 mx-auto mb-5" />
        <h1 className="text-xl font-bold text-white mb-1">Autorizar este dispositivo</h1>
        <p className="text-sm text-white/50 mb-6">
          {empresa ?? ''} protege su kiosco. Pide al administrador un código de
          vinculación (panel → Marcador) y digítalo aquí una sola vez.
        </p>
        <form onSubmit={vincular} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={codigoVinculo}
            onChange={e => { setCodigoVinculo(e.target.value.replace(/\D/g, '')); setErrorVinculo(''); }}
            placeholder="000000"
            required
            className={`hp-input-dark w-full border rounded-xl px-4 py-3 text-3xl text-center tracking-[0.4em] font-mono placeholder:text-white/20 focus:outline-none transition-colors ${errorVinculo ? 'border-red-400/60 bg-red-500/10 hp-shake' : 'border-white/10 focus:border-primary/60'}`}
          />
          {errorVinculo && <p className="text-red-400 text-sm font-medium">{errorVinculo}</p>}
          <button type="submit" disabled={vinculando || codigoVinculo.length !== 6}
            className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60 transition-colors">
            {vinculando ? 'Vinculando...' : 'Vincular dispositivo'}
          </button>
        </form>
      </div>
    </div>
  );
}
