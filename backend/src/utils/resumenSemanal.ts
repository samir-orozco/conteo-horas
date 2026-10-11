import { rangoDiaBogota } from './fechas';
import type { TipoAlerta } from './contratos';
import { plantillaCorreo, escapar, parrafo } from './correo';

// EL RESUMEN SEMANAL POR CORREO (11 de octubre de 2026).
//
// Sale el lunes a las 7 a. m. de Bogotá, solo a los administradores, con la semana anterior
// completa. Aquí vive la decisión; la plomería (consultas, envío, marca de «ya se mandó») está en
// envioResumenSemanal.ts.

const DIA_MS = 24 * 60 * 60 * 1000;
export const HORA_DEL_RESUMEN = 7;

// El interruptor de la empresa, en `configuracion`. Encendido de fábrica: la empresa que lo apaga
// guarda '0', y una clave que no existe es encendido. Solo el administrador lo cambia (routes/configuracion.ts).
export const CLAVE_RESUMEN_SEMANAL = 'RESUMEN_SEMANAL_CORREO';

export type Semana = { desde: string; hasta: string };

// "YYYY-MM-DD" de una medianoche de Bogotá (05:00 UTC): su fecha UTC es la de Bogotá.
const clave = (medianoche: Date) => medianoche.toISOString().slice(0, 10);

// Qué semana le toca al resumen en este instante, o null si no toca.
//
// Toca el lunes desde las 7 hasta la medianoche, y nada más. Desde las 7 y no A las 7 porque el
// trabajo corre también al arrancar la app, y en un hosting que la duerme puede ser la primera
// visita del lunes la que lo dispara. Solo el lunes porque un resumen de la semana que llega el
// miércoles ya no sirve para lo que existe: decidir qué hacer al empezar la semana.
//
// Que no salga dos veces el mismo lunes no se decide aquí: lo pregunta quien envía.
export function semanaDelResumen(ahora: Date): (Semana & { anterior: Semana }) | null {
  const { inicioDia } = rangoDiaBogota(ahora);
  if (inicioDia.getUTCDay() !== 1) return null;
  if (ahora.getTime() - inicioDia.getTime() < HORA_DEL_RESUMEN * 60 * 60 * 1000) return null;
  const dia = (n: number) => clave(new Date(inicioDia.getTime() - n * DIA_MS));
  return {
    desde: dia(7), hasta: dia(1),
    anterior: { desde: dia(14), hasta: dia(8) },
  };
}

// ── Lo que dice el resumen ────────────────────────────────────────────────────

// Una persona en una semana, como la devuelven liquidarEmpresa y tardanzasDeEmpresa.
export type FilaHoras = { nombre: string; apellido: string; minutosOrdinarios: number; minutosExtra: number; totalAdicional: number };
export type FilaTarde = { nombre: string; apellido: string; diasTarde: number; totalMinutos: number };
export type Periodo = { horas: FilaHoras[]; tardanzas: FilaTarde[] };
export type AlertaDeContrato = { nombre: string; tipo: TipoAlerta; dias: number | null };

export type EntradaDelResumen = {
  semana: Semana;
  actual: Periodo;
  anterior: Periodo;
  // Las salidas que puso el auto-cierre esa semana; `fecha` es el día del turno, "YYYY-MM-DD".
  turnosCerradosSolos: { nombre: string; fecha: string }[];
  // Todas las que siguen sin aprobar, sean de la semana que sean: el pendiente es hoy.
  novedadesPorAprobar: number;
  contratos: AlertaDeContrato[];
};

export type Cifra = { actual: number; anterior: number };

export type Resumen = {
  semana: Semana;
  horasTrabajadas: Cifra;
  horasExtra: Cifra;
  recargosYExtras: Cifra;
  llegadasTarde: Cifra;
  // Frases listas, en orden de importancia. Es la parte del correo que dice qué hacer.
  atencion: string[];
  turnosCerradosSolos: number;
  masTarde: { nombre: string; veces: number; minutos: number }[];
  // Sin marcaciones ni pendientes no hay nada que contar, y no se manda: un correo semanal
  // que llega vacío enseña a no abrirlo.
  hayAlgo: boolean;
  // Hubo marcaciones esta semana. Sin ellas, el correo no pinta una tabla de ceros.
  huboActividad: boolean;
  // La semana anterior tuvo actividad: si no, comparar contra cero es ruido.
  comparable: boolean;
};

