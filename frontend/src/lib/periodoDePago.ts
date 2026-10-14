import { TZ } from './fechas';

// EL PERÍODO DE PAGO EN LOS REPORTES (13 de octubre de 2026, decisión del dueño).
//
// El «Total a pagar» sumaba el salario MENSUAL completo a cualquier rango: del 1 al 15 salía con medio
// salario de más. En vez de guardar un tipo de pago por persona, el reporte se pide por período —primera
// quincena, segunda quincena o mes completo— y el período SALE DE LAS FECHAS: no hay un estado aparte que
// se pueda desalinear de ellas. Si alguien las cambia a mano, ya no es un período y el total no se muestra.
//
// El mes de nómina es de 30 días: cada quincena es medio salario, tenga el mes 31, 30 o 28 días.
//
// Todo con cadenas «yyyy-MM-dd» y aritmética de año y mes, nunca con `new Date("2026-10-01")`, que es
// medianoche UTC y en Bogotá es el día anterior.

export type TipoDePeriodo = 'PRIMERA_QUINCENA' | 'SEGUNDA_QUINCENA' | 'MES';
// `mes` va de 1 a 12, como se escribe en la fecha.
export type PeriodoDePago = { tipo: TipoDePeriodo; anio: number; mes: number };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dosCifras = (n: number) => String(n).padStart(2, '0');
const fecha = (anio: number, mes: number, dia: number) => `${anio}-${dosCifras(mes)}-${dosCifras(dia)}`;
// Día 0 del mes siguiente = último día de este. En UTC, para que la zona de la máquina no cuente.
const ultimoDia = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

export function fechasDelPeriodo({ tipo, anio, mes }: PeriodoDePago): { desde: string; hasta: string } {
  switch (tipo) {
    case 'PRIMERA_QUINCENA': return { desde: fecha(anio, mes, 1), hasta: fecha(anio, mes, 15) };
    case 'SEGUNDA_QUINCENA': return { desde: fecha(anio, mes, 16), hasta: fecha(anio, mes, ultimoDia(anio, mes)) };
    case 'MES': return { desde: fecha(anio, mes, 1), hasta: fecha(anio, mes, ultimoDia(anio, mes)) };
  }
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIPOS: TipoDePeriodo[] = ['PRIMERA_QUINCENA', 'SEGUNDA_QUINCENA', 'MES'];

/** El período de pago que son exactamente estas fechas, o null si son otro rango. */
export function periodoDeLasFechas(desde: string, hasta: string): PeriodoDePago | null {
  const m = FECHA.exec(desde);
  if (!m) return null;
  const anio = Number(m[1]), mes = Number(m[2]);
  for (const tipo of TIPOS) {
    const f = fechasDelPeriodo({ tipo, anio, mes });
    if (f.desde === desde && f.hasta === hasta) return { tipo, anio, mes };
  }
  return null;
}

export function salarioDelPeriodo(salarioMensual: number, tipo: TipoDePeriodo): number {
  switch (tipo) {
    case 'PRIMERA_QUINCENA':
    case 'SEGUNDA_QUINCENA': return salarioMensual / 2;
    case 'MES': return salarioMensual;
  }
}

/**
 * Si ya pasó el último día del período. Mientras no, el reporte cuenta como «debía trabajar» los días que
 * todavía no llegan, el descuento sale inflado y el total sería falso.
 */
export function periodoTerminado(p: PeriodoDePago, hoy: string): boolean {
  return fechasDelPeriodo(p).hasta < hoy;
}

/** «yyyy-MM-dd» de hoy en Bogotá, no en la zona de la máquina. */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

export function textoDelPeriodo({ tipo, anio, mes }: PeriodoDePago): string {
  const delMes = `${MESES[mes - 1]} de ${anio}`;
  switch (tipo) {
    case 'PRIMERA_QUINCENA': return `primera quincena de ${delMes}`;
    case 'SEGUNDA_QUINCENA': return `segunda quincena de ${delMes}`;
    case 'MES': return delMes;
  }
}

// La etiqueta del salario en el reporte: «Salario de la primera quincena de…», pero «Salario de octubre de
// 2026». Con «de la» para todo salió «Salario de la octubre» a producción (13 de octubre de 2026).
export function rotuloDelSalario(p: PeriodoDePago): string {
  switch (p.tipo) {
    case 'PRIMERA_QUINCENA':
    case 'SEGUNDA_QUINCENA': return `Salario de la ${textoDelPeriodo(p)}`;
    case 'MES': return `Salario de ${textoDelPeriodo(p)}`;
  }
}

// ===== El «Total a pagar» del reporte =====
//
// Una sola decisión para la pantalla y el Excel: si hay total y con qué salario. Sin período no hay total,
// porque cualquier número sería inventado (decisión del dueño). Con un período sin terminar tampoco: los
// días que faltan cuentan como no trabajados y el descuento saldría inflado. El SALARIO del período sí va
// en los dos casos con período: se sabe desde el primer día, y lo único provisional es la deuda.
export type TotalDelReporte =
  | { estado: 'TOTAL'; periodo: PeriodoDePago; salario: number; total: number }
  | { estado: 'SIN_PERIODO' }
  | { estado: 'SIN_TERMINAR'; periodo: PeriodoDePago; salario: number };

export function totalDelReporte(r: {
  desde: string; hasta: string; salarioMensual: number; totalAdicional: number; descuento: number; hoy: string;
}): TotalDelReporte {
  const periodo = periodoDeLasFechas(r.desde, r.hasta);
  if (!periodo) return { estado: 'SIN_PERIODO' };
  const salario = salarioDelPeriodo(r.salarioMensual, periodo.tipo);
  if (!periodoTerminado(periodo, r.hoy)) return { estado: 'SIN_TERMINAR', periodo, salario };
  return { estado: 'TOTAL', periodo, salario, total: salario + r.totalAdicional - r.descuento };
}

/** Lo que se dice en lugar del total cuando no lo hay. */
export function avisoSinTotal(t: Exclude<TotalDelReporte, { estado: 'TOTAL' }>): string {
  switch (t.estado) {
    case 'SIN_PERIODO':
      return 'Para ver el total a pagar, elige un período de pago: primera quincena, segunda quincena o mes completo.';
    case 'SIN_TERMINAR': {
      const [, mes, dia] = fechasDelPeriodo(t.periodo).hasta.split('-').map(Number);
      // «La primera quincena de…» pero «El mes de…».
      const periodo = t.periodo.tipo === 'MES' ? `El mes de ${textoDelPeriodo(t.periodo)}` : `La ${textoDelPeriodo(t.periodo)}`;
      return `${periodo} termina el ${dia} de ${MESES[mes - 1]}. El total a pagar sale cuando termine: `
        + 'hasta entonces, los días que faltan cuentan como no trabajados.';
    }
  }
}
