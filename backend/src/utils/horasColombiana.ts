import { getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Bogota';
const DIAS = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];

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
  // día de semana (0=DOM..6=SAB) → ventana de la franja en minutos del día; null/ausente = no programado
  franjaPorDia?: Record<number, { ini: number; fin: number } | null>;
  toleranciaMin?: number; // gracia para no marcar como extra unos minutos sueltos
};

function esExtraPorModo(extra: ExtraConfig, zc: Date, hora: number, superoTope: boolean): boolean {
  if (extra.modo !== 'HORARIO' || !extra.franjaPorDia) return superoTope;
  const fr = extra.franjaPorDia[getDay(zc)] ?? null;
  const min = hora * 60 + zc.getMinutes();
  const tol = extra.toleranciaMin ?? 0;
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
  extra: ExtraConfig = { modo: 'SEMANAL' }
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
    const esDomingo = diaSemana === 'DOMINGO';
    const esDomOFestivo = esDomingo || esFestivo;

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
