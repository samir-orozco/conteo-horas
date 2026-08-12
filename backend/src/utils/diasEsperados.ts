import { toZonedTime } from 'date-fns-tz';
import { franjaDelDia, DIAS_SEMANA, HorarioConFranjas } from './tardanzas';
import { duracionFranjaMin } from './saldoTiempo';

const TZ = 'America/Bogota';
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// El día esperado, materializado: por cada colaborador y día se guarda lo que su
// horario exigía ESE día. Sin esto, editar un horario reescribe el pasado — los
// reportes se recalculan con la configuración actual y las liquidaciones ya
// entregadas cambian solas.
//
// Lo que esta función NO resuelve, a propósito, porque no es "lo que pedía el
// horario" sino contexto que se aplica al leer:
//  - Festivos: son ley nacional, viven en su propia tabla.
//  - Tope semanal legal: depende de la jornada vigente en esa fecha.
//  - Permisos: se cruzan al calcular el saldo.
export type DiaEsperadoCalculado = {
  fecha: Date; // medianoche de Bogotá, igual convención que Registro.fecha
  programado: boolean; // false = ese día no se trabajaba según el horario
  horaEntrada: string | null;
  horaSalida: string | null;
  toleranciaMin: number;
  almuerzoMin: number; // el que aplica ESE día (0 si la franja no lo descuenta)
  minutosEsperados: number; // duración ya neta de almuerzo
};

// Medianoche de Bogotá del día al que pertenece un instante.
function medianocheBogotaDe(d: Date): Date {
  const z = toZonedTime(d, TZ);
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), 5, 0, 0));
}

export function calcularDiasEsperados(
  desde: Date,
  finExclusivo: Date,
  horario: HorarioConFranjas | null,
): DiaEsperadoCalculado[] {
  const activo = !!horario && horario.activo;
  const salida: DiaEsperadoCalculado[] = [];

  // Se recorre en medianoches de Bogotá. Colombia es UTC-5 fijo, así que avanzar
  // 24h no arrastra desfases; con una zona con horario de verano habría que
  // recalcular la medianoche en cada paso.
  let cursor = medianocheBogotaDe(desde);
  const fin = finExclusivo.getTime();

  while (cursor.getTime() < fin) {
    const z = toZonedTime(cursor, TZ);
    const franja = activo ? franjaDelDia(horario!, DIAS_SEMANA[z.getDay()]) : null;

    if (!franja) {
      salida.push({
        fecha: cursor,
        programado: false,
        horaEntrada: null,
        horaSalida: null,
        toleranciaMin: horario?.toleranciaMin ?? 0,
        almuerzoMin: 0,
        minutosEsperados: 0,
      });
    } else {
      const almuerzo = (franja as any).tieneAlmuerzo ? (horario!.almuerzoMin ?? 0) : 0;
      const bruto = duracionFranjaMin((franja as any).horaEntrada, (franja as any).horaSalida);
      salida.push({
        fecha: cursor,
        programado: true,
        horaEntrada: (franja as any).horaEntrada,
        horaSalida: (franja as any).horaSalida,
        toleranciaMin: horario!.toleranciaMin ?? 0,
        almuerzoMin: almuerzo,
        minutosEsperados: Math.max(0, bruto - almuerzo),
      });
    }

    cursor = new Date(cursor.getTime() + UN_DIA_MS);
  }

  return salida;
}
