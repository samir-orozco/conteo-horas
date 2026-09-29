import { useEffect, useRef, useCallback } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { rotuloDelContador } from './contadorDelAviso';

// EL AVISO FLOTANTE DE LA ESQUINA (rehecho el 28 de septiembre de 2026, con el diseño de la maqueta).
//
// El que había era una barra oscura de una línea que se iba a los 2,5 segundos. Servía para decir
// «Guardado» y nada más. La programación en bloque necesita otra cosa, y no por estética: su aviso
// lleva dentro el DESHACER, que es la única marcha atrás de una escritura de cientos de filas.
//
// UN SOLO COMPONENTE PARA TODA LA APP, no uno nuevo al lado. Cuatro pantallas ya usaban la forma
// simple, y dos diseños de aviso conviviendo son dos verdades sobre cómo avisa este producto
// (CLAUDE.md §9.3). La forma simple sigue funcionando: el mensaje pasa a ser el título.

export type TipoDeAviso = 'ok' | 'aviso';

export type Aviso = {
  id: number;
  tipo: TipoDeAviso;
  titulo: string;
  texto?: string;
  accion?: { texto: string; al: () => void };
  // ───── UN AVISO QUE SE REPITE NO SE APILA: SUBE UN NÚMERO (29 de septiembre de 2026) ─────
  //
  // `clave` es cómo quien avisa dice «este es el mismo de antes». Sin ella, hacer clic ocho veces en
  // una celda de un día pasado deja ocho avisos idénticos tapando la esquina, y el octavo no dice
  // nada que no dijera el primero.
  //
  // Es OPCIONAL porque la mayoría de los avisos no se repiten: «Programación deshecha» pasa una vez.
  // Un aviso sin clave se apila como siempre.
  clave?: string;
  // Cuántas veces ha pasado. Lo lleva la lista y no el componente: el componente se vuelve a dibujar
  // con el número nuevo, y guardándolo dentro se perdería la cuenta en cuanto React lo remonte.
  veces?: number;
};

// Cuánto dura en pantalla. Diez segundos el aviso completo, porque puede llevar el deshacer dentro;
// dos y medio el simple, que no tiene nada que hacer y solo taparía la esquina.
const MS_AVISO = 10_000;
const MS_SIMPLE = 2_500;
// Al retirar el puntero no se reanudan los diez segundos: ya se leyó.
const MS_TRAS_SOLTAR = 2_500;

// El degradado de color de la izquierda y el tinte del icono, que es lo que distingue un «ya está»
// de un «ojo con esto» antes de leer una palabra.
const TINTE: Record<TipoDeAviso, { franja: string; icono: string }> = {
  ok: { franja: 'from-emerald-200', icono: 'text-emerald-600' },
  aviso: { franja: 'from-amber-200', icono: 'text-amber-600' },
};

