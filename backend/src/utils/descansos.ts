import { minutosDe, duracionFranjaMin } from './tardanzas';
import {
  solape, instantesDe, estaDentroDe, finDeLaVentanaDe, seTrabajo, minutosTomadosEnLaPausa,
  type TramoTrabajado, type MarcaDePausa,
} from './almuerzo';

// VARIOS DESCANSOS NO REMUNERADOS POR FRANJA (decisión del dueño, 12 de septiembre
// de 2026).
//
// Cada franja del horario puede tener hasta tres descansos, además del almuerzo,
// cada uno con su «desde» y su «hasta». Ninguno se paga: restan de lo exigido
// igual que el almuerzo, y lo trabajado dentro de sus horas se descuenta.
//
// La lista se guarda como TEXTO en `franjas_horario.descansos` y se congela igual
// en `dias_esperados.descansos`:
//
//   [{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]
//
// NULL es «sin descansos»; nunca se guarda `[]`. Y cada marcación guarda a cuál
// salió en `registros.descansoVentana` con la clave "09:00-09:15".
//
// Por qué texto y no JSON ni columnas fijas: es el tipo que MariaDB agrega en
// línea sin copiar `registros`, igual que las columnas que ya se agregaron así.
//
// La regla de dependencias de este módulo es estricta para no crear ciclos: solo
// importa de `tardanzas.ts` y de `almuerzo.ts`, que no importan nada de aquí.

export const MAX_DESCANSOS_POR_FRANJA = 3;
// Una fila por tramo trabajado: la de la entrada, y una más por cada pausa que se
// marca (el almuerzo y los tres descansos).
export const MAX_MARCACIONES_POR_JORNADA = 2 + MAX_DESCANSOS_POR_FRANJA;

export type Ventana = { inicio: string; fin: string };

// Un texto más largo que esto no es una lista de tres descansos: es basura, y no se
// le entrega a JSON.parse. Tres ventanas escritas por `escribirDescansos` ocupan
// menos de 100 caracteres.
const LARGO_MAXIMO_DEL_TEXTO = 2000;

// "HH:MM" dentro del día, o null. Mudada aquí desde ventanasDeHorario.ts el 12 de
// septiembre de 2026, que la reexporta: la lectura de la lista la necesita y la
// ruta de horarios tenía su propia copia sin rango (CLAUDE.md §9.3).
export function horaValida(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(':').map(Number);
  // "99:99" pasa la regex. Sin este rango, minutosDe daría 6039 y la ventana
  // duraría días.
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? v : null;
}

// Minutos de una hora contados desde la hora de entrada de la franja. Así se
// comparan igual una franja de día y una nocturna que cruza la medianoche: en un
// turno de 22:00 el descanso de las 23:55 va antes que el de las 03:00. Vive en un
// solo sitio: estaba escrita tres veces (horario, editor y ahora los descansos).
export function minutosDesdeLaEntrada(horaEntrada: string, hhmm: string): number {
  return (minutosDe(hhmm) - minutosDe(horaEntrada) + 1440) % 1440;
}

// Una ventana, venga como objeto {inicio, fin} o como la clave "09:00-09:15".
// Media ventana, una hora imposible o inicio igual a fin (que sería una ventana de
// 24 horas) no son una ventana.
export function leerVentana(valor: unknown): Ventana | null {
  let inicio: unknown;
  let fin: unknown;
  if (typeof valor === 'string') {
    const partes = valor.split('-');
    if (partes.length !== 2) return null;
    [inicio, fin] = partes.map(p => p.trim());
  } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    ({ inicio, fin } = valor as { inicio?: unknown; fin?: unknown });
  } else {
    return null;
  }
  const i = horaValida(inicio);
  const f = horaValida(fin);
  return i !== null && f !== null && i !== f ? { inicio: i, fin: f } : null;
}

export const claveDeVentana = (v: Ventana): string => `${v.inicio}-${v.fin}`;

