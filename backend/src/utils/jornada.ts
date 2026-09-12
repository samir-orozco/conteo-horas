import type { MetodoMarcacion } from '@prisma/client';
import {
  minutosAlmuerzoADescontar, minutosEnLaVentana, finDeLaVentanaDe, ventanaDeAlmuerzo,
  type DiaParaAlmuerzo, type VentanaDelDia,
} from './almuerzo';
import { ajustarAJornada, type DiaParaAjuste } from './ajusteJornada';
import { minutosDe, duracionFranjaMin } from './tardanzas';
import {
  minutosDesdeLaEntrada, minutosDescansoADescontar, minutosEnLasVentanas, leerDescansos, ventanasEnOrden,
  ventanasDeLasSalidas, regresoEsperadoDelDescanso, claveDeVentana, emparejarSalidasDeDescanso,
  MAX_DESCANSOS_POR_FRANJA, type DiaConDescansos,
} from './descansos';

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
  // A cuál descanso salió ("09:00-09:15"), si el kiosco o el editor lo anotaron.
  // Opcional: lo que no lo trae se asigna por la hora (12 de septiembre de 2026).
  descansoVentana?: string | null;
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
    minutosVentana: conVentana ? duracionFranjaMin(ventana.inicio!, ventana.fin!) : null,
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
  return resumirSalida(base, enOrden, salida, finDeLaVentanaDe(salida, ventana), ahora);
}

