import { minutosAlmuerzoADescontar, minutosEnVentana, type DiaParaAlmuerzo } from './almuerzo';
import { ajustarAJornada, type DiaParaAjuste } from './ajusteJornada';
import { minutosDe } from './tardanzas';

// Qué pasó con el almuerzo de UN día.
//
// El almuerzo no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Esta función lee ese hueco.
//
// Existe para que la columna de Registros, el modal de detalle y el reporte
// cuenten la MISMA historia. Si cada pantalla dedujera el almuerzo por su
// cuenta, tarde o temprano dirían cosas distintas del mismo día, y el
// administrador no tendría forma de saber cuál creer.
//
// Distingue a propósito dos números que es fácil confundir:
//  - `minutos`: lo que la persona se tomó de verdad (lo que se ve).
//  - `minutosDescontados`: lo que ese almuerzo le cuesta al día (lo que se paga).
// No son lo mismo. Quien almuerza en 20 minutos se tomó 20, pero se le
// descuentan los 60 de la ventana: ese tiempo se lo regaló a la empresa.

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type RegistroDeDia = {
  entrada: Date | null;
  salida: Date | null;
  salidaAlmuerzo: boolean;
  entradaEstimada: boolean;
};

// Los tramos que de verdad se pueden contar: abiertos, cerrados, y en ese orden.
//
// Una salida ANTERIOR a su entrada no es un tramo raro, es un imposible, y
// contarla resta horas que nadie dejó de trabajar. Aparece de verdad: el
// formulario de edición arma la entrada y la salida sobre la misma fecha, así
// que corregir a mano un turno nocturno deja guardada una salida del día
// anterior. Se ignora en vez de restarla.
function tramosUtiles<T extends RegistroDeDia>(registros: T[]): T[] {
  return registros.filter(r => r.entrada && r.salida && r.salida.getTime() > r.entrada.getTime());
}

export type EstadoAlmuerzo =
  | 'SIN_VENTANA'  // el día no tiene ventana congelada: no hay hora que mostrar
  | 'MARCADO'      // salió y volvió
  | 'EN_CURSO'     // está descansando ahora mismo, dentro de lo razonable
  | 'ABIERTO'      // se le pasó la hora con holgura y sigue sin volver
  | 'NO_MARCADO';  // hay ventana, pero nadie marcó la salida

// Cuánto se espera después del fin del descanso antes de tratarlo como olvido.
// Generoso a propósito: quien vuelve veinte minutos tarde y marca bien no
// debería tener que responder nada. Vive aquí, junto a `finDeLaVentana`, porque
// las dos preguntas son la misma y `cierreAlmuerzo` la reutiliza.
export const GRACIA_MIN = 60;

export type ResumenAlmuerzo = {
  estado: EstadoAlmuerzo;
  ventana: { inicio: string; fin: string } | null;
  salida: Date | null;
  regreso: Date | null;
  minutos: number | null;      // lo que se tomó de verdad
  minutosDescontados: number;  // lo que le cuesta al día
  regresoEstimado: boolean;    // el regreso lo puso el sistema, no una persona
  seExcedio: boolean;          // volvió después del fin de la ventana
  // Cuántos minutos después del FIN de la ventana volvió. Ojo: no es lo mismo
  // que "almorzó más de lo que dura la ventana". Quien sale a las 11:30 y
  // vuelve a las 12:50 almorzó 80 minutos —veinte más de los que dura— y aun
  // así llegó antes de las 13:00: no se pasó de nada.
  minutosDeMas: number;
};

