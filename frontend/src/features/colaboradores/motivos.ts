// Motivos de retiro. Van aparte del componente porque son datos que también
// usa la tabla de retirados, y porque un archivo que exporta un componente y
// además constantes rompe el refresco en caliente de Vite.

export const MOTIVOS: { valor: string; etiqueta: string; nota?: string }[] = [
  { valor: 'RENUNCIA', etiqueta: 'Renuncia', nota: 'No genera indemnización' },
  { valor: 'FIN_CONTRATO', etiqueta: 'Terminación del contrato', nota: 'Se avisó a tiempo, no genera indemnización' },
  { valor: 'SIN_JUSTA_CAUSA', etiqueta: 'Despido sin justa causa', nota: 'Genera indemnización del artículo 64' },
  { valor: 'JUSTA_CAUSA', etiqueta: 'Despido con justa causa', nota: 'No genera indemnización' },
  { valor: 'FIN_OBRA', etiqueta: 'Terminó la obra o labor' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

export const ETIQUETA_MOTIVO: Record<string, string> =
  Object.fromEntries(MOTIVOS.map(m => [m.valor, m.etiqueta]));
