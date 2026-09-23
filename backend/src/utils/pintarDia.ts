import { horaValida, leerDescansos, ventanasEnOrden, minutosDeLaUnion, escribirDescansos } from './descansos';
import { duracionFranjaMin } from './tardanzas';

// QUÉ EXIGE UN DÍA QUE SE PINTÓ CON UN TURNO DEL CATÁLOGO (21 de septiembre de 2026).
//
// Es la decisión que sostiene el planificador, y mueve dinero: lo que esto devuelve se escribe en
// `DiaEsperado`, y de ahí salen la tolerancia de llegada, el descuento de almuerzo, el saldo de
// tiempo y qué horas son extra. Un minuto de más aquí es un minuto pagado de más en la nómina.
//
// SE ESCRIBIÓ MIRANDO `calcularDiasEsperados` LÍNEA POR LÍNEA, y no de memoria. Un día pintado y un
// día generado por el horario tienen que exigir lo mismo con los mismos datos: si difieren, la
// diferencia no se ve en ninguna pantalla y aparece en una liquidación.
//
// El reparto entre plantilla y horario no lo inventa esta función: lo eligió el catálogo cuando se
// creó, y está escrito en `cuerpoDePlantilla.ts`.
//
//   la PLANTILLA lleva lo de la franja: horas, ventana de almuerzo, descansos.
//   el HORARIO lleva lo de política: tolerancias, `ajustaEntrada`, y los minutos de almuerzo de
//   respaldo para los turnos a los que nadie les puso ventana.

// Lo que hace falta de un turno del catálogo. No se pide la plantilla entera a propósito: así la
// función se puede probar sin fabricar una fila de Prisma.
export type PlantillaParaPintar = {
  esDescanso: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
  tieneAlmuerzo: boolean;
  almuerzoInicio: string | null;
  almuerzoFin: string | null;
  descansos: string | null;
};

// La política de la empresa. `null` = a esta persona no se le asignó horario, que es un caso real:
// se le puede pintar un turno igual, y entonces simplemente no hay tolerancias.
export type PoliticaDelHorario = {
  toleranciaMin?: number | null;
  almuerzoMin?: number | null;
  toleranciaSalidaMin?: number | null;
  ajustaEntrada?: boolean | null;
} | null;

// Los mismos campos que produce `calcularDiasEsperados`, que son los que `DiaEsperado` guarda.
export type DiaPintado = {
  programado: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
  toleranciaMin: number;
  almuerzoMin: number;
  minutosEsperados: number;
  toleranciaSalidaMin: number;
  ajustaEntrada: boolean;
  almuerzoInicio: string | null;
  almuerzoFin: string | null;
  descansos: string | null;
};

// `null` significa «esta plantilla no describe un día que se pueda pintar», y quien llama tiene que
// rechazarlo. La alternativa era devolverlo como día no programado, y eso convertiría EN SILENCIO
// un turno de trabajo roto en un día libre.
export function diaDesdePlantilla(
  plantilla: PlantillaParaPintar,
  horario: PoliticaDelHorario,
): DiaPintado | null {
  // La política se copia siempre, también en un día de descanso: es lo que hace
  // `calcularDiasEsperados` en su rama sin franja, y que los dos caminos difieran aquí sería una
  // diferencia invisible entre pintar un día y generarlo.
  const politica = {
    toleranciaMin: horario?.toleranciaMin ?? 0,
    toleranciaSalidaMin: horario?.toleranciaSalidaMin ?? 0,
    ajustaEntrada: horario?.ajustaEntrada ?? false,
  };

  // Un día libre no tiene horas, y las que traiga NO se miran: la pantalla las oculta al marcar
  // «descanso», así que son residuo de lo que el administrador escribió antes de cambiar de idea.
  // Guardarlas dejaría un día que el calendario pinta como libre mientras el kiosco exige entrada.
  if (plantilla.esDescanso) {
    return {
      ...politica,
      programado: false,
      horaEntrada: null,
      horaSalida: null,
      almuerzoMin: 0,
      minutosEsperados: 0,
      almuerzoInicio: null,
      almuerzoFin: null,
      descansos: null,
    };
  }

  const entrada = horaValida(plantilla.horaEntrada);
  const salida = horaValida(plantilla.horaSalida);
  if (entrada === null || salida === null) return null;
  // Mismo criterio que `leerVentana` y que `limpiarPlantilla`: inicio igual a fin no es un tramo de
  // cero, es uno de veinticuatro horas, y nadie quiso decir eso.
  if (entrada === salida) return null;

  // La ventana manda sobre los minutos sueltos del horario. Se VALIDAN las dos horas, al revés que
  // el cálculo desde una franja: si una ventana rota llegara aquí, `duracionFranjaMin` devolvería
  // un número cualquiera y ese número se restaría de lo exigido. Una ventana inválida degrada al
  // respaldo, que es el comportamiento de un turno sin ventana.
  const ini = horaValida(plantilla.almuerzoInicio);
  const fin = horaValida(plantilla.almuerzoFin);
  const conVentana = ini !== null && fin !== null && ini !== fin;
  const almuerzo = plantilla.tieneAlmuerzo
    ? (conVentana ? duracionFranjaMin(ini, fin) : (horario?.almuerzoMin ?? 0))
    : 0;

  // Los descansos no remunerados NO dependen de `tieneAlmuerzo`: el sábado corto sin almuerzo puede
  // tener descansos igual. Se ordenan desde la hora de entrada para que en un turno nocturno el de
  // las 23:55 vaya antes que el de las 03:00, y se descuenta la UNIÓN, no la suma: dos descansos
  // que se solapan no cuestan dos veces.
  const ventanas = ventanasEnOrden(entrada, leerDescansos(plantilla.descansos));
  const descanso = minutosDeLaUnion(entrada, ventanas);
  const bruto = duracionFranjaMin(entrada, salida);

  return {
    ...politica,
    programado: true,
    horaEntrada: entrada,
    horaSalida: salida,
    almuerzoMin: almuerzo,
    // Nunca negativo: un turno corto con pausas absurdas no debería poder guardarse, pero si llega,
    // que no produzca un número que después se sume a un saldo de tiempo.
    minutosEsperados: Math.max(0, bruto - almuerzo - descanso),
    // La ventana solo se guarda si este turno descuenta almuerzo.
    almuerzoInicio: plantilla.tieneAlmuerzo && conVentana ? ini : null,
    almuerzoFin: plantilla.tieneAlmuerzo && conVentana ? fin : null,
    descansos: escribirDescansos(ventanas),
  };
}
