import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { TZ } from './tipos';

// Las horas se muestran SIEMPRE en zona Bogotá, no en la del dispositivo (una tablet
// en otra zona mostraría una hora equivocada aunque el instante guardado sea correcto).
export const horaBog = (d: Date | string, fmt = 'HH:mm:ss') => formatInTimeZone(new Date(d), TZ, fmt);

// «Jueves, 1 de Octubre», en hora de Bogotá: con mayúscula el día y el mes, como en el diseño
// del kiosco (3 de octubre de 2026). Antes se usaba `capitalize` de CSS, que también ponía en
// mayúscula el «De».
export const fechaDelKiosco = (d: Date | string) =>
  formatInTimeZone(new Date(d), TZ, "EEEE, d 'de' MMMM", { locale: es })
    .split(' ')
    .map(p => (p === 'de' ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
