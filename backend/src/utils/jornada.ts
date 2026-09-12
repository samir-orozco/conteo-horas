import type { MetodoMarcacion } from '@prisma/client';
import {
  minutosAlmuerzoADescontar, minutosDescansoADescontar, minutosEnLaVentana, finDeLaVentanaDe,
  ventanaDeAlmuerzo, ventanaDeDescanso,
  type DiaParaAlmuerzo, type DiaParaDescanso, type VentanaDelDia,
} from './almuerzo';
import { ajustarAJornada, type DiaParaAjuste } from './ajusteJornada';
import { minutosDe } from './tardanzas';

// Qué pasó con una pausa de UN día: el almuerzo o el descanso no remunerado.
//
// La pausa no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Con descanso y almuerzo son tres tramos y dos huecos. Esta
// función lee cada hueco.
//
// Existe para que la columna de Registros, el modal de detalle y el reporte
// cuenten la MISMA historia. Si cada pantalla dedujera las pausas por su cuenta,
// tarde o temprano dirían cosas distintas del mismo día, y el administrador no
// tendría forma de saber cuál creer.
//
// Distingue a propósito dos números que es fácil confundir:
//  - `minutos`: lo que la persona se tomó de verdad (lo que se ve).
//  - `minutosDescontados`: lo que esa pausa le cuesta al día (lo que se paga).
// No son lo mismo. Quien almuerza en 20 minutos se tomó 20, pero se le
// descuentan los 60 de la ventana: ese tiempo se lo regaló a la empresa.

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type RegistroDeDia = {
  entrada: Date | null;
  salida: Date | null;
  salidaAlmuerzo: boolean;
  // La salida fue al descanso no remunerado. Como la del almuerzo, no cierra la
  // jornada: la persona sigue en su turno.
  salidaDescanso: boolean;
  entradaEstimada: boolean;
};

export type PausaDeJornada = 'ALMUERZO' | 'DESCANSO';

// A qué pausa salió esta marcación, o null si su salida no fue a ninguna. Es LA
// pregunta de la que salen la agrupación en filas, la columna de Salida y los
// rótulos, así que vive en un solo sitio: si cada una la contestara por su
// cuenta, un descanso partiría el día en una pantalla y no en la otra.
function pausaDeLaSalida(r: RegistroDeDia): PausaDeJornada | null {
  if (!r.salida) return null;
  if (r.salidaAlmuerzo) return 'ALMUERZO';
  if (r.salidaDescanso) return 'DESCANSO';
  return null;
}

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

export type EstadoPausa =
  | 'SIN_VENTANA'  // el día no tiene ventana congelada: no hay hora que mostrar
  | 'MARCADO'      // salió y volvió
  | 'EN_CURSO'     // está en su pausa ahora mismo, dentro de lo razonable
  | 'ABIERTO'      // se le pasó la hora con holgura y sigue sin volver
  | 'NO_MARCADO';  // hay ventana, pero nadie marcó la salida

// Cuánto se espera después del fin de la pausa antes de tratarla como olvido.
// Generoso a propósito: quien vuelve veinte minutos tarde y marca bien no
// debería tener que responder nada. Vive aquí, junto al resumen de la pausa,
// porque las dos preguntas son la misma y `cierreAlmuerzo` la reutiliza.
export const GRACIA_MIN = 60;

export type ResumenPausa = {
  estado: EstadoPausa;
  ventana: { inicio: string; fin: string } | null;
  salida: Date | null;
  regreso: Date | null;
  minutos: number | null;      // lo que se tomó de verdad
  // Cuánto dura la pausa según el horario. Con esto se puede decir cuánto se
  // tomó DE MÁS, que no es lo mismo que volver tarde: quien sale quince minutos
  // antes y vuelve quince tarde solo "volvió 15 tarde", pero se tomó media hora
  // de más.
  minutosVentana: number | null;
  minutosDescontados: number;  // lo que le cuesta al día
  regresoEstimado: boolean;    // el regreso lo puso el sistema, no una persona
  seExcedio: boolean;          // volvió después del fin de la ventana
  // Cuántos minutos después del FIN de la ventana volvió. Ojo: no es lo mismo
  // que "almorzó más de lo que dura la ventana". Quien sale a las 11:30 y
  // vuelve a las 12:50 almorzó 80 minutos —veinte más de los que dura— y aun
  // así llegó antes de las 13:00: no se pasó de nada.
  minutosDeMas: number;
};

// Cuánto dura una ventana, en minutos. La que cruza la medianoche —un nocturno
// que come a las 23:30— se mide sumándole el día.
function duracionDe(v: VentanaDelDia): number {
  const ini = minutosDe(v.inicio!);
  const fin = minutosDe(v.fin!);
  return fin > ini ? fin - ini : fin + 1440 - ini;
}

