import { lunesDeLaSemana, diasDeLaSemana, sumarDias } from './semana';

// LAS SEMANAS QUE HAY DENTRO DE LA REJILLA (28 de septiembre de 2026).
//
// En la vista de mes la columna de «Total» desaparecía: solo existía en la de semana. Y con ella
// desaparecía el guardia de las 42 horas, que es SEMANAL. Un mes son cinco o seis semanas y ninguna
// tenía dónde decir «esta persona quedó en 48».
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UN BUCLE DENTRO DEL JSX: de este número sale una alarma legal.
// Si agrupara mal, el total saldría plausible y equivocado, que es exactamente la forma en que este
// producto se rompe según su propio CLAUDE.md: nadie lo nota hasta que un trabajador reclama.

export type SemanaDeLaRejilla = {
  // El lunes al que pertenece el grupo. Es la identidad de la semana, no su primera columna: en un
  // rango que empieza a media semana, el lunes puede ni estar entre las fechas.
  lunes: string;
  fechas: string[];
};

// AGRUPA POR LUNES Y NO DE SIETE EN SIETE, y esa es toda la decisión.
//
// Hoy las dos reglas coinciden, porque la vista de mes ya llega con semanas completas. Atarse a eso
// sería depender de una decisión que vive en otro módulo: el día que alguien pida una quincena que
// arranca un miércoles, «de siete en siete» metería en el mismo grupo días de dos semanas distintas
// y el tope de 42 horas se mediría sobre una ventana que no es la legal.
//
// `lunesDeLaSemana` es el mismo de `semana.ts` que usa todo el calendario, no una cuenta nueva: con
// dos formas de decidir a qué semana pertenece un día, la rejilla y el motor acabarían discrepando.
export function semanasDeLasColumnas(dias: readonly string[]): SemanaDeLaRejilla[] {
  const semanas: SemanaDeLaRejilla[] = [];
  for (const fecha of dias) {
    const lunes = lunesDeLaSemana(fecha);
    const ultima = semanas[semanas.length - 1];
    // Se compara solo contra la ÚLTIMA y no se busca en todas: las columnas vienen en orden, así que
    // dos trozos de la misma semana no pueden aparecer separados. Y si algún día vinieran
    // desordenadas, partir el grupo es mejor que juntar días que en pantalla no están seguidos: el
    // total tiene que cuadrar con las celdas que tiene encima.
    if (ultima && ultima.lunes === lunes) ultima.fechas.push(fecha);
    else semanas.push({ lunes, fechas: [fecha] });
  }
  return semanas;
}

// Los minutos que esa semana exige a una persona.
//
// UNA FECHA QUE NO ESTÁ EN EL MAPA CUENTA COMO CERO, y pasa de verdad: las columnas de relleno del
// mes son de otro mes, y esa persona puede no tener fila ahí. Sumar `undefined` daría `NaN` y el
// total saldría en blanco sin que nadie sepa por qué; un día sin fila es un día que no exige nada.
export function minutosDeLaSemana(
  fechas: readonly string[],
  minutosPorFecha: Readonly<Record<string, number>>,
): number {
  let total = 0;
  for (const fecha of fechas) total += minutosPorFecha[fecha] ?? 0;
  return total;
}

// El primer día del mes siguiente, sobre texto. Vivía dentro de `rotacion.ts` y se muda con el
// recorrido que la usaba: así no queda una copia allá y otra aquí.
function primeroDelMesSiguiente(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  return numero === 12
    ? `${anio + 1}-01-01`
    : `${anio}-${String(numero + 1).padStart(2, '0')}-01`;
}

