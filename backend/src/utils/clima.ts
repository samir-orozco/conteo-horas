import { createHash } from 'crypto';
import { rangoDiaBogota } from './fechas';

// CLIMA LABORAL (4 de octubre de 2026). Las decisiones del módulo, sin base de datos.
// El requerimiento, con cada decisión y su fecha, está en docs/CLIMA_LABORAL.md.

// «Otro» no es un motivo de la empresa: va fijo al final y abre la observación.
export const MOTIVO_OTRO = 'Otro';
export const MAX_MOTIVOS = 5;
export const MAX_LARGO_MOTIVO = 40;
export const MAX_OBSERVACION = 1000;
// Las caritas que muestran los motivos: Muy mal, Mal y Normal.
export const CARITA_MAX_CON_MOTIVOS = 3;
// «Necesitan atención»: tantas respuestas seguidas en Muy mal o Mal.
export const RACHA_DE_ATENCION = 3;
export const CARITA_MAX_DE_ATENCION = 2;

export const CATALOGO_DE_MOTIVOS: { tema: string; motivos: string[] }[] = [
  { tema: 'El trabajo', motivos: ['Mucho trabajo', 'Faltó personal', 'Desorden o instrucciones poco claras'] },
  { tema: 'El tiempo', motivos: ['Turno largo', 'Me tocó quedarme más tiempo', 'Cambio de horario a última hora'] },
  { tema: 'Las personas', motivos: ['Jefe o supervisor', 'Compañeros', 'Clientes difíciles'] },
  { tema: 'El lugar', motivos: ['Herramientas o equipos que fallan', 'Calor, ruido o espacio'] },
  { tema: 'Yo', motivos: ['Cansancio o salud', 'No me sentí valorado', 'Algo personal'] },
  { tema: 'La plata', motivos: ['Problemas con mi pago'] },
];

export const MOTIVOS_PREDETERMINADOS = [
  'Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal',
];

type Resultado<T> = ({ ok: true } & T) | { ok: false; error: string };

// ¿La salida que se acaba de marcar abre la ventana de las caritas? Solo la que
// cierra la jornada, y una vez por día: en un turno partido, la primera.
export function debePreguntarClima(p: {
  accion: 'ENTRADA' | 'SALIDA'; pausa: boolean; tieneModulo: boolean; yaSePreguntoHoy: boolean;
}): boolean {
  return p.accion === 'SALIDA' && !p.pausa && p.tieneModulo && !p.yaSePreguntoHoy;
}

// En un turno partido se pregunta solo en la PRIMERA salida, la responda o no. Mirar solo si calificó
// no alcanza: quien toca «Omitir» no deja fila, y la segunda salida volvía a preguntar (revisión
// adversarial del 4 de octubre de 2026). Las salidas que cuentan son las que abrieron la ventana: las
// del kiosco, no las que puso el cierre automático ni las cargadas a mano.
export function yaSePreguntoHoy(p: { calificoHoy: boolean; otrasSalidasDelKioscoHoy: number }): boolean {
  return p.calificoHoy || p.otrasSalidasDelKioscoHoy > 0;
}

// Los motivos de una empresa, guardados como lista JSON en `configuracion`. Lo
// que no se pueda leer cae a los predeterminados: una configuración dañada no
// puede dejar la ventana sin motivos.
export function leerMotivosDeEmpresa(guardado: string | null): string[] {
  if (guardado === null) return MOTIVOS_PREDETERMINADOS;
  try {
    const lista: unknown = JSON.parse(guardado);
    const v = validarMotivosDeEmpresa(lista);
    return v.ok ? v.motivos : MOTIVOS_PREDETERMINADOS;
  } catch {
    return MOTIVOS_PREDETERMINADOS;
  }
}

