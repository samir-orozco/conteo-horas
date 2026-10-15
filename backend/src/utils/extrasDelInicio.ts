// LAS EXTRAS Y LOS RECARGOS DE LA QUINCENA EN EL INICIO (15 de octubre de 2026). Decisión del dueño: en pesos, con
// las horas pequeñas debajo. La cuenta es `liquidarEmpresa` (utils/reportesDeEmpresa.ts), la misma del reporte de
// extras: el número del Inicio es el «Total» de ese reporte para las mismas fechas. Las fechas las pone la pantalla,
// que es la que sabe qué quincena es (lib/periodoDePago.ts del frontend); aquí solo se valida que sean un rango corto.

// El Inicio se carga a cada rato: no puede ser la puerta para liquidar un año entero.
export const DIAS_MAXIMOS_DEL_RANGO = 31;

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 24 * 60 * 60 * 1000;

// La fecha como medianoche UTC si existe en el calendario («2026-02-30» no), o null.
function fechaReal(v: unknown): number | null {
  const m = typeof v === 'string' ? FECHA.exec(v) : null;
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(a, mes - 1, d);
  const f = new Date(t);
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d ? t : null;
}

export function leerRangoDelInicio(q: unknown): { ok: true; desde: string; hasta: string } | { ok: false; error: string } {
  const { desde, hasta } = (typeof q === 'object' && q !== null ? q : {}) as { desde?: unknown; hasta?: unknown };
  const d = fechaReal(desde);
  const h = fechaReal(hasta);
  if (d === null || h === null) return { ok: false, error: 'Las fechas van como AAAA-MM-DD.' };
  if (h < d) return { ok: false, error: 'La fecha final es anterior a la inicial.' };
  if ((h - d) / DIA_MS + 1 > DIAS_MAXIMOS_DEL_RANGO) return { ok: false, error: `El rango no puede pasar de ${DIAS_MAXIMOS_DEL_RANGO} días.` };
  return { ok: true, desde: desde as string, hasta: hasta as string };
}

type FilaLiquidada = { totalRecargos: number; totalExtra: number; totalAdicional: number; minutosExtra: number; minutosConRecargo: number };

// A centavos: sumar decimales en coma flotante deja colas (0.1 + 0.2 = 0.30000000000000004).
const centavos = (n: number) => Math.round(n * 100) / 100;
const sumar = (filas: FilaLiquidada[], f: (x: FilaLiquidada) => number) => filas.reduce((s, x) => s + f(x), 0);

export function resumenDeLaQuincena(filas: FilaLiquidada[]) {
  return {
    total: centavos(sumar(filas, f => f.totalAdicional)),
    extras: centavos(sumar(filas, f => f.totalExtra)),
    recargos: centavos(sumar(filas, f => f.totalRecargos)),
    minutosExtra: sumar(filas, f => f.minutosExtra),
    minutosConRecargo: sumar(filas, f => f.minutosConRecargo),
    // Cuántas personas tienen algo que pagar de más en la quincena.
    personas: filas.filter(f => f.totalAdicional > 0).length,
  };
}