export function resumirAlmuerzoDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaAlmuerzo,
  ahora: Date = new Date(),
): ResumenAlmuerzo {
  // Los tramos completos son los que cuentan para el descuento: uno abierto
  // todavía no dice cuánto se trabajó.
  const tramos = tramosUtiles(registros).map(r => ({ entrada: r.entrada!, salida: r.salida! }));
  // Un día sin ningún tramo cerrado no ha pagado nada, así que tampoco ha
  // descontado nada. Hay que decirlo aquí porque `minutosAlmuerzoADescontar`
  // devuelve los minutos fijos antes de mirar los tramos; el motor no se entera
  // porque solo mete al cálculo los días con algún tramo cerrado (reportes.ts).
  const minutosDescontados = tramos.length > 0 ? minutosAlmuerzoADescontar(tramos, dia) : 0;

  const conVentana = !!dia.almuerzoInicio && !!dia.almuerzoFin;
  const base: ResumenAlmuerzo = {
    estado: conVentana ? 'NO_MARCADO' : 'SIN_VENTANA',
    ventana: conVentana ? { inicio: dia.almuerzoInicio!, fin: dia.almuerzoFin! } : null,
    salida: null, regreso: null, minutos: null,
    minutosDescontados, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  };
  if (!conVentana) return base;

  // Ordenar por entrada: los registros pueden llegar en cualquier orden y el
  // "regreso" es el primer tramo POSTERIOR a la salida, no cualquiera.
  const enOrden = [...registros]
    .filter(r => r.entrada)
    .sort((a, b) => a.entrada!.getTime() - b.entrada!.getTime());

  const salidaAAlmorzar = enOrden.find(r => r.salidaAlmuerzo && r.salida);
  if (!salidaAAlmorzar) return base;

  const salida = salidaAAlmorzar.salida!;
  const regresoReg = enOrden.find(r => r.entrada!.getTime() > salida.getTime());
  if (!regresoReg) {
    // Salió y todavía no vuelve. Mientras su ventana siga abierta —más una hora
    // de gracia— está EN SU DESCANSO, que es lo normal y lo que se espera.
    // Llamar "sin regreso" a eso acusa a alguien de algo que no ha pasado, y lo
    // pinta en rojo mientras está comiendo.
    const seLePaso = ahora.getTime() > finDeLaVentana(salida, dia) + GRACIA_MIN * MS_MIN;
    return { ...base, estado: seLePaso ? 'ABIERTO' : 'EN_CURSO', salida };
  }

  const regreso = regresoReg.entrada!;
  const minutos = Math.round((regreso.getTime() - salida.getTime()) / MS_MIN);
  const minutosDeMas = Math.max(0, Math.round((regreso.getTime() - finDeLaVentana(salida, dia)) / MS_MIN));

  return {
    ...base,
    estado: 'MARCADO',
    salida, regreso, minutos,
    regresoEstimado: regresoReg.entradaEstimada,
    seExcedio: minutosDeMas > 0,
    minutosDeMas,
  };
}

// ¿Este tramo pisa a alguno de los otros del mismo día?
//
// Nadie está en dos turnos a la vez, así que dos tramos solapados son siempre un
// error. Aparecía al editar: quien corregía la salida de la mañana para ponerle
// la hora real de la tarde se tragaba entero el tramo del regreso del descanso, y
// el día volvía a partirse en dos filas —una de ellas imposible— sin que nada
// avisara.
//
// Tocarse en un extremo NO es pisarse: volver del descanso exactamente a la hora
// en que se salió es lo normal, así que la comparación es estricta.
export function tramoQueChoca<T extends { entrada: Date | null; salida: Date | null }>(
  nuevo: { entrada: Date | null; salida: Date | null },
  otros: T[],
): T | null {
  // Un tramo abierto todavía no dice dónde termina: no hay nada que juzgar.
  if (!nuevo.entrada || !nuevo.salida) return null;
  const ini = nuevo.entrada.getTime();
  const fin = nuevo.salida.getTime();
  return otros.find(o =>
    o.entrada && o.salida && ini < o.salida.getTime() && fin > o.entrada.getTime()) ?? null;
}

// Los instantes de una jornada, a partir de horas sueltas "HH:MM".
//
// Cada hora que no sea POSTERIOR a la anterior pertenece al día siguiente. Es lo
// que hace que un turno 20:00→05:00 se guarde entero en vez de con la salida
// nueve horas antes de su entrada: el formulario solo conoce una fecha, y colgar
// de ella las cuatro horas a ciegas era el origen de los tramos invertidos.
//
// El descanso de duración cero no rueda: salir y volver en el mismo minuto es
// raro pero no imposible, y mandarlo un día adelante sí sería un disparate.
export type HorasDeJornada = {
  entrada: string;
  descansoSalida?: string;
  descansoRegreso?: string;
  salida?: string;
};