function resumirPausa(
  registros: RegistroDeDia[],
  pausa: PausaDeJornada,
  ventana: VentanaDelDia,
  minutosDescontados: number,
  ahora: Date,
): ResumenPausa {
  const conVentana = !!ventana.inicio && !!ventana.fin;
  const base: ResumenPausa = {
    estado: conVentana ? 'NO_MARCADO' : 'SIN_VENTANA',
    ventana: conVentana ? { inicio: ventana.inicio!, fin: ventana.fin! } : null,
    salida: null, regreso: null, minutos: null,
    minutosVentana: conVentana ? duracionDe(ventana) : null,
    minutosDescontados, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  };
  if (!conVentana) return base;

  // Ordenar por entrada: los registros pueden llegar en cualquier orden y el
  // "regreso" es el primer tramo POSTERIOR a la salida, no cualquiera.
  const enOrden = [...registros]
    .filter(r => r.entrada)
    .sort((a, b) => a.entrada!.getTime() - b.entrada!.getTime());

  const salidaALaPausa = enOrden.find(r => pausaDeLaSalida(r) === pausa);
  if (!salidaALaPausa) return base;

  const salida = salidaALaPausa.salida!;
  const regresoReg = enOrden.find(r => r.entrada!.getTime() > salida.getTime());
  if (!regresoReg) {
    // Salió y todavía no vuelve. Mientras su ventana siga abierta —más una hora
    // de gracia— está EN SU PAUSA, que es lo normal y lo que se espera. Llamar
    // "sin regreso" a eso acusa a alguien de algo que no ha pasado, y lo pinta
    // en rojo mientras está comiendo.
    const seLePaso = ahora.getTime() > finDeLaVentanaDe(salida, ventana) + GRACIA_MIN * MS_MIN;
    return { ...base, estado: seLePaso ? 'ABIERTO' : 'EN_CURSO', salida };
  }

  const regreso = regresoReg.entrada!;
  const minutos = Math.round((regreso.getTime() - salida.getTime()) / MS_MIN);
  const minutosDeMas = Math.max(0, Math.round((regreso.getTime() - finDeLaVentanaDe(salida, ventana)) / MS_MIN));

  return {
    ...base,
    estado: 'MARCADO',
    salida, regreso, minutos,
    regresoEstimado: regresoReg.entradaEstimada,
    seExcedio: minutosDeMas > 0,
    minutosDeMas,
  };
}

// Los tramos completos del día son los que cuentan para el descuento: uno
// abierto todavía no dice cuánto se trabajó.
const tramosCerrados = (registros: RegistroDeDia[]) =>
  tramosUtiles(registros).map(r => ({ entrada: r.entrada!, salida: r.salida! }));

export function resumirAlmuerzoDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaAlmuerzo,
  ahora: Date = new Date(),
): ResumenPausa {
  const tramos = tramosCerrados(registros);
  // Un día sin ningún tramo cerrado no ha pagado nada, así que tampoco ha
  // descontado nada. Hay que decirlo aquí porque `minutosAlmuerzoADescontar`
  // devuelve los minutos fijos antes de mirar los tramos; el motor no se entera
  // porque solo mete al cálculo los días con algún tramo cerrado (reportes.ts).
  const minutosDescontados = tramos.length > 0 ? minutosAlmuerzoADescontar(tramos, dia) : 0;
  return resumirPausa(registros, 'ALMUERZO', ventanaDeAlmuerzo(dia), minutosDescontados, ahora);
}

export function resumirDescansoDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaDescanso,
  ahora: Date = new Date(),
): ResumenPausa {
  const minutosDescontados = minutosDescansoADescontar(tramosCerrados(registros), dia);
  return resumirPausa(registros, 'DESCANSO', ventanaDeDescanso(dia), minutosDescontados, ahora);
}

// ¿Este tramo pisa a alguno de los otros del mismo día?
//
// Nadie está en dos turnos a la vez, así que dos tramos solapados son siempre un
// error. Aparecía al editar: quien corregía la salida de la mañana para ponerle
// la hora real de la tarde se tragaba entero el tramo del regreso del descanso, y
// el día volvía a partirse en dos filas —una de ellas imposible— sin que nada
// avisara.
//
// Tocarse en un extremo NO es pisarse: volver de una pausa exactamente a la hora
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
// de ella las horas a ciegas era el origen de los tramos invertidos.
//
// Con dos pausas, primero hay que saber en qué orden ocurrieron, y ese orden se
// mide DESDE LA ENTRADA: en un turno nocturno el descanso de las 22:00 va antes
// que el almuerzo de la 01:00, aunque la hora suelta diga lo contrario.
//
// La pausa de duración cero no rueda: salir y volver en el mismo minuto es raro
// pero no imposible, y mandarlo un día adelante sí sería un disparate.
export type HorasDeJornada = {
  entrada: string;
  almuerzo?: { salida: string; regreso?: string };
  descanso?: { salida: string; regreso?: string };
  salida?: string;
};

export type InstantesDeJornada = {
  entrada: Date;
  pausas: { tipo: PausaDeJornada; salida: Date; regreso: Date | null }[]; // en el orden en que ocurrieron
  salida: Date | null;
};

