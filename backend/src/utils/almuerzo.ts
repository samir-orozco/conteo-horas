import { minutosDe } from './tardanzas';

// Cuánto almuerzo se le descuenta a alguien en un día.
//
// La regla es una sola:
//
//   Se descuentan los minutos de la ventana de almuerzo durante los cuales la
//   persona estuvo MARCADA.
//
// De ahí salen solos cuatro comportamientos que antes eran problemas distintos:
//
//  - No marcó el almuerzo: estuvo marcado toda la ventana → se descuenta
//    completa. No marcar deja de ser negocio.
//  - Se fue temprano y nunca llegó a la ventana: no se descuenta nada. Antes
//    perdía una hora que jamás tomó — quien salía a las 10:00 tras trabajar dos
//    horas terminaba con una sola contada.
//  - Marcó su almuerzo: el hueco ya quedó fuera de lo trabajado, así que no se
//    vuelve a restar. Antes se cobraba dos veces, y el disciplinado que marcaba
//    cobraba menos que el que no.
//  - Almorzó en 20 minutos: los otros 40 estuvo marcado y se le descuentan
//    igual. Ese tiempo se lo regala a la empresa; la jornada semanal la fija la
//    norma, no la velocidad para comer.
//
// Sin ventana configurada se conserva el comportamiento de siempre (restar los
// minutos fijos). Eso es lo que mantiene quietos los reportes ya emitidos: los
// días materializados antes de esta función no tienen ventana.
//
// Los DESCANSOS NO REMUNERADOS usan la misma regla de fondo, cada uno con su
// ventana, y viven en utils/descansos.ts desde el 12 de septiembre de 2026, cuando
// el día pasó a tener varios. De aquí toman `solape`, `instantesDe`, `estaDentroDe`
// y `finDeLaVentanaDe`, para no medir de otra manera.

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type DiaParaAlmuerzo = {
  fecha: Date; // medianoche de Bogotá
  almuerzoMin: number;
  almuerzoInicio: string | null; // "12:00"
  almuerzoFin: string | null; // "13:00"
};

// Una ventana del día, sea la del almuerzo o la de un descanso. Cuánto se descuenta
// por solape, si alguien está dentro y cuándo se acaba se responden igual para
// todas las pausas; lo único que cambia es de dónde sale la ventana.
export type VentanaDelDia = { fecha: Date; inicio: string | null; fin: string | null };

export const ventanaDeAlmuerzo = (dia: Pick<DiaParaAlmuerzo, 'fecha' | 'almuerzoInicio' | 'almuerzoFin'>): VentanaDelDia =>
  ({ fecha: dia.fecha, inicio: dia.almuerzoInicio, fin: dia.almuerzoFin });

export type TramoTrabajado = { entrada: Date; salida: Date };

// Minutos en que dos intervalos se solapan. Se exporta desde el 12 de septiembre de
// 2026 porque los descansos miden igual: una copia daría, tarde o temprano, otro
// redondeo.
export function solape(aIni: number, aFin: number, bIni: number, bFin: number): number {
  return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni)) / MS_MIN;
}

// La ventana anclada a su día, en milisegundos. La que cruza medianoche —el turno
// nocturno que almuerza o descansa en la madrugada— termina al día siguiente. Vive
// en un solo sitio: estaba copiada en tres, y las tres tenían que coincidir. Se
// exporta para los descansos (utils/descansos.ts), por lo mismo.
export function instantesDe(v: VentanaDelDia): { inicio: number; fin: number } {
  const inicio = v.fecha.getTime() + minutosDe(v.inicio!) * MS_MIN;
  let fin = v.fecha.getTime() + minutosDe(v.fin!) * MS_MIN;
  if (fin <= inicio) fin += UN_DIA_MS;
  return { inicio, fin };
}

// Minutos EXACTOS —sin redondear— que estos tramos pasaron dentro de la ventana.
// `null` cuando el día no tiene ventana: ahí el descuento del almuerzo es un fijo
// del horario, no un solape, y no hay nada que repartir.
//
// Se expone aparte porque el descuento de un día hay que saber a QUIÉN cobrárselo
// cuando el día tiene más de una jornada. Sin esto, la fila de quien se fue a las
// 10 de la mañana cargaba el almuerzo del que se quedó hasta las cinco.
export function minutosEnLaVentana(tramos: TramoTrabajado[], v: VentanaDelDia): number | null {
  if (!v.inicio || !v.fin) return null;
  const { inicio, fin } = instantesDe(v);

  // La pausa de un turno nocturno cae en la madrugada del día SIGUIENTE al que
  // ancla la fila, así que la ventana tiene DOS ubicaciones posibles y hay que
  // contar las dos.
  //
  // Se suman en vez de elegir una. Una fila de día puede contener tramos de dos
  // noches distintas —el regreso del almuerzo de la noche anterior y la noche
  // siguiente completa— y sus almuerzos caen en madrugadas distintas. Probar
  // solo la primera que diera algo dejaba el otro almuerzo sin descontar: 60
  // minutos nocturnos pagados como trabajados, cada vez que alguien marcaba su
  // almuerzo una noche y no la siguiente.
  //
  // Sumar es seguro: las dos ventanas están a 24 h de distancia, así que un
  // tramo tendría que durar más de un día para caer en ambas.
  const cruza = (ini: number, f: number) =>
    tramos.reduce((s, t) => s + solape(t.entrada.getTime(), t.salida.getTime(), ini, f), 0);

  return cruza(inicio, fin) + cruza(inicio + UN_DIA_MS, fin + UN_DIA_MS);
}

