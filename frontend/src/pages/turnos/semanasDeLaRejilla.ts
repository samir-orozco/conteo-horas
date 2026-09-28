import { lunesDeLaSemana } from './semana';

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
