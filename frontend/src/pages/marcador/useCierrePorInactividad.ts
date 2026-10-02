import { useEffect, useRef } from 'react';

// Cuánto se espera sin que nadie toque la pantalla antes de volver a la cámara.
// Alcanza para leer el aviso reforzado y escribir un motivo con calma: cada tecla
// y cada toque vuelven a empezar la cuenta.
export const MS_INACTIVIDAD_KIOSCO = 30_000;

// LA SESIÓN DE UNA PERSONA NO PUEDE QUEDAR ABIERTA PARA LA SIGUIENTE (2 de octubre de 2026).
//
// Cancelar «Ya registraste tu jornada», volver de la pantalla del motivo, un error
// al marcar o irse sin escribir la cédula dejaban la pantalla de alguien abierta
// sin límite en una tableta compartida. La siguiente persona marcaba en ella, o
// se llevaba la foto del respaldo con cédula de la anterior.
//
// OJO al verificarlo en el navegador (CLAUDE.md 12.8): las escuchas viven en un
// efecto, y la recarga en caliente de Vite no lo vuelve a ejecutar. Recargar la
// página antes de creerse un fallo.
export function useCierrePorInactividad(activo: boolean, ms: number, alVencer: () => void) {
  const alVencerRef = useRef(alVencer);
  useEffect(() => { alVencerRef.current = alVencer; }, [alVencer]);

  useEffect(() => {
    if (!activo) return;
    let t = setTimeout(() => alVencerRef.current(), ms);
    const reiniciar = () => {
      clearTimeout(t);
      t = setTimeout(() => alVencerRef.current(), ms);
    };
    // En captura: un toque sobre un botón que detenga la propagación igual cuenta.
    const eventos = ['pointerdown', 'keydown', 'input'] as const;
    eventos.forEach(ev => window.addEventListener(ev, reiniciar, true));
    return () => {
      clearTimeout(t);
      eventos.forEach(ev => window.removeEventListener(ev, reiniciar, true));
    };
  }, [activo, ms]);
}