// La del almuerzo, que es la que ya leían el motor y la tabla.
export function minutosEnVentana(tramos: TramoTrabajado[], dia: DiaParaAlmuerzo): number | null {
  return minutosEnLaVentana(tramos, ventanaDeAlmuerzo(dia));
}

export function minutosAlmuerzoADescontar(
  tramos: TramoTrabajado[],
  dia: DiaParaAlmuerzo,
): number {
  // Sin ventana: comportamiento histórico. No se toca el pasado. Ojo al orden:
  // esta guarda va ANTES de mirar los tramos, y hay reportes viejos que dependen
  // de eso. Quien necesite un cero con la lista vacía lo comprueba por su cuenta.
  if (!dia.almuerzoInicio || !dia.almuerzoFin) return dia.almuerzoMin;
  if (tramos.length === 0) return 0;
  // El redondeo se queda aquí, en el único sitio donde estaba: lo consume
  // `reportes.ts` y moverlo movería nómina ya emitida.
  return Math.round(minutosEnVentana(tramos, dia)!);
}

// ¿La persona está DENTRO de la ventana en este instante?
//
// No decide si puede marcar la pausa —eso es `puedeSalirAAlmorzar`, que a
// propósito no mira la hora, o `descansoQueToca`— sino cómo se le
// ofrece. Estando dentro, el botón grande del kiosco lo dice de frente en vez de
// esconderlo detrás de "Registrar Salida", que era algo que había que adivinar.
//
// Prueba las dos posiciones posibles de la ventana, por lo mismo que el
// descuento: la de un turno nocturno cae en la madrugada del día SIGUIENTE al
// que ancla la fila.
export function estaDentroDe(ahora: Date, v: VentanaDelDia): boolean {
  if (!v.inicio || !v.fin) return false;
  const { inicio, fin } = instantesDe(v);
  const t = ahora.getTime();
  const cae = (i: number, f: number) => t >= i && t < f;
  return cae(inicio, fin) || cae(inicio + UN_DIA_MS, fin + UN_DIA_MS);
}

export function dentroDeLaVentana(
  ahora: Date,
  // Solo lo que de verdad necesita: así la sirve tanto un día completo como el
  // `select` acotado con el que el kiosco lee su ventana.
  dia: Pick<DiaParaAlmuerzo, 'fecha' | 'almuerzoInicio' | 'almuerzoFin'>,
): boolean {
  return estaDentroDe(ahora, ventanaDeAlmuerzo(dia));
}

// Instante en que se acaba la ventana de ESE turno.
//
// La ventana es una hora ("13:00"), no una fecha, así que hay que anclarla a la
// fila del día, con la misma corrección del descuento: la pausa de un turno
// nocturno cae en la madrugada del día SIGUIENTE al que ancla la fila. Si la
// salida ya pasó el fin calculado, la ventana que aplica es la del día siguiente:
// es la misma pausa, contada desde el otro extremo. Solo tiene sentido con
// ventana; quien llama lo comprueba antes.
export function finDeLaVentanaDe(salida: Date, v: VentanaDelDia): number {
  const { fin } = instantesDe(v);
  return salida.getTime() > fin ? fin + UN_DIA_MS : fin;
}

// ¿Este turno puede cerrarse como "salgo a mi pausa"?
//
// La usan los dos extremos: el kiosco para mostrar la pregunta y el servidor
// para creerle a la marca. Si estuvieran separadas podrían discrepar, y la
// persona marcaría una pausa que el servidor descarta sin decir nada.
//
// No mira la hora a propósito. Quien sale a las 11:40 a almorzar no debería
// pelear con el reloj, y responder no cuesta nada: la marca no cambia cuánto se
// descuenta —eso lo decide el solape con la ventana— solo deja constancia de qué
// fue esa salida.
function puedeSalirA(v: { inicio: string | null; fin: string | null } | null, yaLaTomo: boolean): boolean {
  if (!v?.inicio || !v.fin) return false;
  return !yaLaTomo;
}

export function puedeSalirAAlmorzar(
  dia: { almuerzoInicio: string | null; almuerzoFin: string | null } | null,
  yaAlmorzo: boolean,
): boolean {
  return puedeSalirA(dia && { inicio: dia.almuerzoInicio, fin: dia.almuerzoFin }, yaAlmorzo);
}
