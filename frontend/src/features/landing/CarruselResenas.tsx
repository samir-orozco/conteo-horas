import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import TarjetaResena from './TarjetaResena';
import { pedirResenasPublicas, type TarjetaPublica } from '../resenas/api';
import { derivar, envolver, etiquetaDePosicion, paginar, suavizar } from '../resenas/carrusel';

// Las reseñas de clientes en la landing, justo antes de Precios (docs/RESENAS.md, sección 5).
//
// Computador: tres a la vista y la fila deslizándose sola hacia la derecha, muy despacio y sin fin
// (pedido del dueño el 8 de octubre de 2026: sin botón de pausa ni puntos, con flechas). Se detiene
// mientras el mouse está encima, el foco del teclado adentro o unos segundos después de un toque, y
// con «reducir movimiento» se queda quieta. Celular: una a la vez con la siguiente asomada, se desliza
// con el dedo y abajo dice «2 / 15»; no se mueve sola. Con tres o menos no se mueve (R39).
//
// Es la misma fila con desplazamiento de BlogReciente, sin biblioteca. En el computador la mueve un
// bucle de cuadros de animación sobre tres copias de la lista, y se mantiene en la del medio: al
// salirse por un lado se la corre una copia entera, que se ve idéntica, y la vuelta no tiene salto.
//
// Nada de lo que hay aquí lleva `hp-reveal`: `useReveal` solo observa lo que existe al cargar la
// página, y esto llega después, del servidor. Con esa clase se quedaría invisible para siempre.

// El mismo corte que el `md:` de Tailwind, para que el reparto y las clases no se contradigan.
const COMPUTADOR = '(min-width: 768px)';
const REDUCIR_MOVIMIENTO = '(prefers-reduced-motion: reduce)';
const POR_PAGINA = 3;
// «Muy lentamente»: una tarjeta (unos 377 px a 1280 de ancho) cada 20 segundos, más o menos.
const VELOCIDAD_PX_S = 18;
// Lo que tarda una flecha en correr una tarjeta.
const FLECHA_MS = 600;
// Lo que se queda quieta después de un toque, para alcanzar a leer.
const PAUSA_TOQUE_MS = 4000;

// Lo que responde el navegador a una consulta de medios, al día si cambia (girar la tableta, o
// activar «reducir movimiento» con la página abierta).
function useConsulta(consulta: string): boolean {
  const suscribir = useCallback((avisar: () => void) => {
    const lista = window.matchMedia(consulta);
    lista.addEventListener('change', avisar);
    return () => lista.removeEventListener('change', avisar);
  }, [consulta]);
  return useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches);
}

// ────────── R44, DEL LADO DE LA LLEGADA ──────────
//
// El hueco de la carga no basta solo. Quien entra a /#precios desde el blog queda en Precios con el
// hueco encima, y cuando llega la respuesta la sección cambia de alto: entera si no hay reseñas, unos
// píxeles si las hay. Chrome y Firefox anclan el desplazamiento y no se nota; Safari no, y deja la
// vista donde estaba, o sea pasando los planes. Por eso: si al llegar la respuesta la vista seguía en
// el ancla de la dirección, después del cambio se la devuelve ahí. Si la persona ya se movió, no se
// la arrastra.

// El elemento al que apunta el `#` de la dirección, si existe.
function anclaDeLaDireccion(): HTMLElement | null {
  const id = window.location.hash.slice(1);
  if (!id) return null;
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null; // un `%` suelto en la dirección
  }
}

// Unos píxeles de holgura: el redondeo del navegador, o un roce del trackpad, no son «se movió».
const HOLGURA_PX = 8;

// Si la vista está donde la deja el ancla: su borde de arriba, menos el margen que le deja el
// encabezado fijo (`scroll-mt-16`). Medido por maquetación y no con getBoundingClientRect, que
// devuelve la caja transformada y miente con las animaciones de entrada (CLAUDE.md §12.9).
function vistaEnElAncla(ancla: HTMLElement): boolean {
  let arriba = 0;
  for (let el: HTMLElement | null = ancla; el; el = el.offsetParent as HTMLElement | null) arriba += el.offsetTop;
  const margen = parseFloat(getComputedStyle(ancla).scrollMarginTop) || 0;
  return Math.abs(window.scrollY - (arriba - margen)) <= HOLGURA_PX;
}

type Props = { titulo: string; subtitulo: string };

