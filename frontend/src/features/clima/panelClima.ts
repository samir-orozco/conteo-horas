import { formatInTimeZone } from 'date-fns-tz';
import { TZ, sinEspaciosRaros } from '../../lib/fechas';

// Lo que el panel del clima laboral calcula para mostrar (4 de octubre de 2026). Las cuentas de fondo
// las hace el servidor (backend/src/utils/clima.ts); esto solo las pone en palabras y en pantalla.

// LOS COLORES DE LAS GRÁFICAS NO SON LOS DE LAS CARITAS, y no por gusto. Se pasaron los de las caritas
// por el validador de paletas: sobre el fondo blanco son demasiado pálidos (contraste de 1,4 a 2,3), las
// dos rosadas casi no se distinguen entre sí, y la amarilla y la verde se confunden para quien no
// distingue el rojo del verde. Esta escala va de un lado al otro pasando por un gris: rosa fuerte y rosa
// para Muy mal y Mal, gris para Normal, verde azulado claro y oscuro para Bien y Muy bien. Cada lado
// pasó el validador por separado. Y la carita va SIEMPRE dibujada al lado: el color nunca es lo único
// que dice cuál es.
export const COLOR_DE_CARITA: Record<number, string> = {
  1: '#c2334d',
  2: '#e88a99',
  3: '#a9a7a1',
  4: '#5cb8aa',
  5: '#137a6d',
};

export const decimal = (n: number) => n.toFixed(1).replace('.', ',');

export function variacion(v: number | null): { texto: string; sube: boolean | null } | null {
  if (v === null) return null;
  if (v === 0) return { texto: '= 0,0', sube: null };
  return { texto: `${v > 0 ? '▲' : '▼'} ${decimal(Math.abs(v))}`, sube: v > 0 };
}

// Cuántas de las jornadas cerradas en el kiosco terminaron con una carita. Por JORNADAS y no por
// personas (4 de octubre de 2026): por personas, en un rango largo casi todos responden alguna vez y la
// tarjeta se quedaba en 100 % sin decir nada. Nunca más de 100: un turno nocturno puede calificarse en
// un día cuya jornada cae fuera del filtro.
export function respondieron(respuestas: number, jornadas: number): { texto: string; porcentaje: number | null } {
  const miles = (n: number) => n.toLocaleString('es-CO');
  return {
    texto: `${miles(respuestas)} de ${miles(jornadas)} jornadas`,
    porcentaje: jornadas === 0 ? null : Math.min(100, Math.round((respuestas / jornadas) * 100)),
  };
}

export const caritaDelPromedio = (promedio: number | null) => (promedio === null ? null : Math.round(promedio));

// Dónde va cada punto de la línea de las semanas: el 5 arriba y el 1 abajo, sobre la escala completa
// de las caritas y no sobre lo que hubo, para que una semana de 3,9 a 4,1 no parezca una montaña.
export function puntosDeLaLinea(semanas: { promedio: number }[], caja: { ancho: number; alto: number; margen: number }) {
  const { ancho, alto, margen } = caja;
  const x = (i: number) => (semanas.length === 1 ? ancho / 2 : margen + (i * (ancho - 2 * margen)) / (semanas.length - 1));
  const y = (p: number) => margen + ((5 - p) * (alto - 2 * margen)) / 4;
  return semanas.map((s, i) => ({ x: x(i), y: y(s.promedio) }));
}

export function rangoDelMes(ahora: Date = new Date()): { desde: string; hasta: string } {
  return { desde: formatInTimeZone(ahora, TZ, 'yyyy-MM-01'), hasta: formatInTimeZone(ahora, TZ, 'yyyy-MM-dd') };
}

// «Semana del 5 de oct»
export const etiquetaDeSemana = (iso: string | Date) => `Semana del ${fechaCortaSinAnio(iso)}`;

// «7 de oct», para listas donde el año sobra.
export const fechaCortaSinAnio = (iso: string | Date) =>
  sinEspaciosRaros(new Date(iso).toLocaleDateString('es-CO', { timeZone: TZ, day: 'numeric', month: 'short' }).replace('.', ''));

// Cuántas notas confidenciales hay de esta semana y de la anterior, para la tarjeta del buzón. El buzón
// solo trae las semanas que tienen notas: tomar la primera sin mirar su fecha contaba como «recientes»
// notas de hace meses (revisión adversarial del 4 de octubre de 2026).
export function notasRecientes(buzon: { semanas: { semana: string; notas: string[] }[] } | null, ahora: Date = new Date()): number | null {
  if (!buzon) return null;
  const [a, m, d] = formatInTimeZone(ahora, TZ, 'yyyy-MM-dd').split('-').map(Number);
  const diaDeLaSemana = Number(formatInTimeZone(ahora, TZ, 'i')); // 1 = lunes … 7 = domingo
  const lunesAnterior = Date.UTC(a, m - 1, d - (diaDeLaSemana - 1) - 7, 5);
  return buzon.semanas.filter(s => new Date(s.semana).getTime() >= lunesAnterior).reduce((n, s) => n + s.notas.length, 0);
}

// «Respuestas negativas»: la parte de las respuestas que fue Muy mal o Mal. Un número suelto («537») no
// decía si era mucho o poco; el porcentaje sí (4 de octubre de 2026).
export function porcentajeNegativas(negativas: number, total: number): string | null {
  return total === 0 ? null : `${decimal((negativas / total) * 100)} %`;
}

// Con menos respuestas que esto, el promedio de una sede no alcanza para sacar conclusiones: se avisa y
// no se la destaca como la más baja.
export const POCAS_RESPUESTAS = 10;

// La sede de menor promedio entre las que tienen respuestas suficientes. undefined cuando no hay dos para
// comparar; null es «Sin sede», que también puede ser la más baja.
export function sedeMasBaja(porSede: { sedeId: string | null; promedio: number; total: number }[]): string | null | undefined {
  const comparables = porSede.filter(s => s.total >= POCAS_RESPUESTAS);
  if (comparables.length < 2) return undefined;
  return comparables.reduce((min, s) => (s.promedio < min.promedio ? s : min)).sedeId;
}

// La evolución del ánimo va por día en los rangos de un mes o menos, y por semana en los más largos. Antes
// iba siempre por semana, y el rango que se abre por defecto (el mes en curso) al comienzo del mes caía
// entero en una semana: un solo punto y ninguna línea (4 de octubre de 2026). Los días se cuentan con las
// fechas «yyyy-MM-dd» como fechas puras, sin zona: es la cuenta del calendario, no de instantes.
export const DIAS_MAXIMOS_POR_DIA = 31;
export function granularidad(desde: string, hasta: string): 'DIA' | 'SEMANA' {
  const dia = (s: string) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  const dias = Math.round((dia(hasta) - dia(desde)) / 86_400_000) + 1;
  return dias <= DIAS_MAXIMOS_POR_DIA ? 'DIA' : 'SEMANA';
}
