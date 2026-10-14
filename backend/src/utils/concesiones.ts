import { FEATURES, type FeatureKey } from './planes';
import { medianocheBogota } from './fechas';

// FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2).
//
// Una concesión le da a una empresa una función por un tiempo, por encima de su plan: el super admin
// («pruébalo 2 meses») o la prueba gratis del clima (fase 3). Solo ENCIENDE: nunca apaga lo que el plan ya
// trae. Y se calcula al leer: una concesión vencida deja de contar sola, sin un barrido diario que tenga que
// acordarse de apagarla (CLAUDE.md §8.3, los trabajos periódicos que fallan en silencio).
//
// Las fechas: `desde` es el instante en que se dio y `hasta` es EXCLUSIVO, la medianoche de Bogotá siguiente
// al último día. «Hasta el 14 de diciembre» incluye ese día entero.

export const ORIGENES_DE_CONCESION = ['PRUEBA', 'SUPER_ADMIN'] as const;
export type OrigenDeConcesion = (typeof ORIGENES_DE_CONCESION)[number];

export type ConcesionParaCalcular = { funcion: string; desde: Date; hasta: Date; revocadaEn: Date | null };

export function concesionVigente(c: ConcesionParaCalcular, ahora: Date): boolean {
  return c.revocadaEn === null && c.desde <= ahora && ahora < c.hasta;
}

const CLAVES = new Set<string>(FEATURES.map(f => f.key));

/** Las funciones que encienden las concesiones vigentes. Una clave que no está en el catálogo no enciende nada. */
export function funcionesConcedidas(concesiones: ConcesionParaCalcular[], ahora: Date): Partial<Record<FeatureKey, boolean>> {
  const encendidas: Partial<Record<FeatureKey, boolean>> = {};
  for (const c of concesiones) {
    if (CLAVES.has(c.funcion) && concesionVigente(c, ahora)) encendidas[c.funcion as FeatureKey] = true;
  }
  return encendidas;
}

/** El fin exclusivo de «hasta el día X»: la medianoche de Bogotá del día siguiente. */
export function finDelDiaBogota(dia: string): Date {
  return new Date(medianocheBogota(dia).getTime() + 24 * 60 * 60 * 1000);
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
// Más de dos años ya no es una prueba ni un favor: es cambiarle el plan, y eso se hace en el plan.
const ANIOS_MAXIMOS = 2;

type Resultado<T> = ({ ok: true } & T) | { ok: false; error: string };

function leerFin(hasta: unknown, hoy: string): Resultado<{ hasta: Date }> {
  const texto = typeof hasta === 'string' ? hasta : '';
  const m = FECHA.exec(texto);
  if (!m) return { ok: false, error: 'La fecha de fin no es válida.' };
  // Que el día exista: «2026-02-30» pasa la expresión pero no es una fecha.
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const real = new Date(Date.UTC(a, mes - 1, d));
  if (real.getUTCFullYear() !== a || real.getUTCMonth() !== mes - 1 || real.getUTCDate() !== d) {
    return { ok: false, error: 'La fecha de fin no es válida.' };
  }
  if (texto < hoy) return { ok: false, error: 'La fecha de fin ya pasó.' };
  const tope = `${Number(hoy.slice(0, 4)) + ANIOS_MAXIMOS}${hoy.slice(4)}`;
  if (texto > tope) return { ok: false, error: `La fecha de fin puede ser hasta dentro de ${ANIOS_MAXIMOS} años.` };
  return { ok: true, hasta: finDelDiaBogota(texto) };
}

/** Lo que llega al dar una función: cuál y su último día («YYYY-MM-DD»), contra el día de hoy en Bogotá. */
export function leerConcesion(cuerpo: unknown, hoy: string): Resultado<{ funcion: FeatureKey; hasta: Date }> {
  const { funcion, hasta } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as { funcion?: unknown; hasta?: unknown };
  const f = FEATURES.find(x => x.key === funcion);
  if (!f) return { ok: false, error: 'Esa función no existe.' };
  if (f.proximamente) return { ok: false, error: 'Esa función todavía no está disponible.' };
  const fin = leerFin(hasta, hoy);
  return fin.ok ? { ok: true, funcion: f.key, hasta: fin.hasta } : fin;
}

/** Lo que llega al cambiar la fecha de una concesión que ya existe. */
export function leerNuevoFin(cuerpo: unknown, hoy: string): Resultado<{ hasta: Date }> {
  const { hasta } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as { hasta?: unknown };
  return leerFin(hasta, hoy);
}
