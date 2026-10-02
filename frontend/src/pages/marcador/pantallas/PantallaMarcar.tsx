import { useState } from 'react';
import { LogIn, LogOut, MapPin, Check, UtensilsCrossed, Coffee, AlertTriangle, type LucideIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import type { DecisionUbicacion } from '../decisionUbicacion';
import { horaBog } from '../helpers';
import { TZ, type Colaborador, type Estado, type Pausa, type Sede } from '../tipos';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';
import ElegirTipoDeSalida from './ElegirTipoDeSalida';
import BotonSostenido from './BotonSostenido';
import { confirmacionDeLaMarca, textoDelAviso } from '../confirmacion';

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
  // «No soy X»: la persona reconocida dice que no es ella. Lo que pasa después lo
  // decide Marcador (pasa a la cédula si la empresa la permite).
  onNoSoy: () => void;
  // La miniatura de la ficha y la foto que se acaba de tomar, lado a lado. La de la
  // ficha es la que delata el error: la de ahora solo le muestra a cada quien su
  // propia cara. Cualquiera de las dos puede faltar.
  fotoReferencia?: string | null;
  fotoAhora?: string | null;
  // La cara se pareció poco a su registro: confirmación reforzada.
  parecidoDudoso?: boolean;
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
export default function PantallaMarcar({
  colaborador, sedes = [], ahora, estado, marcar, marcando, decisionUbic, salir, onRegresoOlvidado,
  onNoSoy, fotoReferencia = null, fotoAhora = null, parecidoDudoso = false,
}: Props) {
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
  // Cuánto hay que sostener el botón y qué se avisa (confirmacion.ts).
  const confirmacion = confirmacionDeLaMarca({ estado, ahora, parecidoDudoso });
  const reforzada = confirmacion.nivel === 'REFORZADA';
  const nombreCompleto = `${colaborador.nombre} ${colaborador.apellido}`;
  const aviso = confirmacion.nivel === 'REFORZADA'
    ? textoDelAviso(confirmacion, { nombre: colaborador.nombre, nombreCompleto, hayFotoDeFicha: !!fotoReferencia })
    : null;
  const accion = boton ? boton.salir
    : dentroAhora ? 'Registrar salida'
    : enCurso ? enCurso.volver
    : 'Registrar entrada';

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
          {/* LAS DOS CARAS, LADO A LADO (2 de octubre de 2026). La de la ficha es la
              que importa: a quien no es esta persona le muestra la cara de otra.
              La de ahora va espejada, como se vio en la cámara. */}
          <div className="flex items-start justify-center gap-4 mb-3">
            <figure className="flex flex-col items-center gap-1">
              {fotoReferencia ? (
                <img src={fotoReferencia} alt={`Foto de la ficha de ${nombreCompleto}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20" />
              ) : (
                <div className="bg-primary rounded-full w-24 h-24 flex items-center justify-center">
                  <span className="text-3xl font-bold text-ink">
                    {colaborador.nombre[0]}{colaborador.apellido[0]}
                  </span>
                </div>
              )}
              {fotoReferencia && fotoAhora && <figcaption className="text-[10px] text-white/40">En tu ficha</figcaption>}
            </figure>
            {fotoAhora && (
              <figure className="flex flex-col items-center gap-1">
                <img src={fotoAhora} alt="Tu foto de ahora"
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20 [transform:scaleX(-1)]" />
                <figcaption className="text-[10px] text-white/40">Ahora</figcaption>
              </figure>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">Hola, {nombreCompleto}</h2>
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

        {/* LO QUE NO CUADRA, dicho antes del botón (2 de octubre de 2026). Solo
            aparece cuando algo no cuadra: si saliera siempre, a la semana nadie lo
            leería. El de la hora es el que habría frenado a Lina el 1 de octubre;
            el del parecido no dice a quién más se parece la cara. */}
        {aviso && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-left">
            <p className="flex items-start gap-2 text-sm font-semibold text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              {aviso.titulo}
            </p>
            <p className="mt-1 pl-6 text-xs text-amber-100/70">{aviso.detalle}</p>
          </div>
        )}

        {/* EL BOTÓN SE SOSTIENE Y LLEVA EL NOMBRE (2 de octubre de 2026). Un toque
            ya no marca: el 1 de octubre dos personas oprimieron el de otra sin
            mirar el nombre, que iba arriba. */}
        <BotonSostenido
          ms={confirmacion.ms}
          onConfirmar={alPresionar}
          disabled={marcando || !estado}
          className={`w-full font-bold py-4 rounded-2xl text-lg text-white transition-colors disabled:opacity-60 shadow-lg
            ${reforzada ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-ink' : ''}
            ${boton
              ? boton.boton
              : dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30'
              : 'bg-green-600 hover:bg-green-500 shadow-green-900/30'
            }`}
        >
          {boton ? <boton.Icono size={26} /> : dentroAhora ? <LogOut size={26} /> : <LogIn size={26} />}
          {marcando ? decisionUbic.textoBoton : `Soy ${colaborador.nombre} · ${accion}`}
        </BotonSostenido>

        {/* Terminar la jornada durante una pausa es raro pero pasa —quien se va
            enfermo, o a quien le cambiaron el turno—. Va discreto y sin perderse:
            si esta salida se guardara como pausa, la vuelta de mañana abriría un
            turno nuevo y el día contaría dos jornadas. También se sostiene: si no,
            sería el atajo para marcar con un toque. */}
        {boton && !marcando && (
          <BotonSostenido
            ms={confirmacion.ms}
            onConfirmar={() => marcar()}
            className="mt-3 w-full text-sm font-semibold text-white/60 hover:text-white/90 py-2 rounded-xl border border-white/10 transition-colors"
          >
            Termino mi jornada
          </BotonSostenido>
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

        {/* «NO SOY X» SE VE (2 de octubre de 2026). Antes era «No soy yo» en letra
            de 12 px casi transparente, que nadie encontraba. */}
        {/* Mientras se marca no se puede decir «no soy»: la marca ya va en camino
            y el aviso la contradiría. */}
        <button onClick={onNoSoy} disabled={marcando}
          className="mt-4 w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40">
          No soy {colaborador.nombre}
        </button>

        {/* Irse sin marcar, SIEMPRE. Sin esto, quien solo venía a mirar su entrada
            tocaba «No soy» para irse, y el servidor anotaba una identificación falsa
            que no ocurrió. Y es la salida de quien sí es esta persona pero no
            reconoce la entrada que ve en pantalla. */}
        <button onClick={salir} disabled={marcando}
          className="mt-2 text-xs font-semibold text-white/50 hover:text-white/80 py-2 disabled:opacity-40">
          Salir sin marcar
        </button>
      </div>

      {confirmando && cerradoHoy && (
        <ConfirmarNuevaEntrada
          turno={cerradoHoy}
          nombre={colaborador.nombre}
          onConfirmar={() => { setConfirmando(false); marcar(); }}
          onCancelar={() => setConfirmando(false)}
          onNoSoy={() => { setConfirmando(false); onNoSoy(); }}
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
