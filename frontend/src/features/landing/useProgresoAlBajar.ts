import { useEffect, useRef } from 'react';

// Cuánto ha avanzado el encabezado de la landing de amarillo a blanco: 0 arriba del todo y 1 al
// recorrer la distancia (decisión del dueño del 15 de septiembre de 2026). Reemplaza al cambio que se
// disparaba al cruzar unos píxeles con una animación de duración fija, que se sentía despegado del scroll.
export function progresoAlBajar(scrollY: number, distancia: number) {
  return Math.min(1, Math.max(0, scrollY / distancia));
}

// Escribe el avance en la variable CSS --progreso del elemento y no en el estado de React: cada cuadro
// del scroll es una sola escritura de estilo y no un render de la landing entera. Escucha la ventana,
// que es donde escribe también el scroll suave (Lenis), y el navegador ya da un evento de scroll por cuadro.
export function useProgresoAlBajar<T extends HTMLElement>(distancia = 200) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const actualizar = () => el.style.setProperty('--progreso', String(progresoAlBajar(window.scrollY, distancia)));
    actualizar();
    window.addEventListener('scroll', actualizar, { passive: true });
    return () => window.removeEventListener('scroll', actualizar);
  }, [distancia]);
  return ref;
}
