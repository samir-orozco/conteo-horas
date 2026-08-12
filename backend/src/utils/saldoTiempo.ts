import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { minutosDe } from './tardanzas';

const TZ = 'America/Bogota';

// ============ Qué permiso se paga y cuál no ============
//
// Tres grupos, y la diferencia importa: los dos primeros los fija la ley y NO
// son negociables por empresa; solo el tercero es política interna de cada una.

// Remunerados por ley: el trabajador cobra el día completo igual.
export const PERMISOS_REMUNERADOS_LEY = [
  'VACACIONES',
  'INCAPACIDAD_EPS',
  'INCAPACIDAD_ARL',
  'LICENCIA_MATERNIDAD',
  'LICENCIA_PATERNIDAD',
  'LICENCIA_LUTO',
] as const;

// Nunca remunerado: es su propia definición.
export const PERMISOS_NUNCA_REMUNERADOS = ['NO_REMUNERADO'] as const;

// La ley no obliga a pagarlos: cada empresa decide su política.
export const PERMISOS_CONFIGURABLES = ['CALAMIDAD', 'MEDICO', 'PERSONAL', 'OTRO'] as const;

// Clave en la tabla genérica `Configuracion` (evita una migración de Prisma).
// Guarda la lista de tipos configurables que la empresa SÍ paga, separados por coma.
export const CLAVE_PERMISOS_REMUNERADOS = 'PERMISOS_REMUNERADOS';

// Default deliberadamente conservador: mientras la empresa no configure nada, los
// 4 tipos "depende" se tratan como remunerados. Descontarle plata a alguien por
// una configuración que el admin nunca tocó sería peor que no descontar.
export const PERMISOS_CONFIGURABLES_POR_DEFECTO = [...PERMISOS_CONFIGURABLES];

const SET_LEY = new Set<string>(PERMISOS_REMUNERADOS_LEY);
const SET_NUNCA = new Set<string>(PERMISOS_NUNCA_REMUNERADOS);
const SET_CONFIGURABLES = new Set<string>(PERMISOS_CONFIGURABLES);

// Lee la política de la empresa desde el valor crudo de Configuracion.
// `null`/ausente = nunca se configuró → se aplica el default conservador.
export function parsearPoliticaPermisos(valor: string | null | undefined): Set<string> {
  if (valor == null) return new Set(PERMISOS_CONFIGURABLES_POR_DEFECTO);
  // Fila existente con valor vacío = la empresa desmarcó todos, y eso es distinto
  // de "nunca configuró". Se respeta tal cual.
  return new Set(
    valor.split(',').map(s => s.trim()).filter(s => SET_CONFIGURABLES.has(s)),
  );
}

// Solo se aceptan tipos del grupo configurable: los legales no se pueden "apagar"
// ni el no remunerado "encender" desde la configuración de una empresa.
export function normalizarPoliticaPermisos(tipos: unknown): string[] {
  if (!Array.isArray(tipos)) return [];
  return [...new Set(tipos.filter((t): t is string => typeof t === 'string' && SET_CONFIGURABLES.has(t)))];
}

export function esPermisoRemunerado(tipo: string, politica: Set<string>): boolean {
  if (SET_LEY.has(tipo)) return true;
  if (SET_NUNCA.has(tipo)) return false;
  return politica.has(tipo);
}

// ============ Horas esperadas según el horario ============

