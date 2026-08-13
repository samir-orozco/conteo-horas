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
  toleranciaSalidaMin: number; // minutos de más que no se pagan como extra
  ajustaEntrada: boolean; // si esa tolerancia vale también para llegar temprano
  almuerzoInicio: string | null; // ventana de almuerzo de ESE día ("12:00")
  almuerzoFin: string | null;
};

// Medianoche de Bogotá del día al que pertenece un instante.
function medianocheBogotaDe(d: Date): Date {
  const z = toZonedTime(d, TZ);
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), 5, 0, 0));
}

// Clave de día calendario Bogotá ("2026-07-01"). Se empareja por día y no por
// instante a propósito: MySQL puede devolver la fecha con milisegundos, y una
// fila que no empareje por unos milisegundos quedaría huérfana y el día caería
// al horario actual sin que nadie se entere.
function claveDiaBogota(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
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
        toleranciaSalidaMin: horario?.toleranciaSalidaMin ?? 0,
        ajustaEntrada: horario?.ajustaEntrada ?? false,
        almuerzoInicio: null,
        almuerzoFin: null,
      });
    } else {
      // La ventana manda sobre los minutos sueltos: si el admin dijo "de 12:00 a
      // 13:00", el almuerzo dura eso. `almuerzoMin` queda como respaldo para las
      // franjas sin ventana, que es como funcionó siempre.
      const ini = (franja as any).almuerzoInicio as string | null;
      const fin = (franja as any).almuerzoFin as string | null;
      const conVentana = !!ini && !!fin;
      const almuerzo = (franja as any).tieneAlmuerzo
        ? (conVentana ? duracionFranjaMin(ini!, fin!) : (horario!.almuerzoMin ?? 0))
        : 0;
      const bruto = duracionFranjaMin((franja as any).horaEntrada, (franja as any).horaSalida);
      salida.push({
        fecha: cursor,
        programado: true,
        horaEntrada: (franja as any).horaEntrada,
        horaSalida: (franja as any).horaSalida,
        toleranciaMin: horario!.toleranciaMin ?? 0,
        almuerzoMin: almuerzo,
        minutosEsperados: Math.max(0, bruto - almuerzo),
        toleranciaSalidaMin: horario!.toleranciaSalidaMin ?? 0,
        ajustaEntrada: horario!.ajustaEntrada ?? false,
        // La ventana solo aplica si esta franja descuenta almuerzo. Ya NO depende
        // de que haya minutos configurados: era circular — había que poner los
        // minutos que la ventana venía a reemplazar.
        almuerzoInicio: (franja as any).tieneAlmuerzo && conVentana ? ini : null,
        almuerzoFin: (franja as any).tieneAlmuerzo && conVentana ? fin : null,
      });
    }

    cursor = new Date(cursor.getTime() + UN_DIA_MS);
  }

  return salida;
}

// Une lo materializado con el horario vigente para cubrir un rango completo.
//
// Donde HAY fila manda la fila: eso es lo que congela el pasado y es la razón de
// ser de toda la función. Donde NO la hay se cae al horario actual, que es
// exactamente lo que el sistema hacía antes de existir la tabla: así el backfill
// puede ir a su ritmo y nadie ve números distintos mientras tanto.
//
// Se devuelve una fila por cada día del rango, en orden, sin repetir.
export function combinarDiasEsperados(
  desde: Date,
  finExclusivo: Date,
  materializados: DiaEsperadoCalculado[],
  horario: HorarioConFranjas | null,
): DiaEsperadoCalculado[] {
  const base = calcularDiasEsperados(desde, finExclusivo, horario);
  if (materializados.length === 0) return base;

  const porDia = new Map(materializados.map(m => [claveDiaBogota(m.fecha), m]));
  return base.map(dia => {
    const congelado = porDia.get(claveDiaBogota(dia.fecha));
    // La fecha se normaliza a la del rango: si la fila viniera con milisegundos
    // de la base de datos, aguas abajo se compara por día y no debe arrastrarlos.
    return congelado ? { ...congelado, fecha: dia.fecha } : dia;
  });
}
