import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { calcularHorasTrabajadas, calcularLiquidacion, descontarAlmuerzo, descontarAlmuerzoOrdinarias, CODIGOS_EXTRA } from './horasColombiana';
import { jornadaVigente, tiposVigentes } from './vigencias';
import { franjaDelDia, DIAS_SEMANA, HorarioConFranjas, construirExtraConfig } from './tardanzas';
import type { DiaEsperadoCalculado } from './diasEsperados';
import { ajustarAJornada } from './ajusteJornada';
import { minutosAlmuerzoADescontar } from './almuerzo';
import { minutosDescansoADescontar } from './descansos';

// El núcleo de la liquidación, que vivía dentro de routes/reportes.ts. Salió de ahí
// el 12 de septiembre de 2026 para poder probarlo sin base de datos: es lo que
// calcula la plata de /liquidacion y de /extras-resumen (CLAUDE.md 8.2).

const TZ = 'America/Bogota';

function semanaKey(fecha: Date): string {
  const z = toZonedTime(fecha, TZ);
  return `${getISOWeekYear(z)}-W${String(getISOWeek(z)).padStart(2,'0')}`;
}

function claveDiaBogota(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
}

// Minutos de almuerzo a descontar de un registro: solo si el horario tiene
// almuerzo y la franja de ESE día lo aplica (ej. el sábado corto no).
export function almuerzoDelRegistro(horario: HorarioConFranjas | null | undefined, fecha: Date): number {
  if (!horario || !horario.almuerzoMin) return 0;
  const z = toZonedTime(fecha, TZ);
  const franja = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);
  return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}

// Lo que ya se cobró de UNA pausa en cada día. Cada fila pide lo que el día debe hasta
// ella menos lo ya cobrado, y lo que una fila no alcanza a pagar, porque se le acabaron
// las horas ordinarias, lo pagan las siguientes del mismo día. Lo usan la liquidación y
// el panel de inicio (routes/dashboard.ts), que tenía la misma cuenta copiada con el
// mismo defecto (12 de septiembre de 2026).
export function cobroDePausas() {
  const cobrado = new Map<string, number>();
  return (dia: string, debido: number, descontar: (minutos: number) => { descontado: number }): number => {
    const ya = cobrado.get(dia) ?? 0;
    if (debido <= ya) return 0;
    const { descontado } = descontar(debido - ya);
    cobrado.set(dia, ya + descontado);
    return descontado;
  };
}

type DetalleRegistro = {
  // El id viaja para que el desglose pueda pedir las fotos de verificación con
  // `GET /registros/:id/fotos`. Sin él, el frontend tenía la fila pero no sabía
  // a qué marcación pertenecía.
  id: string;
  fecha: Date; entrada: Date; salida: Date;
  filas: { codigo: string; nombre: string; horas: number; subtotal: number }[];
};