export function instantesDeJornada(
  fecha: Date, // medianoche de Bogotá
  horas: HorasDeJornada,
): { entrada: Date; descansoSalida: Date | null; descansoRegreso: Date | null; salida: Date | null } {
  const enElDia = (hhmm: string) => new Date(fecha.getTime() + minutosDe(hhmm) * MS_MIN);

  const entrada = enElDia(horas.entrada);
  let tope = entrada.getTime();

  // `permiteIgual` para el descanso instantáneo; para el resto, seguir en la
  // misma hora significaría no haber avanzado, y eso es el día siguiente.
  const siguiente = (hhmm: string | undefined, permiteIgual = false): Date | null => {
    if (!hhmm) return null;
    let t = enElDia(hhmm).getTime();
    while (permiteIgual ? t < tope : t <= tope) t += UN_DIA_MS;
    tope = t;
    return new Date(t);
  };

  const descansoSalida = siguiente(horas.descansoSalida);
  const descansoRegreso = siguiente(horas.descansoRegreso, true);
  const salida = siguiente(horas.salida);
  return { entrada, descansoSalida, descansoRegreso, salida };
}

// La marcación que CIERRA la jornada, o null si todavía está abierta.
//
// Una salida al descanso NO la cierra. La persona no se fue: sigue en su turno,
// solo que ahora está descansando. Tomarla como fin de jornada ponía la hora del
// descanso en la columna de Salida —diciendo que se había ido a casa— y dejaba
// la duración del día en cero.
export function marcacionQueCierra<T extends RegistroDeDia>(marcaciones: T[]): T | null {
  const ultima = [...marcaciones].reverse().find(m => m.salida);
  if (!ultima || ultima.salidaAlmuerzo) return null;
  // Si después de esa salida alguien volvió a entrar y sigue dentro, tampoco.
  const vueltaDespues = marcaciones.some(m => m.entrada && !m.salida
    && m.entrada.getTime() >= ultima.salida!.getTime());
  return vueltaDespues ? null : ultima;
}

// Un día partido en JORNADAS.
//
// Marcar el almuerzo parte la jornada en dos tramos. La tabla de Registros los
// mostraba como dos filas —el mismo día repetido, con la segunda medio vacía,
// sin llegada y sin almuerzo— y se leía como una marcación duplicada. Pero
// volver del almuerzo no es empezar otra jornada: es seguir la misma.
//
// La regla, entonces: un tramo se funde con el siguiente SOLO si ese tramo cerró
// saliendo a almorzar. Quien sale y vuelve por la tarde a hacer horas extra sí
// empieza una jornada nueva, y esa sí merece su propia fila.
export type JornadaDelDia<T> = {
  marcaciones: T[];
  minutosContados: number;
  // Del descuento de almuerzo del día, cuánto le tocó pagar a ESTA jornada. No
  // es lo mismo que `almuerzo.minutosDescontados`, que es el del día entero:
  // decir "−1 h" sobre una fila que solo alcanzó a pagar media es una
  // contradicción a la vista de cualquiera.
  minutosAlmuerzoAqui: number;
  // Solo en la jornada que contiene el almuerzo. En las demás va null: repetirlo
  // en cada fila del día invita a sumar dos veces el mismo descuento, y esos
  // minutos son plata.
  almuerzo: ResumenAlmuerzo | null;
};

