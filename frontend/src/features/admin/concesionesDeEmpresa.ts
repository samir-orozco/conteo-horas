import { hoyEnBogota } from '../../lib/periodoDePago';

// LAS FUNCIONES CON FECHA EN LA FICHA DE LA EMPRESA DEL SUPER ADMIN (14 de octubre de 2026, PENDIENTES nº 39,
// fase 2). Qué dice cada fila de la tabla. El servidor decide qué vale (backend/src/utils/concesiones.ts) y
// manda todas las concesiones, también las vencidas y las quitadas; esto solo las pinta.
//
// `hasta` es EXCLUSIVO: la medianoche de Bogotá siguiente al último día. «Hasta el 14 de diciembre» incluye
// ese día entero, y por eso lo que se le muestra a una persona es `ultimoDiaDe(hasta)`.

export type Concesion = {
  id: string; funcion: string; desde: string; hasta: string; origen: string;
  otorgadaPorNombre: string | null; revocadaEn: string | null; creadoEn: string;
};

const vigente = (c: Concesion, ahora: Date) =>
  c.revocadaEn === null && new Date(c.desde) <= ahora && ahora < new Date(c.hasta);

export type EstadoDeFuncion =
  | { tipo: 'PLAN' }
  | { tipo: 'EXTRA' }
  | { tipo: 'CONCEDIDA'; concesion: Concesion }
  | { tipo: 'NO' };

/** Lo que dice la fila de una función: lo que trae el plan manda, después lo dado a la medida, después la fecha. */
export function estadoDeFuncion(
  funcion: string, base: { delPlan: boolean; extra: boolean }, concesiones: Concesion[], ahora: Date,
): EstadoDeFuncion {
  if (base.delPlan) return { tipo: 'PLAN' };
  if (base.extra) return { tipo: 'EXTRA' };
  const c = concesiones.find(x => x.funcion === funcion && vigente(x, ahora));
  return c ? { tipo: 'CONCEDIDA', concesion: c } : { tipo: 'NO' };
}

export type EstadoEnElHistorial = 'VIGENTE' | 'VENCIDA' | 'QUITADA';

export function estadoEnElHistorial(c: Concesion, ahora: Date): EstadoEnElHistorial {
  if (c.revocadaEn !== null) return 'QUITADA';
  return ahora < new Date(c.hasta) ? 'VIGENTE' : 'VENCIDA';
}

/** El último día que cubre una concesión, como «YYYY-MM-DD» de Bogotá: el anterior a su fin exclusivo. */
export function ultimoDiaDe(hasta: string): string {
  return hoyEnBogota(new Date(new Date(hasta).getTime() - 1));
}

/** Un «YYYY-MM-DD» más n días, con aritmética de UTC sobre las partes: la zona de la máquina no cuenta. */
export function diaMasDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
