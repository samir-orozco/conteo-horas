// Reconocimiento facial: solo comparamos descriptores matemáticos (128 floats
// que produce face-api.js en el navegador). La imagen nunca llega al servidor.

// Distancia recomendada por face-api.js para considerar "misma persona".
// Por debajo de este umbral se acepta la coincidencia.
export const UMBRAL_COINCIDENCIA = 0.5;

// Cada colaborador guarda varias muestras (frente, perfiles, con/sin gafas)
const MAX_MUESTRAS = 6;

function distanciaEuclidiana(a: number[], b: number[]): number {
  let suma = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    suma += diff * diff;
  }
  return Math.sqrt(suma);
}

export function esDescriptorValido(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === 128 && d.every(n => typeof n === 'number' && Number.isFinite(n));
}

// Lista de muestras del enrolamiento guiado (1 a MAX_MUESTRAS descriptores)
export function esListaDescriptoresValida(l: unknown): l is number[][] {
  return Array.isArray(l) && l.length >= 1 && l.length <= MAX_MUESTRAS && l.every(esDescriptorValido);
}

// Lo guardado puede ser un descriptor suelto (enrolamientos viejos) o una lista
// de muestras (enrolamiento guiado multi-ángulo). Siempre devolvemos lista.
function muestrasDe(guardado: unknown): number[][] {
  if (esDescriptorValido(guardado)) return [guardado];
  if (esListaDescriptoresValida(guardado)) return guardado;
  return [];
}

// CUÁNTO TIENE QUE SEPARAR AL PRIMERO DEL SEGUNDO PARA FIARSE.
//
// Este número es un JUICIO, no una medición, y conviene que quede dicho: no hay
// todavía datos de producción suficientes para derivarlo. Se eligió mirando la
// asimetría del daño, no una distribución:
//
//   Un rechazo falso cuesta ocho segundos y marcar con la cédula.
//   Una identificación falsa le abona las horas de una persona a OTRA, y nadie
//   se entera hasta que alguien reclama su nómina.
//
// Ante esa asimetría se prefiere rechazar de más. Desde el 10 de septiembre de
// 2026 cada marcación guarda su distancia, así que en unas semanas este número se
// puede fijar con la distribución real en la mano. Hasta entonces es provisional
// y está aquí, en un solo sitio, para poder moverlo.
export const MARGEN_AMBIGUO = 0.08;

export type Veredicto<T> =
  // Hay un único candidato claro.
  | { tipo: 'ACEPTADA'; colaborador: T; distancia: number; margen: number }
  // Dos personas distintas quedaron demasiado cerca: se sabe que es alguien de
  // los dos, y no se sabe cuál. Responder sería adivinar.
  | { tipo: 'AMBIGUA'; distancia: number; margen: number }
  | { tipo: 'SIN_COINCIDENCIA' };

// De quién es esta cara, entre todas las personas enroladas de la empresa.
//
// EL KIOSCO NO PREGUNTA «¿ESTE ES JULIÁN?» SINO «¿QUIÉN ES ESTE?». Son dos
// problemas distintos: el primero compara contra una persona, el segundo contra
// N, y cuantas más personas hay más probable es que alguien caiga por debajo del
// umbral por casualidad. Un umbral pensado para el primero es demasiado flojo
// para el segundo.
//
// El código anterior se quedaba con el más parecido que bajara del umbral y no
// miraba nada más. Si el segundo estaba a una milésima, elegía al primero igual.
// Eso es confundir una persona con otra, y es lo que el dueño reportó que pasa.
export function identificarRostro<T extends { id: string; rostroDescriptor: unknown }>(
  entrante: number[],
  candidatos: T[],
): Veredicto<T> {
  // La distancia de cada PERSONA es la de su mejor muestra. Alguien enrolado con
  // frente, perfiles y sin gafas tiene varias tomas cercanas entre sí POR DISEÑO:
  // si el margen se midiera entre muestras, enrolar bien haría imposible marcar.
  const porPersona: { colaborador: T; distancia: number }[] = [];
  for (const c of candidatos) {
    let mejor = Infinity;
    for (const muestra of muestrasDe(c.rostroDescriptor)) {
      const d = distanciaEuclidiana(entrante, muestra);
      if (d < mejor) mejor = d;
    }
    if (mejor <= UMBRAL_COINCIDENCIA) porPersona.push({ colaborador: c, distancia: mejor });
  }

  if (porPersona.length === 0) return { tipo: 'SIN_COINCIDENCIA' };

  porPersona.sort((a, b) => a.distancia - b.distancia);
  const [primero, segundo] = porPersona;

  // Sin segundo candidato no hay con quién confundirse. El margen es infinito, y
  // se acota para que viaje como número y no como Infinity.
  const margen = segundo ? segundo.distancia - primero.distancia : UMBRAL_COINCIDENCIA;

  // Ojo: solo cuentan como segundo los que TAMBIÉN bajaron del umbral. Alguien a
  // 0,60 está descartado, y que esté «cerca» del aceptado no significa nada.
  if (segundo && margen < MARGEN_AMBIGUO) {
    return { tipo: 'AMBIGUA', distancia: primero.distancia, margen };
  }

  return { tipo: 'ACEPTADA', colaborador: primero.colaborador, distancia: primero.distancia, margen };
}