// Lo que pasó con UNA salida a una pausa: si volvió, cuándo y cuánto se pasó; si no,
// si todavía está en su pausa o ya se le olvidó. `regresoEsperado` es la hora a la
// que le tocaba volver: el fin de la ventana del almuerzo, o la del descanso anotado
// (`regresoEsperadoDelDescanso`). Null cuando la salida no tiene ventana: ahí no se
// sabe cuánto se pasó, y no se inventa.
function resumirSalida(
  base: ResumenPausa,
  enOrden: RegistroDeDia[],
  salida: Date,
  regresoEsperado: number | null,
  ahora: Date,
): ResumenPausa {
  const regresoReg = enOrden.find(r => r.entrada!.getTime() > salida.getTime());
  if (!regresoReg) {
    // Salió y todavía no vuelve. Mientras su ventana siga abierta —más una hora
    // de gracia— está EN SU PAUSA, que es lo normal y lo que se espera. Llamar
    // "sin regreso" a eso acusa a alguien de algo que no ha pasado, y lo pinta
    // en rojo mientras está comiendo.
    const seLePaso = ahora.getTime() > (regresoEsperado ?? salida.getTime()) + GRACIA_MIN * MS_MIN;
    return { ...base, estado: seLePaso ? 'ABIERTO' : 'EN_CURSO', salida };
  }

  const regreso = regresoReg.entrada!;
  const minutos = Math.round((regreso.getTime() - salida.getTime()) / MS_MIN);
  const minutosDeMas = regresoEsperado === null ? 0 : Math.max(0, Math.round((regreso.getTime() - regresoEsperado) / MS_MIN));

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

// Qué pasó con cada DESCANSO del día (12 de septiembre de 2026): un resumen por
// ventana, en el orden de la jornada, y uno más por cada salida al descanso que no
// tuvo ventana donde anotarse (ventana null).
//
// A cuál ventana pertenece cada salida lo decide la misma asignación del kiosco
// (`ventanasDeLasSalidas`): la guardada en la marcación si sigue en el día, y si no,
// la que tocaba a esa hora. Así la tabla y el kiosco cuentan la misma historia.
//
// `minutosDescontados` de cada ventana es lo que cayó dentro de ella y no de las
// anteriores, redondeado sobre el acumulado: los resúmenes SUMAN el descuento del
// día, que se redondea una sola vez.
type ResumenConSuSalida<T> = { resumen: ResumenPausa; marcacion: T | null };

function resumenesDeDescanso<T extends RegistroDeDia>(registros: T[], dia: DiaConDescansos, ahora: Date): ResumenConSuSalida<T>[] {
  const ventanas = ventanasEnOrden(dia.horaEntrada, leerDescansos(dia.descansos));
  const enOrden = [...registros]
    .filter(r => r.entrada)
    .sort((a, b) => a.entrada!.getTime() - b.entrada!.getTime());
  const salidas = enOrden.filter(r => pausaDeLaSalida(r) === 'DESCANSO');
  const asignadas = ventanasDeLasSalidas(dia, salidas.map(r => ({ salida: r.salida!, descansoVentana: r.descansoVentana ?? null })));

  const tramos = tramosCerrados(registros);
  const acumulado = (k: number) => (tramos.length === 0 ? 0 : Math.round(minutosEnLasVentanas(tramos, dia.fecha, ventanas.slice(0, k))));
  const vacio: ResumenPausa = {
    estado: 'NO_MARCADO', ventana: null, salida: null, regreso: null, minutos: null,
    minutosVentana: null, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  };

  const resumenes: ResumenConSuSalida<T>[] = ventanas.map((v, k) => {
    const base: ResumenPausa = {
      ...vacio,
      ventana: { inicio: v.inicio, fin: v.fin },
      minutosVentana: duracionFranjaMin(v.inicio, v.fin),
      minutosDescontados: acumulado(k + 1) - acumulado(k),
    };
    const i = asignadas.findIndex(a => a !== null && claveDeVentana(a) === claveDeVentana(v));
    if (i < 0) return { resumen: base, marcacion: null };
    const salida = salidas[i].salida!;
    const esperado = regresoEsperadoDelDescanso(salida, dia.fecha, v).getTime();
    return { resumen: resumirSalida(base, enOrden, salida, esperado, ahora), marcacion: salidas[i] };
  });
  salidas.forEach((m, i) => {
    if (asignadas[i]) return;
    resumenes.push({ resumen: resumirSalida(vacio, enOrden, m.salida!, null, ahora), marcacion: m });
  });
  return resumenes;
}

export function resumirDescansosDelDia(
  registros: RegistroDeDia[],
  dia: DiaConDescansos,
  ahora: Date = new Date(),
): ResumenPausa[] {
  return resumenesDeDescanso(registros, dia, ahora).map(r => r.resumen);
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
// Con varias pausas, primero hay que saber en qué orden ocurrieron, y ese orden se
// mide DESDE LA ENTRADA: en un turno nocturno el descanso de las 22:00 va antes
// que el almuerzo de la 01:00, aunque la hora suelta diga lo contrario.
//
// La pausa de duración cero no rueda: salir y volver en el mismo minuto es raro
// pero no imposible, y mandarlo un día adelante sí sería un disparate.
export type HorasDeJornada = {
  entrada: string;
  almuerzo?: { salida: string; regreso?: string };
  // Hasta tres descansos, en cualquier orden: se ordenan desde la entrada. Era uno
  // solo, `descanso`, hasta el 12 de septiembre de 2026.
  descansos?: { salida: string; regreso?: string }[];
  salida?: string;
};

// Una pausa como llega del editor: a qué hora salió y, si ya volvió, a qué hora
// regresó. Lo que no es texto no es una hora. Vivía suelta en la ruta.
export function leerPausaDelCuerpo(p: unknown): { salida?: string; regreso?: string } {
  const o = (p && typeof p === 'object' ? p : {}) as { salida?: unknown; regreso?: unknown };
  return {
    salida: typeof o.salida === 'string' && o.salida ? o.salida : undefined,
    regreso: typeof o.regreso === 'string' && o.regreso ? o.regreso : undefined,
  };
}

// Los descansos que manda el editor en `descansos` (12 de septiembre de 2026). Lo que
// no es una lista es «sin descansos», y una fila vacía se ignora: el formulario deja
// filas sin llenar. Un regreso sin su salida, o más descansos de los que caben en una
// franja, se rechazan diciendo qué pasa, antes de tocar la base.
//
// «Descanso N» es la POSICIÓN en que llegó la fila, contando las vacías: el editor manda
// todas sus filas y la pantalla las numera así. Contado después de quitar las vacías, el
// mensaje nombraba otra fila (12 de septiembre de 2026).
export function leerDescansosDelCuerpo(valor: unknown):
  { descansos: { salida: string; regreso?: string }[] } | { error: string; codigo?: string } {
  const filas = (Array.isArray(valor) ? valor : [])
    .map((p, i) => ({ ...leerPausaDelCuerpo(p), n: i + 1 }))
    .filter(p => p.salida || p.regreso);
  const sinSalida = filas.find(p => !p.salida);
  if (sinSalida) {
    return { error: `Para registrar el regreso del descanso ${sinSalida.n} hace falta la hora en que salió.` };
  }
  if (filas.length > MAX_DESCANSOS_POR_FRANJA) {
    return { error: `Una jornada puede tener hasta ${MAX_DESCANSOS_POR_FRANJA} descansos.`, codigo: 'DEMASIADOS_DESCANSOS' };
  }
  return { descansos: filas.map(p => ({ salida: p.salida as string, regreso: p.regreso })) };
}

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

  const desdeLaEntrada = (hhmm: string) => minutosDesdeLaEntrada(horas.entrada, hhmm);
  const pedidas: { tipo: PausaDeJornada; horas: { salida: string; regreso?: string } }[] = [];
  if (horas.almuerzo?.salida) pedidas.push({ tipo: 'ALMUERZO', horas: horas.almuerzo });
  for (const d of horas.descansos ?? []) if (d.salida) pedidas.push({ tipo: 'DESCANSO', horas: d });
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

const NO_CABE_EN_UN_DIA = 'La jornada no cabe en un día: revisa que las pausas no se crucen y que la salida sea posterior a la entrada';

export function tramosDeLaJornada(t: InstantesDeJornada): { tramos: TramoDeJornada[] } | { error: string } {
  // Una hora que no avanza pasa al día siguiente (`instantesDeJornada`). Así cabe un
  // nocturno, pero así también rodaba a mañana una pausa que se cruzaba con otra, y la
  // jornada quedaba de 33 horas sin que nada avisara. Nada que dure un día entero es
  // una jornada: se rechaza (12 de septiembre de 2026). Va antes que lo demás, porque
  // una pausa rodada pasaría como «la última pausa, todavía sin regreso».
  //
  // Cambio de comportamiento, a propósito: una jornada sin pausas con la salida a la
  // misma hora de la entrada pasaba como 24 horas, y tampoco es creíble.
  const instantes = [t.entrada, ...t.pausas.flatMap(p => [p.salida, p.regreso]), t.salida]
    .filter((d): d is Date => d !== null)
    .map(d => d.getTime());
  if (Math.max(...instantes) - t.entrada.getTime() >= UN_DIA_MS) return { error: NO_CABE_EN_UN_DIA };

  const tramos: TramoDeJornada[] = [];
  let inicio = t.entrada;
  for (let i = 0; i < t.pausas.length; i++) {
    const p = t.pausas[i];
    tramos.push({ entrada: inicio, salida: p.salida, fin: p.tipo });
    if (p.regreso) { inicio = p.regreso; continue; }
    // Salió a una pausa y no volvió: la jornada termina ahí. Cualquier cosa
    // escrita después describe algo que no pudo pasar.
    if (i < t.pausas.length - 1) {
      return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, no puede haber otra pausa después. Pon primero la hora del regreso` };
    }
    if (t.salida) {
      return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, la jornada no puede tener hora de salida. Pon primero la hora del regreso` };
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
  // Los descansos, por la misma regla: cada resumen en la jornada que contiene su
  // salida, y el que nadie marcó en la primera del día. Lista vacía en las demás
  // (12 de septiembre de 2026).
  descansos: ResumenPausa[];
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
  // A cuál descanso salió (12 de septiembre de 2026). Solo se hereda con la salida que
  // queda en el mismo minuto: movida, se vuelve a decidir por la hora.
  descansoVentana: string | null;
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

const SIN_SALIDA = { sedeSalidaId: null, fotoSalida: null, metodoSalida: null, distanciaSalida: null, descansoVentana: null };

const mismoMinuto = (a: Date, b: Date) => Math.floor(a.getTime() / MS_MIN) === Math.floor(b.getTime() / MS_MIN);

// Una fila termina en una pausa si no termina en la salida del día ni sigue
// abierta. Así una pausa nueva cuenta como pausa sin tocar esto, y los `Record`
// de rótulos no compilan hasta que alguien le ponga nombre.
const esPausa = (fin: FinDeTramo): fin is PausaDeJornada => fin !== null && fin !== 'SALIDA';

// Qué salidas guardaban las marcaciones antes de editar. El cierre puede no tener
// hora: un turno abierto, o uno que el barrido marcó sin poder ponerle hora,
// sigue siendo el sitio de la salida del día.
//
// Los descansos son VARIOS desde el 12 de septiembre de 2026, así que van todos:
// «la primera salida al descanso» ya no es la del descanso. El orden no importa,
// porque se emparejan por la hora.
type SalidasDeAntes<T> = { ALMUERZO: T | null; DESCANSOS: T[]; CIERRE: T | null };

function salidasDeAntes<T extends MarcacionEditable>(antes: T[]): SalidasDeAntes<T> {
  const ultima = antes[antes.length - 1];
  return {
    ALMUERZO: antes.find(m => pausaDeLaSalida(m) === 'ALMUERZO') ?? null,
    DESCANSOS: antes.filter(m => pausaDeLaSalida(m) === 'DESCANSO'),
    CIERRE: marcacionQueCierra(antes) ?? (ultima && !ultima.salida ? ultima : null),
  };
}

// El papel de la salida con que termina cada fila que queda.
function papelDeLaFila(fin: FilaQueQueda['fin']): Papel {
  switch (fin) {
    case 'DESCANSO': return 'DESCANSO';
    case 'ALMUERZO': return 'ALMUERZO';
    case 'SALIDA':
    case null: return 'CIERRE';
  }
}

// De qué salida de antes hereda cada fila (12 de septiembre de 2026):
//
//   1. La que quedó en el MISMO MINUTO de una salida marcada de antes se queda con esa
//      salida, tenga el papel que tenga ahora: cambiarle el papel a una marca no la vuelve
//      otra. Primero las del mismo papel. Una salida que puso el sistema
//      (`salidaEstimada`) no es la marca de nadie, y esa sigue a su papel.
//   2. Los descansos que quedan se emparejan por la hora con las salidas al descanso que
//      nadie se llevó (`emparejarSalidasDeDescanso`).
//   3. El almuerzo hereda la salida a almorzar y la salida del día la del día (una fila
//      abierta también es su sitio, solo que aún no la tiene), si nadie se las llevó.
//
// Con el papel por delante del minuto, corregir solo cuál pausa fue cuál sin mover sus
// horas (quien oprimió «almorzar» a las 09:00 por error y «descanso» a las 12:00) le
// dejaba a cada una la foto y la sede de la otra, y la foto de una salida de las 17:00
// que pasaba a ser almuerzo aparecía en una salida de las 20:00 que nadie marcó.
function huecosQueQuedan<T extends MarcacionEditable>(filas: FilaQueQueda[], antes: T[]): Hueco<T>[] {
  const de = salidasDeAntes(antes);
  const fuente: (T | null)[] = filas.map(() => null);
  const tomadas = new Set<T>();
  const tomar = (k: number, m: T) => {
    fuente[k] = m;
    tomadas.add(m);
  };

  const marcadas = antes.filter(m => m.salida && !m.salidaEstimada);
  for (const delMismoPapel of [true, false]) {
    filas.forEach((f, k) => {
      if (fuente[k] || !f.salida) return;
      const misma = marcadas.find(m => !tomadas.has(m) && mismoMinuto(m.salida!, f.salida!)
        && (!delMismoPapel || (pausaDeLaSalida(m) ?? 'CIERRE') === papelDeLaFila(f.fin)));
      if (misma) tomar(k, misma);
    });
  }

  const deDescanso = filas.flatMap((f, k) => (f.fin === 'DESCANSO' && f.salida && !fuente[k] ? [k] : []));
  const libres = de.DESCANSOS.filter(m => !tomadas.has(m));
  emparejarSalidasDeDescanso(deDescanso.map(k => filas[k].salida!), libres.map(m => m.salida!))
    .forEach((j, i) => { if (j !== null) tomar(deDescanso[i], libres[j]); });

  const porSuPapel: Record<Papel, T | null> = { DESCANSO: null, ALMUERZO: de.ALMUERZO, CIERRE: de.CIERRE };
  return filas.map((f, k) => {
    const papel = papelDeLaFila(f.fin);
    const suya = porSuPapel[papel];
    return { papel, hora: f.salida, fuente: fuente[k] ?? (suya && !tomadas.has(suya) ? suya : null) };
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
// marca no la vuelve otra— y si no, la que regresaba de esa pausa. Si ninguna, la
// fila es nueva. Tras un descanso, «la que regresaba» es solo el regreso de ESE
// descanso, nunca el de otro (12 de septiembre de 2026).
//
// En DOS pasadas desde el 12 de septiembre de 2026: primero TODAS las filas que
// entran en el minuto de una marcación, y después las demás. Fila por fila, la del
// regreso de las 09:15, sin marcación de ese minuto, se llevaba la de las 15:10
// antes de que la fila de las 15:10 la pidiera, y esa foto aparecía a las 09:15.
function filasQueSeReusan<T extends MarcacionEditable>(antes: T[], filas: FilaQueQueda[], huecos: Hueco<T>[]): (T | null)[] {
  const reusa: (T | null)[] = filas.map(() => null);
  const tomadas = new Set<T>();
  const libre = (m: T) => !tomadas.has(m);
  const tomar = (k: number, m: T | undefined) => {
    if (!m) return;
    tomadas.add(m);
    reusa[k] = m;
  };
  const porElMinuto = (k: number) => {
    tomar(k, antes.find(m => libre(m) && !!m.entrada && mismoMinuto(m.entrada, filas[k].entrada)));
  };
  const porLaPausa = (k: number) => {
    if (reusa[k]) return;
    const anterior = filas[k - 1].fin;
    if (!esPausa(anterior)) return;
    // Tras un descanso, SOLO la marcación que venía justo después de la salida que ese
    // descanso heredó: es SU regreso. Con varios descansos, «la que regresaba de un
    // descanso» puede ser el regreso de otro: quitar el de las 09:00 reescribía con la
    // tarde la fila del regreso de las 09:15, y poner uno nuevo le daba a su regreso la
    // foto, la sede y el método de entrada del regreso de otro descanso, sin avisar. Si
    // ese descanso no heredó ninguna salida, o su regreso ya tiene fila, esta nace nueva y
    // la foto que sobre se avisa en `fotosQueSePierden` (12 de septiembre de 2026). El
    // almuerzo es uno solo, así que su respaldo por tipo sigue.
    if (anterior === 'DESCANSO') {
      const fuente = huecos[k - 1].fuente;
      const suRegreso = fuente ? antes[antes.indexOf(fuente) + 1] : undefined;
      if (suRegreso && libre(suRegreso)) tomar(k, suRegreso);
      return;
    }
    tomar(k, antes.find(m => libre(m) && entradaDe(antes, antes.indexOf(m)) === REGRESO_DE[anterior]));
  };
  tomar(0, antes[0]);
  for (let k = 1; k < filas.length; k++) porElMinuto(k);
  for (let k = 1; k < filas.length; k++) porLaPausa(k);
  return reusa;
}

function datosDelHueco<T extends MarcacionEditable>({ papel, hora, fuente }: Hueco<T>): DatosDeSalida {
  // La marca de estimada va con el sitio de la salida y no con la hora: reabrir
  // un turno que cerró el sistema no puede dejarlo listo para que el barrido lo
  // vuelva a cerrar, y ponerle hora a mano no borra que nadie la marcó.
  const salidaEstimada = fuente?.salidaEstimada ?? false;
  if (!hora) return { ...SIN_SALIDA, salidaEstimada };
  if (!fuente?.salida) return { ...SIN_SALIDA, metodoSalida: 'MANUAL', salidaEstimada };
  const { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida } = fuente;
  // A cuál descanso salió solo viaja con la salida al descanso que no se movió de
  // minuto: movida, se vuelve a decidir por la hora (12 de septiembre de 2026).
  const descansoVentana = papel === 'DESCANSO' && mismoMinuto(fuente.salida, hora) ? fuente.descansoVentana ?? null : null;
  return { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida, salidaEstimada, descansoVentana };
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
  const huecos = huecosQueQuedan(filas, antes);
  const reusadas = filasQueSeReusan(antes, filas, huecos);
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
  dia: DiaParaAlmuerzo & DiaConDescansos & DiaParaAjuste,
): JornadaDelDia<T>[] {
  const enOrden = enOrdenDeEntrada(registros);
  if (enOrden.length === 0) return [];

  const bloques = agruparEnJornadas(enOrden);

  const almuerzo = resumirAlmuerzoDelDia(enOrden, dia);
  const descansos = resumenesDeDescanso(enOrden, dia, new Date());
  const jornadaDe = (m: T | null) => (m ? Math.max(0, bloques.findIndex(b => b.includes(m))) : 0);
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
  // Con varios descansos, cada jornada paga lo que sus tramos pasaron dentro de la
  // UNIÓN de las ventanas: el mismo número con el que el día calcula su descuento.
  const ventanas = leerDescansos(dia.descansos);
  const descuentoDescanso = minutosDescansoADescontar(todos, dia);
  const quitaDescanso = cobrarHastaDondeAlcance(
    cobroPorJornada(descuentoDescanso, porBloque.map(ts => minutosEnLasVentanas(ts, dia.fecha, ventanas)), iDelDescanso),
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
    descansos: descansos.filter(d => jornadaDe(d.marcacion) === i).map(d => d.resumen),
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
  dia: DiaParaAlmuerzo & DiaConDescansos & DiaParaAjuste,
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
