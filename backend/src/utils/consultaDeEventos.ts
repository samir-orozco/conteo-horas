import { toZonedTime } from 'date-fns-tz';
import { medianocheBogota } from './fechas';

// De lo que la pantalla pide a lo que se le consulta a la base, y qué se puede borrar.
//
// Los extremos de un rango se anclan a medianoche de BOGOTÁ, no a medianoche UTC: `new
// Date("2026-09-15")` es las 7 p.m. del 14 en Bogotá, así que un rango construido así deja fuera
// las últimas cinco horas del último día. El final es el arranque del día siguiente y va con `lt`,
// nunca con `lte`, igual que `rangoReporte` (CLAUDE.md §4).

const TIPOS = ['ERROR', 'ACCESO', 'AUDITORIA'] as const;
const POR_PAGINA = 50;
const MAXIMO_POR_PAGINA = 200;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type FiltrosCrudos = {
  tipo?: string; empresaId?: string; buscar?: string;
  desde?: string; hasta?: string; limite?: string; pagina?: string;
};

type Where = Record<string, unknown>;

// Un rango válido, o null si las fechas no sirven. Que sea null y no "el rango de siempre" es
// deliberado: un rango que no se entiende no puede convertirse en silencio en otro rango.
function rangoBogota(desde?: string, hasta?: string): { gte: Date; lt: Date } | null {
  if (!desde || !hasta || !FECHA.test(desde) || !FECHA.test(hasta)) return null;
  const gte = medianocheBogota(desde);
  const lt = new Date(medianocheBogota(hasta).getTime() + 24 * 60 * 60 * 1000);
  if (gte >= lt) return null;
  return { gte, lt };
}

function entero(valor: string | undefined, porDefecto: number, maximo: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return porDefecto;
  return Math.min(Math.floor(n), maximo);
}

export function filtrosDeEventos(crudos: FiltrosCrudos): { where: Where; take: number; skip: number } {
  const where: Where = {};

  // Un tipo que no existe se ignora en vez de viajar a la consulta: Prisma lo rechazaría con un
  // error de 500 que acabaría escrito en este mismo registro.
  if (crudos.tipo && (TIPOS as readonly string[]).includes(crudos.tipo)) where.tipo = crudos.tipo;
  if (crudos.empresaId) where.empresaId = crudos.empresaId;

  const buscar = crudos.buscar?.trim();
  if (buscar) {
    where.OR = [
      { mensaje: { contains: buscar } },
      { ruta: { contains: buscar } },
      { ip: { contains: buscar } },
      { usuarioEmail: { contains: buscar } },
      { empresaNombre: { contains: buscar } },
    ];
  }

  const rango = rangoBogota(crudos.desde, crudos.hasta);
  if (rango) where.ultimaVez = rango;

  const take = entero(crudos.limite, POR_PAGINA, MAXIMO_POR_PAGINA);
  const pagina = entero(crudos.pagina, 1, 10000);
  return { where, take, skip: (pagina - 1) * take };
}

// Lo que se puede borrar. El alcance se pide EXPLÍCITO: sin él no se borra nada.
//
// La alternativa —que la ausencia de filtros signifique "todo"— pone el registro entero a merced
// de un botón mal pulsado o de una petición a la que se le olvidó un parámetro. La puerta va en el
// código y no en la atención de quien mira (CLAUDE.md §12.3).
export const BORRADO_SIN_ALCANCE = null;

export type AlcanceCrudo = { todo?: boolean; ids?: string[]; desde?: string; hasta?: string; tipo?: string };

export function rangoDeBorrado(crudo: AlcanceCrudo): { where: Where } | null {
  if (crudo.todo === true) return { where: {} };

  if (crudo.ids) {
    return crudo.ids.length > 0 ? { where: { id: { in: crudo.ids } } } : BORRADO_SIN_ALCANCE;
  }

  const rango = rangoBogota(crudo.desde, crudo.hasta);
  if (!rango) return BORRADO_SIN_ALCANCE;

  const where: Where = { ultimaVez: rango };
  if (crudo.tipo && (TIPOS as readonly string[]).includes(crudo.tipo)) where.tipo = crudo.tipo;
  return { where };
}

// El "Exportar" de la pantalla.
//
// Las fechas van en hora de Bogotá y no en UTC ni en la del servidor: el archivo lo abre una
// persona en Colombia, y un evento de las 2 de la tarde que aparezca a las 7 no se reconoce. La
// suite corre fijada en Los Ángeles justamente para que un olvido aquí salga rojo (§8.1).
const TZ = 'America/Bogota';

function fechaBogota(f: Date | null | undefined): string {
  if (!f) return '';
  const z = toZonedTime(f, TZ);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${z.getFullYear()}-${dos(z.getMonth() + 1)}-${dos(z.getDate())} ${dos(z.getHours())}:${dos(z.getMinutes())}`;
}

// Una celda de CSV: las comas, las comillas y los saltos de línea de un mensaje de error no pueden
// partir el archivo en columnas o filas que no existen.
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).replace(/\r?\n/g, ' ');
  return /[",]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

type EventoExportable = {
  tipo: string; origen: string; veces: number;
  primeraVez: Date | null; ultimaVez: Date | null;
  metodo: string | null; ruta: string | null; estado: number | null;
  mensaje: string; ip: string | null; usuarioEmail: string | null;
  empresaNombre: string | null; navegador: string | null;
};

const COLUMNAS = [
  'Tipo', 'Origen', 'Veces', 'Primera vez', 'Última vez', 'Método', 'Ruta',
  'Estado', 'Mensaje', 'IP', 'Usuario', 'Empresa', 'Navegador',
];

export function csvDeEventos(eventos: EventoExportable[]): string {
  const filas = eventos.map(e => [
    e.tipo, e.origen, e.veces, fechaBogota(e.primeraVez), fechaBogota(e.ultimaVez),
    e.metodo, e.ruta, e.estado, e.mensaje, e.ip, e.usuarioEmail, e.empresaNombre, e.navegador,
  ].map(celda).join(','));
  return [COLUMNAS.join(','), ...filas].join('\n');
}