export function instantesDeJornada(
  fecha: Date, // medianoche de Bogotá
  horas: HorasDeJornada,
): InstantesDeJornada {
  const enElDia = (hhmm: string) => new Date(fecha.getTime() + minutosDe(hhmm) * MS_MIN);

  const entrada = enElDia(horas.entrada);
  let tope = entrada.getTime();

  // `permiteIgual` para la pausa instantánea; para el resto, seguir en la misma
  // hora significaría no haber avanzado, y eso es el día siguiente.
  const siguiente = (hhmm: string | undefined, permiteIgual = false): Date | null => {
    if (!hhmm) return null;
    let t = enElDia(hhmm).getTime();
    while (permiteIgual ? t < tope : t <= tope) t += UN_DIA_MS;
    tope = t;
    return new Date(t);
  };

  const desdeLaEntrada = (hhmm: string) => (minutosDe(hhmm) - minutosDe(horas.entrada) + 1440) % 1440;
  const pedidas: { tipo: PausaDeJornada; horas: { salida: string; regreso?: string } }[] = [];
  if (horas.almuerzo?.salida) pedidas.push({ tipo: 'ALMUERZO', horas: horas.almuerzo });
  if (horas.descanso?.salida) pedidas.push({ tipo: 'DESCANSO', horas: horas.descanso });
  pedidas.sort((a, b) => desdeLaEntrada(a.horas.salida) - desdeLaEntrada(b.horas.salida));

  const pausas = pedidas.map(p => {
    const salida = siguiente(p.horas.salida)!;
    const regreso = siguiente(p.horas.regreso, true);
    return { tipo: p.tipo, salida, regreso };
  });
  const salida = siguiente(horas.salida);
  return { entrada, pausas, salida };
}

// Las filas en que se guarda una jornada que el administrador reescribe entera:
// una por tramo trabajado, y cada una sabe cómo termina —en una pausa, en la
// salida del día o todavía abierta—. Lo que no se puede cumplir se rechaza aquí,
// con un mensaje, antes de tocar la base.
export type TramoDeJornada = { entrada: Date; salida: Date | null; fin: FinDeTramo };

const DE_LA_PAUSA: Record<PausaDeJornada, string> = { ALMUERZO: 'del almuerzo', DESCANSO: 'del descanso' };

export function tramosDeLaJornada(t: InstantesDeJornada): { tramos: TramoDeJornada[] } | { error: string } {
  const tramos: TramoDeJornada[] = [];
  let inicio = t.entrada;
  for (let i = 0; i < t.pausas.length; i++) {
    const p = t.pausas[i];
    tramos.push({ entrada: inicio, salida: p.salida, fin: p.tipo });
    if (p.regreso) { inicio = p.regreso; continue; }
    // Salió a una pausa y no volvió: la jornada termina ahí. Cualquier cosa
    // escrita después describe algo que no pudo pasar.
    if (i < t.pausas.length - 1) {
      return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, no puede haber otra pausa después` };
    }
    if (t.salida) {
      return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, la jornada no puede tener hora de salida` };
    }
    return { tramos };
  }
  tramos.push({ entrada: inicio, salida: t.salida, fin: t.salida ? 'SALIDA' : null });
  return { tramos };
}

// La marcación que CIERRA la jornada, o null si todavía está abierta.
//
// Una salida a una pausa —almuerzo o descanso— NO la cierra. La persona no se
// fue: sigue en su turno, solo que ahora está en su pausa. Tomarla como fin de
// jornada ponía la hora de la pausa en la columna de Salida —diciendo que se
// había ido a casa— y dejaba la duración del día en cero.
export function marcacionQueCierra<T extends RegistroDeDia>(marcaciones: T[]): T | null {
  const ultima = [...marcaciones].reverse().find(m => m.salida);
  if (!ultima || pausaDeLaSalida(ultima)) return null;
  // Si después de esa salida alguien volvió a entrar y sigue dentro, tampoco.
  const vueltaDespues = marcaciones.some(m => m.entrada && !m.salida
    && m.entrada.getTime() >= ultima.salida!.getTime());
  return vueltaDespues ? null : ultima;
}

// Si el auto-cierre tocó esta jornada.
//
// No basta con mirar la marcación que la cierra: cuando el barrido no encuentra
// la franja del colaborador (sin horario, horario inactivo, o un día que ninguna
// franja cubre) marca `salidaEstimada` y deja la hora en null a propósito, para
// que la ponga el admin. En esa jornada NINGUNA marcación tiene salida, así que
// `marcacionQueCierra` devuelve null y la marca se perdía: la tabla de Registros
// pintaba la fila igual que un turno que nadie tocó, mientras el detalle del
// mismo registro decía "El sistema cerró este turno".
export function laCerroElSistema(marcaciones: (RegistroDeDia & { salidaEstimada: boolean })[]): boolean {
  const cierra = marcacionQueCierra(marcaciones);
  return cierra ? cierra.salidaEstimada : marcaciones.some(m => m.salidaEstimada);
}

