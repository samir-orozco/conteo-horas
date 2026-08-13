import { minutosDe } from './tardanzas';

// Cuánto almuerzo se le descuenta a alguien en un día.
//
// La regla es una sola:
//
//   Se descuentan los minutos de la ventana de almuerzo durante los cuales la
//   persona estuvo MARCADA.
//
// De ahí salen solos cuatro comportamientos que antes eran problemas distintos:
//
//  - No marcó el almuerzo: estuvo marcado toda la ventana → se descuenta
//    completa. No marcar deja de ser negocio.
//  - Se fue temprano y nunca llegó a la ventana: no se descuenta nada. Antes
//    perdía una hora que jamás tomó — quien salía a las 10:00 tras trabajar dos
//    horas terminaba con una sola contada.
//  - Marcó su almuerzo: el hueco ya quedó fuera de lo trabajado, así que no se
//    vuelve a restar. Antes se cobraba dos veces, y el disciplinado que marcaba
//    cobraba menos que el que no.
//  - Almorzó en 20 minutos: los otros 40 estuvo marcado y se le descuentan
//    igual. Ese tiempo se lo regala a la empresa; la jornada semanal la fija la
//    norma, no la velocidad para comer.
//
// Sin ventana configurada se conserva el comportamiento de siempre (restar los
// minutos fijos). Eso es lo que mantiene quietos los reportes ya emitidos: los
// días materializados antes de esta función no tienen ventana.

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type DiaParaAlmuerzo = {
  fecha: Date; // medianoche de Bogotá
  almuerzoMin: number;
  almuerzoInicio: string | null; // "12:00"
  almuerzoFin: string | null; // "13:00"
};

export type TramoTrabajado = { entrada: Date; salida: Date };

// Minutos en que dos intervalos se solapan.
function solape(aIni: number, aFin: number, bIni: number, bFin: number): number {
  return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni)) / MS_MIN;
}

export function minutosAlmuerzoADescontar(
  tramos: TramoTrabajado[],
  dia: DiaParaAlmuerzo,
): number {
  // Sin ventana: comportamiento histórico. No se toca el pasado.
  if (!dia.almuerzoInicio || !dia.almuerzoFin) return dia.almuerzoMin;
  if (tramos.length === 0) return 0;

  const inicio = dia.fecha.getTime() + minutosDe(dia.almuerzoInicio) * MS_MIN;
  let fin = dia.fecha.getTime() + minutosDe(dia.almuerzoFin) * MS_MIN;
  // Ventana que cruza medianoche (turno nocturno que almuerza en la madrugada).
  if (fin <= inicio) fin += UN_DIA_MS;

  // El almuerzo de un turno nocturno cae en la madrugada del día SIGUIENTE al
  // que ancla la fila. Si ningún tramo toca la ventana tal cual, se prueba
  // corrida un día: es el mismo almuerzo, contado desde el otro extremo.
  const cruza = (ini: number, f: number) =>
    tramos.reduce((s, t) => s + solape(t.entrada.getTime(), t.salida.getTime(), ini, f), 0);

  const directo = cruza(inicio, fin);
  if (directo > 0) return Math.round(directo);
  return Math.round(cruza(inicio + UN_DIA_MS, fin + UN_DIA_MS));
}

// ¿Este turno puede cerrarse como "salgo a almorzar"?
//
// La usan los dos extremos: el kiosco para mostrar la pregunta y el servidor
// para creerle a la marca. Si estuvieran separadas podrían discrepar, y la
// persona marcaría un almuerzo que el servidor descarta sin decir nada.
//
// No mira la hora a propósito. Quien sale a las 11:40 a almorzar no debería
// pelear con el reloj, y responder no cuesta nada: la marca de almuerzo no
// cambia cuánto se descuenta —eso lo decide `minutosAlmuerzoADescontar` por
// solape— solo deja constancia de qué fue esa salida.
export function puedeSalirAAlmorzar(
  dia: { almuerzoInicio: string | null; almuerzoFin: string | null } | null,
  yaAlmorzo: boolean,
): boolean {
  if (!dia?.almuerzoInicio || !dia.almuerzoFin) return false;
  return !yaAlmorzo;
}
