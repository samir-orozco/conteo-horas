import { useState } from 'react';
import { MapPin, Check, UtensilsCrossed, Coffee, AlertTriangle, type LucideIcon } from 'lucide-react';
import type { DecisionUbicacion } from '../decisionUbicacion';
import { horaBog, fechaDelKiosco } from '../helpers';
import type { Colaborador, Estado, Pausa, Sede } from '../tipos';
import ConfirmarNuevaEntrada from './ConfirmarNuevaEntrada';
import ElegirTipoDeSalida from './ElegirTipoDeSalida';
import BotonSostenido from './BotonSostenido';
import { confirmacionDeLaMarca, textoDelAviso, textoDelSostenido } from '../confirmacion';

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
  // La miniatura de la ficha: la foto que la persona tiene REGISTRADA. Puede faltar, y
  // entonces van las iniciales.
  fotoReferencia?: string | null;
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
  onNoSoy, fotoReferencia = null, parecidoDudoso = false,
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
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-7">
        {/* EL DISEÑO DEL DUEÑO (3 de octubre de 2026): la pregunta en grande, la tarjeta de la
            persona con la foto que tiene REGISTRADA, el reloj y el botón. La foto es la de la
            ficha y no la que se acaba de tomar: la de ahora le muestra a cada quien su propia
            cara, que es lo que espera ver, y no le dice nada. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white">Marcación</p>
          {/* Irse sin marcar, SIEMPRE. Sin esto, quien solo venía a mirar su entrada tocaba
              «No soy» para irse, y el servidor anotaba una identificación falsa que no ocurrió.
              Y es la salida de quien sí es esta persona pero no reconoce la entrada que ve. */}
          <button onClick={salir} disabled={marcando}
            className="text-sm font-semibold text-white/55 hover:text-white/85 transition-colors disabled:opacity-40">
            Salir sin marcar
          </button>
        </div>

        <h2 className="mt-3 text-[28px] leading-tight font-bold text-white">¿Eres tú, {colaborador.nombre}?</h2>

        <div className="relative mt-5 flex items-center gap-4 rounded-3xl bg-black/25 px-5 py-4">
          {fotoReferencia ? (
            <img src={fotoReferencia} alt={`Foto de la ficha de ${nombreCompleto}`}
              className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-white/15" />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-ink">{colaborador.nombre[0]}{colaborador.apellido[0]}</span>
            </div>
          )}
          <div className="min-w-0 text-left">
            <p className="text-xl font-bold text-white leading-tight">{nombreCompleto}</p>
            {colaborador.cargo && <p className="text-base text-white/55 leading-tight mt-0.5">{colaborador.cargo}</p>}
          </div>
          {/* Dónde le toca marcar, en la esquina de su tarjeta. */}
          {sedes.length > 0 && (
            <span className="absolute -top-2.5 right-2 max-w-[70%] inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-medium text-ink shadow">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{sedes.map(s => s.nombre).join(' · ')}</span>
            </span>
          )}
        </div>

        <hr className="my-6 border-white/15" />

        <div className="text-center">
          <p className="font-extrabold text-white tabular-nums tracking-tight leading-none">
            <span className="text-7xl">{horaBog(ahora, 'HH:mm')}</span>
            <span className="text-2xl text-white/70">{horaBog(ahora, ':ss')}</span>
          </p>
          <p className="mt-3 text-lg text-white/55">{fechaDelKiosco(ahora)}</p>
        </div>

        {/* Cómo va el día de esta persona. Pequeño, pero sin quitarlo: «Entrada registrada a
            las 08:35» es lo que delata que alguien ya marcó a su nombre. */}
        <p className={`mt-4 mx-auto w-fit rounded-full px-3 py-1 text-xs font-medium ${
          enCurso ? enCurso.aviso
            : dentroAhora || cerradoHoy ? 'bg-green-500/10 text-green-400'
            : 'bg-white/5 text-white/50'
        }`}>
          {enCurso && salidaDeLaPausa ? (
            <span className="flex items-center justify-center gap-1.5">
              <enCurso.Icono size={13} /> {enCurso.enCurso} {horaBog(salidaDeLaPausa, 'HH:mm')}
            </span>
          ) : dentroAhora ? (
            `Entrada registrada a las ${entradaHace}`
          ) : cerradoHoy ? (
            <span className="flex items-center justify-center gap-1.5">
              <Check size={13} /> Hoy: entrada {horaBog(cerradoHoy.entrada, 'HH:mm')} · salida {horaBog(cerradoHoy.salida, 'HH:mm')}
            </span>
          ) : (
            'Sin entrada registrada hoy'
          )}
        </p>

        {/* LO QUE NO CUADRA, dicho antes del botón (2 de octubre de 2026). Solo aparece
            cuando algo no cuadra: si saliera siempre, a la semana nadie lo leería. El de la
            hora es el que habría frenado a Lina el 1 de octubre; el del parecido no dice a
            quién más se parece la cara. */}
        {aviso && (
          <div role="alert" className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-left">
            <p className="flex items-start gap-2 text-sm font-semibold text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              {aviso.titulo}
            </p>
            <p className="mt-1 pl-6 text-xs text-amber-100/70">{aviso.detalle}</p>
          </div>
        )}

        {/* EL BOTÓN SE SOSTIENE Y DICE QUIÉN Y QUÉ (2 de octubre de 2026). Un toque ya no
            marca. La acción va escrita —entrada, salida, almuerzo— y no un «registrar ahora»:
            el 1 de octubre lo que delataba el error era que el botón decía «Salida» a quien
            venía a entrar. */}
        <BotonSostenido
          ms={confirmacion.ms}
          onConfirmar={alPresionar}
          disabled={marcando || !estado}
          indicacion={false}
          className={`mt-5 w-full font-bold py-4 rounded-full text-xl text-white transition-colors disabled:opacity-60 shadow-lg
            ${reforzada ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-ink' : ''}
            ${boton
              ? boton.boton
              : dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30'
              : 'bg-[#74c15c] hover:bg-[#82cb6b] shadow-green-900/30'
            }`}
        >
          {marcando ? decisionUbic.textoBoton : `Soy ${colaborador.nombre}, ${accion.charAt(0).toLowerCase()}${accion.slice(1)}`}
        </BotonSostenido>
        <p className={`mt-2 text-center text-sm ${reforzada ? 'text-amber-300' : 'text-[#74c15c]'}`}>
          {textoDelSostenido(confirmacion.ms)}
        </p>

        {/* Terminar la jornada durante una pausa es raro pero pasa —quien se va
            enfermo, o a quien le cambiaron el turno—. Va discreto y sin perderse:
            si esta salida se guardara como pausa, la vuelta de mañana abriría un
            turno nuevo y el día contaría dos jornadas. También se sostiene: si no,
            sería el atajo para marcar con un toque. */}
        {boton && !marcando && (
          <BotonSostenido
            ms={confirmacion.ms}
            onConfirmar={() => marcar()}
            className="mt-3 w-full text-sm font-semibold text-white/60 hover:text-white/90 py-2 rounded-full border border-white/10 transition-colors"
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

        {/* «NO SOY X» SE VE (2 de octubre de 2026). Antes era «No soy yo» en letra de 12 px
            casi transparente, que nadie encontraba. Mientras se marca no se puede tocar: la
            marca ya va en camino y el aviso la contradiría. */}
        <button onClick={onNoSoy} disabled={marcando}
          className="mt-5 w-full rounded-full border-2 border-white/70 py-3.5 text-lg font-semibold text-white hover:bg-white/5 transition-colors disabled:opacity-40">
          No soy {colaborador.nombre}
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
