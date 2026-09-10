import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ScanFace, ImageOff, AlertTriangle, ChevronLeft, ChevronRight, Info,
  CalendarOff, Sunrise, Sun, Sunset, Moon, Frame, Hand,
} from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas } from '../lib/retencionFotos';
import { pistaDePantalla, UMBRAL_PISTA, type Pista } from '../lib/pistaPantalla';
import {
  motivoSinFoto, franjaDeLaHora, TEXTO_SIN_FOTO, ROTULO_METODO, ROTULO_MOMENTO, ROTULO_FRANJA,
  type EventoDeRevision, type RespuestaRevision, type Franja,
} from '../lib/revision';

// REVISIÓN DE MARCACIONES: el día como una línea de tiempo, y una cara a la vez.
//
// Existe porque se marcó mostrando la foto de un compañero en la pantalla de un
// celular y el sistema lo aceptó. Eso no lo detecta ningún dato: lo detecta un
// ojo viendo el filo del bisel, el brillo de la pantalla o la mano que sostiene
// el teléfono.
//
// LA FOTO SE PINTA A 2x EXACTO Y SIN SUAVIZAR, Y ESE ES EL CORAZÓN DE TODO.
// `capturarFoto` guarda 320x240. La primera versión de esta pantalla la pintaba
// con `max-w-xl` (576 px), o sea un aumento de 1,8x con interpolación bilineal:
// el filo de un bisel, que es una línea dura de un píxel, se convertía en un
// degradado de dos. Se estaba borrando justo la evidencia que la pantalla existe
// para mostrar. Ahora son 640 = 320x2, ampliación por entero, con
// `image-rendering: pixelated`: cada píxel de origen es un bloque nítido de 2x2
// y no se inventa nada. Y hay un conmutador a 1:1, que es adonde se va para
// descartar que un borde sea un artefacto del propio escalado.
//
// POR QUÉ EL ESCENARIO ES OSCURO. La evidencia vive en las sombras y en los
// reflejos: un marco blanco alrededor sube el negro percibido y aplasta ese
// detalle. `ink` (#303030) es el gris de cabina de la propia paleta, mejor que
// el negro puro, que exagera el contraste.
//
// POR QUÉ NO HAY ORDEN POR SOSPECHA.
//
// Lo que decía antes aquí era falso y hay que dejarlo escrito: comparaba la
// distancia real de un fraude (0,2157) contra 0,28 y 0,41 «de las legítimas»,
// que NO eran legítimas ni medidas, eran números escritos a mano en
// `seed-revision.ts`. Estaba rotulado «Medido». No lo era.
//
// Lo medido de verdad, sobre producción el 10 de septiembre de 2026, con 13
// marcaciones que ya traen distancia (2 de ellas los fraudes conocidos):
//
//   fraude 0,3947  ->  6 honestas por debajo, 5 por encima   (a mitad de la nube)
//   fraude 0,4746  ->  las 11 honestas por debajo            (la más alta jamás vista)
//
// O sea que la creencia de que el fraude deja una distancia BAJA es falsa: uno
// de los dos dio el valor más alto del histórico. Pero la conclusión no cambia,
// y ahora se sostiene en datos: el otro fraude está en la mitad exacta, con seis
// marcaciones honestas por encima. Un umbral que lo cace marca a esas seis.
// Once honestas de dos días tampoco alcanzan para concluir más que eso; hay que
// volver a correr `sql/distribucion-distancias.sql` cuando haya cientos.
//
// POR QUÉ NO SE MUESTRA LA FOTO DE LA FICHA AL LADO. Sería la tarea equivocada:
// el reconocedor acertó contra el descriptor del compañero, así que la cara
// capturada y la de la ficha COINCIDEN por construcción. Poner la referencia al
// lado invita a comparar identidades, que siempre va a dar "sí es él", en vez de
// mirar si eso es una pantalla.

const TZ = 'America/Bogota';
const enBogota = (iso: string) => toZonedTime(new Date(iso), TZ);
const hhmm = (iso: string) => format(enBogota(iso), 'HH:mm');
const diaLargo = (iso: string) => format(enBogota(iso), "d 'de' MMM");

const VENTANAS = [
  { dias: 1, etiqueta: 'Hoy' },
  { dias: 3, etiqueta: '3 días' },
  { dias: 7, etiqueta: '7 días' },
];

const ICONO_FRANJA: Record<Franja, typeof Sun> = {
  MADRUGADA: Moon, MANANA: Sunrise, MEDIODIA: Sun, TARDE: Sunset, NOCHE: Moon,
};

