import { format, getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Bogota';

export type TipoHoraCalculo = {
  codigo: string;
  nombre: string;
  recargo: number;
  minutos: number;
};

const DIAS = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];

export function calcularHorasTrabajadas(
  entrada: Date,
  salida: Date,
  festivos: Date[],
  tiposHora: { codigo: string; nombre: string; horaInicio: number; horaFin: number; recargo: number; aplica: string[] }[],
  jornadaSemanalHoras: number
): TipoHoraCalculo[] {
  const resultados: Record<string, TipoHoraCalculo> = {};

  // Minutos ordinarios por día (jornada / 6 dias)
  const minutosOrdinariosDia = (jornadaSemanalHoras / 6) * 60;
  let minutosOrdinariosTrabajados = 0;

  let cursor = new Date(entrada.getTime());

  while (cursor < salida) {
    const zonedCursor = toZonedTime(cursor, TZ);
    const hora = zonedCursor.getHours();
    const diaSemana = DIAS[getDay(zonedCursor)];
    const fechaStr = format(zonedCursor, 'yyyy-MM-dd');
    const esFestivo = festivos.some(f => format(toZonedTime(f, TZ), 'yyyy-MM-dd') === fechaStr);
    const diaEfectivo = esFestivo ? 'FESTIVO' : diaSemana;

    // Avanzar al siguiente cambio de hora o al final
    const nextCursor = new Date(cursor.getTime() + 60 * 1000); // minuto a minuto
    if (nextCursor > salida) break;

    const esExtra = diaSemana !== 'DOMINGO' && !esFestivo && minutosOrdinariosTrabajados >= minutosOrdinariosDia;

    // Encontrar el tipo de hora aplicable
    const tipo = tiposHora.find(t => {
      if (!t.aplica.includes(diaEfectivo) && !(diaEfectivo !== 'DOMINGO' && diaEfectivo !== 'FESTIVO' && t.aplica.includes('LUNES'))) return false;
      if (!t.aplica.includes(diaEfectivo)) return false;

      const esNocturna = t.codigo.includes('N');
      const esExtraTipo = t.codigo.startsWith('HE');

      if (esExtraTipo !== esExtra) return false;

      if (t.horaInicio < t.horaFin) {
        return hora >= t.horaInicio && hora < t.horaFin && !esNocturna;
      } else {
        return (hora >= t.horaInicio || hora < t.horaFin) && esNocturna;
      }
    });

    if (tipo) {
      if (!resultados[tipo.codigo]) {
        resultados[tipo.codigo] = { codigo: tipo.codigo, nombre: tipo.nombre, recargo: tipo.recargo, minutos: 0 };
      }
      resultados[tipo.codigo].minutos += 1;
    }

    if (diaEfectivo !== 'DOMINGO' && diaEfectivo !== 'FESTIVO' && !esExtra) {
      minutosOrdinariosTrabajados += 1;
    }

    cursor = nextCursor;
  }

  return Object.values(resultados);
}

export function calcularValorHora(salarioMensual: number, horasMes: number): number {
  return salarioMensual / horasMes;
}

export function calcularLiquidacion(
  salarioMensual: number,
  horasMes: number,
  horasPorTipo: TipoHoraCalculo[]
): { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; subtotal: number }[] {
  const valorHoraBase = calcularValorHora(salarioMensual, horasMes);
  return horasPorTipo.map(t => ({
    codigo: t.codigo,
    nombre: t.nombre,
    horas: parseFloat((t.minutos / 60).toFixed(2)),
    valorHora: valorHoraBase,
    recargo: t.recargo,
    subtotal: parseFloat(((t.minutos / 60) * valorHoraBase * t.recargo).toFixed(2)),
  }));
}