export default function CarruselResenas({ titulo, subtitulo }: Props) {
  // null mientras el servidor no responde.
  const [resenas, setResenas] = useState<TarjetaPublica[] | null>(null);
  const computador = useConsulta(COMPUTADOR);
  // El ancla a la que hay que devolver la vista cuando la sección cambie de alto (R44).
  const volverA = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let vigente = true;
    // Se mira ANTES de cambiar nada: después, la vista ya no está donde estaba el ancla.
    const llegaron = (lista: TarjetaPublica[]) => {
      if (!vigente) return;
      const ancla = anclaDeLaDireccion();
      volverA.current = ancla && vistaEnElAncla(ancla) ? ancla : null;
      setResenas(lista);
    };
    pedirResenasPublicas()
      // La verificación antirobots del hosting puede responder una página HTML en vez de JSON: sin
      // lista no hay reseñas, pero la landing no se cae.
      .then(lista => llegaron(Array.isArray(lista) ? lista : []))
      .catch(() => llegaron([]));
    return () => { vigente = false; };
  }, []);

  // Antes de pintar, para que no se vea el salto. Si el ancla queda arriba de la sección, no se movió
  // y esto no cambia nada.
  useLayoutEffect(() => {
    const ancla = volverA.current;
    if (resenas === null || !ancla) return;
    volverA.current = null;
    ancla.scrollIntoView({ block: 'start' });
  }, [resenas]);

  // R44: mientras carga, la sección guarda su espacio, para que quien llega a «Precios» desde el blog
  // no quede en medio de las reseñas cuando terminan de llegar (y si el alto cambia, ver arriba). Sin título: si al final no hay
  // ninguna, un título que aparece y se va se leería como un error. Los 700 px son lo que midió la
  // sección ya cargada el 8 de octubre de 2026, a 375 y a 1280 px (698 y 697) con reseñas de una a
  // cuatro líneas; con textos más largos crece un poco, y sin reseñas se recoge entera.
  if (resenas === null) return <div aria-hidden="true" className="min-h-[700px]" />;
  // R39: sin reseñas publicadas, o con el servidor caído, la sección no aparece.
  if (resenas.length === 0) return null;

  return (
    <section aria-labelledby="titulo-resenas" aria-roledescription="carrusel" className="max-w-6xl mx-auto py-16 md:py-24">
      <div className="px-5 text-center max-w-xl mx-auto mb-12">
        <h2 id="titulo-resenas" className="text-3xl md:text-4xl font-extrabold tracking-tight">{titulo}</h2>
        <p className="text-muted mt-3">{subtitulo}</p>
      </div>
      {/* Al cruzar el ancho del computador cambia todo el reparto (de a una o de a tres), así que se
          arranca de cero en vez de traducir una posición a la otra. */}
      <Fila key={computador ? 'computador' : 'celular'} resenas={resenas} computador={computador} />
    </section>
  );
}

// Cuánto mide una copia entera de la lista dentro de la fila: de la primera tarjeta de una copia a la
// primera de la siguiente. Por maquetación (offsetLeft), no con getBoundingClientRect (CLAUDE.md §12.9).
// Cero mientras el navegador no dibuja.
function anchoDeCopia(el: HTMLElement, total: number): number {
  const primera = el.children[0] as HTMLElement | undefined;
  const otraVuelta = el.children[total] as HTMLElement | undefined;
  return primera && otraVuelta ? otraVuelta.offsetLeft - primera.offsetLeft : 0;
}

// De una tarjeta a la siguiente, con el espacio entre ellas: lo que corre una flecha.
function pasoDeTarjeta(el: HTMLElement): number {
  const [primera, segunda] = Array.from(el.children) as HTMLElement[];
  return primera && segunda ? segunda.offsetLeft - primera.offsetLeft : 0;
}

type Viaje = { desde: number; hasta: number; inicio: number | null };

