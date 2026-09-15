import { fechaCorta } from '../../lib/fechas';

// Lo que la landing muestra del blog (14 de septiembre de 2026).

// Los más nuevos primero. Las fechas van como 'AAAA-MM-DD', así que ordenarlas como texto
// es ordenarlas por día, sin pasar por Date y sin zonas horarias de por medio.
export function losMasRecientes<T extends { fecha: string }>(articulos: readonly T[], cuantos: number): T[] {
  return [...articulos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, cuantos);
}

// '2026-09-02' leído tal cual es medianoche UTC, que en Bogotá todavía es el 1 de
// septiembre: se ancla al mediodía de Bogotá antes de formatear.
export const fechaDeArticulo = (fecha: string) => fechaCorta(`${fecha}T12:00:00-05:00`);