// La lista de descansos de una franja o de un día. NUNCA LANZA.
//
// La lee el kiosco en `/estado` antes de abrir la sesión, así que un valor roto no
// puede tumbar a nadie: lo que no se entiende se descarta ELEMENTO POR ELEMENTO, y
// lo demás se queda. Acepta el texto JSON que se guarda, un arreglo u objeto ya
// parseado, y el texto "09:00-09:15,15:00-15:10".
//
// No recorta a tres: un día que ya congeló cuatro por un error conserva su
// descuento en vez de perderlo en silencio. El tope se aplica al guardar.
export function leerDescansos(valor: unknown): Ventana[] {
  let elementos: unknown[];
  if (typeof valor === 'string') {
    if (valor.length > LARGO_MAXIMO_DEL_TEXTO) return [];
    const texto = valor.trim();
    if (texto.startsWith('[') || texto.startsWith('{')) {
      let parseado: unknown;
      try {
        parseado = JSON.parse(texto);
      } catch {
        return [];
      }
      elementos = Array.isArray(parseado) ? parseado : [parseado];
    } else {
      elementos = texto.split(',');
    }
  } else if (Array.isArray(valor)) {
    elementos = valor;
  } else if (valor && typeof valor === 'object') {
    elementos = [valor];
  } else {
    return [];
  }

  const vistas = new Set<string>();
  const lista: Ventana[] = [];
  for (const elemento of elementos) {
    const v = leerVentana(elemento);
    if (!v || vistas.has(claveDeVentana(v))) continue;
    vistas.add(claveDeVentana(v));
    lista.push(v);
  }
  return lista;
}

// La forma canónica que se guarda: solo inicio y fin, en ese orden, y NULL si no
// hay ninguna. Siempre igual para la misma lista, así que dos días con los mismos
// descansos guardan el mismo texto.
export function escribirDescansos(ventanas: readonly Ventana[]): string | null {
  if (ventanas.length === 0) return null;
  return JSON.stringify(ventanas.map(v => ({ inicio: v.inicio, fin: v.fin })));
}

// Las ventanas en el orden en que ocurren en la jornada, contado desde la entrada.
// Sin hora de entrada, por la hora del reloj. Devuelve una copia.
export function ventanasEnOrden(horaEntrada: string | null, ventanas: readonly Ventana[]): Ventana[] {
  const entrada = horaValida(horaEntrada);
  const posicion = (v: Ventana) => (entrada === null ? minutosDe(v.inicio) : minutosDesdeLaEntrada(entrada, v.inicio));
  return [...ventanas].sort((a, b) => posicion(a) - posicion(b));
}

// ─────────────────────────────── EL DINERO ───────────────────────────────

// El día con sus descansos: lo mínimo de una fila de `DiaEsperado` para ubicar las
// ventanas en el reloj (la fecha) y en el orden de la jornada (la entrada).
export type DiaConDescansos = { fecha: Date; horaEntrada: string | null; descansos: string | null };

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Funde los intervalos que se pisan o se tocan, descarta los vacíos, y los devuelve
// en orden. Tocarse y fundirse da el mismo largo, así que no cambia ninguna cuenta.
export function unirIntervalos(intervalos: readonly (readonly [number, number])[]): [number, number][] {
  const orden = intervalos
    .filter(([a, b]) => b > a)
    .map(([a, b]) => [a, b] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  const unidos: [number, number][] = [];
  for (const [a, b] of orden) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
    else unidos.push([a, b]);
  }
  return unidos;
}

// Cuánto le quitan los descansos a lo que el día exige: la UNIÓN de sus ventanas,
// ubicadas desde la entrada. Al guardar el horario dos descansos no se pueden pisar,
// pero un día ya congelado no se vuelve a validar, y sumar ventana por ventana
// cobraría dos veces la hora compartida.
export function minutosDeLaUnion(horaEntrada: string | null, ventanas: readonly Ventana[]): number {
  const entrada = horaValida(horaEntrada);
  return unirIntervalos(ventanas.map(v => {
    const desde = entrada === null ? minutosDe(v.inicio) : minutosDesdeLaEntrada(entrada, v.inicio);
    return [desde, desde + duracionFranjaMin(v.inicio, v.fin)] as [number, number];
  })).reduce((s, [a, b]) => s + b - a, 0);
}

