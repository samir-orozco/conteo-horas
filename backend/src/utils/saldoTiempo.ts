import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { minutosDe, franjaDelDia, DIAS_SEMANA, HorarioConFranjas } from './tardanzas';

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

// Clave de día calendario Bogotá, comparable lexicográficamente ("2026-07-15").
function claveDia(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
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

// Recorre día por día el rango en calendario Bogotá y suma lo que el horario
// exigía. Un día suma solo si tiene franja asignada y no es festivo.
//
// Dos decisiones que evitan saldos fantasma:
//  - El total de cada semana ISO se topa a la jornada legal vigente. Si el
//    horario de la empresa pide más que el tope legal, ese exceso el motor de
//    horas lo clasifica como EXTRA (y se paga aparte), así que no puede seguir
//    contando como "esperado" o el colaborador quedaría en deuda permanente.
//  - Los días cubiertos por un permiso REMUNERADO no se exigen: se pagan como si
//    se hubieran trabajado. Los no remunerados sí quedan como deuda, que es
//    justamente lo que se quiere medir.
export function calcularHorasEsperadas(
  desde: Date,
  finExclusivo: Date,
  horario: HorarioConFranjas | null,
  festivosDates: Date[],
  permisos: PermisoRango[],
  politica: Set<string>,
  jornadaSemanalDe: (fecha: Date) => number,
): { minutosEsperados: number; minutosPermisoRemunerado: number; minutosPermisoNoRemunerado: number } {
  if (!horario || !horario.activo) {
    return { minutosEsperados: 0, minutosPermisoRemunerado: 0, minutosPermisoNoRemunerado: 0 };
  }

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

  // Cursor en hora de pared Bogotá; Colombia es UTC-5 fijo, así que avanzar 24h
  // no arrastra desfases.
  let z = toZonedTime(desde, TZ);
  const zFin = toZonedTime(finExclusivo, TZ);

  while (z < zFin) {
    const clave = claveDia(z);
    const franja = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);

    // Solo se exige un día programado y no festivo.
    if (franja && !festSet.has(clave)) {
      let minutosDia = duracionFranjaMin(franja.horaEntrada, franja.horaSalida);
      // El almuerzo no se paga: se descuenta igual que en las horas trabajadas,
      // o la comparación quedaría sesgada ~1h por día.
      if (franja.tieneAlmuerzo) minutosDia = Math.max(0, minutosDia - (horario.almuerzoMin ?? 0));

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

    z = new Date(z.getTime() + 24 * 60 * 60 * 1000);
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
