import { Palmtree, HeartPulse, Stethoscope, Baby, HandHeart, Ban, Clock, CalendarOff, type LucideIcon } from 'lucide-react';
import type { TonoHito } from '../../components/LineaDeTiempo';
import { fechaLarga } from '../../lib/fechas';

// El ícono dice de qué tipo es la novedad de un vistazo, sin leer el título.
const ICONOS: Record<string, LucideIcon> = {
  VACACIONES: Palmtree,
  INCAPACIDAD_EPS: HeartPulse,
  INCAPACIDAD_ARL: HeartPulse,
  LICENCIA_MATERNIDAD: Baby,
  LICENCIA_PATERNIDAD: Baby,
  LICENCIA_LUTO: HandHeart,
  CALAMIDAD: HandHeart,
  MEDICO: Stethoscope,
  PERSONAL: Clock,
  NO_REMUNERADO: Ban,
  OTRO: CalendarOff,
};

// El color va por ESTADO y no por tipo: el tipo ya se lee en el título, y lo
// que se busca de un vistazo en esta lista es qué falta por aprobar.
export function aspectoDeNovedad(tipo: string, aprobado: boolean): {
  icono: LucideIcon;
  tono: TonoHito;
  insignia: { texto: string; tono: TonoHito };
} {
  return {
    icono: ICONOS[tipo] ?? CalendarOff,
    tono: aprobado ? 'verde' : 'ambar',
    insignia: aprobado
      ? { texto: 'APROBADA', tono: 'verde' }
      : { texto: 'PENDIENTE', tono: 'ambar' },
  };
}

const DIA = 86400000;

// De cuándo a cuándo, y cuántos días.
//
// Los dos extremos cuentan: del lunes al viernes son cinco días de novedad, no
// cuatro. Es la misma convención con la que el motor descuenta las ausencias.
export function rangoDeNovedad(inicioISO: string, finISO: string): string {
  const inicio = new Date(inicioISO);
  const fin = new Date(finISO);
  const dias = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / DIA) + 1);
  const cuantos = `${dias} día${dias === 1 ? '' : 's'}`;

  // Un solo día no se escribe como rango: "5 de mayo → 5 de mayo" se lee como
  // un error de quien lo registró.
  if (dias === 1) return `${fechaLarga(inicio)} · ${cuantos}`;
  return `${fechaLarga(inicio)} → ${fechaLarga(fin)} · ${cuantos}`;
}