// Un día partido en JORNADAS.
//
// Marcar una pausa parte la jornada en tramos. La tabla de Registros los mostraba
// como filas separadas —el mismo día repetido, con la segunda medio vacía, sin
// llegada y sin almuerzo— y se leía como una marcación duplicada. Pero volver de
// una pausa no es empezar otra jornada: es seguir la misma.
//
// La regla, entonces: un tramo se funde con el siguiente SOLO si ese tramo cerró
// saliendo a una pausa. Quien sale y vuelve por la tarde a hacer horas extra sí
// empieza una jornada nueva, y esa sí merece su propia fila.
export type JornadaDelDia<T> = {
  marcaciones: T[];
  minutosContados: number;
  // De cada descuento del día, cuánto le tocó pagar a ESTA jornada. No es lo
  // mismo que `almuerzo.minutosDescontados`, que es el del día entero: decir
  // "−1 h" sobre una fila que solo alcanzó a pagar media es una contradicción a
  // la vista de cualquiera.
  minutosAlmuerzoAqui: number;
  minutosDescansoAqui: number;
  // Solo en la jornada que contiene la pausa. En las demás va null: repetirlo en
  // cada fila del día invita a sumar dos veces el mismo descuento, y esos
  // minutos son plata.
  almuerzo: ResumenPausa | null;
  descanso: ResumenPausa | null;
};

// Las marcaciones ordenadas por hora de entrada. La base no garantiza ningún
// orden y toda la agrupación depende de quién sigue a quién. Las que no tienen
// entrada —cargadas a mano, incompletas— van al final: no hay forma de
// encadenarlas.
function enOrdenDeEntrada<T extends RegistroDeDia>(registros: T[]): T[] {
  return [...registros].sort((a, b) => {
    if (!a.entrada) return 1;
    if (!b.entrada) return -1;
    return a.entrada.getTime() - b.entrada.getTime();
  });
}

// Agrupa las marcaciones de un día en jornadas. Un tramo se funde con el
// siguiente SOLO si cerró saliendo a una pausa.
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
    const sigue = !!ultimo && !!pausaDeLaSalida(ultimo) && !!r.entrada
      && r.entrada.getTime() >= ultimo.salida!.getTime();
    if (sigue) actual.push(r);
    else bloques.push([r]);
  }
  return bloques;
}

// Qué es cada marca DENTRO del día.
//
// `salidaAlmuerzo` y `salidaDescanso` son booleanos sueltos en el registro, y
// hasta ahora cada pantalla los re-interpretaba por su cuenta: la tabla de
// Registros lo resolvía bien, el detalle de la jornada rotulaba la foto de la
// salida a almorzar como "Salida" —afirmando que la persona se fue a su casa a
// las 14:04 cuando volvió a las 14:50— y el dashboard ni siquiera traía el
// campo. Tres lecturas del mismo dato, dos equivocadas. Esta función es la única.
//
// Se apoya en `agruparEnJornadas` y no en "la primera entrada del día es la
// entrada y las demás son regresos": quien sale y vuelve por la tarde a hacer
// extras abre una jornada NUEVA, y su entrada de las 19:00 no es un regreso de
// ninguna pausa. Con la regla ingenua, el administrador leería un almuerzo de
// siete horas.
export type Momento =
  | 'ENTRADA'
  | 'SALIDA_ALMUERZO' | 'REGRESO_ALMUERZO'
  | 'SALIDA_DESCANSO' | 'REGRESO_DESCANSO'
  | 'SALIDA';

// Un rótulo por pausa, con el tipo exhaustivo: una tercera pausa no compila
// hasta que alguien decida cómo se llaman su salida y su regreso.
const SALIDA_A: Record<PausaDeJornada, Momento> = { ALMUERZO: 'SALIDA_ALMUERZO', DESCANSO: 'SALIDA_DESCANSO' };
const REGRESO_DE: Record<PausaDeJornada, Momento> = { ALMUERZO: 'REGRESO_ALMUERZO', DESCANSO: 'REGRESO_DESCANSO' };

export type MomentosDeMarcacion = {
  entrada: Momento | null; // null: la marcación no tiene hora de entrada
  salida: Momento | null; // null: sigue abierta
};

export function momentosDelDia<T extends RegistroDeDia & { id: string }>(
  registros: T[],
): Map<string, MomentosDeMarcacion> {
  const momentos = new Map<string, MomentosDeMarcacion>();
  for (const jornada of agruparEnJornadas(enOrdenDeEntrada(registros))) {
    jornada.forEach((m, i) => {
      // Dentro de una jornada, la marcación anterior siempre cerró saliendo a
      // una pausa: es lo que las fundió. Su pausa dice de dónde vuelve esta.
      const vuelveDe = i > 0 ? pausaDeLaSalida(jornada[i - 1]) : null;
      const saleA = pausaDeLaSalida(m);
      momentos.set(m.id, {
        entrada: !m.entrada ? null : vuelveDe ? REGRESO_DE[vuelveDe] : 'ENTRADA',
        // Una salida a una pausa no cierra la jornada ni siquiera cuando es la
        // última marca del día: la persona no se fue a su casa, simplemente no
        // volvió a marcar. Es la misma regla de `marcacionQueCierra`, y las dos
        // no pueden decir cosas distintas del mismo registro.
        salida: !m.salida ? null : saleA ? SALIDA_A[saleA] : 'SALIDA',
      });
    });
  }
  return momentos;
}

