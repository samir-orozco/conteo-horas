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

// CUÁNTOS DÍAS HAY DE UNA FECHA A OTRA (28 de septiembre de 2026). Positivo hacia adelante.
//
// Nace con el motor de rotaciones, que necesita saber en qué punto del ciclo cae cada día y no
// puede contarlo por el índice del arreglo: una selección con huecos dejaría dos días separados por
// una semana en posiciones contiguas del ciclo, y la rotación se desalinearía sin que se note.
//
// Vive AQUÍ y no en `rotacion.ts` porque necesita el mismo anclaje a mediodía UTC que todo este
// archivo: restar dos fechas construidas con `new Date("2026-09-28")` da 0 o 2 días según la zona
// del navegador, y las pruebas de este lado corren fijadas en América/Los Ángeles a propósito.
// Media jornada de margen a cada lado hace que ningún desfase de zona pueda mover la cuenta.
//
// El `Math.round` es DEFENSIVO, no es lo que sostiene el resultado, y conviene no confundirse:
// anclando las dos fechas a las 12:00 UTC la resta siempre da un múltiplo exacto de un día, porque
// `Date.UTC` no tiene horario de verano. Se comprobó con una mutación: cambiarlo por `Math.floor`
// no pone roja ninguna prueba. Se deja por si alguien cambia el anclaje, que es cuando aparecerían
// las restas de 23,96 o 24,04 horas.
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / UN_DIA_MS);
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

// EL NOMBRE DEL MES, A SECAS Y EN MINÚSCULA: "septiembre" (28 de septiembre de 2026).
//
// Estaba escrito aquí dentro como una constante local de `rotuloDeSemana`, y al necesitarlo también
// el veredicto de la rotación se saca en vez de copiarse: dos copias parecen una sola regla y se
// separan a la primera (CLAUDE.md §9.3). La copia vieja se migra en este mismo cambio.
//
// SIN AÑO, y esa es toda la diferencia con `rotuloDeMes`: aquel titula la vista de mes y ahí el año
// hace falta; dentro de una frase («en 2 semanas de septiembre») sobra y estorba.
//
// EL `timeZone: 'UTC'` ES DEFENSIVO Y NO ES LO QUE SOSTIENE ESTO, y conviene no confundirse porque es
// fácil creer lo contrario: quien protege el resultado es `aFecha`, que ancla a MEDIODÍA UTC, y desde
// ahí sobra medio día de margen en las dos direcciones. Se comprobó con una mutación: quitando esta
// opción no se pone roja ninguna prueba. Se deja por si alguien mueve ese anclaje, que es cuando sí
// empezaría a decidir. Va igual que en `rotuloDeDia` y `rotuloDeMes`, que llevan la misma opción por
// la misma razón.
export function nombreDelMes(iso: string): string {
  return aFecha(iso).toLocaleDateString('es-CO', { timeZone: 'UTC', month: 'long' });
}

// "28 de septiembre": una fecha dicha como la diría una persona, sin el día de la semana.
//
// Existe porque los avisos nombran días sueltos («pintarías sobre el descanso obligatorio de Julián,
// el 28 de septiembre») y hasta hoy mostraban la cadena "2026-09-28" tal cual. Esa cadena es la clave
// con la que se escribe el día, no algo que un administrador tenga que leer.
//
// `getUTCDate()` corre la misma suerte que el `timeZone` de arriba: cambiarlo por `getDate()` no pone
// roja ninguna prueba, porque el anclaje a mediodía deja el mismo día en las dos lecturas. Se queda
// por coherencia con el resto del archivo, no porque hoy decida nada.
export function rotuloCorto(iso: string): string {
  return `${aFecha(iso).getUTCDate()} de ${nombreDelMes(iso)}`;
}

// "28 sep – 4 oct 2026": el rótulo del botón que va entre las dos flechas de navegación.
//
// EL FORMATO ES EL DEL BOTÓN, no el de un título, y por eso es corto y de ancho estable. Tiene 200 px
// de ancho mínimo y se pulsa repetido para avanzar. El formato anterior («28 de septiembre al 4 de
// octubre») cambiaba de largo según la semana, y con él se movían las flechas justo mientras alguien
// hacía clic en ellas.
//
// NO COLAPSA EL MES cuando los dos extremos caen en el mismo, por esa misma razón: colapsarlo ahorra
// ocho caracteres una semana de cada cinco y hace que el botón respire de tamaño.
//
// EL AÑO ES EL DEL FINAL. Navegando hacia adelante, el final es hacia donde se va: la semana del 28
// de diciembre de 2026 se rotula «28 dic – 3 ene 2027», que es el dato que avisa de que se cruzó.
//
// ESTUVO PARTIDA EN DOS unas horas el 28 de septiembre de 2026, con un `rotuloDeRango` aparte que
// compartían la semana y la quincena. Al salir la quincena le quedó un solo autor, y una función
// extraída para compartir que ya no comparte nada es una indirección de más.
export function rotuloDeSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  return `${rangoBreve(lunes)} ${aFecha(domingo).getUTCFullYear()}`;
}

