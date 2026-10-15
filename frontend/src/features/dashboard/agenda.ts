import { TZ } from '../../lib/fechas';
import { MESES } from './helpers';
import type { EventoDeAgenda } from './types';

// «PRÓXIMOS DÍAS» EN EL INICIO (15 de octubre de 2026): cómo se dice cada evento. El servidor manda el tipo, el día
// y cuántos días faltan (backend: utils/agendaDelInicio.ts); aquí solo se pone en palabras.

export const cuando = (enDias: number) => (enDias <= 0 ? 'hoy' : enDias === 1 ? 'mañana' : `en ${enDias} días`);

// El día y el mes en hora de Bogotá: leído en el navegador de alguien al occidente, la medianoche de Bogotá
// (05:00Z) es todavía el día anterior.
const PARTES = new Intl.DateTimeFormat('en-US', { timeZone: TZ, day: 'numeric', month: 'numeric' });
export function diaDelEvento(iso: string): { dia: string; mes: string } {
  const partes = PARTES.formatToParts(new Date(iso));
  const de = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return { dia: de('day'), mes: MESES[Number(de('month')) - 1] ?? '' };
}

export type TextoDeEvento = { titulo: string; detalle: string | null; destino: string | null };

const AL_CONTRATO = (colaboradorId: string) => `/app/colaboradores/${colaboradorId}?tab=contratos`;

// Un caso por tipo y un default explícito (CLAUDE.md §9.4): un servidor más nuevo puede mandar un tipo que esta
// pantalla no conoce, y entonces sale sin inventar nada.
export function textoDeEvento(e: EventoDeAgenda): TextoDeEvento {
  switch (e.tipo) {
    case 'FESTIVO': return { titulo: e.nombre, detalle: e.propio ? 'Festivo de la empresa' : 'Festivo', destino: null };
    case 'CUMPLEANOS': return { titulo: e.nombre, detalle: 'Cumpleaños', destino: null };
    case 'CONTRATO_PREAVISO': return { titulo: e.nombre, detalle: 'Último día para avisar si no se renueva el contrato', destino: AL_CONTRATO(e.colaboradorId) };
    // El preaviso ya venció: lo mismo que dicen los pendientes.
    case 'CONTRATO_SE_PRORROGA': return { titulo: e.nombre, detalle: 'Vence y se prorroga solo', destino: AL_CONTRATO(e.colaboradorId) };
    case 'SUSCRIPCION_VENCE': return {
      titulo: e.eraPrueba ? 'Último día de tu prueba gratis' : 'Último día del mes pagado',
      detalle: 'Registra el pago para seguir usando HoraPro', destino: '/app/configuracion?tab=suscripcion',
    };
    case 'PRUEBA_CLIMA_TERMINA': return { titulo: 'Último día de la prueba del clima', detalle: 'Después, el clima laboral es del plan Empresarial', destino: '/app/clima' };
    default: return { titulo: 'Evento', detalle: null, destino: null };
  }
}