export function AvisoFlotante({ tipo, titulo, texto, accion, veces = 1, onCerrar, ms = MS_AVISO }: {
  tipo: TipoDeAviso;
  titulo: string;
  texto?: string;
  accion?: { texto: string; al: () => void };
  veces?: number;
  onCerrar: () => void;
  ms?: number;
}) {
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `onCerrar` en una `ref` y no en las dependencias del efecto: quien llama suele pasar una función
  // nueva en cada pintada, y con ella en las dependencias el temporizador se reiniciaría cada vez.
  // El aviso no se iría nunca, que es justo lo contrario de lo que hace un aviso.
  //
  // La asignación va en un EFECTO y no en el cuerpo: escribir en una `ref` durante el render es
  // impuro y el linter lo marca («Cannot access refs during render»). El temporizador la lee dentro
  // del `setTimeout`, o sea después de que los efectos hayan corrido, así que siempre ve la última.
  const cerrar = useRef(onCerrar);
  useEffect(() => { cerrar.current = onCerrar; });

  const contar = useCallback((cuanto: number) => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => cerrar.current(), cuanto);
  }, []);

  const parar = useCallback(() => {
    if (reloj.current) clearTimeout(reloj.current);
  }, []);

  // `veces` ENTRE LAS DEPENDENCIAS, y no es un descuido: cada repetición REARMA la cuenta atrás. Sin
  // esto, alguien que hace clic ocho veces en el segundo nueve ve desaparecer el aviso mientras el
  // contador sube, o sea la única explicación de por qué su clic no hace nada.
  useEffect(() => {
    contar(ms);
    return parar;
  }, [contar, parar, ms, veces]);

  const t = TINTE[tipo];

  return (
    // EL RELOJ SE PARA CON EL PUNTERO ENCIMA. Es la única regla de comportamiento de este componente
    // y su razón de ser: una marcha atrás que se evapora mientras la lees no es una marcha atrás.
    <div role="status"
      onPointerEnter={parar}
      onPointerLeave={() => contar(MS_TRAS_SOLTAR)}
      className="hp-pop relative flex w-[370px] max-w-[calc(100vw-2.25rem)] items-start gap-3 overflow-hidden rounded-2xl bg-white py-3 pl-3 pr-10 shadow-[0_12px_34px_rgba(0,0,0,.16)]">
      {/* La franja de color, en degradado hacia la transparencia sobre los primeros 150 px. Va detrás
          de todo y sin captar el puntero, para no comerse el clic del botón de acción. */}
      <span aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-[150px] bg-gradient-to-r to-transparent opacity-55 ${t.franja}`} />

      <span aria-hidden="true"
        className={`relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,.06)] ${t.icono}`}>
        {tipo === 'ok' ? <Check size={19} strokeWidth={2.5} /> : <AlertTriangle size={19} />}
        {/* EL CONTADOR, COLGADO DEL ICONO. Cuántas veces ha pasado esto mismo desde que salió el
            aviso. No sale la primera vez: ese caso lo decide `rotuloDelContador`, que devuelve `null`.

            LA `key` ES EL NÚMERO, y de eso depende el temblor: una animación CSS no se vuelve a
            lanzar si la clase ya estaba puesta. Cambiando la `key`, React monta un elemento NUEVO y
            la animación arranca otra vez. Es lo mismo que pasa con `hmr` y los efectos: el CSS no
            reacciona a que el contenido cambie, solo a que el elemento nazca.

            `aria-hidden` NO, aquí: el número es información. El icono de al lado sí lo lleva. */}
        {rotuloDelContador(veces) && (
          <span key={veces}
            className="hp-tembleque absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-ink px-1 text-[10px] font-extrabold leading-none text-white tabular-nums">
            {rotuloDelContador(veces)}
          </span>
        )}
      </span>

      <div className="relative min-w-0">
        <span className="block text-[13px] font-extrabold text-ink">{titulo}</span>
        {texto && <span className="mt-0.5 block text-[12px] leading-[1.45] text-muted">{texto}</span>}
        {accion && (
          <button type="button"
            onClick={() => { accion.al(); onCerrar(); }}
            className="relative mt-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-extrabold text-ink transition-colors hover:border-gray-400">
            {accion.texto}
          </button>
        )}
      </div>

      <button type="button" aria-label="Cerrar aviso" onClick={onCerrar}
        className="absolute right-2.5 top-2.5 p-0.5 leading-none text-gray-400 transition-colors hover:text-ink">
        <X size={14} />
      </button>
    </div>
  );
}

// LA PILA. Abajo a la derecha y en `column-reverse`, para que el más nuevo quede pegado al borde y
// los anteriores suban: así el que acaba de aparecer está siempre en el mismo sitio.
export function PilaDeAvisos({ avisos, onCerrar }: { avisos: Aviso[]; onCerrar: (id: number) => void }) {
  if (avisos.length === 0) return null;
  return (
    <div className="fixed bottom-[18px] right-[18px] z-[90] flex flex-col-reverse items-end gap-2.5">
      {avisos.map(a => (
        // SE CIERRA POR SU `id` Y NO POR SU POSICIÓN: la lista cambia mientras hay avisos en pantalla,
        // y cerrar «el segundo» cerraría a otro en cuanto entre uno nuevo.
        <AvisoFlotante key={a.id} tipo={a.tipo} titulo={a.titulo} texto={a.texto} accion={a.accion}
          veces={a.veces} onCerrar={() => onCerrar(a.id)} />
      ))}
    </div>
  );
}

// LA FORMA SIMPLE, la que ya usaban Colaboradores, ColaboradorDetalle y las dos de admin: un texto y
// listo. Se queda con la misma firma para no tocar cuatro pantallas, y estrena el diseño nuevo.
export default function Toast({ mensaje, onClose }: { mensaje: string | null; onClose: () => void }) {
  if (!mensaje) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      <AvisoFlotante tipo="ok" titulo={mensaje} onCerrar={onClose} ms={MS_SIMPLE} />
    </div>
  );
}
