import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// El scroll suave de la landing (decisión del dueño del 15 de septiembre de 2026): con la rueda del
// mouse o el trackpad la página se desliza con inercia. En el celular el dedo sigue siendo el del
// navegador, porque Lenis no toca el desplazamiento táctil si no se le pide.
//
// Vive solo mientras la landing está montada, así que el panel sigue con el scroll del navegador. Y
// no se enciende para quien pidió «reducir movimiento» en su equipo.
//
// Los enlaces a secciones (#funciones, #como, #precios) se atienden aquí y no con la opción `anchors`
// de Lenis, que no frena el salto del navegador: medido el 15 de septiembre, la página saltaba a la
// sección, volvía a mitad de camino y saltaba otra vez. Dónde se detiene, debajo del encabezado fijo,
// lo dice el `scroll-mt-16` de cada sección, que Lenis respeta igual que el navegador.
export function useScrollSuave() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: true });

    const alTocarEnlace = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = (e.target as Element | null)?.closest?.('a[href^="#"]')?.getAttribute('href');
      const destino = href && href.length > 1 ? document.getElementById(decodeURIComponent(href.slice(1))) : null;
      if (!destino) return;
      e.preventDefault();
      lenis.scrollTo(destino);
      // La sección queda en la dirección sin sumar una entrada al historial ni tocar el estado del enrutador.
      history.replaceState(history.state, '', href);
    };
    document.addEventListener('click', alTocarEnlace);
    return () => {
      document.removeEventListener('click', alTocarEnlace);
      lenis.destroy();
    };
  }, []);
}