// A qué turno del día pertenece cada marcación, contando desde 0.
//
// Lo usa la pantalla de fotos del día para poner un título encima de cada
// turno. Se arma con la MISMA agrupación que `momentosDelDia` y no con una regla
// propia: si las dos agruparan distinto, la foto del regreso del descanso podría
// caer bajo el título de un turno nuevo. Hay una prueba que las amarra.
export function jornadaDeCadaMarcacion<T extends RegistroDeDia & { id: string }>(
  registros: T[],
): Map<string, number> {
  const turnos = new Map<string, number>();
  agruparEnJornadas(enOrdenDeEntrada(registros)).forEach((jornada, i) => {
    for (const m of jornada) turnos.set(m.id, i);
  });
  return turnos;
}

// Dónde se abrió y dónde se cerró la JORNADA que contiene a una marcación.
//
// El detalle se abre desde la fila con el id de UNA marcación y pintaba la sede
// de salida de esa marcación suelta. En una jornada con almuerzo esa salida es la
// del descanso: decía «Cerró en Laureles» de quien salió a almorzar allí y cerró
// en El Poblado, contradiciendo a la tabla. Esta es la regla de la tabla (la sede
// de la primera marcación y la de salida de `marcacionQueCierra`), sobre la misma
// agrupación que `momentosDelDia`.
export function sedesDeLaJornada<S>(
  registros: (RegistroDeDia & { id: string; sede: S | null; sedeSalida: S | null })[],
  id: string,
): { abrio: S | null; cerro: S | null } {
  const jornada = agruparEnJornadas(enOrdenDeEntrada(registros)).find(j => j.some(m => m.id === id));
  if (!jornada) return { abrio: null, cerro: null };
  return { abrio: jornada[0].sede, cerro: marcacionQueCierra(jornada)?.sedeSalida ?? null };
}

// Todo lo que dice CÓMO se marcó una salida. Es de la salida y no de la fila.
export type DatosDeSalida = {
  sedeSalidaId: string | null;
  fotoSalida: string | null;
  metodoSalida: MetodoMarcacion | null;
  distanciaSalida: number | null;
  salidaEstimada: boolean;
};

export type MarcacionEditable = RegistroDeDia & DatosDeSalida & { id: string; fotoEntrada: string | null };

// Cómo queda cada fila de la jornada editada, ya resuelta por `tramosDeLaJornada`:
// a qué hora entra, a qué hora sale y cómo termina.
export type FilaQueQueda = { entrada: Date; salida: Date | null; fin: FinDeTramo };

export type FotoQueSePierde = { momento: Momento; hora: Date | null };

// Qué papel cumple una salida: la de una pausa o la del día.
type Papel = PausaDeJornada | 'CIERRE';
// Una salida de la jornada editada: qué papel cumple, a qué hora quedó y de qué
// marcación de antes hereda lo suyo. La posición en la lista es la fila.
type Hueco<T> = { papel: Papel; hora: Date | null; fuente: T | null };

const SIN_SALIDA = { sedeSalidaId: null, fotoSalida: null, metodoSalida: null, distanciaSalida: null };

const mismoMinuto = (a: Date, b: Date) => Math.floor(a.getTime() / MS_MIN) === Math.floor(b.getTime() / MS_MIN);

// Una fila termina en una pausa si no termina en la salida del día ni sigue
// abierta. Así una pausa nueva cuenta como pausa sin tocar esto, y los `Record`
// de rótulos no compilan hasta que alguien le ponga nombre.
const esPausa = (fin: FinDeTramo): fin is PausaDeJornada => fin !== null && fin !== 'SALIDA';

// Qué salida guardaba cada marcación antes de editar. El cierre puede no tener
// hora: un turno abierto, o uno que el barrido marcó sin poder ponerle hora,
// sigue siendo el sitio de la salida del día.
function salidasDeAntes<T extends MarcacionEditable>(antes: T[]): Record<Papel, T | null> {
  const ultima = antes[antes.length - 1];
  const deLaPausa = (pausa: PausaDeJornada) => antes.find(m => pausaDeLaSalida(m) === pausa) ?? null;
  return {
    ALMUERZO: deLaPausa('ALMUERZO'),
    DESCANSO: deLaPausa('DESCANSO'),
    CIERRE: marcacionQueCierra(antes) ?? (ultima && !ultima.salida ? ultima : null),
  };
}