export function validarMotivosDeEmpresa(lista: unknown): Resultado<{ motivos: string[] }> {
  if (!Array.isArray(lista) || !lista.every(m => typeof m === 'string')) {
    return { ok: false, error: 'Los motivos tienen que ser una lista de textos.' };
  }
  const motivos = lista.map(m => m.trim());
  if (motivos.length === 0) return { ok: false, error: 'Deja al menos un motivo.' };
  if (motivos.length > MAX_MOTIVOS) return { ok: false, error: `Máximo ${MAX_MOTIVOS} motivos, además de «Otro».` };
  if (motivos.some(m => m === '')) return { ok: false, error: 'Hay un motivo vacío.' };
  if (motivos.some(m => m.length > MAX_LARGO_MOTIVO)) return { ok: false, error: `Cada motivo puede tener hasta ${MAX_LARGO_MOTIVO} letras.` };
  const claves = motivos.map(m => m.toLocaleLowerCase('es'));
  if (claves.includes(MOTIVO_OTRO.toLocaleLowerCase('es'))) return { ok: false, error: '«Otro» ya va siempre al final.' };
  if (new Set(claves).size !== claves.length) return { ok: false, error: 'Hay motivos repetidos.' };
  return { ok: true, motivos };
}

// La carita y los motivos que manda la ventana. Los motivos se guardan por su
// nombre, no por un id: si la empresa cambia sus motivos, lo que ya se respondió
// conserva lo que la persona escogió.
//
// «OTRO» SE ACEPTA PERO NO SE GUARDA (revisión adversarial del 4 de octubre de 2026). No es un motivo:
// es el botón que abre la observación. Guardado con nombre y sin observación directa al lado, era casi
// siempre la huella de una observación confidencial, y señalaba a su autor en el panel.
export function leerCalificacion(cuerpo: unknown, motivosDeLaEmpresa: string[]): Resultado<{ carita: number; motivos: string[] }> {
  if (typeof cuerpo !== 'object' || cuerpo === null) return { ok: false, error: 'Falta la calificación.' };
  const { carita, motivos } = cuerpo as { carita?: unknown; motivos?: unknown };
  if (typeof carita !== 'number' || !Number.isInteger(carita) || carita < 1 || carita > 5) {
    return { ok: false, error: 'La carita va del 1 al 5.' };
  }
  if (carita > CARITA_MAX_CON_MOTIVOS) return { ok: true, carita, motivos: [] };
  if (motivos === undefined) return { ok: true, carita, motivos: [] };
  if (!Array.isArray(motivos)) return { ok: false, error: 'Los motivos tienen que ser una lista.' };
  const validos = new Set([...motivosDeLaEmpresa, MOTIVO_OTRO]);
  if (!motivos.every(m => typeof m === 'string' && validos.has(m))) return { ok: false, error: 'Ese motivo no existe.' };
  return { ok: true, carita, motivos: [...new Set(motivos as string[])].filter(m => m !== MOTIVO_OTRO) };
}

export function leerObservacion(cuerpo: unknown): Resultado<{ texto: string; confidencial: boolean }> {
  const { texto, confidencial } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as { texto?: unknown; confidencial?: unknown };
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (limpio === '') return { ok: false, error: 'La observación está vacía.' };
  if (limpio.length > MAX_OBSERVACION) return { ok: false, error: `La observación puede tener hasta ${MAX_OBSERVACION} letras.` };
  return { ok: true, texto: limpio, confidencial: confidencial === true };
}

export type CalificacionDelDia = { colaboradorId: string; fecha: Date; carita: number; motivos: string[] };
export type EnAtencion = { colaboradorId: string; dias: number; desde: Date; motivo: string | null };

// Quién lleva varias respuestas seguidas en Muy mal o Mal. Cuenta RESPUESTAS y no
// días de calendario: quien descansa el domingo nunca sumaría tres seguidos.
export function necesitanAtencion(calificaciones: CalificacionDelDia[]): EnAtencion[] {
  const porPersona = new Map<string, CalificacionDelDia[]>();
  for (const c of calificaciones) {
    const lista = porPersona.get(c.colaboradorId) ?? [];
    lista.push(c);
    porPersona.set(c.colaboradorId, lista);
  }
  const resultado: EnAtencion[] = [];
  for (const [colaboradorId, lista] of porPersona) {
    const racha = rachaFinal([...lista].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()));
    if (racha.length < RACHA_DE_ATENCION) continue;
    resultado.push({ colaboradorId, dias: racha.length, desde: racha[0].fecha, motivo: motivoMasRepetido(racha) });
  }
  return resultado.sort((a, b) => b.dias - a.dias);
}

