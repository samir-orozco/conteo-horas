import { useState } from 'react';
import { mensajeGeo, OPC_GEO, type MensajeGeo } from './geo';
import type { PermisoUbicacion } from './decisionUbicacion';

type Coords = { lat: number; lng: number };

// Ubicación del kiosco (geocerco). El permiso se pide con un botón dedicado porque
// Safari iOS exige que getCurrentPosition salga de un toque limpio y directo.
export function useGeolocalizacion() {
  const [ubicOk, setUbicOk] = useState<Coords | null>(null);
  const [buscandoUbic, setBuscandoUbic] = useState(false);
  const [errorUbic, setErrorUbic] = useState<MensajeGeo | null>(null);
  // Sin muro previo, `ubicOk === null` ya no alcanza: significa a la vez
  // "todavía no le he preguntado" y "le pregunté y dijo que no", y de eso
  // depende si se le avisa al presencial que su marca va a ser rechazada.
  const [permiso, setPermiso] = useState<PermisoUbicacion>('sin-preguntar');

  // Pide la ubicación DIRECTO desde el toque (sin nada async antes).
  const activarUbicacion = () => {
    setErrorUbic(null);
    if (!navigator.geolocation) { setPermiso('negado'); setErrorUbic(mensajeGeo({ code: 0 })); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUbicOk({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setPermiso('concedido'); setBuscandoUbic(false); },
      err => { setBuscandoUbic(false); setPermiso('negado'); setErrorUbic(mensajeGeo(err)); },
      OPC_GEO,
    );
    setBuscandoUbic(true);
  };

  // Refresca la ubicación al marcar (el permiso ya está concedido → casi nunca falla).
  const obtenerUbicacion = (): Promise<Coords> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ code: 0 });
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        OPC_GEO,
      );
    });

  // La costura entre dos personas distintas en la misma tablet: sin esto, la
  // lectura de quien marcó hace horas seguiría viva para el siguiente.
  const limpiar = () => { setUbicOk(null); setErrorUbic(null); setPermiso('sin-preguntar'); };

  return { ubicOk, buscandoUbic, errorUbic, setErrorUbic, permiso, limpiar, activarUbicacion, obtenerUbicacion };
}
