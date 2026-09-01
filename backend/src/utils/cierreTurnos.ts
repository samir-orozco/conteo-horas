import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
// El cliente, no el arranque. Traerlo de '../index' hacía que importar este
// archivo levantara el servidor entero: las pruebas abrían el puerto 3001 y
// disparaban las tareas diarias contra la base de desarrollo.
import { prisma } from '../prisma';
import { franjaDelDia } from './tardanzas';
import { notificar } from './notificaciones';

const TZ = 'America/Bogota';
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const minutosDe = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Margen después de la hora de salida programada antes de dar el turno por olvidado
// (evita cerrar a alguien que todavía está en su jornada, p. ej. un turno nocturno).
const GRACIA_MS = 2 * 60 * 60 * 1000;
// Sin horario definido no sabemos su hora de salida: solo lo cerramos si ya lleva
// demasiado abierto para ser una jornada real.
const MAX_TURNO_MS = 16 * 60 * 60 * 1000;

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

export type HorarioDeCierre = {
  activo: boolean;
  franjas: { dias: unknown; horaEntrada: string; horaSalida: string }[];
} | null;

export type TurnoAbierto = { entrada: Date; horario: HorarioDeCierre };

// Qué hacer con un turno que quedó abierto. `salida` en null significa cerrarlo
// SIN hora: el sistema sabe que la persona no marcó, pero no tiene con qué
// estimarla, así que la pone el admin.
export type Cierre = { cerrar: boolean; salida: Date | null; horaFranja: string | null };

const NO_CERRAR: Cierre = { cerrar: false, salida: null, horaFranja: null };

// Medianoche de Bogotá del día de `momento`.
function inicioDelDia(momento: Date): Date {
  const z = toZonedTime(momento, TZ);
  return fromZonedTime(new Date(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0), TZ);
}

// La decisión, sin base de datos: dado un turno abierto y el instante actual,
// si se cierra y con qué hora.
//
// Vive aparte del barrido a propósito. Es la pieza que decide cuántas horas se
// le pagan a alguien que no marcó, y una decisión así tiene que poder probarse
// sin levantar MySQL.
export function decidirCierre(turno: TurnoAbierto, ahora: Date): Cierre {
  const { entrada, horario } = turno;

  // Solo días ya pasados. Un turno que empezó hoy puede seguir en curso, por
  // más horas que lleve abierto: el día todavía no termina.
  if (entrada.getTime() >= inicioDelDia(ahora).getTime()) return NO_CERRAR;

  const zEnt = toZonedTime(entrada, TZ);
  // La franja del día en que ENTRÓ, no la de hoy: un viernes sale a otra hora.
  const franja = horario?.activo ? franjaDelDia(horario, DIAS_SEMANA[zEnt.getDay()]) : null;

  if (!franja) {
    // Sin franja no hay hora que aplicar; solo lo damos por olvidado cuando ya
    // no puede ser una jornada real.
    if (ahora.getTime() - entrada.getTime() < MAX_TURNO_MS) return NO_CERRAR;
    return { cerrar: true, salida: null, horaFranja: null };
  }

  const cruzaMedianoche = minutosDe(franja.horaSalida) <= minutosDe(franja.horaEntrada);
  const [hFin, mFin] = franja.horaSalida.split(':').map(Number);
  // Hora de salida programada, como instante real (día de la entrada, +1 si cruza
  // medianoche). El +1 rueda solo al mes siguiente: `new Date(2026, 7, 32)` es
  // el 1 de septiembre.
  const finLocal = new Date(
    zEnt.getFullYear(), zEnt.getMonth(), zEnt.getDate() + (cruzaMedianoche ? 1 : 0), hFin, mFin, 0,
  );
  const finProg = fromZonedTime(finLocal, TZ);

  // Si aún no ha pasado su salida + margen, sigue en jornada → no lo cerramos
  if (ahora.getTime() < finProg.getTime() + GRACIA_MS) return NO_CERRAR;
  return { cerrar: true, salida: finProg, horaFranja: franja.horaSalida };
}

// Cierra turnos que quedaron abiertos en días ya pasados: pone como salida la hora
// de fin de la franja de ese colaborador y los marca `salidaEstimada` para que el
// admin los revise. No toca `tipo` (la liquidación del día sigue correcta).
// Idempotente: solo actúa sobre turnos aún abiertos, así que correr de más no daña.
export async function cerrarTurnosOlvidados(log?: Log): Promise<number> {
  try {
    const ahora = new Date();

    const abiertos = await prisma.registro.findMany({
      where: { entrada: { not: null, lt: inicioDelDia(ahora) }, salida: null, salidaEstimada: false },
      select: {
        id: true, entrada: true,
        colaborador: {
          select: {
            nombre: true, apellido: true, empresaId: true,
            horario: { select: { activo: true, franjas: { select: { dias: true, horaEntrada: true, horaSalida: true } } } },
          },
        },
      },
    });

    let cerrados = 0;
    for (const r of abiertos) {
      const entrada = r.entrada!;
      const d = decidirCierre({ entrada, horario: r.colaborador.horario }, ahora);
      if (!d.cerrar) continue;

      await prisma.registro.update({
        where: { id: r.id },
        data: {
          ...(d.salida ? { salida: d.salida } : {}),
          salidaEstimada: true,
          editadoPor: 'SISTEMA',
          editadoEn: ahora,
        },
      });
      cerrados++;

      const nombre = `${r.colaborador.nombre} ${r.colaborador.apellido}`;
      const fechaTxt = format(toZonedTime(entrada, TZ), "d 'de' MMM", { locale: es });
      await notificar(r.colaborador.empresaId, {
        tipo: 'NO_MARCO_SALIDA',
        titulo: `${nombre} no marcó salida`,
        cuerpo: d.horaFranja
          ? `Se estimó su salida a las ${d.horaFranja} del ${fechaTxt}. Revísala y confírmala.`
          : `Quedó un turno abierto del ${fechaTxt} sin hora de salida. Corrígelo cuando puedas.`,
        entidad: 'registro',
        entidadId: r.id,
      });
    }

    // Se registra SIEMPRE, incluso con cero. Antes solo hablaba cuando cerraba
    // algo, así que "no cerró nada" y "no corrió nunca" se veían igual en el log:
    // por eso este fallo pasó semanas sin que nadie lo notara.
    log?.info(`Auto-cierre: ${abiertos.length} turno(s) abierto(s) de días pasados, ${cerrados} cerrado(s)`);
    return cerrados;
  } catch (err) {
    log?.error(err, 'Error en el auto-cierre de turnos');
    return 0;
  }
}
