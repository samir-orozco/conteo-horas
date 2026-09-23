import { horasDeMinutos } from './semana';

// CÓMO SE LE CUENTAN A UNA PERSONA LAS REGLAS DE SU DÍA (22 de septiembre de 2026).
//
// Pedido del dueño: «nos hace falta más info, similar a como tenemos en la creación de horario:
// las tolerancias, cómo se maneja el almuerzo, descansos no remunerados».
//
// POR QUÉ ES UNA DECISIÓN Y NO PLANTILLA: los números crudos mienten por omisión. Una tolerancia
// de cero escrita como «0 minutos» se lee como relleno; escrita «sin tolerancia» dice lo que de
// verdad le pasa a quien llega un minuto tarde. Un almuerzo sin ventana no puede inventarse una.
// Y «1 descansos» delata que nadie pensó en el caso de uno.

export type VentanaDeDescanso = { inicio: string; fin: string };

// Las reglas de UN día, tal como las manda `GET /turnos/calendario`. Salen de la fila del día, no
// del horario vigente: son las que gobiernan ese día y con las que ese día se liquida.
export type JornadaDelDia = {
  horaEntrada: string | null;
  horaSalida: string | null;
  minutosEsperados: number;
  toleranciaMin: number;
  toleranciaSalidaMin: number;
  ajustaEntrada: boolean;
  almuerzoMin: number;
  almuerzoInicio: string | null;
  almuerzoFin: string | null;
  descansos: VentanaDeDescanso[];
};

// La nota es OPCIONAL a propósito: aparece solo cuando dice algo que el valor no dice. Una nota
// de relleno debajo de cada línea entrena a la gente a no leer ninguna.
export type LineaDeDetalle = { etiqueta: string; valor: string; nota?: string };

const NOTA_ENTRADA_TEMPRANA = 'Vale también para llegar antes de la hora.';
const NOTA_SALIDA = 'Minutos de más al salir que no cuentan como extra.';

const linea = (etiqueta: string, valor: string, nota?: string): LineaDeDetalle =>
  nota === undefined ? { etiqueta, valor } : { etiqueta, valor, nota };

// Cero no es un número más: es que no hay margen. Por eso tiene su propia frase.
const toleranciaEnPalabras = (minutos: number): string =>
  minutos === 0 ? 'Sin tolerancia' : `${minutos} minutos`;

export function detalleDeJornada(j: JornadaDelDia): LineaDeDetalle[] {
  // Un día que el horario no programa no tiene reglas que mostrar. Sus otras columnas traen
  // valores igual, así que la lista vacía sale de las horas y no de que falten datos.
  if (j.horaEntrada === null || j.horaSalida === null) return [];

  const cuantos = j.descansos.length;

  // La ventana del almuerzo se muestra aunque el almuerzo no se descuente, y no es un descuido:
  // son dos datos distintos. `almuerzoMin` es cuánto se resta de la jornada; la ventana es a qué
  // hora se almuerza, y sigue siendo cierta en una empresa que da el almuerzo y lo paga.
  const ventanaDeAlmuerzo = j.almuerzoInicio !== null && j.almuerzoFin !== null
    ? `Entre ${j.almuerzoInicio} y ${j.almuerzoFin}.`
    : undefined;

  return [
    linea('Jornada', `${j.horaEntrada} a ${j.horaSalida}`,
      `${horasDeMinutos(j.minutosEsperados)} esperadas, ya sin el almuerzo.`),

    linea('Tolerancia de entrada', toleranciaEnPalabras(j.toleranciaMin),
      j.ajustaEntrada ? NOTA_ENTRADA_TEMPRANA : undefined),

    // La nota va siempre: esta tolerancia es la que menos gente conoce, y sin explicarla el valor
    // no se entiende ni cuando es cero.
    linea('Tolerancia de salida', toleranciaEnPalabras(j.toleranciaSalidaMin), NOTA_SALIDA),

    linea('Almuerzo',
      j.almuerzoMin === 0 ? 'No se descuenta' : `${j.almuerzoMin} minutos`,
      ventanaDeAlmuerzo),

    linea('Descansos no remunerados',
      cuantos === 0 ? 'Ninguno' : `${cuantos} descanso${cuantos === 1 ? '' : 's'}`,
      cuantos === 0 ? undefined : j.descansos.map(d => `${d.inicio} a ${d.fin}`).join(', ')),
  ];
}
