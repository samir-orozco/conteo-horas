import { minutosAlmuerzoADescontar, type DiaParaAlmuerzo } from './almuerzo';
import { ajustarAJornada, type DiaParaAjuste } from './ajusteJornada';
import { minutosDe } from './tardanzas';

// Qué pasó con el almuerzo de UN día.
//
// El almuerzo no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Esta función lee ese hueco.
//
// Existe para que la columna de Registros, el modal de detalle y el reporte
// cuenten la MISMA historia. Si cada pantalla dedujera el almuerzo por su
// cuenta, tarde o temprano dirían cosas distintas del mismo día, y el
// administrador no tendría forma de saber cuál creer.
//
// Distingue a propósito dos números que es fácil confundir:
//  - `minutos`: lo que la persona se tomó de verdad (lo que se ve).
//  - `minutosDescontados`: lo que ese almuerzo le cuesta al día (lo que se paga).
// No son lo mismo. Quien almuerza en 20 minutos se tomó 20, pero se le
// descuentan los 60 de la ventana: ese tiempo se lo regaló a la empresa.

const MS_MIN = 60_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type RegistroDeDia = {
  entrada: Date | null;
  salida: Date | null;
  salidaAlmuerzo: boolean;
  entradaEstimada: boolean;
};

export type EstadoAlmuerzo =
  | 'SIN_VENTANA'  // el día no tiene ventana congelada: no hay hora que mostrar
  | 'MARCADO'      // salió y volvió
  | 'ABIERTO'      // salió a almorzar y todavía no vuelve
  | 'NO_MARCADO';  // hay ventana, pero nadie marcó la salida

export type ResumenAlmuerzo = {
  estado: EstadoAlmuerzo;
  ventana: { inicio: string; fin: string } | null;
  salida: Date | null;
  regreso: Date | null;
  minutos: number | null;      // lo que se tomó de verdad
  minutosDescontados: number;  // lo que le cuesta al día
  regresoEstimado: boolean;    // el regreso lo puso el sistema, no una persona
  seExcedio: boolean;          // volvió después del fin de la ventana
  // Cuántos minutos después del FIN de la ventana volvió. Ojo: no es lo mismo
  // que "almorzó más de lo que dura la ventana". Quien sale a las 11:30 y
  // vuelve a las 12:50 almorzó 80 minutos —veinte más de los que dura— y aun
  // así llegó antes de las 13:00: no se pasó de nada.
  minutosDeMas: number;
};

export function resumirAlmuerzoDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaAlmuerzo,
): ResumenAlmuerzo {
  // Los tramos completos son los que cuentan para el descuento: uno abierto
  // todavía no dice cuánto se trabajó.
  const tramos = registros
    .filter(r => r.entrada && r.salida)
    .map(r => ({ entrada: r.entrada!, salida: r.salida! }));
  // Un día sin ningún tramo cerrado no ha pagado nada, así que tampoco ha
  // descontado nada. Hay que decirlo aquí porque `minutosAlmuerzoADescontar`
  // devuelve los minutos fijos antes de mirar los tramos; el motor no se entera
  // porque solo mete al cálculo los días con algún tramo cerrado (reportes.ts).
  const minutosDescontados = tramos.length > 0 ? minutosAlmuerzoADescontar(tramos, dia) : 0;

  const conVentana = !!dia.almuerzoInicio && !!dia.almuerzoFin;
  const base: ResumenAlmuerzo = {
    estado: conVentana ? 'NO_MARCADO' : 'SIN_VENTANA',
    ventana: conVentana ? { inicio: dia.almuerzoInicio!, fin: dia.almuerzoFin! } : null,
    salida: null, regreso: null, minutos: null,
    minutosDescontados, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
  };
  if (!conVentana) return base;

  // Ordenar por entrada: los registros pueden llegar en cualquier orden y el
  // "regreso" es el primer tramo POSTERIOR a la salida, no cualquiera.
  const enOrden = [...registros]
    .filter(r => r.entrada)
    .sort((a, b) => a.entrada!.getTime() - b.entrada!.getTime());

  const salidaAAlmorzar = enOrden.find(r => r.salidaAlmuerzo && r.salida);
  if (!salidaAAlmorzar) return base;

  const salida = salidaAAlmorzar.salida!;
  const regresoReg = enOrden.find(r => r.entrada!.getTime() > salida.getTime());
  if (!regresoReg) return { ...base, estado: 'ABIERTO', salida };

  const regreso = regresoReg.entrada!;
  const minutos = Math.round((regreso.getTime() - salida.getTime()) / MS_MIN);
  const minutosDeMas = Math.max(0, Math.round((regreso.getTime() - finDeLaVentana(salida, dia)) / MS_MIN));

  return {
    ...base,
    estado: 'MARCADO',
    salida, regreso, minutos,
    regresoEstimado: regresoReg.entradaEstimada,
    seExcedio: minutosDeMas > 0,
    minutosDeMas,
  };
}

// Instante en que se acaba la ventana de almuerzo de ESE turno.
//
// La ventana es una hora ("13:00"), no una fecha, así que hay que anclarla. Se
// ancla a la fila del día, con la misma corrección que hace
// `minutosAlmuerzoADescontar`: el almuerzo de un turno nocturno cae en la
// madrugada del día SIGUIENTE al que ancla la fila. Si la salida a almorzar ya
// pasó el fin calculado, la ventana que aplica es la del día siguiente — es el
// mismo almuerzo, contado desde el otro extremo.
export function finDeLaVentana(salida: Date, dia: DiaParaAlmuerzo): number {
  const inicio = dia.fecha.getTime() + minutosDe(dia.almuerzoInicio!) * MS_MIN;
  let fin = dia.fecha.getTime() + minutosDe(dia.almuerzoFin!) * MS_MIN;
  if (fin <= inicio) fin += UN_DIA_MS;
  return salida.getTime() > fin ? fin + UN_DIA_MS : fin;
}

// Cuánto tiempo se le contó a alguien en un día: la suma de sus tramos, ya
// ajustada por la tolerancia de salida y ya descontado el almuerzo.
//
// Es la pregunta por la que se abre la pantalla —"¿trabajó sus ocho horas o
// no?"— y hoy no se responde en ningún lado: la tabla muestra cada tramo por
// separado y deja al administrador sumando de cabeza.
//
// Se puede mostrar sin miedo a contradecir la nómina porque este total NO
// depende de lo que la persona llevara acumulado esa semana. El acumulado
// decide cómo se CLASIFICAN los minutos (ordinaria, extra, nocturna), no
// cuántos son. Por eso el número no baila según el filtro de fechas de la
// pantalla, que es justo lo que lo haría indefendible.
//
// Lo que este número NO es: plata. Para eso está el reporte, donde esos mismos
// minutos ya vienen repartidos por tipo de hora y con sus recargos.
export function minutosContadosDelDia(
  registros: RegistroDeDia[],
  dia: DiaParaAlmuerzo & DiaParaAjuste,
): number {
  const tramos = registros
    .filter(r => r.entrada && r.salida)
    .map(r => ajustarAJornada(r.entrada!, r.salida!, dia));
  if (tramos.length === 0) return 0;

  const trabajados = tramos.reduce(
    (s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0,
  );
  const almuerzo = minutosAlmuerzoADescontar(
    tramos.map(t => ({ entrada: t.entrada, salida: t.salida })), dia,
  );
  // Media jornada con una hora de almuerzo fijo daría negativo. Cero es la
  // respuesta honesta; un número en rojo sería una invención.
  return Math.max(0, Math.round(trabajados - almuerzo));
}
