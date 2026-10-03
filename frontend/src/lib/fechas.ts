// Todo lo que se le muestra a una persona se formatea en la hora de Bogotá.
//
// Sin esto, el navegador usa su propia zona. Las fechas de vinculación se
// guardan a medianoche de Bogotá (05:00 UTC), así que desde cualquier zona al
// occidente de Colombia se pintaba el día ANTERIOR: un retiro del 1 de
// septiembre aparecía como 31 de agosto. En un producto donde esas fechas son
// el registro legal de cuándo entró y cuándo salió alguien, eso no es un
// detalle de presentación.
export const TZ = 'America/Bogota';

// "24 de agosto de 2026"
export const fechaLarga = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric',
  });

// "24 de ago de 2026", para tablas donde el mes largo no cabe.
export const fechaCorta = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
  });

// "agosto de 2026", para decir desde cuándo sin la precisión del día.
export const mesYAnio = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-CO', { timeZone: TZ, month: 'long', year: 'numeric' });

// "24 de ago, 9:15 a. m."
export const fechaYHora = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

// "6:00 p. m." — la hora en 12 horas, como la lee la gente. Los espacios raros que pone el formato
// (no separables) se cambian por espacios normales: pegados en WhatsApp o en un correo se ven como
// cuadritos. Lo usan el kiosco y el mensaje del enlace de registro facial (3 de octubre de 2026).
const HORA_DOCE = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
export const horaDoce = (iso: string | Date) => sinEspaciosRaros(HORA_DOCE.format(new Date(iso)));

// Los espacios no separables que ponen los navegadores en «p. m.», cambiados por espacios normales.
// Aparte para poder probarla: en Node el formato ya sale con espacios normales.
export const sinEspaciosRaros = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