// Clave de día calendario, comparable lexicográficamente ("2026-07-15").
// Ojo: `claveZonificada` recibe una fecha a la que YA se le aplicó toZonedTime;
// volver a convertirla la correría otras 5 horas hacia atrás.
function claveZonificada(z: Date): string {
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function claveDia(d: Date): string {
  return claveZonificada(toZonedTime(d, TZ));
}

function semanaKeyDeZonificada(z: Date): string {
  return `${getISOWeekYear(z)}-W${getISOWeek(z)}`;
}

// Duración de una franja en minutos, contemplando que cruce medianoche.
export function duracionFranjaMin(horaEntrada: string, horaSalida: string): number {
  const ini = minutosDe(horaEntrada);
  const fin = minutosDe(horaSalida);
  return fin > ini ? fin - ini : 24 * 60 - ini + fin;
}

export type PermisoRango = { fechaInicio: Date; fechaFin: Date; tipo: string };

// Lo que el horario del colaborador exigía UN día, ya congelado. Es la forma
// mínima de una fila de `DiaEsperado`; se declara aquí, y no se importa de
// `diasEsperados`, porque ese módulo ya importa de este y el ciclo no aporta nada.
export type DiaEsperadoParaSaldo = {
  fecha: Date; // medianoche de Bogotá
  programado: boolean; // false = ese día no se trabajaba
  minutosEsperados: number; // ya neto de almuerzo
};

export type SaldoTiempo = {
  sinHorario: boolean;
  minutosEsperados: number; // lo que el horario pedía, ya neto de permisos remunerados
  minutosPermisoRemunerado: number; // lo que se excusó por permisos que sí se pagan
  minutosPermisoNoRemunerado: number; // informativo: días de permiso que no se pagan
  minutosTrabajados: number; // ordinarias reales (sin extras)
  minutosSaldo: number; // >0 debe tiempo, <0 trabajó de más (ya compensado)
  valorHora: number;
  montoSaldo: number; // >0 es lo que se descuenta; 0 si no debe nada
};

// Suma lo que se le exigía al colaborador en el rango, leyendo los días ya
// MATERIALIZADOS (`DiaEsperado`) en vez del horario vigente.
//
// Esa es la diferencia que importa: el horario de hoy no dice lo que pedía el
// horario de julio. Mientras esto recorría el horario actual, editarlo movía
// dinero ya liquidado — el dueño lo vio cuando cambió una entrada de 08:00 a
// 07:00 y aparecieron tardanzas en meses cerrados.
//
// Lo que NO viaja en la fila y se aplica aquí, al leer, porque no es "lo que
// pedía el horario" sino contexto de la fecha:
//  - Festivos: son ley nacional y viven en su propia tabla.
//  - El tope semanal legal: cada semana ISO se topa a la jornada vigente. Si el
//    horario de la empresa pide más que el tope, ese exceso el motor de horas lo
//    clasifica como EXTRA (y se paga aparte), así que no puede seguir contando
//    como "esperado" o el colaborador quedaría en deuda permanente.
//  - Los permisos: los días cubiertos por uno REMUNERADO no se exigen, se pagan
//    como si se hubieran trabajado. Los no remunerados sí quedan como deuda, que
//    es justamente lo que se quiere medir.
//
// Un día sin fila no exige nada. Para que eso no se traduzca en deudas que
// desaparecen mientras el backfill va a medias, quien llama completa el rango
// con `combinarDiasEsperados`.
export function calcularHorasEsperadas(
  desde: Date,
  finExclusivo: Date,
  dias: DiaEsperadoParaSaldo[],
  festivosDates: Date[],
  permisos: PermisoRango[],
  politica: Set<string>,
  jornadaSemanalDe: (fecha: Date) => number,
): { minutosEsperados: number; minutosPermisoRemunerado: number; minutosPermisoNoRemunerado: number } {
  const festSet = new Set(festivosDates.map(claveDia));
  // Se precalculan los rangos de permiso como claves de día para comparar por
  // calendario y no por instante (un permiso guardado a medianoche Bogotá no
  // debe "empezar" el día anterior por la diferencia de zona).
  const rangos = permisos.map(p => ({
    ini: claveDia(p.fechaInicio),
    fin: claveDia(p.fechaFin),
    remunerado: esPermisoRemunerado(p.tipo, politica),
  }));

  let minutosEsperados = 0;
  let minutosPermisoRemunerado = 0;
  let minutosPermisoNoRemunerado = 0;
  const acumSemana = new Map<string, number>();
  const jornadaSemana = new Map<string, number>();

  // Solo los días del rango pedido, y en orden ascendente: el tope semanal se va
  // gastando día a día, así que recorrerlos desordenados repartiría el recorte
  // entre días distintos.
  const delRango = dias
    .filter(d => d.fecha >= desde && d.fecha < finExclusivo)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  for (const dia of delRango) {
    // Solo se exige un día programado y no festivo.
    if (!dia.programado) continue;

    // Hora de pared Bogotá: de ahí salen la clave del día, la semana ISO y la
    // jornada vigente. `dia.fecha` es un instante real (medianoche de Bogotá,
    // 05:00 UTC), así que `toZonedTime` se aplica aquí una sola vez.
    const z = toZonedTime(dia.fecha, TZ);
    const clave = claveZonificada(z);
    if (festSet.has(clave)) continue;

    // El almuerzo ya viene descontado en la fila: se congela con el día porque
    // también es parte de lo que el horario pedía.
    let minutosDia = dia.minutosEsperados;

    // Tope semanal legal: lo que pase de ahí ya se liquida como extra.
    // La jornada se fija UNA vez por semana ISO, en el primer día que se ve de
    // esa semana, igual que hace el motor de horas. Resolverla día a día
    // desincronizaría las dos mitades de una semana partida por un cambio de
    // vigencia (p. ej. la Ley 2101 el 15 de julio) y aparecería un saldo falso.
    const sk = semanaKeyDeZonificada(z);
    if (!jornadaSemana.has(sk)) jornadaSemana.set(sk, jornadaSemanalDe(z));
    const topeSemana = jornadaSemana.get(sk)! * 60;
    const yaEnSemana = acumSemana.get(sk) ?? 0;
    minutosDia = Math.max(0, Math.min(minutosDia, topeSemana - yaEnSemana));
    acumSemana.set(sk, yaEnSemana + minutosDia);

    const cubre = rangos.find(r => r.ini <= clave && clave <= r.fin);
    if (cubre) {
      if (cubre.remunerado) minutosPermisoRemunerado += minutosDia;
      else minutosPermisoNoRemunerado += minutosDia;
    }
    // Un permiso remunerado no se exige; uno no remunerado sí queda como deuda.
    if (!cubre || !cubre.remunerado) minutosEsperados += minutosDia;
  }

  return { minutosEsperados, minutosPermisoRemunerado, minutosPermisoNoRemunerado };
}

// Arma el saldo final. `minutosTrabajados` son las horas ORDINARIAS reales
// (las extra se pagan aparte con su recargo y no entran aquí).
export function armarSaldo(
  esperadas: { minutosEsperados: number; minutosPermisoRemunerado: number; minutosPermisoNoRemunerado: number },
  minutosTrabajados: number,
  valorHora: number,
  sinHorario: boolean,
): SaldoTiempo {
  const minutosSaldo = sinHorario ? 0 : esperadas.minutosEsperados - minutosTrabajados;
  // Solo el saldo EN CONTRA se cobra. Trabajar de más no genera pago extra por
  // esta vía: si superó la jornada legal, el motor ya lo liquidó como extra.
  const montoSaldo = minutosSaldo > 0 ? (minutosSaldo / 60) * valorHora : 0;
  return {
    sinHorario,
    minutosEsperados: esperadas.minutosEsperados,
    minutosPermisoRemunerado: esperadas.minutosPermisoRemunerado,
    minutosPermisoNoRemunerado: esperadas.minutosPermisoNoRemunerado,
    minutosTrabajados,
    minutosSaldo,
    valorHora: parseFloat(valorHora.toFixed(2)),
    montoSaldo: parseFloat(montoSaldo.toFixed(2)),
  };
}
