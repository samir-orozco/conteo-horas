import { useEffect, useRef, useState } from 'react';
import { pedirFotos, fotoDelMomento } from '../lib/fotosRevision';

// LA CARA EN EL RIEL DE LA LÍNEA DEL DÍA.
//
// Reemplaza el punto del riel y conserva lo que ese punto decía: la ENTRADA es
// el aro oscuro y lleno, la SALIDA el aro gris claro. Se lee igual que antes,
// pero ahora con la cara adentro.
//
// POR QUÉ SE PIDE AL APARECER Y NO AL MONTAR. Una semana de revisión puede traer
// hasta 600 filas. Pedirlas todas al abrir la pantalla son 600 peticiones y
// megas de fotos que nadie va a mirar, porque la lista enseña unas ocho a la
// vez. Cada miniatura espera a estar cerca de la vista.
//
// POR QUÉ `alt=""`. La miniatura es decorativa: el nombre ya está escrito al
// lado, en la misma fila. Con un texto alternativo, un lector de pantalla diría
// el nombre dos veces por fila, y además la foto grande del visor dejaría de ser
// la única imagen con nombre en la pantalla.

type Props = {
  registroId: string;
  momento: 'entrada' | 'salida';
  activa: boolean;
};

const ARO = {
  entrada: 'ring-ink',          // lleno y oscuro, como el punto relleno de antes
  salida: 'ring-gray-300',      // claro, como el punto hueco de antes
} as const;

export default function MiniaturaMarcacion({ registroId, momento, activa }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cerca, setCerca] = useState(false);
  // undefined = todavía no se sabe; null = no hay foto o no se pudo traer.
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) { setCerca(true); io.disconnect(); }
    }, { rootMargin: '160px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!cerca) return;
    let vivo = true;
    pedirFotos(registroId)
      .then(f => { if (vivo) setUrl(fotoDelMomento(f, momento)); })
      .catch(() => { if (vivo) setUrl(null); });
    return () => { vivo = false; };
  }, [cerca, registroId, momento]);

  // El aro exterior claro separa la cara del riel vertical que la atraviesa; en
  // la fila activa toma el color de su fondo para no dibujar un halo blanco.
  const separador = activa ? 'ring-offset-[#FFF9E7]' : 'ring-offset-white';

  return (
    <span ref={ref} data-miniatura={`${registroId}:${momento}`}
      className={`relative block h-9 w-9 shrink-0 rounded-full ring-2 ring-offset-2 ${ARO[momento]} ${separador} overflow-hidden bg-gray-100`}>
      {url ? (
        <img src={url} alt="" aria-hidden="true" draggable={false}
          className="h-full w-full object-cover [transform:scaleX(-1)]" />
      ) : url === undefined ? (
        <span className="absolute inset-0 animate-pulse bg-gray-200" />
      ) : null}
    </span>
  );
}