// Agrupa las marcaciones de un día en jornadas. Un tramo se funde con el
// siguiente SOLO si cerró saliendo al descanso.
//
// Se exige además que el siguiente empiece después de que el anterior cerró: dos
// tramos solapados son datos rotos de una edición a mano, y encadenarlos daría
// una jornada cuya salida es anterior a su propia entrada.
//
// Espera las marcaciones YA ordenadas por entrada.
export function agruparEnJornadas<T extends RegistroDeDia>(enOrden: T[]): T[][] {
  const bloques: T[][] = [];
  for (const r of enOrden) {
    const actual = bloques[bloques.length - 1];
    const ultimo = actual?.[actual.length - 1];
    const sigue = !!ultimo?.salidaAlmuerzo && !!ultimo.salida && !!r.entrada
      && r.entrada.getTime() >= ultimo.salida.getTime();
    if (sigue) actual.push(r);
    else bloques.push([r]);
  }
  return bloques;
}

export function partirDiaEnJornadas<T extends RegistroDeDia>(
  registros: T[],
  dia: DiaParaAlmuerzo & DiaParaAjuste,
): JornadaDelDia<T>[] {
  // Los registros llegan en el orden que quiera la base y la agrupación depende
  // de quién sigue a quién. Las marcaciones sin hora de entrada —creadas a mano,
  // incompletas— van al final: no hay forma de encadenarlas.
  const enOrden = [...registros].sort((a, b) => {
    if (!a.entrada) return 1;
    if (!b.entrada) return -1;
    return a.entrada.getTime() - b.entrada.getTime();
  });
  if (enOrden.length === 0) return [];

  const bloques = agruparEnJornadas(enOrden);

  const almuerzo = resumirAlmuerzoDelDia(enOrden, dia);
  // De qué jornada es el almuerzo: la que contiene la salida a almorzar. Cuando
  // nadie la marcó —el caso de "descontar 60 min" sin ventana horaria, que es el
  // de la mayoría— es la primera del día, que es donde se mira primero.
  const iDelAlmuerzo = Math.max(0, bloques.findIndex(b => b.some(r => r.salidaAlmuerzo && r.salida)));

  const tramosDe = (b: T[]) => tramosUtiles(b).map(r => ajustarAJornada(r.entrada!, r.salida!, dia));
  const porBloque = bloques.map(tramosDe);
  const trabajados = porBloque.map(ts =>
    ts.reduce((s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0));

  // El descuento se calcula UNA vez para todo el día y después se reparte. Es la
  // trampa de este cambio: sin ventana horaria `minutosAlmuerzoADescontar`
  // devuelve los minutos fijos del día, no un número proporcional a los tramos,
  // así que pedirlo una vez por jornada lo cobraría dos veces y le robaría una
  // hora al día sin que nadie lo notara.
  const todos = porBloque.flat();
  const descuento = todos.length > 0 ? minutosAlmuerzoADescontar(todos, dia) : 0;

  // A QUIÉN se le cobra. Con ventana, a cada jornada los minutos que SUS tramos
  // pasaron dentro de ella: quien se fue a las diez de la mañana no almorzó, y
  // cargarle el almuerzo a esa fila para no tocar la del mediodía deja las dos
  // mintiendo aunque el total del día cuadre. Sin ventana el descuento es un
  // fijo del horario, no es proporcional a nada, y va entero a la del almuerzo.
  const solapes = porBloque.map(ts => minutosEnVentana(ts, dia));
  const enLaVentana = solapes.reduce<number>((s, p) => s + (p ?? 0), 0);
  const cobro = new Array(bloques.length).fill(0);
  if (enLaVentana <= 0) {
    cobro[iDelAlmuerzo] = descuento;
  } else {
    // El último con solape se lleva el resto: así los cobros suman exactamente
    // el descuento del día, que viene ya redondeado.
    const ultimo = solapes.reduce<number>((u, p, k) => ((p ?? 0) > 0 ? k : u), 0);
    let dado = 0;
    for (let k = 0; k < bloques.length; k++) {
      if ((solapes[k] ?? 0) <= 0) continue;
      cobro[k] = k === ultimo ? descuento - dado : descuento * solapes[k]! / enLaVentana;
      dado += cobro[k];
    }
  }

  // Lo que una jornada no alcanza a pagar lo pagan las demás, empezando por la
  // del almuerzo. Media jornada con una hora de almuerzo fijo dejaría el recorte
  // a medias y el día contaría de más.
  const quita = new Array(bloques.length).fill(0);
  let pendiente = 0;
  for (let k = 0; k < bloques.length; k++) {
    quita[k] = Math.min(cobro[k], trabajados[k]);
    pendiente += cobro[k] - quita[k];
  }
  for (const i of [iDelAlmuerzo, ...bloques.map((_, k) => k).filter(k => k !== iDelAlmuerzo)]) {
    const cabe = Math.min(pendiente, trabajados[i] - quita[i]);
    quita[i] += cabe;
    pendiente -= cabe;
  }

  // Se redondea sobre el acumulado, no jornada por jornada: redondear cada una
  // por su cuenta descuadraría la suma en un minuto, y dos filas que no dan el
  // total que muestra el modal no se pueden defender ante nadie.
  let acumulado = 0;
  let entregado = 0;
  let almuerzoAcum = 0;
  let almuerzoEntregado = 0;
  return bloques.map((marcaciones, i) => {
    acumulado += trabajados[i] - quita[i];
    const minutosContados = Math.round(acumulado) - entregado;
    entregado += minutosContados;
    almuerzoAcum += quita[i];
    const minutosAlmuerzoAqui = Math.round(almuerzoAcum) - almuerzoEntregado;
    almuerzoEntregado += minutosAlmuerzoAqui;
    return {
      marcaciones, minutosContados, minutosAlmuerzoAqui,
      almuerzo: i === iDelAlmuerzo ? almuerzo : null,
    };
  });
}

// Instante en que se acaba la ventana de almuerzo de ESE turno.
//
// La ventana es una hora ("13:00"), no una fecha, así que hay que anclarla. Se
// ancla a la fila del día, con la misma corrección que hace
// `minutosAlmuerzoADescontar`: el almuerzo de un turno nocturno cae en la
// madrugada del día SIGUIENTE al que ancla la fila. Si la salida a almorzar ya
// pasó el fin calculado, la ventana que aplica es la del día siguiente — es el
// mismo almuerzo, contado desde el otro extremo.
export function finDeLaVentana(salida: Date, dia: DiaParaAlmuerzo): number {
  const inicio = dia.fecha.getTime() + minutosDe(dia.almuerzoInicio!) * MS_MIN;
  let fin = dia.fecha.getTime() + minutosDe(dia.almuerzoFin!) * MS_MIN;
  if (fin <= inicio) fin += UN_DIA_MS;
  return salida.getTime() > fin ? fin + UN_DIA_MS : fin;
}

// Cuánto tiempo se le contó a alguien en un día: la suma de sus tramos, ya
// ajustada por la tolerancia de salida y ya descontado el almuerzo.
//
// Es la pregunta por la que se abre la pantalla —"¿trabajó sus ocho horas o
// no?"— y hoy no se responde en ningún lado: la tabla muestra cada tramo por
// separado y deja al administrador sumando de cabeza.
//
// Se puede mostrar sin miedo a contradecir la nómina porque este total NO
// depende de lo que la persona llevara acumulado esa semana. El acumulado
// decide cómo se CLASIFICAN los minutos (ordinaria, extra, nocturna), no
// cuántos son. Por eso el número no baila según el filtro de fechas de la
// pantalla, que es justo lo que lo haría indefendible.
//
// Lo que este número NO es: plata. Para eso está el reporte, donde esos mismos
// minutos ya vienen repartidos por tipo de hora y con sus recargos.
export function minutosContadosDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaAlmuerzo & DiaParaAjuste,
): number {
  const tramos = tramosUtiles(registros).map(r => ajustarAJornada(r.entrada!, r.salida!, dia));
  if (tramos.length === 0) return 0;

  const trabajados = tramos.reduce(
    (s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0,
  );
  const almuerzo = minutosAlmuerzoADescontar(
    tramos.map(t => ({ entrada: t.entrada, salida: t.salida })), dia,
  );
  // Media jornada con una hora de almuerzo fijo daría negativo. Cero es la
  // respuesta honesta; un número en rojo sería una invención.
  return Math.max(0, Math.round(trabajados - almuerzo));
}