// Minutos EXACTOS, sin redondear, que estos tramos pasaron dentro de la unión de las
// ventanas de descanso. Cada ventana se ubica en sus dos posiciones posibles, el día
// de la fila y el siguiente (la de un nocturno cae en la madrugada), igual que el
// almuerzo en `minutosEnLaVentana`, y las que se pisan se funden antes de medir.
//
// El orden de las sumas es el mismo del almuerzo, y es a propósito: con una sola
// ventana da el mismo número bit a bit, así que el redondeo del día no se mueve.
export function minutosEnLasVentanas(tramos: readonly TramoTrabajado[], fecha: Date, ventanas: readonly Ventana[]): number {
  const intervalos = unirIntervalos(ventanas.flatMap(v => {
    const { inicio, fin } = instantesDe({ fecha, inicio: v.inicio, fin: v.fin });
    return [[inicio, fin], [inicio + UN_DIA_MS, fin + UN_DIA_MS]] as [number, number][];
  }));
  const cruza = (ini: number, fin: number) =>
    tramos.reduce((s, t) => s + solape(t.entrada.getTime(), t.salida.getTime(), ini, fin), 0);
  return intervalos.reduce((s, [a, b]) => s + cruza(a, b), 0);
}

// Cuánto descanso no remunerado se le descuenta a alguien en un día, con la regla del
// almuerzo (utils/almuerzo.ts, decisión del dueño del 12 de septiembre de 2026): los
// descansos del día cuestan SIEMPRE lo que suman sus ventanas, y lo que la persona se
// tomó marcado en sus salidas al descanso cuenta para ese tiempo. Se redondea una vez.
//
// Se cuentan JUNTOS y no ventana por ventana. El kiosco anota a cuál descanso sale cada
// quien por la hora, y fuera de las ventanas lo anota en el próximo: Carla, que toma de
// 10:00 a 10:15 y de 15:00 a 15:10, queda con la salida de 15 minutos en la ventana de 10
// y la de 10 en la de 15. Contados por ventana se le cobraban 5 minutos aunque se tomó
// exactamente sus 25.
//
// Lo que suman las ventanas es su UNIÓN: dos congeladas que se pisan no cobran dos veces
// la hora compartida. Sin ventanas no hay descanso: no hereda los minutos fijos del
// almuerzo.
export function minutosDescansoADescontar(marcas: readonly MarcaDePausa[], dia: DiaConDescansos): number {
  return Math.round(descuentoDeDescansoExacto(marcas, dia));
}

function descuentoDeDescansoExacto(marcas: readonly MarcaDePausa[], dia: DiaConDescansos): number {
  const fijado = minutosDeLaUnion(dia.horaEntrada, leerDescansos(dia.descansos));
  if (fijado <= 0 || !marcas.some(seTrabajo)) return 0;
  const tomados = marcas
    .filter(m => m.salida && m.salidaDescanso)
    .reduce((s, m) => s + minutosTomadosEnLaPausa(m.salida!, marcas), 0);
  return Math.max(0, fijado - tomados);
}

// Cómo se reparte ese descuento entre las ventanas, para decir en el resumen de cada
// descanso cuánto costó (utils/jornada.ts). A cada ventana le toca lo que le faltó a su
// salida anotada, en el orden de la jornada y hasta agotar el descuento del día,
// redondeado sobre el acumulado: los repartos SUMAN el descuento del día. La plata no
// depende de este reparto.
export function descuentoDeCadaDescanso(marcas: readonly MarcaDePausa[], dia: DiaConDescansos): number[] {
  const ventanas = ventanasEnOrden(dia.horaEntrada, leerDescansos(dia.descansos));
  const salidas = marcas
    .filter(m => m.salida && m.salidaDescanso)
    .sort((a, b) => a.salida!.getTime() - b.salida!.getTime());
  const asignadas = ventanasDeLasSalidas(dia, salidas.map(m => ({ salida: m.salida!, descansoVentana: m.descansoVentana ?? null })));
  let quedan = descuentoDeDescansoExacto(marcas, dia);
  let acumulado = 0;
  let entregado = 0;
  return ventanas.map(v => {
    const i = asignadas.findIndex(a => a !== null && claveDeVentana(a) === claveDeVentana(v));
    const tomados = i < 0 ? 0 : minutosTomadosEnLaPausa(salidas[i].salida!, marcas);
    const aqui = Math.min(quedan, Math.max(0, duracionFranjaMin(v.inicio, v.fin) - tomados));
    quedan -= aqui;
    acumulado += aqui;
    const redondeado = Math.round(acumulado) - entregado;
    entregado += redondeado;
    return redondeado;
  });
}

