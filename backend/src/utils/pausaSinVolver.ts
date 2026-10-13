import { escapar } from './correo';
import { ventanaDeAlmuerzo, finDeLaVentanaDe, type DiaParaAlmuerzo } from './almuerzo';
import { leerVentana, regresoEsperadoDelDescanso } from './descansos';
import { limiteDeEsperaDelDescanso, type DiaDelTurno } from './cierreAlmuerzo';
import { horaLegible, horaDeBogota, MINUTOS_DE_ESPERA } from './noHaLlegado';

// «NO HA VUELTO DE SU PAUSA» POR TELEGRAM (13 de octubre de 2026).
//
// Decisiones del dueño, las mismas de «no ha llegado»: avisa 15 minutos después de la hora a la que
// debía volver, en un solo mensaje con la lista, con copia en la campana, y cuando la persona vuelve
// se avisa también. Aquí vive la decisión y los textos; la plomería está en avisoPausaSinVolver.ts.
//
// Esto NO es el aviso del día siguiente (`avisarPausasSinRegreso`, cierreAlmuerzo.ts), que sigue
// igual: ese es para la pausa olvidada, con lo que cuesta en la nómina. Este es para el momento.

// El interruptor de la empresa, en `configuracion`. Apagado de fábrica, como los otros de Telegram.
export const CLAVE_PAUSAS = 'TELEGRAM_PAUSAS';

const MIN = 60 * 1000;

// Una marcación del día, como sale de `registros`.
export type FilaDelDia = {
  id: string;
  colaboradorId: string;
  fecha: Date;
  entrada: Date | null;
  salida: Date | null;
  salidaAlmuerzo: boolean;
  salidaDescanso: boolean;
  descansoVentana: string | null;
};

export type DiaDeLaPausa = DiaParaAlmuerzo & DiaDelTurno;

export type Pausa = 'almuerzo' | 'descanso';

export type PausaSinVolver = {
  registroId: string;
  colaboradorId: string;
  nombre: string;
  pausa: Pausa;
  salio: Date;
  debiaVolver: Date;
};

// A qué hora le tocaba volver, o null si no se sabe.
//
// El almuerzo con ventana se mide contra ella, como en la tabla de Registros. SIN ventana, la tabla no
// propone hora —sería inventar un dato de nómina—, pero un aviso no escribe nada en la nómina: se
// espera la salida más lo que dura su almuerzo. Sin esto, ninguna empresa con almuerzo de duración
// fija recibiría el aviso.
function debiaVolver(f: FilaDelDia, dia: DiaDeLaPausa | null): Date | null {
  if (f.salidaDescanso) {
    const v = leerVentana(f.descansoVentana);
    return v ? regresoEsperadoDelDescanso(f.salida!, f.fecha, v) : null;
  }
  if (!dia) return null;
  const v = ventanaDeAlmuerzo(dia);
  if (v.inicio && v.fin) return new Date(finDeLaVentanaDe(f.salida!, v));
  return dia.almuerzoMin > 0 ? new Date(f.salida!.getTime() + dia.almuerzoMin * MIN) : null;
}

// A quiénes les toca el aviso en este instante. Cada condición es para NO avisar: sin hora a la que
// volver, ya volvió, todavía está en tiempo, ya se le avisó, o ya pasó el fin de su turno (desde ahí
// la pausa olvidada la cubre el aviso del día siguiente, con lo que cuesta).
export function pausasPorAvisar(
  ahora: Date,
  filas: FilaDelDia[],
  // El día esperado de la FECHA de la fila, no el de hoy: la pausa de un turno nocturno después de
  // la medianoche es del día anterior.
  diaDe: (colaboradorId: string, fecha: Date) => DiaDeLaPausa | null,
  personas: Map<string, { nombre: string; apellido: string }>,
  yaAvisadas: Set<string>,
): PausaSinVolver[] {
  const resultado: PausaSinVolver[] = [];
  for (const f of filas) {
    if (!f.salida || !(f.salidaAlmuerzo || f.salidaDescanso) || yaAvisadas.has(f.id)) continue;
    // Volvió: una entrada posterior a la salida, en la misma fecha (el regreso hereda la de su salida).
    const volvio = filas.some(o => o.colaboradorId === f.colaboradorId && o.fecha.getTime() === f.fecha.getTime()
      && !!o.entrada && o.entrada > f.salida!);
    if (volvio) continue;
    const dia = diaDe(f.colaboradorId, f.fecha);
    const regreso = debiaVolver(f, dia);
    if (!regreso || ahora.getTime() < regreso.getTime() + MINUTOS_DE_ESPERA * MIN) continue;
    const ventana = f.salidaDescanso ? leerVentana(f.descansoVentana) : null;
    if (ahora > limiteDeEsperaDelDescanso(f.salida, dia, ventana)) continue;
    const p = personas.get(f.colaboradorId);
    if (!p) continue;
    resultado.push({
      registroId: f.id, colaboradorId: f.colaboradorId, nombre: `${p.nombre} ${p.apellido}`,
      pausa: f.salidaDescanso ? 'descanso' : 'almuerzo', salio: f.salida, debiaVolver: regreso,
    });
  }
  return resultado.sort((a, b) => a.debiaVolver.getTime() - b.debiaVolver.getTime() || a.nombre.localeCompare(b.nombre, 'es'));
}

// «a la 1:00 p.m.», «a las 3:15 p.m.»: la una va en singular.
export function aLaHora(d: Date): string {
  const h = horaLegible(horaDeBogota(d));
  return `${h.startsWith('1:') ? 'a la' : 'a las'} ${h}`;
}

const delaPausa = (p: Pausa) => (p === 'almuerzo' ? 'del almuerzo' : 'de su descanso');

export function mensajePausasSinVolver(lista: PausaSinVolver[]): string {
  if (lista.length === 1) {
    const p = lista[0];
    return `☕ <b>${escapar(p.nombre)}</b> no ha vuelto ${delaPausa(p.pausa)}\n🕐 ${cuerpoDePausaSinVolver(p)}`;
  }
  return `☕ <b>${lista.length} personas</b> no han vuelto de su pausa:\n`
    + lista.map(p => `• ${escapar(p.nombre)} — ${p.pausa}, debía volver ${aLaHora(p.debiaVolver)}`).join('\n');
}

export function mensajeYaVolvio(nombre: string, pausa: Pausa, marco: Date): string {
  return `✅ <b>${escapar(nombre)}</b> volvió ${delaPausa(pausa)}\n🕐 Marcó ${aLaHora(marco)}`;
}

// La campana, al avisar.
export function cuerpoDePausaSinVolver(p: Pick<PausaSinVolver, 'salio' | 'debiaVolver'>): string {
  return `Salió ${aLaHora(p.salio)} · debía volver ${aLaHora(p.debiaVolver)}`;
}

// La campana, cuando vuelve: se antepone la hora del regreso a lo que ya decía.
export function cuerpoYaVolvio(marco: Date, cuerpoAnterior: string | null): string {
  const antes = cuerpoAnterior ? ` · ${cuerpoAnterior.charAt(0).toLowerCase()}${cuerpoAnterior.slice(1)}` : '';
  return `Volvió ${aLaHora(marco)}${antes}`;
}
