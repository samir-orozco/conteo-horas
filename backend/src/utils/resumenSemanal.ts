import { rangoDiaBogota } from './fechas';

// EL RESUMEN SEMANAL POR CORREO (11 de octubre de 2026).
//
// Sale el lunes a las 7 a. m. de Bogotá, solo a los administradores, con la semana anterior
// completa. Aquí vive la decisión; la plomería (consultas, envío, marca de «ya se mandó») está en
// envioResumenSemanal.ts.

const DIA_MS = 24 * 60 * 60 * 1000;
export const HORA_DEL_RESUMEN = 7;

export type Semana = { desde: string; hasta: string };

// "YYYY-MM-DD" de una medianoche de Bogotá (05:00 UTC): su fecha UTC es la de Bogotá.
const clave = (medianoche: Date) => medianoche.toISOString().slice(0, 10);

// Qué semana le toca al resumen en este instante, o null si no toca.
//
// Toca el lunes desde las 7 hasta la medianoche, y nada más. Desde las 7 y no A las 7 porque el
// trabajo corre también al arrancar la app, y en un hosting que la duerme puede ser la primera
// visita del lunes la que lo dispara. Solo el lunes porque un resumen de la semana que llega el
// miércoles ya no sirve para lo que existe: decidir qué hacer al empezar la semana.
//
// Que no salga dos veces el mismo lunes no se decide aquí: lo pregunta quien envía.
export function semanaDelResumen(ahora: Date): (Semana & { anterior: Semana }) | null {
  const { inicioDia } = rangoDiaBogota(ahora);
  if (inicioDia.getUTCDay() !== 1) return null;
  if (ahora.getTime() - inicioDia.getTime() < HORA_DEL_RESUMEN * 60 * 60 * 1000) return null;
  const dia = (n: number) => clave(new Date(inicioDia.getTime() - n * DIA_MS));
  return {
    desde: dia(7), hasta: dia(1),
    anterior: { desde: dia(14), hasta: dia(8) },
  };
}
