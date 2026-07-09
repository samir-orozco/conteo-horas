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

export function calcularHorasTrabajadas(
  entrada: Date,
  salida: Date,
  festivosDates: Date[],
  tiposHoraDB: TipoHoraDB[],
  jornadaSemanalHoras: number,
  minutosOrdinariosSemanaAcumulados: number = 0
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

  let cursor = new Date(entrada.getTime());

  while (cursor < salida) {
    const zonedCursor = toZonedTime(cursor, TZ);
    const hora = zonedCursor.getHours();
    const diaSemana = DIAS[getDay(zonedCursor)];
    const key = `${zonedCursor.getFullYear()}-${zonedCursor.getMonth()}-${zonedCursor.getDate()}`;
    const esFestivo = festSet.has(key);
    const esDomingo = diaSemana === 'DOMINGO';
    const esDomOFestivo = esDomingo || esFestivo;

    // Extra si se superan las horas ordinarias de la semana
    const esExtra = minutosOrdAcum >= maxOrdinariosSemana;

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

    cursor = new Date(cursor.getTime() + 60 * 1000);
  }

  return {
    resultado: Object.values(acc),
    minutosOrdinariosTrabajados: minutosOrdAcum - minutosOrdinariosSemanaAcumulados,
  };
}

export function calcularValorHora(salarioMensual: number, horasMes: number): number {
  return salarioMensual / horasMes;
}

// Códigos de hora EXTRA (superan la jornada legal). Las demás son ordinarias
// y su hora base ya está incluida en el salario mensual.
const CODIGOS_EXTRA = new Set(['HED', 'HEN', 'HEDD', 'HEND']);

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
