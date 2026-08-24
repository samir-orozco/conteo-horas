// Forma de lo que devuelve /api/contratos. El bloque `calculo` lo produce el
// motor del backend (utils/contratos.ts), donde vive toda la Ley 2466: aquí no
// se recalcula nada, solo se muestra.

export type TipoContrato = 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR' | 'APRENDIZAJE';

export type TipoAlerta =
  | 'PREAVISO_PROXIMO' | 'PREAVISO_VENCIDO' | 'PRORROGA_MINIMO_UN_ANO'
  | 'SE_VUELVE_INDEFINIDO' | 'SUPERA_TOPE' | 'CAMBIO_ETAPA_APRENDIZ';

export type Prorroga = {
  id: string; desde: string; hasta: string;
  documentoTipo: string | null; documentoNombre: string | null;
};

export type Contrato = {
  id: string; colaboradorId: string; tipo: TipoContrato;
  fechaInicio: string; fechaFin: string | null; fechaInicioPractica: string | null;
  estado: 'VIGENTE' | 'TERMINADO';
  convertidoAIndefinidoEn: string | null;
  observacion: string | null;
  documentoTipo: string | null; documentoNombre: string | null;
  creadoEn: string;
  prorrogas: Prorroga[];
  calculo: {
    finVigente: string | null;
    numeroProrrogas: number;
    diasParaVencer: number | null;
    fechaLimitePreaviso: string | null;
    diasParaPreaviso: number | null;
    preavisoVencido: boolean;
    proximaProrrogaMinimaUnAno: boolean;
    topeMaximo: string | null;
    seVuelveIndefinidoEl: string | null;
    yaSuperaElTope: boolean;
    etapa: 'LECTIVA' | 'PRACTICA' | null;
    alertas: { tipo: TipoAlerta; dias: number | null }[];
  };
};

export const TIPO_LABEL: Record<TipoContrato, string> = {
  INDEFINIDO: 'Término indefinido',
  FIJO: 'Término fijo',
  OBRA_LABOR: 'Obra o labor',
  APRENDIZAJE: 'Aprendizaje',
};

// El texto de cada alerta. Se escribe una vez y se usa en la tarjeta y en el
// aviso, para que digan exactamente lo mismo.
export const ALERTA: Record<TipoAlerta, { titulo: string; detalle: (d: number | null) => string; tono: 'rojo' | 'ambar' | 'azul' }> = {
  PREAVISO_VENCIDO: {
    titulo: 'Se venció el plazo para avisar',
    detalle: () => 'Nadie avisó por escrito a tiempo, así que este contrato se prorroga solo por un término igual.',
    tono: 'rojo',
  },
  PREAVISO_PROXIMO: {
    titulo: 'Se acerca el plazo para avisar',
    detalle: d => `Quedan ${d} días para avisar por escrito si no se va a renovar. Pasado ese plazo se prorroga automáticamente.`,
    tono: 'ambar',
  },
  PRORROGA_MINIMO_UN_ANO: {
    titulo: 'La próxima prórroga no puede ser menor a un año',
    detalle: () => 'Ya lleva cuatro prórrogas y el contrato se pactó por menos de un año, así que la siguiente debe ser de un año como mínimo.',
    tono: 'ambar',
  },
  SE_VUELVE_INDEFINIDO: {
    titulo: 'Está por convertirse en indefinido',
    detalle: d => `En ${d} días se agota el tope de cuatro años y pasa a indefinido por ley.`,
    tono: 'azul',
  },
  SUPERA_TOPE: {
    titulo: 'Pasado del tope legal',
    detalle: () => 'La vigencia supera el tope de cuatro años de la Ley 2466 de 2025. Por ley este contrato ya es indefinido.',
    tono: 'rojo',
  },
  CAMBIO_ETAPA_APRENDIZ: {
    titulo: 'Cambio de etapa del aprendiz',
    detalle: d => `En ${d} días pasa a etapa práctica y la remuneración sube del 75% al 100% del salario mínimo.`,
    tono: 'azul',
  },
};
