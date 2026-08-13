import { useState } from 'react';
import { mensajeGeo, OPC_GEO, type MensajeGeo } from './geo';

type Coords = { lat: number; lng: number };

// Ubicación del kiosco (geocerco). El permiso se pide con un botón dedicado porque
// Safari iOS exige que getCurrentPosition salga de un toque limpio y directo.
export function useGeolocalizacion() {
  const [ubicOk, setUbicOk] = useState<Coords | null>(null);
  const [buscandoUbic, setBuscandoUbic] = useState(false);
  const [errorUbic, setErrorUbic] = useState<MensajeGeo | null>(null);

  // Pide la ubicación DIRECTO desde el toque (sin nada async antes).
  const activarUbicacion = () => {
    setErrorUbic(null);
    if (!navigator.geolocation) { setErrorUbic(mensajeGeo({ code: 0 })); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUbicOk({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setBuscandoUbic(false); },
      err => { setBuscandoUbic(false); setErrorUbic(mensajeGeo(err)); },
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

  return { ubicOk, buscandoUbic, errorUbic, setErrorUbic, activarUbicacion, obtenerUbicacion };
}