// Una fila abierta también es el sitio de la salida del día: solo que aún no la tiene.
function huecosQueQuedan<T>(filas: FilaQueQueda[], antes: Record<Papel, T | null>): Hueco<T>[] {
  return filas.map(f => {
    const papel: Papel = esPausa(f.fin) ? f.fin : 'CIERRE';
    return { papel, hora: f.salida, fuente: antes[papel] };
  });
}

// Qué fue la entrada de cada marcación de antes: la del día, o el regreso de la
// pausa en que terminó la anterior.
function entradaDe<T extends RegistroDeDia>(antes: T[], i: number): Momento {
  const vuelveDe = i > 0 ? pausaDeLaSalida(antes[i - 1]) : null;
  return vuelveDe ? REGRESO_DE[vuelveDe] : 'ENTRADA';
}

// Qué marcación de antes se reescribe con cada fila. Se elige por su ENTRADA y no
// por su posición: la foto de la entrada, su sede y cómo se marcó son de la fila,
// y al quitar el descanso de una jornada de tres, reescribir por posición le
// pegaba la foto del regreso de las 09:15 a la entrada de las 13:00.
//
// La primera fila es siempre la primera marcación, que nunca se borra. Para las
// demás vale primero la que entró en ese mismo minuto —cambiarle el papel a una
// marca no la vuelve otra— y si no, la que regresaba de la misma pausa. Si
// ninguna, la fila es nueva.
function filasQueSeReusan<T extends MarcacionEditable>(antes: T[], filas: FilaQueQueda[]): (T | null)[] {
  const tomadas = new Set<T>();
  const tomar = (m: T | undefined) => {
    if (m) tomadas.add(m);
    return m ?? null;
  };
  return filas.map((f, k) => {
    if (k === 0) return tomar(antes[0]);
    const libres = antes.filter(m => !tomadas.has(m));
    const alMismoMinuto = libres.find(m => m.entrada && mismoMinuto(m.entrada, f.entrada));
    if (alMismoMinuto) return tomar(alMismoMinuto);
    const anterior = filas[k - 1].fin;
    if (!esPausa(anterior)) return null;
    return tomar(libres.find(m => entradaDe(antes, antes.indexOf(m)) === REGRESO_DE[anterior]));
  });
}

// Una marca que cambió de papel sin cambiar de minuto es la MISMA marca: quien
// oprimió «salir a descansar» cuando se iba. Se busca solo para el hueco que no
// tiene de quién heredar una salida con hora, y entre las marcas que ningún otro
// hueco se llevó. Al minuto, porque el formulario manda HH:mm y el kiosco guarda
// segundos.
function reconocerLaMismaMarca<T extends MarcacionEditable>(huecos: Hueco<T>[], antes: T[]): Hueco<T>[] {
  const tomadas = new Set(huecos.map(h => h.fuente).filter(f => f?.salida));
  return huecos.map(h => {
    const hora = h.hora;
    if (!hora || h.fuente?.salida) return h;
    const misma = antes.find(m => m.salida && !tomadas.has(m) && mismoMinuto(m.salida, hora));
    if (!misma) return h;
    tomadas.add(misma);
    return { ...h, fuente: misma };
  });
}

function datosDelHueco<T extends MarcacionEditable>({ hora, fuente }: Hueco<T>): DatosDeSalida {
  // La marca de estimada va con el sitio de la salida y no con la hora: reabrir
  // un turno que cerró el sistema no puede dejarlo listo para que el barrido lo
  // vuelva a cerrar, y ponerle hora a mano no borra que nadie la marcó.
  const salidaEstimada = fuente?.salidaEstimada ?? false;
  if (!hora) return { ...SIN_SALIDA, salidaEstimada };
  if (!fuente?.salida) return { ...SIN_SALIDA, metodoSalida: 'MANUAL', salidaEstimada };
  const { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida } = fuente;
  return { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida, salidaEstimada };
}

// Las fotos que no quedan en ninguna fila: las de las salidas que nadie heredó
// con hora, y la de la entrada de una marcación que se borra.
function fotosQueSePierden<T extends MarcacionEditable>(antes: T[], huecos: Hueco<T>[], reusadas: (T | null)[]): FotoQueSePierde[] {
  const conservadas = new Set(huecos.filter(h => h.hora && h.fuente?.salida).map(h => h.fuente));
  const siguen = new Set(reusadas);
  const fotos: FotoQueSePierde[] = [];
  antes.forEach((m, i) => {
    if (!siguen.has(m) && m.fotoEntrada) fotos.push({ momento: entradaDe(antes, i), hora: m.entrada });
    if (m.fotoSalida && !conservadas.has(m)) {
      const saleA = pausaDeLaSalida(m);
      fotos.push({ momento: saleA ? SALIDA_A[saleA] : 'SALIDA', hora: m.salida });
    }
  });
  const orden = (f: FotoQueSePierde) => f.hora?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return fotos.sort((a, b) => orden(a) - orden(b));
}

