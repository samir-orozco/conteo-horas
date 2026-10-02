import { getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Con alias para no tocar ni una línea del cálculo: este paso solo quita la copia de la lista.
import { DIAS_SEMANA as DIAS } from './diasDeLaSemana';
import { esDescansoObligatorioDe, type FuenteDelDescanso } from './descansoDelHorario';

const TZ = 'America/Bogota';

export type TipoHoraCalculo = {
  codigo: string;
  nombre: string;
  recargo: number;
  minutos: number;
};

type TipoHoraDB = {
  codigo: string;
  nombre: string;
  horaInicio: number;
  horaFin: number;
  recargo: number;
};

function esDiurna(hora: number, horaInicio: number, horaFin: number): boolean {
  // Ej: horaInicio=6, horaFin=21 → diurna si 6 <= hora < 21
  if (horaInicio < horaFin) return hora >= horaInicio && hora < horaFin;
  // Cruce de medianoche (poco común para diurna)
  return hora >= horaInicio || hora < horaFin;
}

function clasificarMinuto(
  hora: number,
  esDomOFestivo: boolean,
  esExtra: boolean,
  horaInicioDiurna: number,
  horaFinDiurna: number
): 'HOD' | 'HON' | 'HED' | 'HEN' | 'HDD' | 'HND' | 'HEDD' | 'HEND' {
  const diurno = esDiurna(hora, horaInicioDiurna, horaFinDiurna);

  if (esDomOFestivo) {
    if (!esExtra) return diurno ? 'HDD' : 'HND';
    return diurno ? 'HEDD' : 'HEND';
  }
  if (!esExtra) return diurno ? 'HOD' : 'HON';
  return diurno ? 'HED' : 'HEN';
}

// Cómo se decide qué es "hora extra":
//  - SEMANAL: extra = lo que pasa de la jornada semanal (tope legal, ej. 42h).
//  - HORARIO: extra = lo trabajado FUERA de la franja asignada de ese día (antes de
//    entrar o después de salir), o en un día no programado; el tope legal se mantiene
//    encima. Requiere el horario del colaborador; sin horario, el llamador cae a SEMANAL.
export type ExtraConfig = {
  modo: 'SEMANAL' | 'HORARIO';
  // FECHA "yyyy-MM-dd" de Bogotá → ventana de la franja en minutos del día;
  // null/ausente = no programado, y entonces todo lo trabajado es extra.
  //
  // Va por fecha y no por día de la semana a propósito. Indexado por día de
  // semana, la ventana salía del horario VIGENTE, así que cambiar un horario
  // reescribía la clasificación de extras de meses ya liquidados: la misma
  // marcación de julio pasaba de extra a ordinaria y el reporte devolvía otra
  // cifra. Por fecha, cada día se clasifica con lo que ESE día exigía.
  //
  // La tolerancia viene dentro de cada día por lo mismo: es la que estaba
  // vigente entonces, no la de hoy.
  franjaPorFecha?: Record<string, FranjaDeExtra>;
  // Respaldo por día de semana, desde el horario vigente, para las fechas que no
  // tengan fila congelada. Es lo mismo que hace `combinarDiasEsperados` con los
  // huecos, y evita que un llamador sin días —el dashboard— convierta la jornada
  // entera en horas extra por no encontrar la fecha.
  franjaPorDia?: Record<number, FranjaDeExtra>;
};

export type FranjaDeExtra = { ini: number; fin: number; toleranciaMin: number } | null;

// La fecha de Bogotá como "yyyy-MM-dd". `zc` ya viene zonificado, así que se lee con los getters
// locales y NO se vuelve a convertir: aplicar `toZonedTime` dos veces sobre la misma fecha la corre
// otras cinco horas.
//
// Estaba escrita suelta dentro de `esExtraPorModo`. Sale a función con nombre el 20 de septiembre
// de 2026 porque el día de descanso necesita la MISMA clave: dos formatos de fecha en el mismo
// archivo es la clase de diferencia que no se nota hasta que un día de diciembre sale corrido.
function claveDeFechaBogota(zc: Date): string {
  return `${zc.getFullYear()}-${String(zc.getMonth() + 1).padStart(2, '0')}-${String(zc.getDate()).padStart(2, '0')}`;
}

// La clave con la que se CONSTRUYE y se CONSULTA `DescansoConfig.porFecha`. Se exporta a propósito,
// y conviene entender por qué antes de tocarla.
//
// En este mismo archivo conviven dos formatos de clave: el de arriba, con relleno (`2026-09-20`), y
// el de los festivos en el bucle (`2026-8-20`, con el mes en base cero). `liquidarRegistros.ts`
// tiene además un tercero, igual al segundo. Son tres formatos que se parecen lo suficiente para
// confundirse y lo bastante distintos para no emparejar.
//
// Si quien arma el mapa usa un formato y quien lo consulta usa otro, `hasOwnProperty` devuelve
// falso, el motor cae al respaldo y liquida como si nadie hubiera declarado nada. No hay excepción,
// no hay aviso y las pruebas del motor siguen verdes: el síntoma sería un domingo cobrando el 90%
// cuando estaba pactado como día de trabajo. Por eso productor y consumidor comparten ESTA función
// en vez de escribir la plantilla dos veces (CLAUDE.md §9.3).
//
// Recibe la fecha CRUDA y zonifica una sola vez: `toZonedTime` aplicado dos veces sobre la misma
// fecha la corre cinco horas (CLAUDE.md §4).
export function claveDeDescanso(fecha: Date): string {
  return claveDeFechaBogota(toZonedTime(fecha, TZ));
}

// Cuál es el día de descanso obligatorio de esta persona (20 de septiembre de 2026).
//
// Va por FECHA y no por una regla de hoy, igual que `ExtraConfig.franjaPorFecha` y por la misma
// razón: lo que decide plata sale del día CONGELADO. Si saliera de la configuración actual, cambiar
// el descanso de alguien reescribiría meses ya liquidados.
export type DescansoConfig = {
  // FECHA "yyyy-MM-dd" de Bogotá → si ESE día era su descanso obligatorio. Sale de `DiaEsperado`.
  porFecha?: Record<string, boolean>;
  // Respaldo para las fechas sin fila congelada: de dónde sale el descanso de esa persona, o sea su
  // horario si tiene y la programación si no. Ausente = presunción legal, o sea el domingo.
  fuente?: FuenteDelDescanso;
};

// EL RESPALDO CUANDO NADIE PASA UNA FUENTE: un horario que no cubre ningún día. Sobran los siete, no
// hay ninguno que se pueda señalar, y manda la presunción legal. Es el domingo, o sea el
// comportamiento de siempre, escrito como lo que es en vez de como un caso aparte.
const POR_PRESUNCION: FuenteDelDescanso = { de: 'HORARIO', diasQueTrabaja: [] };

function esDescansoDeLaFecha(zc: Date, diaSemana: string, cfg: DescansoConfig): boolean {
  // `hasOwnProperty` y no `??`, por lo mismo que las franjas de abajo: un día congelado como
  // `false` dice a propósito «ese día NO era su descanso», y con `??` se caería al respaldo justo
  // cuando la fila ya respondió. Se pregunta si la fecha ESTÁ, no si trae algo.
  if (cfg.porFecha) {
    const clave = claveDeFechaBogota(zc);
    if (Object.prototype.hasOwnProperty.call(cfg.porFecha, clave)) return cfg.porFecha[clave];
  }
  // Sin fila congelada no hay semana programada que consultar, así que se pasa `null`: quien tiene
  // horario se resuelve con sus franjas igual, y quien no lo tiene cae a la presunción legal, que es
  // el DOMINGO. Ese `null` significa «nadie ha programado todavía», no «esta semana no hay
  // descanso»: confundir las dos cosas es lo que costó 3,34 millones el 1 de octubre de 2026.
  return esDescansoObligatorioDe(diaSemana, cfg.fuente ?? POR_PRESUNCION, null);
}

function esExtraPorModo(extra: ExtraConfig, zc: Date, hora: number, superoTope: boolean): boolean {
  if (extra.modo !== 'HORARIO' || (!extra.franjaPorFecha && !extra.franjaPorDia)) return superoTope;

  const clave = claveDeFechaBogota(zc);
  // `??` no sirve aquí: un día congelado como NO programado vale `null`, y con
  // `??` se caería al respaldo justo cuando el día dice, a propósito, que no
  // había franja. Se pregunta si la fecha ESTÁ, no si trae algo.
  const fr = extra.franjaPorFecha && Object.prototype.hasOwnProperty.call(extra.franjaPorFecha, clave)
    ? extra.franjaPorFecha[clave]
    : extra.franjaPorDia?.[getDay(zc)] ?? null;
  const min = hora * 60 + zc.getMinutes();
  const tol = fr?.toleranciaMin ?? 0;
  let fuera: boolean;
  if (!fr) fuera = true;                                       // día no programado → todo extra
  else if (fr.fin > fr.ini) fuera = min < fr.ini - tol || min >= fr.fin + tol;
  else fuera = !(min >= fr.ini - tol || min < fr.fin + tol);   // franja que cruza medianoche
  return fuera || superoTope;                                  // el tope legal siempre aplica encima
}

export function calcularHorasTrabajadas(
  entrada: Date,
  salida: Date,
  festivosDates: Date[],
  tiposHoraDB: TipoHoraDB[],
  jornadaSemanalHoras: number,
  minutosOrdinariosSemanaAcumulados: number = 0,
  extra: ExtraConfig = { modo: 'SEMANAL' },
  // Va al final y con valor por defecto vacío A PROPÓSITO: así las llamadas que ya existen no se
  // tocan y devuelven exactamente lo mismo que antes. Vacío equivale a PRESUMIDO, o sea el domingo.
  descanso: DescansoConfig = {}
): { resultado: TipoHoraCalculo[]; minutosOrdinariosTrabajados: number } {
  const maxOrdinariosSemana = jornadaSemanalHoras * 60;
  const festSet = new Set(
    festivosDates.map(f => {
      const z = toZonedTime(f, TZ);
      return `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
    })
  );

  // Mapa para acumular por código
  const acc: Record<string, TipoHoraCalculo> = {};
  let minutosOrdAcum = minutosOrdinariosSemanaAcumulados;

  // Configurar rangosDiurnos desde los tipos (usando HOD como referencia)
  const hod = tiposHoraDB.find(t => t.codigo === 'HOD');
  const horaInicioDiurna = hod?.horaInicio ?? 6;
  const horaFinDiurna = hod?.horaFin ?? 21;

  // Construir mapa código→TipoHoraDB para lookups rápidos
  const tipoMap = Object.fromEntries(tiposHoraDB.map(t => [t.codigo, t]));

  // Iteramos en la "hora de pared" de Bogotá. Como Colombia es UTC-5 constante (sin
  // horario de verano), avanzar el cursor ya zonificado 1 minuto equivale a llamar
  // toZonedTime en cada minuto, pero sin ese costo por minuto.
  const zSalida = toZonedTime(salida, TZ);
  let zc = toZonedTime(entrada, TZ);

  while (zc < zSalida) {
    const hora = zc.getHours();
    const diaSemana = DIAS[getDay(zc)];
    const key = `${zc.getFullYear()}-${zc.getMonth()}-${zc.getDate()}`;
    const esFestivo = festSet.has(key);
    // Antes decía `diaSemana === 'DOMINGO'` escrito a mano. La ley presume el domingo SALVO acuerdo
    // escrito, y medido en producción hay 26 personas cuyo horario cubre los siete días. Sin
    // configuración esto devuelve exactamente lo mismo de siempre.
    const esDescanso = esDescansoDeLaFecha(zc, diaSemana, descanso);
    // El festivo es otro concepto y no depende de quién descansa cuándo: un martes festivo se paga
    // igual aunque el martes no sea el descanso de nadie.
    const esDomOFestivo = esDescanso || esFestivo;

    // Extra según el modo configurado (semanal >tope, u horario fuera de la franja).
    // El tope legal semanal siempre aplica encima.
    const superoTope = minutosOrdAcum >= maxOrdinariosSemana;
    const esExtra = esExtraPorModo(extra, zc, hora, superoTope);

    const codigo = clasificarMinuto(hora, esDomOFestivo, esExtra, horaInicioDiurna, horaFinDiurna);
    const tipoRef = tipoMap[codigo];

    if (tipoRef) {
      if (!acc[codigo]) {
        acc[codigo] = { codigo, nombre: tipoRef.nombre, recargo: tipoRef.recargo, minutos: 0 };
      }
      acc[codigo].minutos += 1;
    }

    // Solo las horas en días normales (no dom/festivo) cuentan para ordinarios semanales
    if (!esDomOFestivo && !esExtra) {
      minutosOrdAcum += 1;
    }

    zc = new Date(zc.getTime() + 60 * 1000);
  }

  return {
    resultado: Object.values(acc),
    minutosOrdinariosTrabajados: minutosOrdAcum - minutosOrdinariosSemanaAcumulados,
  };
}

// Descuenta el almuerzo (minutos no pagados) de las horas ordinarias diurnas de
// un registro. Se aplica una sola vez por día trabajado (el llamador controla eso)
// y solo cuando la franja de ese día tiene almuerzo. Devuelve cuántos minutos
// alcanzó a descontar para ajustar también el acumulado de ordinarias semanales.
export function descontarAlmuerzo(
  resultado: TipoHoraCalculo[],
  almuerzoMin: number
): { descontado: number } {
  if (almuerzoMin <= 0) return { descontado: 0 };
  const hod = resultado.find(t => t.codigo === 'HOD');
  if (!hod || hod.minutos <= 0) return { descontado: 0 };
  const restar = Math.min(almuerzoMin, hod.minutos);
  hod.minutos -= restar;
  return { descontado: restar };
}

export function calcularValorHora(salarioMensual: number, horasMes: number): number {
  return salarioMensual / horasMes;
}

// Códigos de hora EXTRA (superan la jornada legal). Las demás son ordinarias
// y su hora base ya está incluida en el salario mensual.
export const CODIGOS_EXTRA = new Set(['HED', 'HEN', 'HEDD', 'HEND']);

// Descuenta minutos de almuerzo repartiéndolos entre las horas ORDINARIAS del
// día, no solo entre las diurnas.
//
// `descontarAlmuerzo` (arriba) busca literalmente 'HOD', así que un turno 100%
// nocturno o dominical nunca pierde su almuerzo: se le paga una hora que no
// trabajó. Afecta a vigilancia y a salud, que es justo donde más turnos así hay.
//
// Esta versión se usa solo cuando el día tiene ventana de almuerzo configurada.
// Los días anteriores siguen por el camino viejo A PROPÓSITO: corregirlos
// retroactivamente bajaría la paga de gente a la que ya se le liquidó, y eso se
// decide con el dueño, no se cuela en un despliegue.
export function descontarAlmuerzoOrdinarias(
  resultado: TipoHoraCalculo[],
  almuerzoMin: number
): { descontado: number } {
  if (almuerzoMin <= 0) return { descontado: 0 };
  let porRestar = almuerzoMin;
  let descontado = 0;
  // Se empieza por las diurnas ordinarias: son las más baratas, así que quitar
  // de ahí es lo que menos castiga al trabajador cuando el turno mezcla tipos.
  const orden = ['HOD', 'HON', 'HDD', 'HND'];
  for (const codigo of orden) {
    if (porRestar <= 0) break;
    const t = resultado.find(x => x.codigo === codigo);
    if (!t || t.minutos <= 0) continue;
    const restar = Math.min(porRestar, t.minutos);
    t.minutos -= restar;
    porRestar -= restar;
    descontado += restar;
  }
  return { descontado };
}

// Liquidación de lo que se paga ADEMÁS del salario:
//  - Ordinaria diurna (HOD): $0, ya está en el salario.
//  - Ordinaria nocturna / dominical / festiva: solo el recargo (factor − 1).
//  - Extra: la hora completa con su recargo (no está en el salario).
export function calcularLiquidacion(
  salarioMensual: number,
  horasMes: number,
  horasPorTipo: TipoHoraCalculo[]
): { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number }[] {
  const valorHoraBase = calcularValorHora(salarioMensual, horasMes);
  return horasPorTipo.map(t => {
    const esExtra = CODIGOS_EXTRA.has(t.codigo);
    // Extra: paga el factor completo. Ordinaria: solo el recargo por encima de la hora base.
    const factorPagado = esExtra ? t.recargo : Math.max(0, t.recargo - 1);
    return {
      codigo: t.codigo,
      nombre: t.nombre,
      horas: parseFloat((t.minutos / 60).toFixed(2)),
      valorHora: parseFloat(valorHoraBase.toFixed(2)),
      recargo: t.recargo,
      esExtra,
      factorPagado: parseFloat(factorPagado.toFixed(2)),
      subtotal: parseFloat(((t.minutos / 60) * valorHoraBase * factorPagado).toFixed(2)),
    };
  });
}