// Lo malo que vino después del último buen día de cada persona, sin importar cuán viejo sea: la racha
// se corta con una carita mayor que 2, nunca con el calendario. Con una ventana fija de fechas, quien
// responde de vez en cuando nunca llegaba a tres (revisión adversarial del 4 de octubre de 2026).
export function filasParaLaRacha<T extends CalificacionDelDia>(malas: T[], ultimoBueno: Map<string, Date>): T[] {
  return malas.filter(c => {
    const corte = ultimoBueno.get(c.colaboradorId);
    return corte === undefined || c.fecha > corte;
  });
}

function rachaFinal(ordenadas: CalificacionDelDia[]): CalificacionDelDia[] {
  let i = ordenadas.length;
  while (i > 0 && ordenadas[i - 1].carita <= CARITA_MAX_DE_ATENCION) i--;
  return ordenadas.slice(i);
}

function motivoMasRepetido(racha: CalificacionDelDia[]): string | null {
  const cuenta = new Map<string, number>();
  for (const c of racha) for (const m of c.motivos) cuenta.set(m, (cuenta.get(m) ?? 0) + 1);
  let mejor: string | null = null;
  for (const [m, n] of cuenta) if (mejor === null || n > (cuenta.get(mejor) ?? 0)) mejor = m;
  return mejor;
}

// BUZÓN CONFIDENCIAL. Una nota no guarda su hora: guarda la semana y desde
// cuándo se puede ver. Así ni siquiera la base dice a qué hora llegó, y nadie la
// puede emparejar con la salida de quien marcó a esa hora.

const DIA_MS = 24 * 60 * 60 * 1000;

// El lunes de la semana del instante, a medianoche de Bogotá.
export function semanaDe(instante: Date): Date {
  const { ahoraBog, inicioDia } = rangoDiaBogota(instante);
  const desdeLunes = (ahoraBog.getDay() + 6) % 7;
  return new Date(inicioDia.getTime() - desdeLunes * DIA_MS);
}

// La medianoche siguiente de Bogotá.
export function visibleDesde(instante: Date): Date {
  return rangoDiaBogota(instante).finDia;
}

// Un orden que no tiene que ver con el de llegada, pero que es siempre el mismo:
// si cambiara al recargar, comparar dos cargas delataría cuál nota es nueva.
export function ordenRevuelto<T extends { id: string }>(notas: T[]): T[] {
  const clave = (id: string) => createHash('sha256').update(id).digest('hex');
  return [...notas].sort((a, b) => (clave(a.id) < clave(b.id) ? -1 : clave(a.id) > clave(b.id) ? 1 : 0));
}

// ────────── EL RESUMEN DEL PANEL ──────────

const unDecimal = (n: number) => Math.round(n * 10) / 10;
const promedioDe = (lista: { carita: number }[]) =>
  lista.length === 0 ? null : unDecimal(lista.reduce((s, c) => s + c.carita, 0) / lista.length);

export type ResumenDelClima = {
  total: number;
  personas: number;
  promedio: number | null;
  distribucion: Record<1 | 2 | 3 | 4 | 5, number>;
  // Respuestas en Muy mal o Mal: lo que cuenta la tarjeta «Respuestas negativas». Son respuestas y no
  // días: una persona con turno partido responde una sola vez por día, pero en el panel se habla de
  // respuestas para que nadie lo lea como días de calendario.
  negativas: number;
  // Sobre los días que no fueron buenos (caritas 1 a 3), que son los que muestran motivos.
  motivos: { motivo: string; veces: number; porcentaje: number }[];
  semanas: { semana: Date; promedio: number; total: number }[];
};