function Fila({ resenas, computador }: { resenas: TarjetaPublica[]; computador: boolean }) {
  const reducir = useConsulta(REDUCIR_MOVIMIENTO);
  const total = resenas.length;
  // R39: con las que caben a la vista no hay nada que mover. En el celular no se mueve nunca sola.
  const seMueve = computador && paginar(total, POR_PAGINA).rota;

  const fila = useRef<HTMLDivElement>(null);
  // La tarjeta que se ve en el celular, para el contador.
  const [indice, setIndice] = useState(0);
  const [encima, setEncima] = useState(false);
  const [conFoco, setConFoco] = useState(false);
  const [tocada, setTocada] = useState(false);
  const deriva = seMueve && !reducir && !encima && !conFoco && !tocada;

  // El estado del bucle vive fuera de React: cambia sesenta veces por segundo y no hay nada que volver
  // a dibujar, solo el desplazamiento de la fila.
  const posicion = useRef<number | null>(null);
  const ancho = useRef(0);
  const viaje = useRef<Viaje | null>(null);
  const derivando = useRef(deriva);
  const ultimoCuadro = useRef<number | null>(null);
  const pedido = useRef<number | null>(null);
  const bucle = useRef<(t: number) => void>(() => {});
  const finDelToque = useRef<number | undefined>(undefined);

  const pedirCuadro = useCallback(() => {
    if (pedido.current === null) pedido.current = requestAnimationFrame(t => bucle.current(t));
  }, []);

  // Ubica la fila la primera vez que hay medidas: en la copia del medio, al comienzo de la lista.
  const ubicar = useCallback((el: HTMLElement): boolean => {
    if (!(ancho.current > 0)) ancho.current = anchoDeCopia(el, total);
    if (!(ancho.current > 0)) return false;
    if (posicion.current === null) posicion.current = ancho.current;
    return true;
  }, [total]);

  useEffect(() => { derivando.current = deriva; }, [deriva]);

  useEffect(() => {
    if (!seMueve) return;
    bucle.current = (t: number) => {
      pedido.current = null;
      const el = fila.current;
      if (!el) return;
      // Sin medidas todavía (antes de que el navegador dibuje): se reintenta en el cuadro siguiente.
      if (!ubicar(el)) { pedirCuadro(); return; }
      const ms = ultimoCuadro.current === null ? 0 : t - ultimoCuadro.current;
      ultimoCuadro.current = t;

      let p = posicion.current!;
      const v = viaje.current;
      if (v) {
        if (v.inicio === null) v.inicio = t;
        const recorrido = (t - v.inicio) / FLECHA_MS;
        p = v.desde + (v.hasta - v.desde) * suavizar(recorrido);
        if (recorrido >= 1) viaje.current = null;
      } else if (derivando.current) {
        p = derivar(p, ms, VELOCIDAD_PX_S);
      }
      const dentro = envolver(p, ancho.current);
      // Si dio la vuelta en medio de una flecha, el viaje se corre la misma copia y sigue igual.
      if (viaje.current) {
        viaje.current.desde += dentro - p;
        viaje.current.hasta += dentro - p;
      }
      posicion.current = dentro;
      el.scrollLeft = dentro;

      if (viaje.current || derivando.current) pedirCuadro();
      else ultimoCuadro.current = null; // detenida: al volver no cuenta el tiempo que estuvo quieta
    };
    pedirCuadro();
    return () => {
      if (pedido.current !== null) cancelAnimationFrame(pedido.current);
      pedido.current = null;
      ultimoCuadro.current = null;
    };
  }, [seMueve, ubicar, pedirCuadro]);

  // Al volver a moverse (sale el mouse, se va el foco, pasa el toque), el bucle arranca otra vez.
  useEffect(() => { if (deriva) pedirCuadro(); }, [deriva, pedirCuadro]);

  // Si cambia el ancho de la ventana cambian las tarjetas: se vuelve a medir y la fila se queda en la
  // misma tarjeta, en proporción.
  useEffect(() => {
    if (!seMueve) return;
    const alCambiar = () => {
      const el = fila.current;
      if (!el) return;
      const antes = ancho.current;
      const ahora = anchoDeCopia(el, total);
      ancho.current = ahora;
      if (antes > 0 && ahora > 0 && posicion.current !== null) {
        posicion.current = envolver(posicion.current * (ahora / antes), ahora);
        el.scrollLeft = posicion.current;
      }
    };
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, [seMueve, total]);

  useEffect(() => () => window.clearTimeout(finDelToque.current), []);

  // Una flecha corre una tarjeta: hacia adelante, la siguiente entra por la derecha. Un clic en medio
  // de otro sigue sumando desde donde iba a llegar el anterior: dos clics son dos tarjetas.
  const correr = (sentido: 1 | -1) => {
    const el = fila.current;
    if (!el || !ubicar(el)) return;
    const paso = pasoDeTarjeta(el) * sentido;
    const actual = posicion.current!;
    if (reducir) {
      viaje.current = null;
      posicion.current = envolver(actual + paso, ancho.current);
      el.scrollLeft = posicion.current;
      return;
    }
    viaje.current = { desde: actual, hasta: (viaje.current?.hasta ?? actual) + paso, inicio: null };
    pedirCuadro();
  };

  // Celular: la tarjeta que se ve es la más cercana al borde izquierdo de la fila.
  const alDesplazar = () => {
    const el = fila.current;
    const paso = el ? pasoDeTarjeta(el) : 0;
    if (el && paso > 0) setIndice(Math.round(el.scrollLeft / paso));
  };

  // R39: las que caben se centran. En el celular solo cabe una; con dos o tres hay que deslizar, y una
  // fila centrada que se desborda deja el comienzo fuera de alcance.
  const centrar = total === 1 ? 'justify-center' : total <= POR_PAGINA ? 'md:justify-center' : '';
  // Las tres copias, solo cuando se mueve. La del medio es la que se anuncia; las otras dos están para
  // que la vuelta no tenga fin y un lector de pantalla no lee tres veces lo mismo.
  const copias = seMueve ? [0, 1, 2] : [1];
  // Mientras se mueve, las tarjetas entran y salen desvanecidas por los costados en vez de cortarse en
  // seco. Quietas (tres o menos, centradas) no lleva: les comería los bordes sin razón.
  const desvanecido = seMueve ? 'hp-desvanecido-lados' : '';

  return (
    <div
      onPointerEnter={e => { if (e.pointerType === 'mouse') setEncima(true); }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setEncima(false); }}
      // Con el dedo no hay «salir de encima»: el toque la detiene un momento para alcanzar a leer.
      onPointerDown={e => {
        if (e.pointerType === 'mouse') return;
        setTocada(true);
        window.clearTimeout(finDelToque.current);
        finDelToque.current = window.setTimeout(() => setTocada(false), PAUSA_TOQUE_MS);
      }}
      onFocus={() => setConFoco(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setConFoco(false); }}
    >
      {/* data-lenis-prevent-horizontal: al deslizar de lado, la fila se corre con el desplazamiento del
          navegador y el scroll suave de la página (useScrollSuave) no se la lleva hacia abajo. En el
          computador va sin imán (snap): el imán pelearía con el movimiento continuo. */}
      <div ref={fila} onScroll={computador ? undefined : alDesplazar} data-lenis-prevent-horizontal
        className={`hp-tabs-scroll flex gap-4 md:gap-5 overflow-x-auto md:overflow-x-hidden snap-x snap-mandatory md:snap-none scroll-px-5 px-5 pb-3 ${centrar} ${desvanecido}`}>
        {copias.flatMap(copia => resenas.map((r, i) => {
          const repetida = copia !== 1;
          // `relative` no es de adorno: la frase «N de 5 estrellas» de la tarjeta es `sr-only`, o sea
          // absoluta, y sin un ancestro posicionado dentro de la fila escapa de su recorte. Medido el
          // 8 de octubre de 2026 a 375 px: la página entera quedaba de 4255 px de ancho, con
          // desplazamiento de lado. jsdom no calcula posiciones, así que esto lo ve solo el navegador.
          return (
            <div key={`${copia}-${r.id}`} role="group" aria-roledescription="reseña" aria-label={`${i + 1} de ${total}`}
              inert={repetida} aria-hidden={repetida || undefined}
              className="relative snap-start shrink-0 w-[85%] md:w-[calc((100%-2.5rem)/3)]">
              <TarjetaResena {...r} />
            </div>
          );
        }))}
      </div>

      {seMueve && (
        <div className="mt-6 px-5 flex items-center justify-center gap-3">
          <button type="button" onClick={() => correr(-1)} aria-label="Reseñas anteriores"
            className="w-11 h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-ink flex items-center justify-center">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => correr(1)} aria-label="Reseñas siguientes"
            className="w-11 h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-ink flex items-center justify-center">
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* R37: en el celular, en cuál va. Con una sola no hay nada que contar. */}
      {!computador && total > 1 && (
        <p className="mt-3 text-center text-sm font-semibold text-muted tabular-nums">{etiquetaDePosicion(indice, total)}</p>
      )}
    </div>
  );
}
