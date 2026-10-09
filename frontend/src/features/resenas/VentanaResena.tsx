import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast';
import { POLITICA_PRIVACIDAD } from '../../lib/legal';
import {
  debeMostrarResena, esRutaDeInicio, resenaMostradaEnEstaPestana, marcarResenaMostrada, avisosDeLaCarga,
  type ContextoResena,
} from './debeMostrarResena';
import {
  pedirPendiente, enviarResena, yaRespondio,
  type ComoAparece, type EnvioDeResena, type RespuestaPendiente,
} from './api';

// LA VENTANA «HABLEMOS DE RESULTADOS» (docs/RESENAS.md §3).
//
// Le pide la reseña al administrador de una empresa que va en su segundo mes pagado. Sale una sola
// vez: solo «Enviar» u «Omitir» gastan la oportunidad (R7), así que un clic fuera la sacude en vez de
// cerrarla, igual que Novedades, y Escape no hace nada.
//
// Se monta en el Layout junto a los otros avisos y decide sola si sale, con `debeMostrarResena`. Lo
// que esa función no ve, y por eso vive aquí, es CUÁNDO se toma la decisión.

const MAXIMO = 500; // R11
const GRACIAS = '¡Gracias por contarnos!';
// R9: otro administrador, o la misma persona en otra pestaña, respondió primero. No es un error.
const YA_LA_DEJO = 'Tu empresa ya nos dejó su opinión, gracias.';
const NO_PENDIENTE: RespuestaPendiente = { pendiente: false, opciones: null };

export default function VentanaResena() {
  const { usuario } = useAuth();
  const enInicio = esRutaDeInicio(useLocation().pathname);

  // ────────── LO QUE HABÍA AL CARGAR EL PANEL (R4) ──────────
  //
  // Se lee UNA vez, al montar. Cerrar las novedades escribe su llave y verificar el correo cambia el
  // usuario; si se leyera después, la reseña saldría justo detrás del otro aviso, en la misma carga.
  const [alCargar] = useState(() => usuario && {
    ...avisosDeLaCarga(usuario),
    emailVerificado: usuario.emailVerificado,
    mostrada: resenaMostradaEnEstaPestana(usuario.id),
  });

  const contexto = (pendiente: boolean, trabajandoEnInicio = false): ContextoResena => ({
    rol: usuario?.rol ?? null,
    pendiente,
    enInicio: true,
    mostradaEnEstaPestana: alCargar?.mostrada ?? true,
    trabajandoEnInicio,
    emailVerificado: alCargar?.emailVerificado,
    vioLaGuia: alCargar?.vioLaGuia ?? false,
    novedadesPorMostrar: alCargar?.novedadesPorMostrar ?? true,
    // El auxilio lo mira el servidor y ya viene dentro de `pendiente`: GET /resenas/pendiente responde
    // que no mientras haya salarios por revisar, con la misma `revisionPendiente` que abre
    // RevisionAuxilio. Y como se pregunta al cargar, es lo que había en ESTA carga.
    auxilioPorRevisar: false,
  });

  // Si ni con un sí del servidor saldría, no se le pregunta: al supervisor, a quien ya le salió en esta
  // pestaña, o cuando en esta carga sale otro aviso.
  const vale = debeMostrarResena(contexto(true));

  // SE PREGUNTA AL CARGAR EL PANEL Y NO AL LLEGAR A INICIO, a propósito. Quien entra por otra pantalla
  // y resuelve allí la revisión del auxilio no puede encontrarse la reseña detrás al pasar a Inicio:
  // vale lo que el servidor dijo para esta carga, igual que con los avisos del navegador.
  const [respuesta, setRespuesta] = useState<RespuestaPendiente | null>(null);
  useEffect(() => {
    if (!vale) return;
    pedirPendiente()
      .then(setRespuesta)
      // Si no se puede saber, no sale: no salir no gasta nada, y vuelve a preguntarse en la siguiente carga.
      .catch(() => setRespuesta(NO_PENDIENTE));
  }, [vale]);

  // ────────── LA DECISIÓN, UNA VEZ POR CARGA (R3, R4) ──────────
  //
  // Se toma la primera vez que se está en Inicio con todo a la mano, y queda fija mientras viva el
  // panel: volver a Inicio no la repite, y cerrar las novedades no la hace salir detrás de ellas.
  // Se ajusta el estado durante el render, como pide React para derivar de lo que cambió, y no en un
  // efecto, que pintaría una vez con la decisión vieja.
  const [decision, setDecision] = useState<'mostrar' | 'no' | null>(null);

  // R3: «ni en mitad de un trabajo». Mientras se espera la respuesta estando en Inicio, cualquier clic
  // o tecla dice que la persona ya empezó algo (abrir un modal, escribir en un campo), y entonces la
  // ventana no le cae encima. Solo cuenta lo que hace EN Inicio: lo de otra pantalla, y el clic del
  // menú que la trajo, se olvidan al llegar, porque entrar a Inicio es justo cuando tiene que salir.
  const [trabajando, setTrabajando] = useState(false);
  const [enInicioAntes, setEnInicioAntes] = useState(enInicio);
  if (enInicio !== enInicioAntes) {
    setEnInicioAntes(enInicio);
    setTrabajando(false);
  }
  useEffect(() => {
    if (!enInicio || decision !== null) return;
    const empezo = () => setTrabajando(true);
    document.addEventListener('pointerdown', empezo, true);
    document.addEventListener('keydown', empezo, true);
    return () => {
      document.removeEventListener('pointerdown', empezo, true);
      document.removeEventListener('keydown', empezo, true);
    };
  }, [enInicio, decision]);

  if (decision === null && enInicio && (!vale || respuesta !== null)) {
    setDecision(debeMostrarResena(contexto(!!respuesta?.pendiente, trabajando)) ? 'mostrar' : 'no');
  }

  // Marcarla en la pestaña es escribir afuera, así que va en un efecto. Se marca SOLO SI SALE: un
  // «no» no gasta nada y la siguiente carga vuelve a preguntar (ver debeMostrarResena.ts).
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (decision === 'mostrar' && usuarioId) marcarResenaMostrada(usuarioId);
  }, [decision, usuarioId]);

  const [terminada, setTerminada] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const terminar = (mensaje: string | null) => {
    setTerminada(true);
    setAviso(mensaje);
  };

  return (
    <>
      {decision === 'mostrar' && !terminada && respuesta?.opciones && (
        <Ventana opciones={respuesta.opciones} onTerminar={terminar} />
      )}
      {/* Fuera de la ventana: el aviso tiene que seguir en pantalla cuando ella ya se cerró. */}
      <Toast mensaje={aviso} onClose={() => setAviso(null)} />
    </>
  );
}

