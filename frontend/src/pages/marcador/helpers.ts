import { formatInTimeZone } from 'date-fns-tz';
import { TZ } from './tipos';

// Las horas se muestran SIEMPRE en zona Bogotá, no en la del dispositivo (una tablet
// en otra zona mostraría una hora equivocada aunque el instante guardado sea correcto).
export const horaBog = (d: Date | string, fmt = 'HH:mm:ss') => formatInTimeZone(new Date(d), TZ, fmt);
