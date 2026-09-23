// LA SEMANA QUE MUESTRA EL CALENDARIO, EN FECHAS DE BOGOTÁ.
//
// Todo aquí se hace sobre cadenas "YYYY-MM-DD" y sobre `Date` anclados a MEDIODÍA UTC, nunca con
// el reloj local del navegador. La razón está en CLAUDE.md §7 y no es teórica: las pruebas de este
// lado corren fijadas en América/Los Ángeles a propósito, y un `new Date("2026-09-21")` leído con
// `getDay()` devuelve el día anterior para cualquiera al occidente de Colombia.
//
// Mediodía y no medianoche: con `Date.UTC(a, m, d, 12)` sobra medio día de margen en las dos
// direcciones, así que ningún desfase de zona puede empujar la fecha al día de al lado.

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Hoy en Bogotá como "YYYY-MM-DD". `en-CA` da exactamente ese formato, que es la forma corta de
// pedirlo sin armar la cadena a mano.
export function hoyEnBogota(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function aFecha(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12, 0, 0));
}

function aISO(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
}

export function sumarDias(iso: string, dias: number): string {
  return aISO(new Date(aFecha(iso).getTime() + dias * UN_DIA_MS));
}

// El lunes de la semana que contiene esa fecha. Lunes y no domingo: es la semana laboral con la
// que se mide el tope de 42 horas, y poner el domingo al principio partiría en dos el fin de
// semana justo donde vive el descanso obligatorio.
export function lunesDeLaSemana(iso: string): string {
  const diaSemana = aFecha(iso).getUTCDay(); // 0 = domingo
  const haciaAtras = diaSemana === 0 ? 6 : diaSemana - 1;
  return sumarDias(iso, -haciaAtras);
}

// Los siete días de la semana que arranca ese lunes.
export function diasDeLaSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

// Si un día se puede pintar con un turno del planificador.
//
// SOLO HACIA ADELANTE, que es la misma regla que aplica el backend: un día pasado no se toca
// porque reescribiría lo que ese día exigía, y de ahí salen la tardanza y las horas extra de un
// período ya liquidado. HOY sí entra: puede que la persona todavía no haya marcado. Si ya marcó,
// el backend responde 400 y el motivo se muestra; la pantalla no puede saberlo sola, y esconder el
// día por si acaso le quitaría al administrador un cambio legítimo.
//
// Se compara texto contra texto ("2026-09-21" vs "2026-09-22"), que en formato ISO ordena igual
// que las fechas. Sin `new Date` de por medio no hay zona horaria que pueda correr un día.
export function sePuedePintar(fecha: string, hoy: string): boolean {
  return fecha >= hoy;
}

// "15 al 21 de septiembre" · "29 de septiembre al 5 de octubre" cuando cruza de mes.
export function rotuloDeSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const mesDe = (iso: string) => aFecha(iso).toLocaleDateString('es-CO', { timeZone: 'UTC', month: 'long' });
  const diaDe = (iso: string) => aFecha(iso).getUTCDate();
  return mesDe(lunes) === mesDe(domingo)
    ? `${diaDe(lunes)} al ${diaDe(domingo)} de ${mesDe(domingo)}`
    : `${diaDe(lunes)} de ${mesDe(lunes)} al ${diaDe(domingo)} de ${mesDe(domingo)}`;
}

// "martes, 22 de septiembre" · "septiembre de 2026" — los otros dos rótulos del encabezado, para
// las vistas de día y de mes (22 de septiembre de 2026).
//
// VIVEN AQUÍ, junto a `rotuloDeSemana`, y no en `vistaDelCalendario.ts`, que es quien los usa: los
// tres necesitan el anclaje a MEDIODÍA UTC que explica el comentario de arriba, y reimplementarlo
// en otro archivo sería tener la misma regla de zona horaria en dos sitios (CLAUDE.md §9.3). Lo
// que decide CUÁL de los tres se usa sí está en `vistaDelCalendario.ts`, y sus pruebas los
// ejercitan a los tres.
// La primera letra en mayúscula, y NADA más. El español escribe los meses en minúscula dentro de
// una oración —por eso `toLocaleDateString` devuelve «septiembre de 2026», y hace bien—, pero esto
// es un TÍTULO, y en un encabezado grande la minúscula inicial se lee como un descuido. El mes
// sigue en minúscula cuando va en medio: «Martes, 22 de septiembre».
const conMayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

export function rotuloDeDia(iso: string): string {
  return conMayuscula(aFecha(iso).toLocaleDateString('es-CO', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }));
}

export function rotuloDeMes(iso: string): string {
  return conMayuscula(
    aFecha(iso).toLocaleDateString('es-CO', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
  );
}

// La inicial del día para el encabezado de la columna: L M M J V S D.
export const INICIALES_DE_DIA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// La inicial que le toca a UNA FECHA (22 de septiembre de 2026).
//
// El encabezado venía haciendo `INICIALES_DE_DIA[i]`, con `i` = número de columna. En una semana
// funciona de casualidad, porque la columna 0 siempre es lunes. En la vista de mes hay hasta 31
// columnas y ese acceso devuelve `undefined` de la octava en adelante: medio encabezado en blanco.
//
// `getUTCDay()` sobre la fecha anclada a mediodía, nunca `getDay()`: es la misma razón de todo este
// archivo. Domingo es 0 y va al FINAL, igual que en `lunesDeLaSemana`.
export function inicialDeDia(iso: string): string {
  const diaSemana = aFecha(iso).getUTCDay();
  return INICIALES_DE_DIA[diaSemana === 0 ? 6 : diaSemana - 1];
}

// Horas con una decimal solo cuando hace falta: "42 h", "41,5 h".
export function horasDeMinutos(minutos: number): string {
  const horas = minutos / 60;
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return `${texto} h`;
}