// LAS SEMANAS ENTERAS DE UN MES (28 de septiembre de 2026).
//
// Este recorrido ya existía, escrito DENTRO de `semanasSinDescanso`. El aviso de las 42 horas
// necesita exactamente el mismo, y escribirlo por segunda vez es como se separan dos copias de una
// misma regla (CLAUDE.md §9.3): se extrae aquí y aquel se migra en el mismo commit.
//
// SOLO LAS ENTERAS, y esa es toda la decisión. Una semana partida por el borde del mes se juzgaría a
// medias, con días que viven en otro mes y que el mapa ni siquiera tiene. Vale igual para «no
// descansó ningún día» que para «pasó del tope»: las dos son reglas SEMANALES, y media semana no es
// una semana.
export function semanasEnterasDelMes(mes: string): string[] {
  const ultimo = sumarDias(primeroDelMesSiguiente(mes), -1);
  const enteras: string[] = [];
  for (let lunes = lunesDeLaSemana(`${mes}-01`); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    if (diasDeLaSemana(lunes).every(f => f.slice(0, 7) === mes)) enteras.push(lunes);
  }
  return enteras;
}

// LAS SEMANAS QUE SE PASAN DEL TOPE, hermana de `semanasSinDescanso` y por la misma razón: la
// jornada legal es SEMANAL, así que el total de un rango de treinta días no se puede comparar con
// ella. Un mes son cinco semanas y cada una se juzga sola.
//
// EL TOPE ENTRA POR PARÁMETRO. Sale de la respuesta del servidor, que lo lee de la tabla de
// vigencias y sube o baja con la ley; un 42 escrito aquí lo congelaría.
//
// `>` Y NO `>=`: programar exactamente el tope es legal. Avisar ahí convertiría en alarma el caso de
// quien programa justo lo que puede.
export function semanasSobreElTope(
  minutosPorFecha: Readonly<Record<string, number>>,
  mes: string,
  topeMinutos: number,
): { lunes: string; minutos: number }[] {
  const salen: { lunes: string; minutos: number }[] = [];
  for (const lunes of semanasEnterasDelMes(mes)) {
    const minutos = minutosDeLaSemana(diasDeLaSemana(lunes), minutosPorFecha);
    if (minutos > topeMinutos) salen.push({ lunes, minutos });
  }
  return salen;
}

// EL MES QUE SE ESTÁ PROGRAMANDO: el que pone más días, no el del primero.
//
// De este valor cuelga qué calendario se pide y qué semanas se juzgan, así que equivocarlo no pinta
// mal una etiqueta: da por bueno un mes en el que no se va a escribir nada. El bloque de la prueba
// cuenta el caso que lo destapó.
//
// CUENTA DÍAS DISTINTOS y no entradas: la selección lleva una por persona y por día, y contando
// entradas el veredicto se movería según a cuánta gente haya marcada, sin que cambie una sola fecha.
//
// EL EMPATE SE ROMPE HACIA EL MES QUE EMPIEZA ANTES, y no porque sea mejor respuesta: porque tiene
// que haber una. Recorriendo los meses en orden y quedándose solo con quien SUPERA al mejor, el
// resultado no depende del orden en que llegaron las fechas.
export function mesQueSePrograma(fechas: readonly string[]): string | null {
  const cuantos = new Map<string, number>();
  for (const fecha of new Set(fechas)) {
    const mes = fecha.slice(0, 7);
    cuantos.set(mes, (cuantos.get(mes) ?? 0) + 1);
  }
  let mejor: string | null = null;
  for (const mes of [...cuantos.keys()].sort()) {
    if (mejor === null || cuantos.get(mes)! > cuantos.get(mejor)!) mejor = mes;
  }
  return mejor;
}

// LAS SEMANAS QUE QUEDARÍAN SIN NINGÚN DESCANSO, para el aviso que va pegado al nombre. El bloque de
// la prueba tiene el porqué; el resumen es el artículo 173: un día de descanso remunerado por semana,
// sin matices. Siete de siete trabajados es ilegal, no «apretado».
//
// REUSA `semanasDeLasColumnas` y no recorre las fechas por su cuenta: el aviso de las 42 horas agrupa
// exactamente igual, y dos copias de «a qué semana pertenece este día» es como se separan (§9.3).
//
// SOLO LAS ENTERAS: en el mes, la primera y la última fila pueden venir cortadas por el borde. Juzgar
// una semana de la que se ven tres días diría «sin descanso» de alguien que descansa el jueves.
export function semanasEnterasSinDescanso(
  dias: readonly string[],
  trabajado: Readonly<Record<string, boolean>>,
): string[] {
  return semanasDeLasColumnas(dias)
    .filter(s => s.fechas.length === 7)
    // `=== true` y no una comprobación laxa: una fecha que no está en el mapa es un día sin nada
    // programado, y eso no es trabajo. Contarla como trabajada inventaría una jornada.
    .filter(s => s.fechas.every(f => trabajado[f] === true))
    .map(s => s.lunes);
}