// ─────────────────────────────── EL KIOSCO ───────────────────────────────

// A cuál descanso sale quien toca «descanso» a esta hora. La persona no elige: el
// servidor lo decide, y la tableta solo muestra lo que el servidor dijo.
//
//   1. El que está EN CURSO (probando sus dos posiciones, como el almuerzo).
//   2. Si no, el PRÓXIMO que empieza, contado desde la entrada.
//   3. Si ya pasaron todos, el ÚLTIMO pendiente.
//
// Carla, que sale a las 10:00 sin haber tomado ninguno, queda anotada en el de las
// 15:00. El descuento de plata no cambia por eso: se mide por solape con la unión.
// `null` cuando no queda ninguno pendiente o el día no tiene descansos.
export function descansoQueToca(ahora: Date, dia: DiaConDescansos, tomadas: readonly Ventana[]): Ventana | null {
  const usadas = new Set(tomadas.map(claveDeVentana));
  const pendientes = ventanasEnOrden(dia.horaEntrada, leerDescansos(dia.descansos))
    .filter(v => !usadas.has(claveDeVentana(v)));
  if (pendientes.length === 0) return null;

  const enCurso = pendientes.find(v => estaDentroDe(ahora, { fecha: dia.fecha, inicio: v.inicio, fin: v.fin }));
  if (enCurso) return enCurso;

  const entrada = horaValida(dia.horaEntrada);
  const base = dia.fecha.getTime() + (entrada === null ? 0 : minutosDe(entrada) * MS_MIN);
  const transcurridos = (ahora.getTime() - base) / MS_MIN;
  const posicion = (v: Ventana) => (entrada === null ? minutosDe(v.inicio) : minutosDesdeLaEntrada(entrada, v.inicio));
  return pendientes.find(v => posicion(v) > transcurridos) ?? pendientes[pendientes.length - 1];
}

export type SalidaAlDescanso = { salida: Date; descansoVentana: string | null };

// A cuál ventana pertenece cada salida al descanso de un día. La usan el kiosco (qué
// descansos ya tomó), la tabla (a qué ventana se resume cada salida) y el editor. Si
// cada uno asignara a su manera, contarían historias distintas de la misma salida.
//
// En DOS pasadas, cada una en el orden en que ocurrieron las salidas:
//   1. La ventana guardada en la marcación manda, si sigue en el día y nadie la usó.
//   2. A las que quedan sin ventana se les infiere por la hora con `descansoQueToca`,
//      entre las ventanas que nadie tomó.
// En una sola pasada, una salida anterior sin ventana (la que un administrador movió)
// se inferiría a la ventana que una salida posterior tiene guardada, y se la quitaría
// (12 de septiembre de 2026). Nunca asigna la misma ventana dos veces, así que nunca
// da más de las que tiene el día.
function asignarSalidas(dia: DiaConDescansos, salidas: readonly SalidaAlDescanso[]): { porSalida: (Ventana | null)[]; tomadas: Ventana[] } {
  const delDia = new Set(leerDescansos(dia.descansos).map(claveDeVentana));
  const tomadas: Ventana[] = [];
  const porSalida: (Ventana | null)[] = salidas.map(() => null);
  const orden = salidas.map((_, i) => i).sort((a, b) => salidas[a].salida.getTime() - salidas[b].salida.getTime());
  const yaTomada = (v: Ventana) => tomadas.some(t => claveDeVentana(t) === claveDeVentana(v));
  const asignar = (i: number, v: Ventana | null) => {
    if (v) tomadas.push(v);
    porSalida[i] = v;
  };
  const porLaGuardada = (i: number) => {
    const guardada = leerVentana(salidas[i].descansoVentana);
    if (guardada !== null && delDia.has(claveDeVentana(guardada)) && !yaTomada(guardada)) asignar(i, guardada);
  };
  const porLaHora = (i: number) => {
    if (porSalida[i] === null) asignar(i, descansoQueToca(salidas[i].salida, dia, tomadas));
  };
  for (const i of orden) porLaGuardada(i);
  for (const i of orden) porLaHora(i);
  return { porSalida, tomadas };
}