// Un separador cada vez que cambia el grupo. Con la ventana en un día son
// franjas (un rótulo de fecha repetiría lo que ya dice el filtro); con 3 o 7 son
// días, porque la franja se repetiría hasta 28 veces y dejaría de separar nada.
// En los dos casos quedan acotados a media docena.
function grupoDe(ev: EventoDeRevision, dias: number): string {
  const d = enBogota(ev.hora);
  return dias === 1 ? franjaDeLaHora(d.getHours()) : format(d, 'yyyy-MM-dd');
}
function rotuloDeGrupo(ev: EventoDeRevision, dias: number): string {
  const d = enBogota(ev.hora);
  return dias === 1 ? ROTULO_FRANJA[franjaDeLaHora(d.getHours())] : format(d, "EEEE d 'de' MMMM");
}

// FUERA del componente a propósito. Definido dentro, React lo trata como un tipo
// nuevo en CADA render y desmonta y vuelve a montar todo el árbol de abajo: se
// pierde el foco, se reinicia el scroll y las animaciones parpadean.
function Marco({ children, dias, setDias, setIdx, total, hayDatos }: {
  children: React.ReactNode; dias: number; setDias: (d: number) => void;
  setIdx: (i: number) => void; total: number; hayDatos: boolean;
}) {
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ScanFace size={22} className="text-muted" /> Revisión de marcaciones
          </h2>
          <p className="text-sm text-muted mt-1">Una cara a la vez, en orden cronológico.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {VENTANAS.map(v => (
              <button key={v.dias} onClick={() => { setDias(v.dias); setIdx(0); }}
                className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-semibold transition ${
                  dias === v.dias ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                {v.etiqueta}
              </button>
            ))}
          </div>
          {hayDatos && (
            <span className="text-sm text-muted tabular-nums">
              {total} {total === 1 ? 'marcación' : 'marcaciones'}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
    );
}

export default function RevisionMarcaciones() {
  const [dias, setDias] = useState(1);
  const [idx, setIdx] = useState(0);
  const [intento, setIntento] = useState(0);
  const [zoom, setZoom] = useState<1 | 2>(2);
  // La respuesta se guarda JUNTO A LA VENTANA que la pidió: así «cargando» se
  // deriva de comparar las dos en vez de ser otro `setState` dentro del efecto,
  // que dispara renders en cascada. Y hace imposible pintar los datos de una
  // ventana bajo el rótulo de otra.
  const [estado, setEstado] = useState<{ dias: number; intento: number; datos: RespuestaRevision | null } | null>(null);
  const [foto, setFoto] = useState<{ clave: string; url: string | null } | null>(null);
  // La pista se recalcula por foto y NO se guarda en ninguna parte: nace y muere
  // con la imagen que se está mirando.
  const [pista, setPista] = useState<{ clave: string; r: Pista } | null>(null);
  const filaActiva = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let vivo = true;
    api.get('/registros/revision', { params: { dias } })
      .then(r => { if (vivo) setEstado({ dias, intento, datos: r.data }); })
      .catch(() => { if (vivo) setEstado({ dias, intento, datos: null }); });
    return () => { vivo = false; };
  }, [dias, intento]);

  const vigente = estado?.dias === dias && estado?.intento === intento ? estado : null;
  const cargando = !vigente;
  const error = !!vigente && !vigente.datos;
  const datos = vigente?.datos ?? null;
  const eventos = useMemo(() => datos?.eventos ?? [], [datos]);
  const actual: EventoDeRevision | undefined = eventos[idx];

  // La imagen se pide SOLO del evento que se está mirando, nunca en bloque. La
  // política publicada afirma que los datos biométricos no se exponen en los
  // listados, y hay una prueba que cuenta peticiones para que siga siendo cierto.
  useEffect(() => {
    if (!actual?.tieneFoto) return;
    let vivo = true;
    api.get(`/registros/${actual.registroId}/fotos`)
      .then(r => {
        if (!vivo) return;
        const d = r.data as { fotoEntrada: string | null; fotoSalida: string | null };
        setFoto({ clave: actual.clave, url: actual.momento === 'entrada' ? d.fotoEntrada : d.fotoSalida });
        setPista(null);
      })
      .catch(() => { if (vivo) setFoto({ clave: actual.clave, url: null }); });
    return () => { vivo = false; };
  }, [actual]);

  const mover = useCallback((paso: number) => {
    setIdx(i => Math.min(Math.max(i + paso, 0), Math.max(eventos.length - 1, 0)));
  }, [eventos.length]);

  // El teclado es lo que hace viable recorrer cuarenta caras. Sin él, a golpe de
  // ratón, es un trabajo que nadie termina.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      // Si el foco está escribiendo en algún campo, las flechas son suyas.
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [mover]);

  // Sin esto el teclado es una promesa rota a partir de la fila trece: la
  // selección se va de la vista y ya no se sabe dónde se está en el día.
  useEffect(() => { filaActiva.current?.scrollIntoView({ block: 'nearest' }); }, [idx]);

  const nombreDe = (colaboradorId: string) => {
    const p = datos?.personas.find(x => x.id === colaboradorId);
    return p ? `${p.nombre} ${p.apellido}` : 'Colaborador';
  };

  if (cargando) {
    return (
      <Marco dias={dias} setDias={setDias} setIdx={setIdx} total={eventos.length} hayDatos={!!datos}>
        <div className="bg-white rounded-xl shadow p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
              <div className="h-3 w-9 rounded bg-gray-100" />
              <div className="h-2.5 w-2.5 rounded-full bg-gray-100" />
              <div className="flex-1"><div className="h-3 w-40 rounded bg-gray-100" /></div>
            </div>
          ))}
        </div>
      </Marco>
    );
  }

  if (error) {
    return (
      <Marco dias={dias} setDias={setDias} setIdx={setIdx} total={eventos.length} hayDatos={!!datos}>
        <div className="bg-white rounded-xl shadow py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <p className="mt-4 font-semibold text-ink">No pudimos cargar las marcaciones.</p>
          <button onClick={() => setIntento(i => i + 1)}
            className="mt-4 px-4 py-2 rounded-lg bg-ink text-white text-sm font-bold">
            Reintentar
          </button>
        </div>
      </Marco>
    );
  }

  if (eventos.length === 0) {
    return (
      <Marco dias={dias} setDias={setDias} setIdx={setIdx} total={eventos.length} hayDatos={!!datos}>
        <div className="bg-white rounded-xl shadow py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
            <CalendarOff size={26} className="text-gray-300" />
          </div>
          <p className="mt-4 font-semibold text-ink">No hay marcaciones en este período.</p>
          <p className="mt-1 text-sm text-muted">Pruebe con una ventana más amplia.</p>
          {dias < 7 && (
            <button onClick={() => { setDias(7); setIdx(0); }}
              className="mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-ink text-sm font-bold">
              Ver 7 días
            </button>
          )}
        </div>
      </Marco>
    );
  }

  const sinFoto = actual && !actual.tieneFoto;
  const llegoLaFoto = actual && foto?.clave === actual.clave;
  // 320 o 640, NUNCA algo en medio. `max-w-full` parecía una red de seguridad y
  // era lo contrario: cuando la columna medía menos de 640 apretaba la imagen a,
  // por ejemplo, 584 px, o sea un escalado de 1,825x. Con `image-rendering:
  // pixelated` eso da bloques desiguales (unos de 2 px, otros de 1) y se ve peor
  // que cualquiera de las dos opciones limpias. Se deja desbordar dentro del
  // escenario, que ya tiene `overflow-auto`.
  //
  // El corte es `xl` y no `md` porque es donde la rejilla se parte en dos
  // columnas: por debajo el visor ocupa el ancho entero y 640 no cabe.
  const anchoFoto = zoom === 2 ? 'w-[320px] xl:w-[640px]' : 'w-[320px]';

  return (
    <Marco dias={dias} setDias={setDias} setIdx={setIdx} total={eventos.length} hayDatos={!!datos}>
      {datos?.truncado && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-2.5 text-xs mb-4">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Hay más marcaciones de las que caben. Se muestran las más recientes; reduzca la ventana para verlas todas.</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-6">
        {/* ===== LA LÍNEA DEL DÍA ===== */}
        <div className="order-2 xl:order-1 xl:sticky xl:top-6 self-start w-full">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <ol className="max-h-[45vh] xl:max-h-[calc(100dvh-14rem)] overflow-y-auto">
              {eventos.map((ev, i) => {
                const nuevoGrupo = i === 0 || grupoDe(ev, dias) !== grupoDe(eventos[i - 1], dias);
                const Icono = dias === 1 ? ICONO_FRANJA[franjaDeLaHora(enBogota(ev.hora).getHours())] : Sun;
                const activa = i === idx;
                return (
                  <li key={ev.clave} ref={activa ? filaActiva : null} className="scroll-mt-9">
                    {nuevoGrupo && (
                      <div role="presentation" className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-1.5 border-y border-gray-100 first:border-t-0">
                        <Icono size={12} className="text-gray-300" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                          {rotuloDeGrupo(ev, dias)}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setIdx(i)}
                      aria-current={activa ? 'true' : undefined}
                      className={`w-full text-left grid grid-cols-[54px_14px_minmax(0,1fr)] items-center py-2 border-l-[3px] transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                        activa ? 'border-primary-dark bg-primary/15' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <span className={`pl-2 text-[13px] tabular-nums font-semibold ${activa ? 'text-ink' : 'text-ink/60'}`}>
                        {hhmm(ev.hora)}
                      </span>
                      {/* El riel: una vertical de 1 px cosida entre filas, con el
                          punto encima. Es lo que convierte la lista en una línea
                          de tiempo sin agregar ni una fila. */}
                      <span className="relative h-full flex items-center justify-center">
                        <span className="absolute left-1/2 -translate-x-1/2 -top-3 -bottom-3 w-px bg-gray-200" />
                        <span className={`relative h-2.5 w-2.5 rounded-full ${activa ? 'ring-4 ring-[#FFF9E7]' : 'ring-4 ring-white'} ${
                          !ev.tieneFoto ? 'bg-white border-2 border-gray-300'
                            : ev.momento === 'entrada' ? 'bg-ink'
                            : 'bg-white border-2 border-ink/40'}`} />
                      </span>
                      <span className="min-w-0 pr-3 flex items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${
                            activa ? 'font-bold text-ink' : ev.tieneFoto ? 'font-medium text-ink' : 'font-medium text-muted'}`}>
                            {nombreDe(ev.colaboradorId)}
                          </span>
                          <span className="block truncate text-[11px] text-muted mt-0.5">
                            {ROTULO_MOMENTO[ev.momento]}
                            {/* El método solo cuando NO es rostro: en el caso normal
                                es ruido repetido cuarenta veces, y cuando no lo es,
                                es justamente la razón de que no haya nada que ver. */}
                            {ev.metodo !== 'ROSTRO' && ` · ${ROTULO_METODO[ev.metodo]}`}
                          </span>
                        </span>
                        {ev.distanciaRepetida ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">Repetida</span>
                        ) : ev.laPusoElSistema ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">Automática</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* ===== EL VISOR ===== */}
        {actual && (
          <div className="order-1 xl:order-2 min-w-0">
            <div className="rounded-2xl bg-ink shadow-lg overflow-hidden">
              {/* Avance: no ocupa altura y dice cuánto falta de un trabajo largo. */}
              <div className="h-[3px] bg-white/10">
                <div className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${((idx + 1) / eventos.length) * 100}%` }} />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <div className="min-w-0">
                  <p className="text-[17px] font-bold leading-tight text-white truncate">{nombreDe(actual.colaboradorId)}</p>
                  <p className="text-[12.5px] leading-tight text-white/55 mt-0.5">
                    {ROTULO_MOMENTO[actual.momento]} · {diaLargo(actual.hora)}, {hhmm(actual.hora)} · {ROTULO_METODO[actual.metodo]}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="hidden sm:flex items-center gap-1 text-white/35">
                    <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white/60">←</kbd>
                    <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white/60">→</kbd>
                  </span>
                  <button onClick={() => mover(-1)} disabled={idx === 0} aria-label="Marcación anterior"
                    className="h-9 w-9 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-25 flex items-center justify-center">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-[13px] font-semibold tabular-nums text-white/80">{idx + 1} / {eventos.length}</span>
                  <button onClick={() => mover(1)} disabled={idx >= eventos.length - 1} aria-label="Marcación siguiente"
                    className="h-9 w-9 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-25 flex items-center justify-center">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* ALTURA FIJA: la foto nace siempre en el mismo píxel y no salta al
                  cambiar de marcación, tenga o no imagen. Recorrer cuarenta caras
                  con la maqueta moviéndose es lo que cansa. */}
              <div className="relative flex items-center justify-center overflow-auto h-[300px] md:h-[540px] p-3 md:p-5 bg-ink">
                {sinFoto ? (
                  <div className="flex max-w-xs flex-col items-center gap-2 text-center">
                    <ImageOff size={30} className="text-white/20" />
                    <p className="text-sm leading-snug text-white/50">
                      {TEXTO_SIN_FOTO[motivoSinFoto(actual, fotosExpiradas(actual.hora))]}
                    </p>
                  </div>
                ) : llegoLaFoto && foto?.url ? (
                  <>
                    <img
                      src={foto.url}
                      alt={`Foto de ${ROTULO_MOMENTO[actual.momento].toLowerCase()} de ${nombreDe(actual.colaboradorId)}`}
                      className={`${anchoFoto} h-auto rounded-xl ring-1 ring-white/10 [transform:scaleX(-1)] [image-rendering:pixelated]`}
                      onLoad={e => {
                        const clave = actual.clave;
                        void pistaDePantalla(e.currentTarget).then(r => {
                          // Puede volver tarde: si ya se cambió de marcación, se descarta.
                          setPista(p => (p && p.clave !== clave ? p : { clave, r }));
                        });
                      }}
                    />
                    {/* El sello dice qué se está mirando. Sin él, "se ve
                        cuadriculada" parece un defecto, cuando es lo contrario:
                        son los píxeles de verdad, sin inventar. */}
                    <span className="absolute left-4 bottom-4 text-[10px] uppercase tracking-widest text-white/25">
                      Espejada · {zoom}× · 320×240
                    </span>
                    <button onClick={() => setZoom(z => (z === 2 ? 1 : 2))}
                      className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur hover:bg-black/60">
                      {zoom === 2 ? 'Ver 1:1' : 'Ver 2×'}
                    </button>
                    {/* LA PISTA. Dice MIRÁ ESTA, nunca "esto es fraude".
                        La diferencia no es de estilo: quien decide sigue siendo
                        el ojo que está viendo la foto, y esta marca solo le
                        dirige la mirada al sitio. Por eso nombra lo que hay que
                        buscar (un borde recto a los dos lados) en vez de dar un
                        veredicto, y por eso es ámbar y no roja: rojo es el color
                        de la señal de distancia repetida, que sí es un hecho
                        duro y no una sospecha. */}
                    {pista?.clave === actual.clave && pista.r?.hay && (
                      <div
                        title={`Rectas paralelas alrededor del rostro: ${pista.r.paralelas.toFixed(2)} (la marca aparece por encima de ${UMBRAL_PISTA})`}
                        className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-amber-400/90 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 backdrop-blur">
                        <Frame size={13} strokeWidth={2.5} />
                        Se ven bordes rectos a los lados. Fíjate si es un aparato.
                      </div>
                    )}
                  </>
                ) : llegoLaFoto ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ImageOff size={30} className="text-white/20" />
                    <p className="text-sm text-white/50">No pudimos cargar esta foto.</p>
                  </div>
                ) : (
                  <div className="w-[320px] xl:w-[640px] h-[240px] xl:h-[480px] rounded-xl bg-white/[0.06] animate-pulse" />
                )}
              </div>

              {actual.distanciaRepetida && (
                <div className="flex gap-2.5 bg-red-50 px-4 py-3 text-[13px] leading-snug text-red-800">
                  <AlertTriangle size={17} className="mt-px shrink-0 text-red-500" />
                  <span>
                    El reconocimiento de esta persona dio <b>exactamente el mismo resultado</b> en más de
                    una marcación. Dos capturas de una cara real nunca coinciden al milímetro, así que
                    esto es compatible con una copia reenviada.
                  </span>
                </div>
              )}

              {/* La guía de qué buscar vive AQUÍ, debajo de la foto, que es donde
                  están los ojos mientras se trabaja. Arriba del todo se lee una
                  vez el primer día y después solo empuja la imagen hacia abajo. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white px-4 py-2.5 text-[11.5px] text-muted">
                <span className="font-semibold text-ink/75">Qué delata una foto de pantalla:</span>
                <span className="inline-flex items-center gap-1.5"><Frame size={13} className="text-gray-400" /> el filo de un marco</span>
                <span className="inline-flex items-center gap-1.5"><Sun size={13} className="text-gray-400" /> un brillo de pantalla</span>
                <span className="inline-flex items-center gap-1.5"><Hand size={13} className="text-gray-400" /> una mano sosteniéndola</span>
              </div>
            </div>

            {/* Navegación de pulgar: en el teléfono no hay flechas y los botones
                de 36 px de la banda oscura quedan apretados. */}
            <div className="xl:hidden flex gap-2 mt-3">
              <button onClick={() => mover(-1)} disabled={idx === 0}
                className="flex-1 h-11 rounded-xl bg-white shadow text-ink text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                <ChevronLeft size={18} /> Anterior
              </button>
              <button onClick={() => mover(1)} disabled={idx >= eventos.length - 1}
                className="flex-1 h-11 rounded-xl bg-ink text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                Siguiente <ChevronRight size={18} />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-muted flex items-center gap-1.5">
              <Info size={12} /> Las fotos se piden de una en una y se eliminan a los 2 meses.
            </p>
          </div>
        )}
      </div>
    </Marco>
  );
}