// ────────── EL DESCANSO QUE A UN ROTATIVO HAY QUE MARCARLE (29 de septiembre de 2026) ──────────
//
// Para alguien con descanso ROTATIVO, cuál de los siete días lleva el descanso lo decide lo que esté
// MARCADO como descanso en esa semana: si hay exactamente uno, ese es; con ninguno o con dos, el
// motor no puede afirmarlo y cae al DOMINGO. Esa caída es deliberada y correcta —un turno pintado
// puede AGREGAR un recargo, nunca quitarlo—, pero deja un olvido caro: quien programa a un rotativo
// de lunes a domingo pensando «esta persona descansa el martes» y no marca el martes, le deja el
// domingo trabajado sobre su descanso obligatorio. Eso paga recargo, y desde el tercero del mes
// obliga a compensar con tiempo.
//
// EL DOMINGO ESTÁ EN LA CONDICIÓN A PROPÓSITO. Lo normal es programar de lunes a sábado y dejar el
// domingo en blanco, y ahí no pasa nada: el domingo es su descanso y no lo trabaja. Avisando a todo
// rotativo sin descanso marcado, el aviso saldría en el caso más común de la pantalla y aprendería a
// ignorarse, que es como se desarma un aviso (§10, el mismo razonamiento del tope del linter).
//
// SE SOLAPA CON «pintarías sobre el descanso obligatorio» Y LOS DOS SE QUEDAN, que es una decisión y
// no un descuido. Aquel es POR CELDA y dice lo que cuesta; este es POR SEMANA y dice que tiene
// arreglo —marcarle el día—, que es lo que aquel no puede decir. Y aquel cubre las semanas que esta
// función no juzga: en la vista de mes, las filas cortadas por el borde.
//
// EL DOMINGO SE CALCULA DESDE EL LUNES y no se toma como la séptima columna: hoy las columnas de una
// semana entera vienen en orden, pero eso lo decide otro módulo, y el día que deje de ser cierto
// esto miraría un día cualquiera sin que nada falle.
export function semanasConDomingoEnRiesgo(
  dias: readonly string[],
  trabajado: Readonly<Record<string, boolean>>,
  descansoMarcado: Readonly<Record<string, boolean>>,
  esRotativo: boolean,
): string[] {
  // A un FIJO o un PRESUMIDO no se le avisa: su día lo pone la ley o un acuerdo escrito, y marcar
  // otro no lo mueve. Trabajarle el domingo también cuesta, pero eso no es un olvido que se pueda
  // arreglar marcando algo, y el aviso por celda es el que le corresponde.
  if (!esRotativo) return [];
  return semanasDeLasColumnas(dias)
    // SOLO LAS ENTERAS, igual que sus dos hermanas de este archivo: con tres días a la vista no se
    // puede afirmar que no hay ningún descanso marcado, porque puede estar en los cuatro que faltan.
    .filter(s => s.fechas.length === 7)
    // LOS SIETE TRABAJADOS SON DEL OTRO AVISO. «Semanas que quedarían sin ningún descanso» ya lo dice
    // y es más grave: no es que el domingo salga caro, es que la semana es ilegal (art. 173). Dos
    // avisos sobre la misma semana harían que el segundo se leyera como eco del primero.
    .filter(s => !s.fechas.every(f => trabajado[f] === true))
    // EXACTAMENTE UNO RESUELVE LA SEMANA, que es la misma cuenta que hace `descansoDeLaSemana` en el
    // backend. Ni cero ni dos: las dos caen al domingo, por razones distintas y con el mismo costo.
    .filter(s => s.fechas.filter(f => descansoMarcado[f] === true).length !== 1)
    .filter(s => trabajado[sumarDias(s.lunes, 6)] === true)
    .map(s => s.lunes);
}