// La ventana de cada salida, en el orden en que llegaron; null la que no tuvo dónde.
export function ventanasDeLasSalidas(dia: DiaConDescansos, salidas: readonly SalidaAlDescanso[]): (Ventana | null)[] {
  return asignarSalidas(dia, salidas).porSalida;
}

// Las ventanas que ya se tomaron, en el orden en que se tomaron.
export function ventanasTomadas(dia: DiaConDescansos, salidas: readonly SalidaAlDescanso[]): Ventana[] {
  return asignarSalidas(dia, salidas).tomadas;
}

// La hora a la que le tocaba volver de un descanso. Sirve para proponerla cuando
// olvida marcar el regreso, como tope de la hora que declara, y para saber si se
// pasó.
//
//   - Si salió DENTRO de la ventana, el fin de la ventana.
//   - Si salió fuera (Carla a las 10:00, anotada en el de las 15:00), la salida más
//     lo que dura ese descanso: 10:10. Con el fin de la ventana el tope sería las
//     15:10, y una salida a las 15:00 hacia el de las 09:00 correría a mañana.
//
// Supuesto técnico del 12 de septiembre de 2026, en una sola función para poder
// cambiarlo. Lo que NO garantiza: fuera de la ventana, declarar un regreso más
// temprano gana hasta la duración de ese descanso en minutos pagados, porque ese
// tiempo no cae en ninguna ventana. Decisión del dueño.
export function regresoEsperadoDelDescanso(salida: Date, fecha: Date, v: Ventana): Date {
  const ventana = { fecha, inicio: v.inicio, fin: v.fin };
  if (estaDentroDe(salida, ventana)) return new Date(finDeLaVentanaDe(salida, ventana));
  return new Date(salida.getTime() + duracionFranjaMin(v.inicio, v.fin) * MS_MIN);
}

// ─────────────────────────────── EL EDITOR ───────────────────────────────

const minutoDe = (d: Date) => Math.floor(d.getTime() / MS_MIN);