// "28 sep – 4 oct": el rango sin el año. Sale a su propia función el 29 de septiembre de 2026 porque
// lo necesita también el encabezado de cada semana del mes, y escribir «día + mes abreviado» por
// segunda vez es como se separan dos formatos que la gente ve a dos centímetros uno del otro (§9.3).
function rangoBreve(lunes: string): string {
  const breve = (iso: string) => `${aFecha(iso).getUTCDate()} ${nombreDelMes(iso).slice(0, 3)}`;
  return `${breve(lunes)} – ${breve(sumarDias(lunes, 6))}`;
}

// "Semana 1 · 28 sep – 4 oct": el encabezado de cada grupo de siete columnas en la vista de mes
// (29 de septiembre de 2026, maqueta del dueño).
//
// EL NÚMERO ES EL DE LA VISTA Y NO EL DEL AÑO. La semana ISO del 28 de septiembre de 2026 es la 40, y
// «Semana 40» no le dice nada a quien mira un mes de cinco filas: lo que necesita es «esta es la
// primera de las que veo». Por eso entra como ÍNDICE y no se calcula aquí: quien dibuja la rejilla ya
// sabe en qué posición va cada grupo, y deducirlo aquí obligaría a saber también dónde empieza la
// vista, que es una decisión de otro módulo.
//
// SIN AÑO, al revés que `rotuloDeSemana`: el año está en el título del período, justo encima, y
// repetirlo cinco veces en una fila de encabezado gasta el ancho que este rótulo viene a dar.
export function rotuloDeSemanaEnLaVista(lunes: string, indice: number): string {
  return `Semana ${indice + 1} · ${rangoBreve(lunes)}`;
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

// LA ABREVIATURA PARA EL ENCABEZADO DE LA SEMANA: «Lun», «Mar», «Mié»… (28 de septiembre de 2026).
//
// Con la inicial sola, lunes y martes son los dos «M» y martes y miércoles también: en la mitad de
// las columnas el encabezado no distingue un día de otro. En la semana hay sitio de sobra para las
// tres letras; en el mes, con hasta cuarenta y dos columnas, no lo hay, y por eso siguen conviviendo.
//
// SALE DE LA MISMA CUENTA que `inicialDeDia`, con el domingo al final, y su prueba afirma que las
// dos tablas empiezan por la misma letra: dos cuentas distintas nombrarían distinto el mismo día en
// el mes y en la semana.
const ABREVIATURAS_DE_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function abreviaturaDeDia(iso: string): string {
  const diaSemana = aFecha(iso).getUTCDay();
  return ABREVIATURAS_DE_DIA[diaSemana === 0 ? 6 : diaSemana - 1];
}


// SI UN DÍA NO ES DEL MES QUE SE ESTÁ VIENDO (28 de septiembre de 2026).
//
// Existe porque el mes se dibuja con SEMANAS COMPLETAS: las columnas de los extremos son del mes
// anterior y del siguiente. Sin marcarlas, la rejilla miente por omisión —se ve un «1» al principio
// y otro «1» al final, y los dos parecen del mes del título.
//
// SE COMPARA EL PREFIJO `YYYY-MM` Y NO EL NÚMERO DE MES. La maqueta compara `getMonth()` a secas, y
// con eso el relleno de enero del año siguiente pasa por del mes; los dos extremos del año cruzan de
// año, no solo de mes. Sobre texto ISO no hace falta ni construir una fecha: el año va delante.
//
// Va aquí y no en el componente porque la rejilla lo pregunta en DOS sitios —el encabezado y la
// celda— y dos copias de la misma regla es peor que ninguna (CLAUDE.md §9.3).
export function esDeOtroMes(iso: string, ancla: string): boolean {
  return iso.slice(0, 7) !== ancla.slice(0, 7);
}

// Horas con una decimal solo cuando hace falta: "42 h", "41,5 h".
export function horasDeMinutos(minutos: number): string {
  const horas = minutos / 60;
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return `${texto} h`;
}

// "6–14" · "8:30–17:15": el horario como cabe en una celda de la rejilla. Ver el bloque de la prueba.
//
// Cada extremo se decide SOLO, y esa es toda la decisión: un turno de 6:00 a 14:30 se escribe
// «6–14:30» y no se recorta entero ni se deja entero. Mirar los dos juntos obligaría a elegir entre
// perder los minutos de un lado o cargar con los ceros del otro.
export function horarioCorto(entrada: string, salida: string): string {
  const breve = (hhmm: string) => {
    const [hh, mm] = hhmm.split(':');
    // `Number` y no un recorte de ceros: '00' tiene que quedar en «0» y no en cadena vacía.
    return mm === '00' ? String(Number(hh)) : `${Number(hh)}:${mm}`;
  };
  return `${breve(entrada)}–${breve(salida)}`;
}
