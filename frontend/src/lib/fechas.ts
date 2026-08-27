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

// "agosto de 2026", para decir desde cuándo sin la precisión del día.
export const mesYAnio = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-CO', { timeZone: TZ, month: 'long', year: 'numeric' });

// "24 de ago, 9:15 a. m."
export const fechaYHora = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