// Qué salida al descanso de ANTES hereda cada salida al descanso de la jornada que el
// administrador reescribió: su foto, su sede, cómo se marcó (12 de septiembre de 2026).
// Devuelve, por cada hueco, el índice de la salida que hereda, o null si ninguna.
//
//   1. Primero, todos los huecos que quedaron en el MISMO MINUTO de una salida de
//      antes: es la misma marca, aunque otra quede más cerca en segundos (el kiosco
//      guarda segundos y el formulario no).
//   2. Después, lo que queda entre esas parejas, EN ORDEN y sin cruzarlas: tantas
//      parejas como se pueda y, entre esas, las más cercanas en total. A la misma
//      distancia gana el hueco más temprano, y después la salida más temprana.
//   3. Lo que no tiene pareja lo escribió el administrador.
//
// Hueco por hueco con la más cercana no sirve: mover el descanso de las 09:00 a las
// 14:40 le daba la foto de las 15:00, a 20 minutos, y el de las 15:00, que no se
// movió, se quedaba con la de las 09:00. El par más cercano suelto tampoco: correr las
// salidas de las 09:00 y de las 09:30 a las 09:20 y a las 09:40 dejaba cada foto en el
// descanso del otro (12 de septiembre de 2026).
export function emparejarSalidasDeDescanso(huecos: readonly Date[], salidas: readonly Date[]): (number | null)[] {
  const pareja: (number | null)[] = huecos.map(() => null);
  const usadas = new Set<number>();
  for (let i = 0; i < huecos.length; i++) {
    const j = salidas.findIndex((s, k) => !usadas.has(k) && minutoDe(s) === minutoDe(huecos[i]));
    if (j < 0) continue;
    pareja[i] = j;
    usadas.add(j);
  }
  // Cada hora cae en un tramo entre las parejas del mismo minuto, y solo se empareja
  // dentro de su tramo: así nada cruza una marca que no se movió.
  const anclas = pareja.flatMap((j, i) => (j === null ? [] : [{ hueco: huecos[i].getTime(), salida: salidas[j].getTime() }]));
  const libres = (lista: readonly Date[], tomada: (k: number) => boolean, lado: 'hueco' | 'salida') => lista
    .flatMap((d, k) => (tomada(k) ? [] : [{ k, t: d.getTime(), tramo: anclas.filter(a => a[lado] < d.getTime()).length }]))
    .sort((a, b) => a.t - b.t);
  const huecosLibres = libres(huecos, i => pareja[i] !== null, 'hueco');
  const salidasLibres = libres(salidas, j => usadas.has(j), 'salida');
  for (let tramo = 0; tramo <= anclas.length; tramo++) {
    const h = huecosLibres.filter(x => x.tramo === tramo);
    const s = salidasLibres.filter(x => x.tramo === tramo);
    for (const [a, b] of enOrdenSinCruzar(h.map(x => x.t), s.map(x => x.t))) pareja[h[a].k] = s[b].k;
  }
  return pareja;
}

// Parejas en orden entre dos listas de instantes ya ordenadas, sin cruces: tantas como
// tenga la más corta y, entre todas las formas de lograrlo, la de menor distancia total.
// A la misma distancia se queda con los más tempranos de la lista larga.
function enOrdenSinCruzar(h: readonly number[], s: readonly number[]): [number, number][] {
  if (h.length > s.length) return enOrdenSinCruzar(s, h).map(([j, i]) => [i, j]);
  // costo[i][j]: lo mínimo para darles pareja a los primeros i de h entre los primeros j de s.
  const costo = [new Array<number>(s.length + 1).fill(0), ...h.map(() => new Array<number>(s.length + 1).fill(Infinity))];
  for (let i = 1; i <= h.length; i++) {
    for (let j = i; j <= s.length; j++) {
      costo[i][j] = Math.min(costo[i][j - 1], costo[i - 1][j - 1] + Math.abs(h[i - 1] - s[j - 1]));
    }
  }
  const pares: [number, number][] = [];
  let j = s.length;
  for (let i = h.length; i > 0; i--, j--) {
    // Si saltarse la más tardía cuesta lo mismo, se salta: queda la más temprana.
    while (j > i && costo[i][j - 1] === costo[i][j]) j--;
    pares.push([i - 1, j - 1]);
  }
  return pares;
}

// A cuál descanso queda anotada cada fila de una jornada que el administrador
// reescribió. Las filas que terminan en un descanso se asignan con la MISMA regla del
// kiosco y de la tabla (`ventanasDeLasSalidas`): la ventana heredada de la salida del
// mismo minuto si sigue en el día y nadie la usó, y si no, la que tocaba a esa hora.
// Si cada uno asignara a su manera, la tabla contaría otra historia de lo que se
// acaba de guardar. Las demás filas, null; sin día, ninguna.
export function completarVentanasDeDescanso(
  dia: DiaConDescansos | null,
  filas: readonly { salida: Date | null; fin: string | null }[],
  heredadas: readonly (string | null)[],
): (string | null)[] {
  const deDescanso = filas.flatMap((f, k) => (f.fin === 'DESCANSO' && f.salida ? [k] : []));
  const asignadas = dia
    ? ventanasDeLasSalidas(dia, deDescanso.map(k => ({ salida: filas[k].salida!, descansoVentana: heredadas[k] ?? null })))
    : [];
  return filas.map((_, k) => {
    const v = asignadas[deDescanso.indexOf(k)];
    return v ? claveDeVentana(v) : null;
  });
}
