import { escapar } from './correo';
import { horaLegible } from './noHaLlegado';

// QUÉ LE MANDA EL KIOSCO AL GRUPO DE TELEGRAM AL MARCAR (12 de octubre de 2026).
//
// Dos avisos, cada uno con su interruptor: la llegada tarde (TELEGRAM_ALERTAS_TARDE, el de siempre)
// y la novedad por aprobar (TELEGRAM_NOVEDADES). Decisiones del dueño:
// - La novedad NO dice el tipo ni el motivo: varios son datos de salud (incapacidad, cita médica,
//   licencia) y el chat suele ser un grupo donde no todos son administradores. Se ven en la app.
// - Quien llega tarde y deja el motivo genera UN solo mensaje con las dos cosas.
//
// El mensaje de llegada tarde vivía armado dentro de routes/worker.ts; salió aquí para poder probar
// el caso combinado, y de paso escapa el nombre, que antes iba crudo en un mensaje HTML.

export const CLAVE_NOVEDADES = 'TELEGRAM_NOVEDADES';

export type QueAvisar = {
  nombre: string;
  hora: string; // "HH:MM" de Bogotá, la de la marca
  minutosTarde: number | null; // null = llegó a tiempo, o no es una entrada
  dejoNovedad: boolean; // la novedad quedó guardada
  alertasTarde: boolean; // interruptor de llegadas tarde
  novedades: boolean; // interruptor de novedades por aprobar
  enlace: string; // a la ficha de la persona, en su pestaña de novedades
};

const cuantoTarde = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);

export function mensajesDelKiosco(a: QueAvisar): string[] {
  const nombre = `<b>${escapar(a.nombre)}</b>`;
  const revisar = `<a href="${escapar(a.enlace)}">Revisar en HoraPro</a>`;
  const avisaNovedad = a.dejoNovedad && a.novedades;

  if (a.minutosTarde !== null && a.alertasTarde) {
    const tarde = `⚠️ ${nombre} llegó tarde\n🕐 ${horaLegible(a.hora)} · ${cuantoTarde(a.minutosTarde)} tarde`;
    return [avisaNovedad ? `${tarde}\n📝 Dejó una novedad por aprobar · ${revisar}` : tarde];
  }
  if (avisaNovedad) return [`📝 ${nombre} reportó una novedad y espera tu aprobación\n${revisar}`];
  return [];
}
