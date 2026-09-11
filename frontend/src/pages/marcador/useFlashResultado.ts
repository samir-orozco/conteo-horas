import { useRef, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { TZ, type Flash, type Pausa } from './tipos';

// Pantalla de resultado (entrada/salida/error) con animación de entrada y salida.
// `onCerrarOk` se ejecuta tras cerrar una confirmación OK (libera la cámara y deja
// el kiosco listo para el siguiente colaborador). Vive en un ref para no quedar viejo.
export function useFlashResultado(onCerrarOk: () => void) {
  const [flash, setFlash] = useState<Flash>(null);
  const [cerrandoFlash, setCerrandoFlash] = useState(false);
  const cerrarOkRef = useRef(onCerrarOk);
  cerrarOkRef.current = onCerrarOk;

  const cerrarFlash = (despues?: () => void) => {
    setCerrandoFlash(true);
    setTimeout(() => {
      setFlash(null);
      setCerrandoFlash(false);
      despues?.();
    }, 320);
  };

  // `pausa`: la salida fue a almorzar o al descanso, y la pantalla lo dice.
  const mostrarFlashOk = (accion: 'ENTRADA' | 'SALIDA', hora: string, nombre: string, pausa?: Pausa) => {
    setFlash({ tipo: 'ok', accion, hora: formatInTimeZone(new Date(hora), TZ, 'HH:mm:ss'), nombre, pausa });
    // Confirmación breve y reset suave (sin recargar la página).
    setTimeout(() => cerrarFlash(() => cerrarOkRef.current()), 1500);
  };

  const mostrarFlashError = (msg: string) => {
    setFlash({ tipo: 'error', msg });
    setTimeout(() => cerrarFlash(), 2800);
  };

  return { flash, cerrandoFlash, mostrarFlashOk, mostrarFlashError, cerrarFlash };
}
