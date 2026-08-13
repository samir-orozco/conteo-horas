import { useState } from 'react';
import { LogIn, LogOut, MapPin, Check, UtensilsCrossed } from 'lucide-react';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { horaBog } from '../helpers';
import { TZ, type Colaborador, type Estado, type Sede } from '../tipos';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';
import ElegirTipoDeSalida from './ElegirTipoDeSalida';

type Props = {
  colaborador: Colaborador;
  // Sedes donde esta persona puede marcar. Se muestran junto al nombre para que
  // sepa a qué sitio pertenece su turno antes de presionar el botón.
  sedes?: Sede[];
  ahora: Date;
  estado: Estado | null;
  marcar: (opciones?: { almuerzo?: boolean }) => void;
  // Volvió del almuerzo con la hora ya pasada: hay que preguntarle cuándo.
  onRegresoOlvidado: () => void;
  marcando: boolean;
  exigeUbicacion: boolean;
  ubicOk: { lat: number; lng: number } | null;
  salir: () => void;
};

// Pantalla principal: reloj + estado del día + botón grande de entrada/salida.
export default function PantallaMarcar({ colaborador, sedes = [], ahora, estado, marcar, marcando, exigeUbicacion, ubicOk, salir, onRegresoOlvidado }: Props) {
  const dentroAhora = estado?.dentroAhora ?? false;
  const entradaHace = estado?.entradaAbierta?.entrada ? horaBog(estado.entradaAbierta.entrada, 'HH:mm') : null;
  const cerradoHoy = estado?.turnoCerradoHoy ?? null;
  const almuerzo = estado?.almuerzo ?? null;
  const enAlmuerzo = estado?.enAlmuerzo ?? false;
  const [confirmando, setConfirmando] = useState(false);
  const [eligiendoSalida, setEligiendoSalida] = useState(false);

  const alPresionar = () => {
    // Saliendo con ventana de almuerzo disponible: hay dos salidas posibles y
    // solo la persona sabe cuál es.
    if (dentroAhora && almuerzo) { setEligiendoSalida(true); return; }
    // Volviendo del almuerzo con la hora ya pasada: se le pregunta a qué hora
    // regresó. Marcarlo ahora le borraría toda la tarde.
    if (enAlmuerzo && estado?.regresoSugerido) { onRegresoOlvidado(); return; }
    // Volviendo del almuerzo a tiempo: es la misma jornada, no un turno nuevo.
    // Preguntar "¿otra entrada?" ahí sería ruido sobre algo que el sistema sabe.
    if (!dentroAhora && cerradoHoy && !enAlmuerzo) { setConfirmando(true); return; }
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
          {sedes.length > 0 && (
            <p className="text-xs text-white/60 mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <MapPin size={12} className="shrink-0" />
              {sedes.length === 1
                ? sedes[0].nombre
                : sedes.map(s => s.nombre).join(' · ')}
            </p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
            {horaBog(ahora)}
          </p>
          <p className="text-sm text-white/50 mt-1 capitalize">
            {formatInTimeZone(ahora, TZ, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className={`mb-6 rounded-xl px-4 py-2 text-sm font-medium ${
          enAlmuerzo ? 'bg-amber-400/10 text-amber-300'
            : dentroAhora || cerradoHoy ? 'bg-green-500/10 text-green-400'
            : 'bg-white/5 text-white/50'
        }`}>
          {enAlmuerzo && estado?.salidaAlmuerzo ? (
            <span className="flex items-center justify-center gap-1.5">
              <UtensilsCrossed size={14} /> En almuerzo desde las {horaBog(estado.salidaAlmuerzo, 'HH:mm')}
            </span>
          ) : dentroAhora ? (
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
          {marcando
            ? (exigeUbicacion ? 'Ubicando...' : 'Registrando...')
            : dentroAhora ? 'Registrar Salida'
            : enAlmuerzo ? 'Volví del almuerzo'
            : 'Registrar Entrada'}
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

      {eligiendoSalida && almuerzo && (
        <ElegirTipoDeSalida
          ventana={almuerzo}
          onAlmuerzo={() => { setEligiendoSalida(false); marcar({ almuerzo: true }); }}
          onFinJornada={() => { setEligiendoSalida(false); marcar(); }}
          onCancelar={() => setEligiendoSalida(false)}
        />
      )}
    </div>
  );
}
