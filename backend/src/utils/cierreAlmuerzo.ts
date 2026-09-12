import { GRACIA_MIN } from './jornada';
import {
  finDeLaVentanaDe, ventanaDeAlmuerzo, ventanaDeDescanso,
  type DiaParaAlmuerzo, type DiaParaDescanso, type VentanaDelDia,
} from './almuerzo';

// El almuerzo que nadie cerró.
//
// Quien sale a almorzar y no marca su regreso pierde la tarde entera: no se
// cuenta ni se paga, y hoy nadie se entera hasta que el trabajador reclama a fin
// de mes. Es el olvido más común de todos.
//
// Lo que este módulo NO hace, a propósito: inventar el regreso. La evidencia de
// quien volvió y no marcó es IDÉNTICA a la de quien se fue para la casa —en los
// dos casos la última marca del día es la salida a almorzar—, así que darle la
// tarde por buena sería fabricar horas pagadas de la nada. En un producto que
// calcula nómina eso es peor que el problema que resuelve.
//
// Lo que sí hace: detectarlo y proponer una hora, para que la confirme quien de
// verdad la sabe. Primero la propia persona, en el kiosco, cuando vuelva a
// marcar; y si nunca vuelve, el administrador, avisado por la campana.

const MS_MIN = 60_000;

// La gracia vive en `jornada.ts` (`GRACIA_MIN`): la tabla y este
// aviso tienen que estar de acuerdo en cuándo un descanso pasa de estar en curso
// a ser un olvido. Se reexporta porque ya había quien la importaba de aquí.
export { GRACIA_MIN } from './jornada';

export type PausaPendiente = {
  vencido: boolean;         // ya pasó la ventana con holgura y sigue sin volver
  finVentana: Date | null;  // la hora a la que debía volver, para proponerla
};

// La misma pregunta para el almuerzo y para el descanso no remunerado: lo único
// que cambia es contra qué ventana se mide.
function pausaSinRegreso(salida: Date, ventana: VentanaDelDia, ahora: Date): PausaPendiente {
  // Sin ventana congelada no se sabe cuándo debía volver. No se propone nada:
  // una hora inventada en una pantalla de nómina se acaba tomando por cierta.
  if (!ventana.inicio || !ventana.fin) return { vencido: false, finVentana: null };

  const fin = finDeLaVentanaDe(salida, ventana);
  return {
    vencido: ahora.getTime() > fin + GRACIA_MIN * MS_MIN,
    finVentana: new Date(fin),
  };
}

export function almuerzoSinRegreso(salida: Date, dia: DiaParaAlmuerzo, ahora: Date): PausaPendiente {
  return pausaSinRegreso(salida, ventanaDeAlmuerzo(dia), ahora);
}

export function descansoSinRegreso(salida: Date, dia: DiaParaDescanso, ahora: Date): PausaPendiente {
  return pausaSinRegreso(salida, ventanaDeDescanso(dia), ahora);
}

// ── La red de seguridad ──────────────────────────────────────────────────────
//
// Para quien nunca vuelve al kiosco ese día. Aquí no hay a quién preguntarle, y
// tampoco se le inventa la tarde: se avisa al administrador, que es el único que
// puede averiguar qué pasó. Un aviso con la consecuencia en claro vale más que
// un número inventado que nadie va a revisar.
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../prisma';
import { rangoDiaBogota } from './fechas';
import { notificar } from './notificaciones';

const TZ = 'America/Bogota';
type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

// Avisa de las pausas —almuerzo o descanso no remunerado— que quedaron sin
// regreso en días YA PASADOS. Hoy no se toca: la persona todavía puede llegar al
// kiosco y arreglarlo ella misma.
//
// Corre a diario y mira una semana atrás, así que hay que comprobar a mano que
// el aviso no exista ya: `notificar` siempre crea, y sin esto la misma pausa
// olvidada llenaría la campana siete veces. Una campana con ruido se deja de
// mirar, y entonces el aviso que sí importaba tampoco se ve.
export async function avisarPausasSinRegreso(log?: Log): Promise<number> {
  try {
    const { inicioDia } = rangoDiaBogota();
    const desde = new Date(inicioDia.getTime() - 7 * 24 * 60 * 60 * 1000);

    const salidasAPausa = await prisma.registro.findMany({
      where: {
        OR: [{ salidaAlmuerzo: true }, { salidaDescanso: true }],
        salida: { not: null },
        fecha: { gte: desde, lt: inicioDia },
      },
      select: {
        id: true, colaboradorId: true, fecha: true, salida: true, salidaDescanso: true,
        colaborador: { select: { nombre: true, apellido: true, empresaId: true } },
      },
    });

    let avisados = 0;
    for (const s of salidasAPausa) {
      // ¿Hubo alguna entrada posterior ese mismo día? Si la hubo, volvió.
      const { finDia } = rangoDiaBogota(s.fecha);
      const regreso = await prisma.registro.findFirst({
        where: {
          colaboradorId: s.colaboradorId,
          entrada: { gt: s.salida!, lt: finDia },
        },
        select: { id: true },
      });
      if (regreso) continue;

      const yaAvisado = await prisma.notificacion.findFirst({
        where: { tipo: 'NO_MARCO_SALIDA', entidad: 'registro', entidadId: s.id },
        select: { id: true },
      });
      if (yaAvisado) continue;

      const nombre = `${s.colaborador.nombre} ${s.colaborador.apellido}`;
      const z = toZonedTime(s.salida!, TZ);
      // De qué pausa no volvió, dicho con sus palabras.
      const pausa = s.salidaDescanso
        ? { regreso: 'su regreso del descanso', salio: 'Salió a su descanso' }
        : { regreso: 'su regreso del almuerzo', salio: 'Salió a almorzar' };
      await notificar(s.colaborador.empresaId, {
        tipo: 'NO_MARCO_SALIDA',
        titulo: `${nombre} no marcó ${pausa.regreso}`,
        // La consecuencia en plata, no solo el hecho: "no marcó" suena a
        // trámite, y lo que de verdad pasa es que no se le está pagando.
        cuerpo: `${pausa.salio} a las ${format(z, 'HH:mm')} del ${format(z, "d 'de' MMM", { locale: es })} y no volvió a marcar. El resto de ese día no se le está contando ni pagando: revísalo y corrige la hora si siguió trabajando.`,
        entidad: 'registro',
        entidadId: s.id,
      });
      avisados++;
    }

    // Se registra SIEMPRE, también la pasada que no encontró nada: un trabajo que
    // solo habla cuando hace algo no se distingue de uno que nunca corrió
    // (CLAUDE.md §8.3).
    log?.info(`Pausas sin regreso: ${salidasAPausa.length} salidas revisadas, ${avisados} avisadas`);
    return avisados;
  } catch (err) {
    log?.error(err, 'Error avisando pausas sin regreso');
    return 0;
  }
}