// Núcleo del cálculo de liquidación de UN colaborador en un período: recorre sus
// registros agrupados por semana ISO (el tope de 42h/sem se resetea cada semana),
// aplica el motor de horas colombianas registro por registro, y opcionalmente
// arma el desglose día a día (para el drill-down de "Extras y recargos").
export function liquidarRegistros(
  registros: { id: string; fecha: Date; entrada: Date | null; salida: Date | null }[],
  horario: HorarioConFranjas | null,
  extraConfig: ReturnType<typeof construirExtraConfig>,
  festivosDates: Date[],
  tiposHoraTodos: any[],
  jornadas: any[],
  salarioMensual: number,
  horasMes: number,
  incluirDetalle: boolean,
  // Días materializados del rango: de ahí sale la hora de salida programada para
  // la tolerancia. Si no llegan, la tolerancia sencillamente no se aplica.
  diasEsperados: DiaEsperadoCalculado[] = [],
) {
  const diaPorClave = new Map(diasEsperados.map(d => [claveDiaBogota(d.fecha), d]));

  // Las pausas se miden por DÍA: la regla mira todos los tramos del día a la vez para
  // saber cuánto de cada ventana estuvo la persona marcada. Pero se COBRAN fila por
  // fila, y hasta el 12 de septiembre de 2026 el día entero se le cobraba a la primera
  // fila que pudiera pagar algo, y se daba por cobrado aunque solo alcanzara a pagar
  // diez minutos: Darío, con una marca de 06:50 a 07:00 creada antes que la de 07:00 a
  // 16:00, quedaba con 50 minutos pagados de más.
  //
  // Ahora cada fila debe lo que el día acumula hasta ella, en orden de entrada. Con
  // ventana, lo que sus tramos y los anteriores pasaron dentro, con el mismo redondeo
  // del día aplicado al acumulado; sin ventana, los minutos fijos del día, que paga la
  // primera fila que alcance y completan las siguientes (`cobroDePausas`). La última
  // fila debe exactamente el número del día, el mismo que muestra la tabla de Registros.
  const debidoPorFila = new Map<string, { almuerzo: number; descanso: number }>();
  const tramosPorDia = new Map<string, { id: string; entrada: Date; salida: Date }[]>();
  for (const r of registros) {
    if (!r.entrada || !r.salida) continue;
    const k = claveDiaBogota(r.entrada);
    if (!tramosPorDia.has(k)) tramosPorDia.set(k, []);
    // Los tramos van YA AJUSTADOS por la tolerancia de salida, igual que los que
    // entran al motor de horas más abajo. Con los crudos, el solape del almuerzo
    // se mediría sobre minutos que la liquidación ya recortó: quien sale 12:10
    // teniendo salida programada a las 12:00 y tolerancia de 15 pagaría 10
    // minutos de almuerzo de un tiempo que no se le está contando.
    const d = diaPorClave.get(k);
    const t = d ? ajustarAJornada(r.entrada, r.salida, d) : { entrada: r.entrada, salida: r.salida };
    tramosPorDia.get(k)!.push({ id: r.id, entrada: t.entrada, salida: t.salida });
  }
  for (const [k, tramos] of tramosPorDia) {
    const d = diaPorClave.get(k);
    if (!d) continue;
    const delDia = [...tramos].sort((a, b) => a.entrada.getTime() - b.entrada.getTime());
    delDia.forEach((t, i) => {
      const hastaAqui = delDia.slice(0, i + 1);
      debidoPorFila.set(t.id, { almuerzo: minutosAlmuerzoADescontar(hastaAqui, d), descanso: minutosDescansoADescontar(hastaAqui, d) });
    });
  }
  // En orden de entrada dentro de cada fecha. La base no garantiza ningún orden entre las
  // filas de un mismo día, y de ese orden dependen la fila a la que se le cobra cada pausa
  // y el acumulado de la semana con el que se clasifican las horas. Entre fechas distintas
  // queda el orden por fecha de la consulta: la jornada de la semana sale de la primera.
  const enOrden = [...registros].sort((a, b) =>
    claveDiaBogota(a.fecha) !== claveDiaBogota(b.fecha)
      ? a.fecha.getTime() - b.fecha.getTime()
      : (a.entrada?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.entrada?.getTime() ?? Number.MAX_SAFE_INTEGER));
  const porSemana = new Map<string, typeof registros>();
  for (const reg of enOrden) {
    const key = semanaKey(reg.fecha);
    if (!porSemana.has(key)) porSemana.set(key, []);
    porSemana.get(key)!.push(reg);
  }

  const acumulado: Record<string, { codigo: string; nombre: string; recargo: number; minutos: number }> = {};
  const cobrarAlmuerzo = cobroDePausas();
  const cobrarDescanso = cobroDePausas();
  const detalleRegistros: DetalleRegistro[] = [];

  for (const [, regsDeUnaSemana] of porSemana) {
    const jornadaSemanal = jornadaVigente(regsDeUnaSemana[0].fecha, jornadas);
    let minutosOrdSemana = 0;
    for (const registro of regsDeUnaSemana) {
      if (!registro.entrada || !registro.salida) continue;
      const claveDia = claveDiaBogota(registro.entrada);

      // Tolerancia de jornada: los minutos sueltos que alguien trabaja fuera de
      // su horario sin orden previa no se pagan como extra. Se aplica ANTES del
      // motor de horas para que la clasificación (ordinaria/extra/nocturna) se
      // haga sobre la jornada ya ajustada.
      const diaDelRegistro = diaPorClave.get(claveDia);
      const { entrada, salida } = diaDelRegistro
        ? ajustarAJornada(registro.entrada, registro.salida, diaDelRegistro)
        : { entrada: registro.entrada, salida: registro.salida };

      const tiposDelDia = tiposVigentes(registro.fecha, tiposHoraTodos);
      const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
        entrada, salida, festivosDates, tiposDelDia as any, jornadaSemanal, minutosOrdSemana, extraConfig
      );
      // Sin fila del día no hay ventana ni almuerzo congelado: se cae al
      // horario vigente, igual que antes de existir `DiaEsperado`.
      const conVentana = !!diaDelRegistro?.almuerzoInicio && !!diaDelRegistro?.almuerzoFin;
      const debido = debidoPorFila.get(registro.id);
      const almuerzo = diaDelRegistro
        ? (debido?.almuerzo ?? 0)
        : almuerzoDelRegistro(horario, registro.entrada);
      const almuerzoCobrado = cobrarAlmuerzo(claveDia, almuerzo, m => (conVentana
        ? descontarAlmuerzoOrdinarias(resultado, m)
        : descontarAlmuerzo(resultado, m)));
      // El descanso no remunerado se descuenta como el almuerzo con ventana, de las
      // horas ordinarias. Sin fila del día no hay descanso, porque nace con ventana y
      // no tiene minutos fijos de respaldo.
      const descansoCobrado = cobrarDescanso(claveDia, debido?.descanso ?? 0, m => descontarAlmuerzoOrdinarias(resultado, m));
      const ordDelRegistro = Math.max(0, minutosOrdinariosTrabajados - almuerzoCobrado - descansoCobrado);
      minutosOrdSemana += ordDelRegistro;

      if (incluirDetalle) {
        // Solo lo que genera pago adicional (excluye HOD, que ya está en el salario)
        const filas = calcularLiquidacion(salarioMensual, horasMes, resultado)
          .filter(l => l.codigo !== 'HOD' && l.horas > 0)
          .map(l => ({ codigo: l.codigo, nombre: l.nombre, horas: l.horas, subtotal: l.subtotal }));
        if (filas.length > 0) {
          detalleRegistros.push({ id: registro.id, fecha: registro.fecha, entrada: registro.entrada, salida: registro.salida, filas });
        }
      }

      for (const p of resultado) {
        if (!acumulado[p.codigo]) acumulado[p.codigo] = { ...p };
        else acumulado[p.codigo].minutos += p.minutos;
      }
    }
  }

  const horasPorTipo = Object.values(acumulado);
  const liquidacion = calcularLiquidacion(salarioMensual, horasMes, horasPorTipo);
  const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
  const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
  const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);

  // Minutos ORDINARIOS del período (ya netos de almuerzo), para comparar contra
  // las horas que el horario exigía. Se suman los códigos no extra del acumulado
  // —no el contador semanal interno— porque ese excluye domingos y festivos, y
  // aquí sí queremos contarlos: si alguien trabajó un domingo, ese tiempo lo
  // trabajó. Las extra quedan fuera a propósito: se pagan aparte con su recargo.
  //
  // Se toman los MINUTOS crudos, no las horas de `liquidacion`: esas vienen
  // redondeadas a 2 decimales y al multiplicarlas por 60 reaparecen colas de
  // coma flotante (167.33h → 10039.8 min en vez de 10040).
  const minutosOrdinarios = horasPorTipo
    .filter(t => !CODIGOS_EXTRA.has(t.codigo))
    .reduce((s, t) => s + t.minutos, 0);

  return { liquidacion, totalRecargos, totalExtra, totalAdicional, registrosCont: registros.length, detalleRegistros, minutosOrdinarios };
}