// ────────── LA VENTANA ──────────

function Ventana({ opciones, onTerminar }: {
  opciones: Record<ComoAparece, string>;
  // Con el texto del aviso que queda en la esquina, o null si se cierra sin decir nada.
  onTerminar: (mensaje: string | null) => void;
}) {
  const id = useId();
  const [estrellas, setEstrellas] = useState(0);
  // Las que se pintan llenas mientras el puntero pasa por encima, antes de elegir.
  const [resaltadas, setResaltadas] = useState(0);
  const [texto, setTexto] = useState('');
  // R13: ninguna opción viene marcada. Una autorización que se da sin tocar nada no es expresa.
  const [comoAparece, setComoAparece] = useState<ComoAparece | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [sacudiendo, setSacudiendo] = useState(false);
  // Si el gesto EMPEZÓ en el fondo: seleccionar texto de la ventana y soltar fuera también le manda el
  // clic al fondo, y esa sacudida no la pidió nadie (igual que en Novedades).
  const pulsoEnElFondo = useRef(false);
  const [conMovimiento] = useState(() => !prefiereMenosMovimiento());
  const caja = useRef<HTMLDivElement>(null);

  // Sin texto no hay nada que publicar, y la pregunta se oculta (§3.3).
  const conTexto = texto.trim() !== '';
  const lista = estrellas > 0 && (!conTexto || comoAparece !== null);

  // El foco arranca en las estrellas (§10.4).
  useEffect(() => {
    if (caja.current) tabulables(caja.current)[0]?.focus();
  }, []);

  // EL FOCO NO SALE DE LA VENTANA. El Tab de los bordes lo da la vuelta `atrapar`; esto cubre lo
  // demás: un clic en el fondo, o algo de detrás que tome el foco por su cuenta.
  useEffect(() => {
    const alEntrarFoco = (e: FocusEvent) => {
      const ventana = caja.current;
      if (ventana && e.target instanceof Node && !ventana.contains(e.target)) tabulables(ventana)[0]?.focus();
    };
    document.addEventListener('focusin', alEntrarFoco);
    return () => document.removeEventListener('focusin', alEntrarFoco);
  }, []);

  const atrapar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !caja.current) return;
    const paradas = tabulables(caja.current);
    const primero = paradas[0];
    const ultimo = paradas[paradas.length - 1];
    if (!primero || !ultimo) return;
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  // «Enviar» y «Omitir» quedan deshabilitados mientras va la petición: el doble clic manda una sola.
  // Basta con eso: React aplica el `disabled` antes de que llegue el segundo clic.
  const mandar = async (cuerpo: EnvioDeResena, gracias: string | null) => {
    setEnviando(true);
    setError('');
    try {
      await enviarResena(cuerpo);
      onTerminar(gracias);
    } catch (e) {
      if (yaRespondio(e)) {
        onTerminar(YA_LA_DEJO);
        return;
      }
      setError(errorDelServidor(e) ?? 'No pudimos guardar tu respuesta. Inténtalo de nuevo.');
      setEnviando(false);
    }
  };

  const enviar = () => {
    if (!lista) return;
    // Sin texto no van ni el texto ni la opción: no hay nada que autorizar publicar.
    mandar(conTexto && comoAparece
      ? { accion: 'ENVIAR', estrellas, texto, comoAparece }
      : { accion: 'ENVIAR', estrellas }, GRACIAS);
  };

  return (
    <div data-testid="fondo" className="fixed inset-0 !mt-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onPointerDown={e => { pulsoEnElFondo.current = e.target === e.currentTarget; }}
      onClick={() => { if (pulsoEnElFondo.current) setSacudiendo(true); }}>
      {/* La sacudida va en este envoltorio y no en la ventana: compartir elemento con hp-pop haría que
          al terminar volviera a correr la animación de entrada (ver hp-sacudida en index.css), que ya
          se apaga sola con «reducir movimiento». `data-sacudiendo` es para las pruebas. */}
      <div
        data-sacudiendo={sacudiendo || undefined}
        className={`w-full max-w-lg ${sacudiendo ? 'hp-sacudida' : ''}`}
        onAnimationEnd={e => { if (e.target === e.currentTarget) setSacudiendo(false); }}
        onClick={e => e.stopPropagation()}
      >
        {/* hp-pop crece desde cero y pasa del tamaño final: con «reducir movimiento» no se pone. El CSS
            no la apaga, y no es una regla de este archivo. `data-animada` es para las pruebas. */}
        <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} onKeyDown={atrapar}
          data-animada={conMovimiento || undefined}
          className={`${conMovimiento ? 'hp-pop ' : ''}bg-white rounded-2xl w-full shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto px-6 py-5`}>
          <h2 id={`${id}-titulo`} className="font-bold text-xl text-ink">Hablemos de resultados</h2>

          <fieldset className="mt-4">
            <legend className="text-sm text-ink">¿Cómo le ha ayudado HoraPro a tu empresa o equipo?</legend>
            {/* Radios de verdad, uno por estrella: las flechas del teclado eligen y un lector de
                pantalla oye «4 estrellas». La estrella es solo el dibujo. */}
            <div className="mt-2 flex gap-1" onPointerLeave={() => setResaltadas(0)}>
              {[1, 2, 3, 4, 5].map(n => {
                const llena = n <= (resaltadas || estrellas);
                return (
                  <label key={n} className="cursor-pointer" onPointerEnter={() => setResaltadas(n)}>
                    <input type="radio" name={`${id}-estrellas`} value={n} checked={estrellas === n}
                      onChange={() => setEstrellas(n)} className="peer sr-only" />
                    <span className="sr-only">{n === 1 ? '1 estrella' : `${n} estrellas`}</span>
                    <span aria-hidden="true" className="block rounded-lg p-1 peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                      <Star size={30} className={`transition-colors ${llena ? 'fill-primary text-primary-dark' : 'text-gray-300'}`} />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <label htmlFor={`${id}-texto`} className="sr-only">Tu experiencia (opcional)</label>
            <textarea id={`${id}-texto`} value={texto} onChange={e => setTexto(e.target.value)}
              // Se cuenta en unidades de texto, como el contador: el servidor cuenta caracteres y un
              // emoji vale dos aquí, así que nada que pase este tope se le pasa a él.
              maxLength={MAXIMO} rows={4} placeholder="Escribe tu experiencia aquí..."
              aria-describedby={`${id}-ayuda`}
              className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary" />
            {/* El ejemplo es una línea de ayuda y no el texto de fondo: aquel desaparece al escribir.
                Sin cifras, a propósito: una cifra publicada por HoraPro pasa a ser publicidad suya. */}
            <div id={`${id}-ayuda`} className="mt-1 flex justify-between gap-3 text-xs text-muted">
              <span>{'Ej: "Ya no peleamos con el Excel a fin de mes..."'}</span>
              <span className="shrink-0 tabular-nums">{texto.length}/{MAXIMO}</span>
            </div>
          </div>

          {conTexto && (
            <fieldset className="mt-4">
              <legend className="text-sm text-ink">¿Nos dejas presumir tu opinión en la web?</legend>
              {/* Los textos EXACTOS que manda el servidor: son los que quedan guardados como constancia
                  de la autorización (R13). Armarlos aquí dejaría decir una cosa y guardar otra. */}
              <div className="mt-2 space-y-2">
                {(['CON_NOMBRE', 'ANONIMA'] as const).map(opcion => (
                  <label key={opcion} className="flex items-start gap-2.5 cursor-pointer text-sm text-ink">
                    <input type="radio" name={`${id}-como`} value={opcion} checked={comoAparece === opcion}
                      onChange={() => setComoAparece(opcion)} className="mt-0.5 accent-ink" />
                    <span>{opciones[opcion]}</span>
                  </label>
                ))}
                {/* El super admin sí ve quién la envió: la ventana no promete más de lo que hace el sistema. */}
                <p className="pl-6 text-xs text-muted">HoraPro sabrá quién la escribió; en la web, no.</p>
                {POLITICA_PRIVACIDAD.publicada && (
                  <p className="pl-6 text-xs text-muted">
                    Así cuidamos tus datos:{' '}
                    <a href={POLITICA_PRIVACIDAD.ruta} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
                      política de privacidad
                    </a>.
                  </p>
                )}
              </div>
            </fieldset>
          )}

          {error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2">
              <p role="alert" className="text-sm text-red-700">{error}</p>
              {/* Sin esto, un servidor caído deja el panel tapado por una ventana que no se puede cerrar.
                  No gasta nada: no se guardó ninguna fila y vuelve en otra pestaña, como al cerrarla (R8). */}
              <button type="button" onClick={() => onTerminar(null)}
                className="text-xs font-semibold text-red-700 underline">
                Cerrar por ahora
              </button>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => mandar({ accion: 'OMITIR' }, null)} disabled={enviando}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-60">
              Omitir
            </button>
            <button type="button" onClick={enviar} disabled={!lista || enviando}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-ink text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────── AYUDANTES ──────────

function prefiereMenosMovimiento(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// El mensaje que mandó el servidor, si mandó uno.
function errorDelServidor(e: unknown): string | null {
  const mensaje = (e as { response?: { data?: { error?: unknown } } } | null)?.response?.data?.error;
  return typeof mensaje === 'string' && mensaje ? mensaje : null;
}

const esRadio = (el: Element | null): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'radio';

// Por dónde pasa el Tab dentro de la ventana, en orden. De un grupo de radios entra a UNO solo: al
// marcado, o al primero si no hay ninguno, que es lo que hace el navegador.
function tabulables(ventana: HTMLElement): HTMLElement[] {
  const todos = [...ventana.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
  )];
  return todos.filter(el => {
    if (!esRadio(el)) return true;
    const grupo = todos.filter((o): o is HTMLInputElement => esRadio(o) && o.name === el.name);
    return el === (grupo.find(o => o.checked) ?? grupo[0]);
  });
}
