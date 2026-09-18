import { useEffect, useState } from 'react';
import api from './api';

// Las reglas legales vigentes que manda el servidor (GET /configuracion/legales): la jornada máxima
// semanal, los recargos y el auxilio de transporte.
//
// Se cachean por sesión con el mismo patrón que `plan.tsx`: una promesa a nivel de módulo, para que
// dos pantallas abiertas a la vez no pidan lo mismo dos veces. No cambian durante una sesión: son
// decretos, no datos de la empresa.

export type AuxilioVigente = { valor: number; tope: number; vigenteDesde: string };

export type Legales = {
  fechaReferencia: string;
  jornadaSemanal: number;
  horasMes: number;
  // null mientras no haya ninguna vigencia sembrada. Con null, la ficha no propone ningún auxilio:
  // inventar una cifra de plata es peor que no proponer nada.
  auxilio: AuxilioVigente | null;
};

let cache: Promise<Legales> | null = null;

export function cargarLegales(force = false): Promise<Legales> {
  if (!cache || force) cache = api.get('/configuracion/legales').then(r => r.data);
  return cache;
}

export function invalidarLegales() { cache = null; }

// Hook: las reglas legales vigentes. `null` mientras cargan, y si la petición falla se queda en
// null a propósito: sin dato, quien lo use no propone nada en vez de proponer un número inventado.
export function useLegales(): Legales | null {
  const [legales, setLegales] = useState<Legales | null>(null);
  useEffect(() => { cargarLegales().then(setLegales).catch(() => {}); }, []);
  return legales;
}
