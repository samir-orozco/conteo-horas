import { ultimoDiaCubierto } from '../../lib/fechas';
import { NOMBRE_DE_CARITA } from '../clima/ventanaClima';
import type { PruebaDelClima } from './types';

// EL CLIMA EN EL INICIO (15 de octubre de 2026): lo que decide la tarjeta, aparte de cómo se pinta. Las cifras
// vienen hechas del servidor (backend: utils/climaDelInicio.ts); aquí solo se ponen en palabras.

export type Invitacion = { boton: string; destino: string; nota: string | null };

// Sin la función: a la prueba gratis si todavía se puede pedir, o a subir de plan. La prueba se EMPIEZA en la página
// del clima, donde se explica qué es y que es una sola vez: desde el Inicio solo se lleva hasta allá. Si se puede
// pedir o no lo decide el servidor (utils/pruebaClima.ts del backend).
export function invitacionDelClima(p: PruebaDelClima): Invitacion {
  if (p.disponible) return { boton: `Pruébalo gratis ${p.dias} días`, destino: '/app/clima', nota: null };
  return {
    boton: 'Subir de plan', destino: '/app/configuracion?tab=suscripcion',
    nota: p.terminada ? `Tu prueba gratis terminó el ${ultimoDiaCubierto(p.terminada.hasta)}.` : null,
  };
}

const CARITAS = [1, 2, 3, 4, 5] as const;

// Cómo se sintieron, de Muy mal a Muy bien: el ancho de cada tramo de la barra, en porcentaje del total.
export function repartoDeCaritas(d: Record<1 | 2 | 3 | 4 | 5, number>) {
  const total = CARITAS.reduce((s, n) => s + d[n], 0);
  return CARITAS.map(n => ({ carita: n, nombre: NOMBRE_DE_CARITA[n], cantidad: d[n], ancho: total > 0 ? (d[n] / total) * 100 : 0 }));
}
