// Reconocimiento facial: solo comparamos descriptores matemáticos (128 floats
// que produce face-api.js en el navegador). La imagen nunca llega al servidor.

// Distancia recomendada por face-api.js para considerar "misma persona".
// Por debajo de este umbral se acepta la coincidencia.
export const UMBRAL_COINCIDENCIA = 0.5;

// Cada colaborador guarda varias muestras (frente, perfiles, con/sin gafas)
const MAX_MUESTRAS = 6;

export function distanciaEuclidiana(a: number[], b: number[]): number {
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
export function muestrasDe(guardado: unknown): number[][] {
  if (esDescriptorValido(guardado)) return [guardado];
  if (esListaDescriptoresValida(guardado)) return guardado;
  return [];
}

// Cuántas tomas tiene guardadas una persona. La ficha y el enlace de registro muestran este número en
// vez de las fotos, que no se guardan.
export function cuantasMuestras(guardado: unknown): number {
  return muestrasDe(guardado).length;
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

// `segunda` es la distancia de la persona más cercana después de la elegida, ESTÉ O
// NO bajo el umbral, o null si no hay nadie más enrolado. No decide nada: viaja al
// log para poder ver con datos si el margen debe medirse contra ella (2 de octubre
// de 2026). Hoy el margen de quien no tiene ningún otro candidato bajo el umbral
// vale 0,5 y mezcla «nadie cerca» con «el segundo a 0,51».
export type Veredicto<T> =
  // Hay un único candidato claro.
  | { tipo: 'ACEPTADA'; colaborador: T; distancia: number; margen: number; segunda: number | null }
  // Dos personas distintas quedaron demasiado cerca: se sabe que es alguien de
  // los dos, y no se sabe cuál. Responder sería adivinar.
  | { tipo: 'AMBIGUA'; distancia: number; margen: number; segunda: number | null }
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
  const todas: { colaborador: T; distancia: number }[] = [];
  for (const c of candidatos) {
    const mejor = mejorDistancia(entrante, muestrasDe(c.rostroDescriptor));
    if (mejor !== null) todas.push({ colaborador: c, distancia: mejor });
  }
  todas.sort((a, b) => a.distancia - b.distancia);
  const porPersona = todas.filter(p => p.distancia <= UMBRAL_COINCIDENCIA);

  if (porPersona.length === 0) return { tipo: 'SIN_COINCIDENCIA' };

  const [primero, segundo] = porPersona;
  const segunda = todas[1]?.distancia ?? null;

  // Sin segundo candidato no hay con quién confundirse. El margen es infinito, y
  // se acota para que viaje como número y no como Infinity.
  const margen = segundo ? segundo.distancia - primero.distancia : UMBRAL_COINCIDENCIA;

  // Ojo: solo cuentan como segundo los que TAMBIÉN bajaron del umbral. Alguien a
  // 0,60 está descartado, y que esté «cerca» del aceptado no significa nada.
  if (segundo && margen < MARGEN_AMBIGUO) {
    return { tipo: 'AMBIGUA', distancia: primero.distancia, margen, segunda };
  }

  return { tipo: 'ACEPTADA', colaborador: primero.colaborador, distancia: primero.distancia, margen, segunda };
}

// La distancia de la mejor muestra, o null si no hay ninguna que comparar. Es LA
// regla de «cada persona cuenta por su mejor muestra»: el cotejo del kiosco y la
// revisión del rostro nuevo la usan las dos, para que no puedan discrepar.
export function mejorDistancia(entrante: number[], muestras: number[][]): number | null {
  let mejor: number | null = null;
  for (const muestra of muestras) {
    const d = distanciaEuclidiana(entrante, muestra);
    if (mejor === null || d < mejor) mejor = d;
  }
  return mejor;
}

// DESDE DÓNDE EL KIOSCO PIDE LA CONFIRMACIÓN REFORZADA (2 de octubre de 2026).
//
// No es un rechazo: la persona sostiene el botón 3 segundos en vez de 1,5 y ve un
// aviso. Sale de una medición, no de un juicio: en Grupo MSM, entre el 10/09 y el
// 1/10, 888 marcas con rostro; a partir de 0,44 queda el 4 % (36). La impostora
// del 1 de octubre dio 0,464 y la marca legítima más alta de esa mañana, 0,460:
// la distancia sola no las separa, por eso esto pide atención y no rechaza.
export const UMBRAL_CONFIRMACION_REFORZADA = 0.44;

export function esParecidoDudoso(distancia: number): boolean {
  return distancia >= UMBRAL_CONFIRMACION_REFORZADA;
}

// LA CAPTURA DE AHORA CONTRA LA ÚLTIMA ACEPTADA DE LA MISMA PERSONA.
//
// El 1 de octubre, a las 08:49 entró «Lina» con una cara y a las 08:52 llegó
// «Lina» con otra. Contra el registro las dos pasaban; entre ellas, no. Por ahora
// solo se MIDE y va al log: el corte para actuar se fija con lo observado. La
// captura anterior vive en memoria del proceso, así que un reinicio la olvida, y
// eso está bien para una medición.
export type CapturaAnterior = { descriptor: number[]; en: number };

export function continuidadConLaAnterior(
  anterior: CapturaAnterior | undefined,
  actual: number[],
  ahora: number,
  ventanaMs: number,
): { distancia: number; minutos: number } | null {
  if (!anterior || ahora - anterior.en > ventanaMs) return null;
  return {
    distancia: distanciaEuclidiana(anterior.descriptor, actual),
    minutos: Math.floor((ahora - anterior.en) / 60_000),
  };
}
