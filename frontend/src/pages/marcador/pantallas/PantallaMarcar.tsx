import { useState } from 'react';
import { LogIn, LogOut, MapPin, Check, UtensilsCrossed, Coffee, type LucideIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import type { DecisionUbicacion } from '../decisionUbicacion';
import { horaBog } from '../helpers';
import { TZ, type Colaborador, type Estado, type Pausa, type Sede } from '../tipos';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';
import ElegirTipoDeSalida from './ElegirTipoDeSalida';

type OpcionesDePausa = { almuerzo?: boolean; descanso?: boolean };

type Props = {
  colaborador: Colaborador;
  // Sedes donde esta persona puede marcar. Se muestran junto al nombre para que
  // sepa a qué sitio pertenece su turno antes de presionar el botón.
  sedes?: Sede[];
  ahora: Date;
  estado: Estado | null;
  marcar: (opciones?: OpcionesDePausa) => void;
  // Volvió de una pausa con la hora ya pasada: hay que preguntarle cuándo.
  onRegresoOlvidado: () => void;
  marcando: boolean;
  // Qué hacer con la ubicación de ESTA persona. Antes eran dos props sueltas
  // (`exigeUbicacion` de la empresa y `ubicOk`) y la pantalla las combinaba a
  // mano, así que la regla vivía repartida entre aquí y Marcador.tsx.
  decisionUbic: DecisionUbicacion;
  salir: () => void;
};

// Todo lo que cambia según la pausa, junto: la opción que se manda, los textos,
// el ícono y los colores. Repartido en ternarios, un descanso terminaba marcado
// con el texto —o peor, con la opción— del almuerzo.
const PAUSA: Record<Pausa, {
  opcion: OpcionesDePausa; salir: string; volver: string; enCurso: string;
  Icono: LucideIcon; boton: string; aviso: string;
}> = {
  ALMUERZO: {
    opcion: { almuerzo: true }, salir: 'Salgo a almorzar', volver: 'Volví de almorzar', enCurso: 'En almuerzo desde las',
    Icono: UtensilsCrossed, boton: 'bg-primary hover:bg-primary-dark !text-ink shadow-yellow-900/30', aviso: 'bg-amber-400/10 text-amber-300',
  },
  DESCANSO: {
    opcion: { descanso: true }, salir: 'Salgo a mi descanso', volver: 'Volví de mi descanso', enCurso: 'En descanso desde las',
    Icono: Coffee, boton: 'bg-sky-400 hover:bg-sky-300 !text-ink shadow-sky-900/30', aviso: 'bg-sky-400/10 text-sky-300',
  },
};

// Pantalla principal: reloj + estado del día + botón grande de entrada/salida.
export default function PantallaMarcar({ colaborador, sedes = [], ahora, estado, marcar, marcando, decisionUbic, salir, onRegresoOlvidado }: Props) {
  const dentroAhora = estado?.dentroAhora ?? false;
  const entradaHace = estado?.entradaAbierta?.entrada ? horaBog(estado.entradaAbierta.entrada, 'HH:mm') : null;
  const cerradoHoy = estado?.turnoCerradoHoy ?? null;
  const almuerzo = estado?.almuerzo ?? null;
  const descanso = estado?.descanso ?? null;
  const [confirmando, setConfirmando] = useState(false);
  const [eligiendoSalida, setEligiendoSalida] = useState(false);

  // La pausa de la que todavía no vuelve, si salió a una. El servidor manda una sola.
  const pausaEnCurso: Pausa | null = estado?.enAlmuerzo ? 'ALMUERZO' : estado?.enDescanso ? 'DESCANSO' : null;
  const salidaDe: Record<Pausa, string | null | undefined> = { ALMUERZO: estado?.salidaAlmuerzo, DESCANSO: estado?.salidaDescanso };
  const enCurso = pausaEnCurso ? PAUSA[pausaEnCurso] : null;
  const salidaDeLaPausa = pausaEnCurso ? salidaDe[pausaEnCurso] : null;

  // Está dentro de la ventana de una pausa justo ahora: lo más probable con
  // diferencia es que salga a ella, así que el botón grande lo dice de frente.
  // Antes había que adivinar que "Registrar Salida" abría esa pregunta, y quien
  // no lo sabía terminaba cerrando su jornada sin querer. Las dos ventanas no se
  // pueden cruzar —el horario no deja guardarlas así—, así que a lo sumo hay una.
  const pausaAhora: Pausa | null = !dentroAhora ? null
    : almuerzo?.ahora ? 'ALMUERZO'
    : descanso?.ahora ? 'DESCANSO'
    : null;
  const boton = pausaAhora ? PAUSA[pausaAhora] : null;

  const alPresionar = () => {
    if (boton) { marcar(boton.opcion); return; }
    // Fuera de las ventanas pero con alguna pausa pendiente: hay varias salidas
    // posibles y solo la persona sabe cuál es.
    if (dentroAhora && (almuerzo || descanso)) { setEligiendoSalida(true); return; }
    // Volviendo de una pausa con la hora ya pasada: se le pregunta a qué hora
    // regresó. Marcarlo ahora le borraría toda la tarde.
    if (pausaEnCurso && estado?.regresoSugerido) { onRegresoOlvidado(); return; }
    // Volviendo de una pausa a tiempo: es la misma jornada, no un turno nuevo.
    // Preguntar "¿otra entrada?" ahí sería ruido sobre algo que el sistema sabe.
    if (!dentroAhora && cerradoHoy && !pausaEnCurso) { setConfirmando(true); return; }
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
          enCurso ? enCurso.aviso
            : dentroAhora || cerradoHoy ? 'bg-green-500/10 text-green-400'
            : 'bg-white/5 text-white/50'
        }`}>
          {enCurso && salidaDeLaPausa ? (
            <span className="flex items-center justify-center gap-1.5">
              <enCurso.Icono size={14} /> {enCurso.enCurso} {horaBog(salidaDeLaPausa, 'HH:mm')}
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
            ${boton
              ? boton.boton
              : dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30'
              : 'bg-green-600 hover:bg-green-500 shadow-green-900/30'
            }`}
        >
          {boton ? <boton.Icono size={28} /> : dentroAhora ? <LogOut size={28} /> : <LogIn size={28} />}
          {marcando
            ? decisionUbic.textoBoton
            : boton ? boton.salir
            : dentroAhora ? 'Registrar Salida'
            : enCurso ? enCurso.volver
            : 'Registrar Entrada'}
        </button>

        {/* Terminar la jornada durante una pausa es raro pero pasa —quien se va
            enfermo, o a quien le cambiaron el turno—. Va discreto y sin perderse:
            si esta salida se guardara como pausa, la vuelta de mañana abriría un
            turno nuevo y el día contaría dos jornadas. */}
        {boton && !marcando && (
          <button
            onClick={() => marcar()}
            className="mt-3 w-full text-sm font-semibold text-white/50 hover:text-white/90 py-2 transition-colors"
          >
            Termino mi jornada
          </button>
        )}

        {/* Lo que se le dice de su ubicación, que ya no es lo mismo para todos.
            El aviso de "sin-gps-bloquea" es el caso NUEVO: antes no podía
            existir, porque el muro no dejaba llegar hasta aquí sin permiso, y
            enterarse por un flash rojo después de oprimir el botón deja a la
            persona en un bucle sin saber qué hacer. */}
        {decisionUbic.indicador === 'confirmada' && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-400/80">
            <MapPin size={12} /> Ubicación activada · marcarás desde la empresa
          </p>
        )}
        {decisionUbic.indicador === 'registra-sede' && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50">
            <MapPin size={12} /> Se registrará desde qué sede marcas
          </p>
        )}
        {decisionUbic.indicador === 'sin-gps-bloquea' && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-400/90">
            <MapPin size={12} /> Sin ubicación no podrás marcar. Actívala en tu navegador.
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

      {eligiendoSalida && (almuerzo || descanso) && (
        <ElegirTipoDeSalida
          almuerzo={almuerzo} descanso={descanso}
          onAlmuerzo={() => { setEligiendoSalida(false); marcar(PAUSA.ALMUERZO.opcion); }}
          onDescanso={() => { setEligiendoSalida(false); marcar(PAUSA.DESCANSO.opcion); }}
          onFinJornada={() => { setEligiendoSalida(false); marcar(); }}
          onCancelar={() => setEligiendoSalida(false)}
        />
      )}
    </div>
  );
}