// Lo que cuelga de una marcación (la novedad de una salida temprana) va a donde
// fue su salida. Si su salida no quedó en ninguna parte se queda en su fila, y si
// su fila se borra, a la primera, que nunca se borra.
function novedadesQueSeMueven<T extends MarcacionEditable>(
  antes: T[], huecos: Hueco<T>[], reusadas: (T | null)[],
): { desde: string; hacia: number }[] {
  return antes.flatMap(m => {
    const suSalida = huecos.findIndex(h => h.fuente === m);
    const suFila = reusadas.indexOf(m);
    const destino = suSalida >= 0 ? suSalida : suFila >= 0 ? suFila : 0;
    return reusadas[destino] === m ? [] : [{ desde: m.id, hacia: destino }];
  });
}

// Qué le toca a cada fila cuando el administrador reescribe una jornada entera, y
// qué se pierde en el camino.
//
// Quitar o poner una pausa cambia CUÁL salida guarda cada fila. La sede, la foto,
// el método, la distancia y la marca de estimada son de la salida, así que viajan
// juntos. Antes solo viajaba la sede: al quitar el almuerzo, la fila que quedaba
// decía «Salida 17:00» con la foto de la salida a almorzar, y la foto real de las
// 17:00 se borraba con la marcación de la tarde.
//
// La regla: la fila que queda con la salida a una pausa hereda la salida a ESA
// pausa de antes, y la que queda con la salida del día hereda la del día. Lo que
// antes no existía no se inventa: la escribió el administrador (MANUAL, sin foto
// ni sede).
//
// `filas` dice, para cada fila que queda, qué marcación de antes se reescribe
// (`reusa`, o null si es nueva) y todo lo de su salida. `sobran` son las que se
// borran. `fotosQueSePierden` son las que no quedan en ninguna fila: la ruta no
// guarda sin que el administrador lo confirme. `novedades` dice a qué fila se
// mueve lo que cuelga de cada marcación, que si no se borraría en cascada.
//
// Espera las marcaciones de UNA jornada en orden de entrada, y las filas que deja
// `tramosDeLaJornada`.
export function salidasTrasEditar<T extends MarcacionEditable>(antes: T[], filas: FilaQueQueda[]): {
  filas: { reusa: string | null; salida: DatosDeSalida }[];
  sobran: string[];
  fotosQueSePierden: FotoQueSePierde[];
  novedades: { desde: string; hacia: number }[];
} {
  const reusadas = filasQueSeReusan(antes, filas);
  const huecos = reconocerLaMismaMarca(huecosQueQuedan(filas, salidasDeAntes(antes)), antes);
  return {
    filas: huecos.map((h, k) => ({ reusa: reusadas[k]?.id ?? null, salida: datosDelHueco(h) })),
    sobran: antes.filter(m => !reusadas.includes(m)).map(m => m.id),
    fotosQueSePierden: fotosQueSePierden(antes, huecos, reusadas),
    novedades: novedadesQueSeMueven(antes, huecos, reusadas),
  };
}

// Cómo termina cada fila de una jornada reescrita: saliendo a una pausa, en la
// salida del día, o abierta.
export type FinDeTramo = PausaDeJornada | 'SALIDA' | null;

// A QUIÉN se le cobra el descuento de una pausa. Con ventana, a cada jornada los
// minutos que SUS tramos pasaron dentro de ella: quien se fue a las diez de la
// mañana no almorzó, y cargarle el almuerzo a esa fila para no tocar la del
// mediodía deja las dos mintiendo aunque el total del día cuadre. Sin solape
// —el almuerzo fijo sin ventana, que no es proporcional a nada— va entero a la
// jornada de la pausa.
function cobroPorJornada(descuento: number, solapes: (number | null)[], iDeLaPausa: number): number[] {
  const enLaVentana = solapes.reduce<number>((s, p) => s + (p ?? 0), 0);
  const cobro = new Array(solapes.length).fill(0);
  if (enLaVentana <= 0) {
    cobro[iDeLaPausa] = descuento;
    return cobro;
  }
  // El último con solape se lleva el resto: así los cobros suman exactamente el
  // descuento del día, que viene ya redondeado.
  const ultimo = solapes.reduce<number>((u, p, k) => ((p ?? 0) > 0 ? k : u), 0);
  let dado = 0;
  for (let k = 0; k < solapes.length; k++) {
    if ((solapes[k] ?? 0) <= 0) continue;
    cobro[k] = k === ultimo ? descuento - dado : descuento * solapes[k]! / enLaVentana;
    dado += cobro[k];
  }
  return cobro;
}

// Lo que una jornada no alcanza a pagar lo pagan las demás, empezando por la de
// la pausa. Media jornada con una hora de almuerzo fijo dejaría el recorte a
// medias y el día contaría de más.
function cobrarHastaDondeAlcance(cobro: number[], disponible: number[], iDeLaPausa: number): number[] {
  const quita = cobro.map((c, k) => Math.min(c, disponible[k]));
  let pendiente = cobro.reduce((s, c, k) => s + c - quita[k], 0);
  for (const i of [iDeLaPausa, ...cobro.map((_, k) => k).filter(k => k !== iDeLaPausa)]) {
    const cabe = Math.min(pendiente, disponible[i] - quita[i]);
    quita[i] += cabe;
    pendiente -= cabe;
  }
  return quita;
}

