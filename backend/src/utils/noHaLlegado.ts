import { rangoDiaBogota } from './fechas';
import { minutosDe, excusaLaTardanza, type NovedadParaDia } from './tardanzas';
import { escapar } from './correo';

// «NO HA LLEGADO» POR TELEGRAM (11 de octubre de 2026).
//
// Decisiones del dueño: se avisa pasada la tolerancia de la persona más 15 minutos, en un solo
// mensaje con la lista, con copia en la campana, y cuando la persona llega se avisa también.
//
// Aquí vive la decisión de a quién le toca el aviso en un instante dado, y los mensajes. La plomería
// (el barrido cada 5 minutos, las consultas y el envío) está en avisoNoHaLlegado.ts.

export const MINUTOS_DE_ESPERA = 15;
// El interruptor de la empresa, en `configuracion`. Apagado de fábrica, como el de llegadas tarde.
export const CLAVE_NO_HA_LLEGADO = 'TELEGRAM_NO_HA_LLEGADO';

export type PersonaDelDia = {
  colaboradorId: string;
  nombre: string;
  apellido: string;
  creadoEn: Date;
  // El día esperado de HOY, ya combinado (materializado o del horario). null = no hay cómo saberlo.
  dia: { programado: boolean; horaEntrada: string | null; horaSalida: string | null; toleranciaMin: number } | null;
};

export type ContextoDelDia = {
  festivo: boolean;
  // Quiénes ya tienen una marcación de hoy.
  conEntrada: Set<string>;
  // Las novedades que tocan hoy, APROBADAS O NO: si la persona avisó que tenía cita médica, mandar
  // «no ha llegado» al grupo es ruido aunque nadie la haya aprobado todavía.
  novedades: (NovedadParaDia & { colaboradorId: string })[];
  // A quiénes ya se les avisó hoy (lo dice la campana).
  yaAvisados: Set<string>;
};

export type QuienNoHaLlegado = { colaboradorId: string; nombre: string; apellido: string; horaEntrada: string };

const MIN = 60 * 1000;

// A quiénes les toca el aviso en este instante.
//
// Un aviso falso en el grupo de una empresa acusa a alguien delante de su jefe, así que cada
// condición es para no avisar: sin turno hoy, festivo, ya marcó, tiene novedad, ya se avisó, todavía
// está en tiempo, su turno ya terminó, o no existía en el sistema cuando tenía que llegar.
export function quienesNoHanLlegado(ahora: Date, personas: PersonaDelDia[], c: ContextoDelDia): QuienNoHaLlegado[] {
  if (c.festivo) return [];
  const { inicioDia } = rangoDiaBogota(ahora);
  const instante = (hhmm: string) => new Date(inicioDia.getTime() + minutosDe(hhmm) * MIN);

  return personas
    .filter(p => {
      const d = p.dia;
      if (!d || !d.programado || !d.horaEntrada) return false;
      if (c.conEntrada.has(p.colaboradorId) || c.yaAvisados.has(p.colaboradorId)) return false;
      const entrada = instante(d.horaEntrada);
      if (ahora.getTime() < entrada.getTime() + (d.toleranciaMin + MINUTOS_DE_ESPERA) * MIN) return false;
      // Su turno ya terminó: un aviso a las 6 p. m. de alguien que entraba a las 8 no sirve para nada.
      // Un turno que cruza la medianoche (salida antes que entrada) no termina hoy.
      if (d.horaSalida && minutosDe(d.horaSalida) > minutosDe(d.horaEntrada) && ahora >= instante(d.horaSalida)) return false;
      if (p.creadoEn > entrada) return false;
      const horaEntrada = d.horaEntrada;
      return !c.novedades.some(n => n.colaboradorId === p.colaboradorId && excusaLaTardanza(n, inicioDia, horaEntrada));
    })
    .map(p => ({ colaboradorId: p.colaboradorId, nombre: p.nombre, apellido: p.apellido, horaEntrada: p.dia!.horaEntrada! }))
    .sort((a, b) => a.horaEntrada.localeCompare(b.horaEntrada) || a.nombre.localeCompare(b.nombre, 'es'));
}

// "13:30" → "1:30 p.m.", como el aviso de llegada tarde.
export function horaLegible(hhmm: string): string {
  const total = minutosDe(hhmm);
  const h = Math.floor(total / 60) % 24;
  return `${h % 12 || 12}:${String(total % 60).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
}

// La hora de pared de Bogotá de un instante, "HH:MM". Colombia es UTC-5 fijo.
export function horaDeBogota(instante: Date): string {
  const { inicioDia } = rangoDiaBogota(instante);
  const min = Math.floor((instante.getTime() - inicioDia.getTime()) / MIN);
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

const nombre = (p: { nombre: string; apellido: string }) => escapar(`${p.nombre} ${p.apellido}`);

// El mensaje del barrido. Telegram con parse_mode HTML: los nombres van escapados.
export function mensajeNoHanLlegado(lista: QuienNoHaLlegado[]): string {
  if (lista.length === 1) {
    return `❗ <b>${nombre(lista[0])}</b> no ha marcado entrada\n🕐 Entraba a las ${horaLegible(lista[0].horaEntrada)}`;
  }
  return `❗ <b>${lista.length} personas</b> no han marcado entrada:\n`
    + lista.map(p => `• ${nombre(p)} — entraba a las ${horaLegible(p.horaEntrada)}`).join('\n');
}

export function mensajeYaLlego(nombreCompleto: string, marco: Date, horaEntrada: string): string {
  return `✅ <b>${escapar(nombreCompleto)}</b> ya llegó\n🕐 Marcó a las ${horaLegible(horaDeBogota(marco))} · entraba a las ${horaLegible(horaEntrada)}`;
}

// El aviso de la campana, cerrado cuando la persona llega. Sin día calculado no se inventa a qué hora
// entraba.
export function cuerpoYaLlego(marco: Date, horaEntrada: string | null): string {
  const llego = `Llegó a las ${horaLegible(horaDeBogota(marco))}`;
  return horaEntrada ? `${llego} · entraba a las ${horaLegible(horaEntrada)}` : llego;
}
