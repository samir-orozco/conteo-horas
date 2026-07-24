import { useState } from 'react';
import { LogIn, LogOut, MapPin, Check } from 'lucide-react';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { horaBog } from '../helpers';
import { TZ, type Colaborador, type Estado } from '../tipos';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';

type Props = {
  colaborador: Colaborador;
  ahora: Date;
  estado: Estado | null;
  marcar: () => void;
  marcando: boolean;
  exigeUbicacion: boolean;
  ubicOk: { lat: number; lng: number } | null;
  salir: () => void;
};

// Pantalla principal: reloj + estado del día + botón grande de entrada/salida.
export default function PantallaMarcar({ colaborador, ahora, estado, marcar, marcando, exigeUbicacion, ubicOk, salir }: Props) {
  const dentroAhora = estado?.dentroAhora ?? false;
  const entradaHace = estado?.entradaAbierta?.entrada ? horaBog(estado.entradaAbierta.entrada, 'HH:mm') : null;
  const cerradoHoy = estado?.turnoCerradoHoy ?? null;
  const [confirmando, setConfirmando] = useState(false);

  // Si el día ya tiene un turno completo y no hay uno abierto, confirmamos antes de
  // abrir otro (evita la entrada duplicada de quien cree que no le quedó la salida).
  const alPresionar = () => {
    if (!dentroAhora && cerradoHoy) { setConfirmando(true); return; }
    marcar();
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-ink">
              {colaborador.nombre[0]}{colaborador.apellido[0]}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">{colaborador.nombre} {colaborador.apellido}</h2>
          {colaborador.cargo && <p className="text-sm text-white/50">{colaborador.cargo}</p>}
        </div>

        <div className="mb-6">
          <p className="text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
            {horaBog(ahora)}
          </p>
          <p className="text-sm text-white/50 mt-1 capitalize">
            {formatInTimeZone(ahora, TZ, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className={`mb-6 rounded-xl px-4 py-2 text-sm font-medium ${dentroAhora || cerradoHoy ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/50'}`}>
          {dentroAhora ? (
            `Entrada registrada a las ${entradaHace}`
          ) : cerradoHoy ? (
            <span className="flex items-center justify-center gap-1.5">
              <Check size={14} /> Hoy: entrada {horaBog(cerradoHoy.entrada, 'HH:mm')} · salida {horaBog(cerradoHoy.salida, 'HH:mm')}
            </span>
          ) : (
            'Sin entrada registrada hoy'
          )}
        </div>

        <button
          onClick={alPresionar}
          disabled={marcando || !estado}
          className={`w-full font-bold py-5 rounded-2xl text-xl text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg
            ${dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30'
              : 'bg-green-600 hover:bg-green-500 shadow-green-900/30'
            }`}
        >
          {dentroAhora ? <LogOut size={28} /> : <LogIn size={28} />}
          {marcando ? (exigeUbicacion ? 'Ubicando...' : 'Registrando...') : (dentroAhora ? 'Registrar Salida' : 'Registrar Entrada')}
        </button>

        {exigeUbicacion && ubicOk && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-400/80">
            <MapPin size={12} /> Ubicación activada · marcarás desde la empresa
          </p>
        )}

        <button onClick={salir} className="mt-4 text-xs text-white/30 hover:text-white/60 underline">
          No soy yo, cambiar usuario
        </button>
      </div>

      {confirmando && cerradoHoy && (
        <ConfirmarNuevaEntrada
          turno={cerradoHoy}
          onConfirmar={() => { setConfirmando(false); marcar(); }}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