export function resumenDelClima(calificaciones: CalificacionDelDia[]): ResumenDelClima {
  const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of calificaciones) distribucion[c.carita as 1 | 2 | 3 | 4 | 5]++;

  const noBuenos = calificaciones.filter(c => c.carita <= CARITA_MAX_CON_MOTIVOS);
  const veces = new Map<string, number>();
  for (const c of noBuenos) for (const m of c.motivos) veces.set(m, (veces.get(m) ?? 0) + 1);
  const motivos = [...veces]
    .map(([motivo, n]) => ({ motivo, veces: n, porcentaje: Math.round((n / noBuenos.length) * 100) }))
    .sort((a, b) => b.veces - a.veces || a.motivo.localeCompare(b.motivo, 'es'));

  const porSemana = new Map<number, CalificacionDelDia[]>();
  for (const c of calificaciones) {
    const clave = semanaDe(c.fecha).getTime();
    porSemana.set(clave, [...(porSemana.get(clave) ?? []), c]);
  }
  const semanas = [...porSemana]
    .sort(([a], [b]) => a - b)
    .map(([clave, lista]) => ({ semana: new Date(clave), promedio: promedioDe(lista)!, total: lista.length }));

  return {
    total: calificaciones.length,
    personas: new Set(calificaciones.map(c => c.colaboradorId)).size,
    promedio: promedioDe(calificaciones),
    distribucion,
    negativas: calificaciones.filter(c => c.carita <= CARITA_MAX_DE_ATENCION).length,
    motivos,
    semanas,
  };
}

export function variacionDelPromedio(actual: number | null, anterior: number | null): number | null {
  return actual === null || anterior === null ? null : unDecimal(actual - anterior);
}

// El promedio de cada sede con las personas que pertenecen a ella, y su participación: cuántas de sus
// jornadas cerradas en el kiosco terminaron con una carita. Sin la participación, un promedio hecho con
// tres respuestas se leía igual que uno hecho con trescientas. Quien tiene dos sedes cuenta en las dos,
// como en el filtro de los reportes. `sedesDe` ya trae la sede atribuida al leer: un presencial sin sede
// viene con la principal (utils/sedePrincipal.ts), y null es «Sin sede», que solo es legítimo para un
// híbrido o un remoto.
export type LineaDeSede = { sedeId: string | null; nombre: string; promedio: number; total: number; jornadas: number; participacion: number | null };

export function promedioPorSede(
  calificaciones: CalificacionDelDia[],
  jornadas: { colaboradorId: string }[],
  sedesDe: Map<string, (string | null)[]>,
  sedes: { id: string; nombre: string }[],
): LineaDeSede[] {
  const lugaresDe = (colaboradorId: string) => new Set(sedesDe.get(colaboradorId) ?? [null]);
  const porSede = new Map<string | null, CalificacionDelDia[]>();
  for (const c of calificaciones) for (const s of lugaresDe(c.colaboradorId)) porSede.set(s, [...(porSede.get(s) ?? []), c]);
  const jornadasDe = new Map<string | null, number>();
  for (const j of jornadas) for (const s of lugaresDe(j.colaboradorId)) jornadasDe.set(s, (jornadasDe.get(s) ?? 0) + 1);
  const linea = (sedeId: string | null, nombre: string): LineaDeSede => {
    const lista = porSede.get(sedeId)!;
    const nJornadas = jornadasDe.get(sedeId) ?? 0;
    return {
      sedeId, nombre, promedio: promedioDe(lista)!, total: lista.length, jornadas: nJornadas,
      participacion: nJornadas === 0 ? null : Math.min(100, Math.round((lista.length / nJornadas) * 100)),
    };
  };
  const lineas = sedes.filter(s => porSede.has(s.id)).map(s => linea(s.id, s.nombre));
  if (porSede.has(null)) lineas.push(linea(null, 'Sin sede'));
  return lineas;
}
