import { DIAS_EN_ORDEN_LABORAL } from '../../lib/diasDeLaSemana';

// EL DESCANSO SALE DE LAS FRANJAS. El bloque de la prueba tiene el porqué; aquí el resumen.
//
// Corrección del dueño: «a lo que me refería del día de descanso son las que se hacen en la franja de
// horario, no se asigna directamente». Es lo que el backend ya hace —`preguntasDeDescanso` deduce de
// las franjas y solo pregunta cuando no puede— y lo que la primera versión de esta sección ignoraba,
// preguntándolo siempre.
//
// SE CALCULA EN VIVO, sobre las franjas que se están editando y no sobre las guardadas: así la
// respuesta cambia mientras se tocan los días, que es cuando quien edita puede hacer algo con ella.

export type LoQueDicenLasFranjas = {
  caso:
    // Sobra exactamente un día: ESE es el descanso, y no hay nada que elegir.
    | 'DEDUCIDO'
    // Sobran dos o más. Solo UNO es el descanso obligatorio y la ley no dice cuál; el otro es un día
    // no laborable, que no es lo mismo y no paga recargo.
    | 'VARIOS_LIBRES'
    // Las franjas cubren los siete. El caso más común en vigilancia, que es la clientela de esto.
    | 'SIN_DIA_LIBRE';
  // El día deducido, solo cuando sobra uno. En los otros dos casos no hay ninguno que afirmar.
  dia: string | null;
  // Los días que no cubre ninguna franja, EN ORDEN DE SEMANA: de aquí salen los botones que se
  // ofrecen, y en otro orden el domingo saldría antes que el martes.
  libres: string[];
};

// `dias` llega como `unknown[]` porque en la base es una columna JSON y el formulario la maneja como
// lista de texto.
//
// AQUÍ HABÍA UN `DIAS_EN_ORDEN_LABORAL.includes(d)` PARA DESCARTAR NOMBRES RAROS Y ERA CÓDIGO MUERTO,
// descubierto mutándolo: al quitarlo no se puso roja ninguna prueba. La razón es que los libres salen
// de FILTRAR la lista de días válidos, así que un valor que no esté en ella no puede cambiar el
// resultado por mucho que entre al conjunto. Es el tercero de este tipo que aparece hoy.
export function descansoSegunLasFranjas(
  franjas: readonly { dias: readonly unknown[] }[],
): LoQueDicenLasFranjas {
  const trabaja = new Set<unknown>();
  for (const f of franjas) for (const d of f.dias) trabaja.add(d);
  // El recorrido va sobre la lista EN ORDEN y no sobre el conjunto: un `Set` conserva el orden de
  // inserción, que es el de las franjas, no el de la semana.
  const libres = DIAS_EN_ORDEN_LABORAL.filter(d => !trabaja.has(d));

  if (libres.length === 0) return { caso: 'SIN_DIA_LIBRE', dia: null, libres };
  if (libres.length === 1) return { caso: 'DEDUCIDO', dia: libres[0], libres };
  return { caso: 'VARIOS_LIBRES', dia: null, libres };
}
