// Vencimientos, prórrogas y topes de los contratos laborales.
//
// Toda la Ley 2466 de 2025 vive aquí, en funciones puras y probadas, porque de
// esto salen avisos que Recursos Humanos va a usar para decidir si renueva o
// deja terminar a alguien. Un error no se ve como una pantalla rota: se ve como
// un contrato que se renovó solo porque nadie avisó a tiempo.
//
// Las tres reglas que importan, y que cambiaron con la reforma:
//
//  1. Tope de CUATRO años para el término fijo. Al agotarlo se convierte en
//     indefinido por ministerio de la ley, sin que nadie firme nada.
//  2. Después de la CUARTA prórroga, un contrato pactado por menos de un año ya
//     no puede renovarse por menos de un año. (El mito viejo decía tres.)
//  3. Preaviso de 30 días. Si nadie avisa, el contrato se prorroga solo por un
//     término igual. Ese silencio es la trampa que este módulo existe para evitar.
//
// Y la que más va a doler: para los contratos que ya estaban vigentes el 25 de
// junio de 2025, el tope de cuatro años NO se cuenta desde que se firmaron, sino
// desde esa fecha. Un contrato de 2019 se vuelve indefinido el 25 de junio de 2029.

export type TipoContrato = 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR' | 'APRENDIZAJE';

export type ContratoParaCalculo = {
  tipo: TipoContrato;
  fechaInicio: Date;
  fechaFin: Date | null;
  // Solo aprendizaje: cuándo pasa de etapa lectiva a práctica. Importa porque la
  // remuneración sube del 75% al 100% del salario mínimo.
  fechaInicioPractica?: Date | null;
};

export type ProrrogaParaCalculo = { desde: Date; hasta: Date };

export type TipoAlerta =
  | 'PREAVISO_PROXIMO'
  | 'PREAVISO_VENCIDO'
  | 'PRORROGA_MINIMO_UN_ANO'
  | 'SE_VUELVE_INDEFINIDO'
  | 'SUPERA_TOPE'
  | 'CAMBIO_ETAPA_APRENDIZ';

export type Alerta = { tipo: TipoAlerta; dias: number | null };

export type EstadoContrato = {
  finVigente: Date | null;
  numeroProrrogas: number;
  diasParaVencer: number | null;
  fechaLimitePreaviso: Date | null;
  diasParaPreaviso: number | null;
  preavisoVencido: boolean;
  proximaProrrogaMinimaUnAno: boolean;
  topeMaximo: Date | null;
  seVuelveIndefinidoEl: Date | null;
  yaSuperaElTope: boolean;
  etapa: 'LECTIVA' | 'PRACTICA' | null;
  alertas: Alerta[];
};

export const DIAS_PREAVISO = 30;
export const ANIOS_TOPE_FIJO = 4;
export const ANIOS_TOPE_APRENDIZAJE = 3;
export const PRORROGAS_ANTES_DE_UN_ANIO = 4;

// Entrada en vigencia de la Ley 2466 de 2025. Los contratos vigentes ese día
// cuentan su tope desde aquí, no desde su propia fecha de inicio.
export const VIGENCIA_REFORMA = new Date(Date.UTC(2025, 5, 25, 5, 0, 0));

const DIA_MS = 24 * 60 * 60 * 1000;
const dias = (desde: Date, hasta: Date) => Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);

const sumarDias = (f: Date, n: number) => new Date(f.getTime() + n * DIA_MS);

// Suma años conservando el día de calendario en la convención de Bogotá. No se
// usa aritmética de milisegundos porque los años bisiestos la desvían.
const sumarAnios = (f: Date, n: number) =>
  new Date(Date.UTC(f.getUTCFullYear() + n, f.getUTCMonth(), f.getUTCDate(), 5, 0, 0));

