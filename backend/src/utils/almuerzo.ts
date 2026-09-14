import { minutosDe } from './tardanzas';

// Cuánto almuerzo se le descuenta a alguien en un día.
//
// La regla, decidida por el dueño el 12 de septiembre de 2026, es una sola:
//
//   El almuerzo cuesta SIEMPRE el tiempo que fijó el horario. Lo que la persona se
//   tomó marcado (de su salida a almorzar a la siguiente entrada) cuenta para ese
//   tiempo, y lo que falte se descuenta de lo trabajado.
//
// De ahí salen los casos:
//
//  - No marcó el almuerzo: se descuenta completo.
//  - Lo marcó y volvió antes: se completa hasta el tiempo fijado. Volver antes es
//    decisión de la persona, no de la empresa.
//  - Lo tomó a otra hora: se descuenta una sola vez. La regla anterior medía cuánto
//    estuvo marcado dentro de la ventana, y quien almorzaba de 11:00 a 12:00 con
//    ventana de 12:00 a 13:00 pagaba la hora que salió y otra vez la de la ventana.
//  - Se demoró: no se descuenta nada más. Lo de más tampoco se paga, porque no estaba
//    marcado.
//  - Se fue antes de la hora del almuerzo, llegó después, o salió a almorzar y no
//    volvió: se descuenta igual lo fijado. Si tiene una novedad aprobada, esa parte del
//    día se le excusa entera (saldoTiempo.ts), así que no queda debiendo el almuerzo.
//
// Lo fijado es `almuerzoMin` del día: los minutos del horario, o lo que dura la ventana
// cuando el horario la tiene (diasEsperados.ts). La ventana ya no decide cuánto se
// descuenta: decide cuándo el kiosco ofrece almorzar y a cuál jornada del día se le
// cobra (utils/jornada.ts).
//
// Los DESCANSOS NO REMUNERADOS siguen la misma regla, con sus ventanas como tiempo
// fijado, y viven en utils/descansos.ts. De aquí toman `solape`, `instantesDe`,
// `estaDentroDe`, `finDeLaVentanaDe` y la medida de lo tomado, para no medir de otra
// manera.

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

// Una marcación del día con lo que hace falta para medir sus pausas: sus horas y a qué
// salió al terminar. Una abierta también sirve: su entrada puede ser el regreso de una.
export type MarcaDePausa = {
  entrada: Date | null;
  salida: Date | null;
  salidaAlmuerzo?: boolean;
  salidaDescanso?: boolean;
  descansoVentana?: string | null;
};

// ¿Este tramo se trabajó? Uno abierto todavía no, y uno con la salida antes de la
// entrada es un imposible que no se cuenta (ver `tramosUtiles` en utils/jornada.ts).
export const seTrabajo = (m: MarcaDePausa) =>
  !!m.entrada && !!m.salida && m.salida.getTime() > m.entrada.getTime();

// Minutos que se tomó la pausa que empezó con esta salida: hasta la siguiente entrada
// del día. Sin regreso, cero: no hay con qué medir cuánto se tomó, y se descuenta lo
// fijado.
export function minutosTomadosEnLaPausa(salida: Date, marcas: readonly MarcaDePausa[]): number {
  const despues = marcas.map(m => m.entrada?.getTime() ?? Number.NaN).filter(t => t > salida.getTime());
  return despues.length === 0 ? 0 : (Math.min(...despues) - salida.getTime()) / MS_MIN;
}

export function minutosAlmuerzoADescontar(
  marcas: readonly MarcaDePausa[],
  dia: Pick<DiaParaAlmuerzo, 'almuerzoMin'>,
): number {
  // Un día sin nada trabajado no ha pagado nada, así que tampoco descuenta nada.
  if (dia.almuerzoMin <= 0 || !marcas.some(seTrabajo)) return 0;
  const tomados = marcas
    .filter(m => m.salida && m.salidaAlmuerzo)
    .reduce((s, m) => s + minutosTomadosEnLaPausa(m.salida!, marcas), 0);
  // Se redondea una sola vez: unos segundos de más o de menos no mueven el minuto.
  return Math.max(0, Math.round(dia.almuerzoMin - tomados));
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