const MAX_NOMBRES = 5;
const MAX_TARDE = 3;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const sumar = <T>(filas: T[], f: (x: T) => number) => filas.reduce((s, x) => s + f(x), 0);
const horasDe = (p: Periodo) => sumar(p.horas, h => h.minutosOrdinarios + h.minutosExtra) / 60;
const nombreDe = (x: { nombre: string; apellido: string }) => `${x.nombre} ${x.apellido}`;

// "2026-09-29" → "mar 29". Se lee de la cadena y no con el reloj de la máquina (§8.1).
function diaCorto(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

function lineaDeContrato(c: AlertaDeContrato): string {
  // Un caso por valor y un default explícito (§9.4): el motor de contratos puede sumar alertas.
  switch (c.tipo) {
    case 'PREAVISO_PROXIMO': return `Contrato de ${c.nombre}: quedan ${c.dias} días para avisar por escrito si no se va a renovar`;
    case 'PREAVISO_VENCIDO': return `Contrato de ${c.nombre}: se venció el plazo para avisar y se prorroga solo`;
    case 'SE_VUELVE_INDEFINIDO': return `Contrato de ${c.nombre}: en ${c.dias} días pasa a indefinido por ley`;
    case 'SUPERA_TOPE': return `Contrato de ${c.nombre}: supera el tope legal de cuatro años`;
    case 'CAMBIO_ETAPA_APRENDIZ': return `Contrato de ${c.nombre}: en ${c.dias} días pasa a etapa práctica`;
    default: return `Contrato de ${c.nombre}: tiene un aviso pendiente`;
  }
}

export function armarResumen(e: EntradaDelResumen): Resumen {
  const cifra = (f: (p: Periodo) => number): Cifra => ({ actual: f(e.actual), anterior: f(e.anterior) });

  const atencion: string[] = [];
  const cerrados = e.turnosCerradosSolos;
  if (cerrados.length) {
    // Por persona y no por turno: quien tuvo tres turnos sin salida el mismo día salía tres veces.
    const diasDe = new Map<string, Set<string>>();
    for (const t of cerrados) diasDe.set(t.nombre, (diasDe.get(t.nombre) ?? new Set()).add(t.fecha));
    const personas = [...diasDe.entries()];
    const nombres = personas.slice(0, MAX_NOMBRES)
      .map(([nombre, dias]) => `${nombre} (${[...dias].sort().map(diaCorto).join(', ')})`).join(', ');
    const resto = personas.length > MAX_NOMBRES ? ` y ${personas.length - MAX_NOMBRES} más` : '';
    atencion.push(`${cerrados.length} ${plural(cerrados.length, 'turno se cerró solo', 'turnos se cerraron solos')} porque nadie marcó la salida: ${nombres}${resto}`);
  }
  if (e.novedadesPorAprobar) {
    atencion.push(`${e.novedadesPorAprobar} ${plural(e.novedadesPorAprobar, 'novedad espera', 'novedades esperan')} tu aprobación`);
  }
  atencion.push(...e.contratos.map(lineaDeContrato));

  const masTarde = e.actual.tardanzas
    .filter(t => t.diasTarde > 0)
    .sort((a, b) => b.diasTarde - a.diasTarde || b.totalMinutos - a.totalMinutos)
    .slice(0, MAX_TARDE)
    .map(t => ({ nombre: nombreDe(t), veces: t.diasTarde, minutos: t.totalMinutos }));

  const llegadasTarde = (p: Periodo) => sumar(p.tardanzas, t => t.diasTarde);
  const huboActividad = (p: Periodo) => horasDe(p) > 0 || llegadasTarde(p) > 0;

  return {
    semana: e.semana,
    horasTrabajadas: cifra(horasDe),
    horasExtra: cifra(p => sumar(p.horas, h => h.minutosExtra) / 60),
    recargosYExtras: cifra(p => sumar(p.horas, h => h.totalAdicional)),
    llegadasTarde: cifra(llegadasTarde),
    atencion,
    turnosCerradosSolos: cerrados.length,
    masTarde,
    hayAlgo: huboActividad(e.actual) || atencion.length > 0,
    huboActividad: huboActividad(e.actual),
    comparable: huboActividad(e.anterior),
  };
}

// ── El correo y el aviso de la campana ────────────────────────────────────────

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

// "28 sep – 4 oct", o "5 – 11 oct" si no cruza de mes. Con el año solo si cruza de año.
export function nombreDeSemana(s: Semana): string {
  const [a1, m1, d1] = s.desde.split('-').map(Number);
  const [a2, m2, d2] = s.hasta.split('-').map(Number);
  if (a1 !== a2) return `${d1} ${MESES[m1 - 1]} ${a1} – ${d2} ${MESES[m2 - 1]} ${a2}`;
  if (m1 !== m2) return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`;
  return `${d1} – ${d2} ${MESES[m2 - 1]}`;
}

// La comparación se hace sobre lo que se muestra, redondeado: si no, «1.864 h» contra «1.866 h»
// podría decir «▼ 1 h» y el lector no cuadraría la resta.
function cambio(c: Cifra, formato: (n: number) => string): string {
  const d = Math.round(c.actual) - Math.round(c.anterior);
  if (d === 0) return 'igual';
  return `${d > 0 ? '▲' : '▼'} ${formato(Math.abs(d))}`;
}

const horas = (n: number) => `${entero.format(n)} h`;
const pesos = (n: number) => `$ ${entero.format(n)}`;
const veces = (n: number) => entero.format(n);

export function correoDelResumen(r: Resumen, empresa: string, enlace: string): { asunto: string; html: string } {
  const semana = nombreDeSemana(r.semana);
  const celda = 'padding:8px 0;border-bottom:1px solid #eeeeec;font-size:14px;color:#303030';
  const fila = (etiqueta: string, c: Cifra, formato: (n: number) => string) =>
    `<tr><td style="${celda}">${etiqueta}</td>`
    + `<td style="${celda};text-align:right;font-weight:700">${formato(Math.round(c.actual))}</td>`
    + `<td style="${celda};text-align:right;color:#898989;padding-left:12px">${r.comparable ? cambio(c, formato) : ''}</td></tr>`;
  const titulo = (t: string) => `<p style="font-size:12px;font-weight:700;color:#898989;letter-spacing:.04em;margin:24px 0 8px">${t}</p>`;
  const lista = (items: string[]) =>
    `<ul style="margin:0 0 12px;padding-left:18px">${items.map(i => `<li style="font-size:14px;color:#303030;line-height:1.5;margin:0 0 6px">${i}</li>`).join('')}</ul>`;

  const html = plantillaCorreo(`Resumen de la semana ${semana}`,
    (r.huboActividad
      ? parrafo(`Así le fue a <b>${escapar(empresa)}</b> la semana pasada${r.comparable ? ', comparada con la anterior' : ''}.`)
        + titulo('LA SEMANA EN NÚMEROS')
        + '<table style="width:100%;border-collapse:collapse">'
        + fila('Horas trabajadas', r.horasTrabajadas, horas)
        + fila('Horas extra', r.horasExtra, horas)
        + fila('Recargos y extras', r.recargosYExtras, pesos)
        + fila('Llegadas tarde', r.llegadasTarde, veces)
        + '</table>'
      : parrafo(`No hubo marcaciones esta semana. Esto es lo que tiene pendiente <b>${escapar(empresa)}</b>.`))
    + (r.atencion.length ? titulo('NECESITA TU ATENCIÓN') + lista(r.atencion.map(escapar)) : '')
    + (r.masTarde.length
      ? titulo(r.masTarde.length === 1 ? 'QUIÉN LLEGÓ TARDE' : `LAS ${r.masTarde.length} PERSONAS QUE MÁS LLEGARON TARDE`)
        + lista(r.masTarde.map(t => `${escapar(t.nombre)} — ${t.veces} ${plural(t.veces, 'vez', 'veces')}, ${entero.format(t.minutos)} min en total`))
      : '')
    + `<p style="margin:24px 0 0"><a href="${enlace}" style="display:inline-block;background:#FFD85E;color:#303030;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px">Ver los reportes en HoraPro</a></p>`
    + `<p style="font-size:12px;color:#898989;margin:16px 0 0">Te llega cada lunes porque eres administrador. Lo puedes apagar en Configuración.</p>`);

  return { asunto: `Resumen semanal · ${empresa} · ${semana}`, html };
}

export function avisoDelResumen(r: Resumen): { titulo: string; cuerpo: string } {
  const n = r.turnosCerradosSolos;
  const a = r.atencion.length;
  const partes = r.huboActividad
    ? [
      `${horas(Math.round(r.horasTrabajadas.actual))} trabajadas`,
      `${horas(Math.round(r.horasExtra.actual))} extra`,
      ...(n ? [`${n} ${plural(n, 'turno cerrado solo', 'turnos cerrados solos')}`] : []),
    ]
    : ['No hubo marcaciones esta semana', `${a} ${plural(a, 'cosa necesita', 'cosas necesitan')} tu atención`];
  return {
    titulo: `Resumen de la semana ${nombreDeSemana(r.semana)}`,
    cuerpo: `${partes.join(' · ')}. También te llegó por correo.`,
  };
}