export function partirDiaEnJornadas<T extends RegistroDeDia>(
  registros: T[],
  dia: DiaParaAlmuerzo & DiaParaDescanso & DiaParaAjuste,
): JornadaDelDia<T>[] {
  const enOrden = enOrdenDeEntrada(registros);
  if (enOrden.length === 0) return [];

  const bloques = agruparEnJornadas(enOrden);

  const almuerzo = resumirAlmuerzoDelDia(enOrden, dia);
  const descanso = resumirDescansoDelDia(enOrden, dia);
  // De qué jornada es cada pausa: la que contiene su salida. Cuando nadie la
  // marcó —el caso de "descontar 60 min" sin ventana horaria, que es el de la
  // mayoría— es la primera del día, que es donde se mira primero.
  const iDe = (pausa: PausaDeJornada) => Math.max(0, bloques.findIndex(b => b.some(r => pausaDeLaSalida(r) === pausa)));
  const iDelAlmuerzo = iDe('ALMUERZO');
  const iDelDescanso = iDe('DESCANSO');

  const tramosDe = (b: T[]) => tramosUtiles(b).map(r => ajustarAJornada(r.entrada!, r.salida!, dia));
  const porBloque = bloques.map(tramosDe);
  const trabajados = porBloque.map(ts =>
    ts.reduce((s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0));

  // Cada descuento se calcula UNA vez para todo el día y después se reparte. Es
  // la trampa de este cálculo: sin ventana horaria `minutosAlmuerzoADescontar`
  // devuelve los minutos fijos del día, no un número proporcional a los tramos,
  // así que pedirlo una vez por jornada lo cobraría dos veces y le robaría una
  // hora al día sin que nadie lo notara.
  const todos = porBloque.flat();
  const descuentoAlmuerzo = todos.length > 0 ? minutosAlmuerzoADescontar(todos, dia) : 0;
  const quitaAlmuerzo = cobrarHastaDondeAlcance(
    cobroPorJornada(descuentoAlmuerzo, porBloque.map(ts => minutosEnLaVentana(ts, ventanaDeAlmuerzo(dia))), iDelAlmuerzo),
    trabajados, iDelAlmuerzo,
  );
  // El descanso cobra sobre lo que el almuerzo dejó: los dos juntos no pueden
  // quitarle a una jornada más de lo que trabajó.
  const libres = trabajados.map((t, k) => t - quitaAlmuerzo[k]);
  const descuentoDescanso = minutosDescansoADescontar(todos, dia);
  const quitaDescanso = cobrarHastaDondeAlcance(
    cobroPorJornada(descuentoDescanso, porBloque.map(ts => minutosEnLaVentana(ts, ventanaDeDescanso(dia))), iDelDescanso),
    libres, iDelDescanso,
  );

  // Se redondea sobre el acumulado, no jornada por jornada: redondear cada una
  // por su cuenta descuadraría la suma en un minuto, y dos filas que no dan el
  // total que muestra el modal no se pueden defender ante nadie.
  const redondeoAcumulado = () => {
    let acumulado = 0;
    let entregado = 0;
    return (valor: number) => {
      acumulado += valor;
      const aqui = Math.round(acumulado) - entregado;
      entregado += aqui;
      return aqui;
    };
  };
  const contados = redondeoAcumulado();
  const almuerzoAqui = redondeoAcumulado();
  const descansoAqui = redondeoAcumulado();
  return bloques.map((marcaciones, i) => ({
    marcaciones,
    minutosContados: contados(trabajados[i] - quitaAlmuerzo[i] - quitaDescanso[i]),
    minutosAlmuerzoAqui: almuerzoAqui(quitaAlmuerzo[i]),
    minutosDescansoAqui: descansoAqui(quitaDescanso[i]),
    almuerzo: i === iDelAlmuerzo ? almuerzo : null,
    descanso: i === iDelDescanso ? descanso : null,
  }));
}

// Cuánto tiempo se le contó a alguien en un día: la suma de sus tramos, ya
// ajustada por la tolerancia de salida y ya descontadas las pausas.
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
  dia: DiaParaAlmuerzo & DiaParaDescanso & DiaParaAjuste,
): number {
  const tramos = tramosUtiles(registros).map(r => ajustarAJornada(r.entrada!, r.salida!, dia));
  if (tramos.length === 0) return 0;

  const trabajados = tramos.reduce(
    (s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0,
  );
  const soloTramos = tramos.map(t => ({ entrada: t.entrada, salida: t.salida }));
  const almuerzo = minutosAlmuerzoADescontar(soloTramos, dia);
  const descanso = minutosDescansoADescontar(soloTramos, dia);
  // Media jornada con una hora de almuerzo fijo daría negativo. Cero es la
  // respuesta honesta; un número en rojo sería una invención.
  return Math.max(0, Math.round(trabajados - almuerzo - descanso));
}