export function estadoDelContrato(
  contrato: ContratoParaCalculo,
  prorrogas: ProrrogaParaCalculo[],
  hoy: Date,
): EstadoContrato {
  const { tipo, fechaInicio } = contrato;
  const alertas: Alerta[] = [];

  // El indefinido y el de obra o labor no vencen en una fecha, así que no hay
  // preaviso, ni tope, ni nada que avisar.
  const tieneVencimiento = tipo === 'FIJO' || tipo === 'APRENDIZAJE';

  const enOrden = [...prorrogas].sort((a, b) => a.hasta.getTime() - b.hasta.getTime());
  const ultima = enOrden[enOrden.length - 1];
  const finVigente = tieneVencimiento ? (ultima?.hasta ?? contrato.fechaFin) : null;

  const diasParaVencer = finVigente ? dias(hoy, finVigente) : null;
  const fechaLimitePreaviso = finVigente ? sumarDias(finVigente, -DIAS_PREAVISO) : null;
  const diasParaPreaviso = fechaLimitePreaviso ? dias(hoy, fechaLimitePreaviso) : null;
  const vigente = diasParaVencer === null || diasParaVencer >= 0;
  const preavisoVencido = !!fechaLimitePreaviso && vigente && diasParaPreaviso! < 0;

  // El tope: cuatro años para el fijo, tres para el aprendizaje. Si el contrato
  // ya existía cuando entró la reforma, se cuenta desde la reforma.
  let topeMaximo: Date | null = null;
  if (tipo === 'FIJO') {
    const arranque = fechaInicio < VIGENCIA_REFORMA ? VIGENCIA_REFORMA : fechaInicio;
    topeMaximo = sumarAnios(arranque, ANIOS_TOPE_FIJO);
  } else if (tipo === 'APRENDIZAJE') {
    topeMaximo = sumarAnios(fechaInicio, ANIOS_TOPE_APRENDIZAJE);
  }

  // Solo el fijo muta a indefinido. El aprendizaje es un contrato de otra
  // naturaleza: al terminar, termina.
  const seVuelveIndefinidoEl = tipo === 'FIJO' ? topeMaximo : null;
  const yaSuperaElTope = !!topeMaximo && !!finVigente && finVigente > topeMaximo;

  // La regla de la cuarta prórroga solo alcanza a los contratos pactados por
  // menos de un año, que es como está redactada en la norma.
  const duracionOriginal = contrato.fechaFin ? dias(fechaInicio, contrato.fechaFin) : 0;
  const proximaProrrogaMinimaUnAno =
    tipo === 'FIJO' && duracionOriginal > 0 && duracionOriginal < 365
    && enOrden.length >= PRORROGAS_ANTES_DE_UN_ANIO;

  // Etapa del aprendiz
  let etapa: 'LECTIVA' | 'PRACTICA' | null = null;
  if (tipo === 'APRENDIZAJE' && contrato.fechaInicioPractica) {
    etapa = hoy >= contrato.fechaInicioPractica ? 'PRACTICA' : 'LECTIVA';
  }

  // ===== Alertas =====
  if (vigente && fechaLimitePreaviso) {
    if (preavisoVencido) alertas.push({ tipo: 'PREAVISO_VENCIDO', dias: diasParaVencer });
    else if (diasParaPreaviso! <= DIAS_PREAVISO) alertas.push({ tipo: 'PREAVISO_PROXIMO', dias: diasParaPreaviso });
  }
  if (proximaProrrogaMinimaUnAno) alertas.push({ tipo: 'PRORROGA_MINIMO_UN_ANO', dias: null });
  if (yaSuperaElTope) alertas.push({ tipo: 'SUPERA_TOPE', dias: null });
  else if (vigente && seVuelveIndefinidoEl) {
    const d = dias(hoy, seVuelveIndefinidoEl);
    if (d >= 0 && d <= DIAS_PREAVISO) alertas.push({ tipo: 'SE_VUELVE_INDEFINIDO', dias: d });
  }
  if (etapa === 'LECTIVA' && contrato.fechaInicioPractica) {
    const d = dias(hoy, contrato.fechaInicioPractica);
    if (d >= 0 && d <= DIAS_PREAVISO) alertas.push({ tipo: 'CAMBIO_ETAPA_APRENDIZ', dias: d });
  }

  return {
    finVigente, numeroProrrogas: enOrden.length, diasParaVencer,
    fechaLimitePreaviso, diasParaPreaviso, preavisoVencido,
    proximaProrrogaMinimaUnAno, topeMaximo, seVuelveIndefinidoEl, yaSuperaElTope,
    etapa, alertas,
  };
}
