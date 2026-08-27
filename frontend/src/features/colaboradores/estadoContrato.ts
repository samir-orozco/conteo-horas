export type Tono = 'rojo' | 'ambar' | 'verde' | 'gris';

// Traducción de lo que manda el servidor (utils/estadoContratoResumen.ts).
//
// Las etiquetas dicen la consecuencia, no el nombre técnico: "Se prorrogó solo"
// es lo que de verdad pasó cuando el preaviso venció, y es lo que le importa a
// quien mira la lista para decidir a quién llamar hoy.
const ETIQUETAS: Record<string, { etiqueta: string; tono: Tono }> = {
  PREAVISO_VENCIDO: { etiqueta: 'Se prorrogó solo', tono: 'rojo' },
  VENCIDO:          { etiqueta: 'Vencido',          tono: 'rojo' },
  POR_VENCER:       { etiqueta: 'Por vencer',       tono: 'ambar' },
  VIGENTE:          { etiqueta: 'Vigente',          tono: 'verde' },
  INDEFINIDO:       { etiqueta: 'Indefinido',       tono: 'verde' },
  SIN_CONTRATO:     { etiqueta: 'Sin contrato',     tono: 'gris' },
};

// Un estado desconocido se muestra tal cual en gris, en vez de dejar la celda
// vacía: el servidor puede agregar uno antes de que esta pantalla se actualice,
// y una celda en blanco se lee como "no tiene contrato", que es otra cosa.
export function estadoContrato(clave: string | null | undefined): { etiqueta: string; tono: Tono } {
  if (!clave) return { etiqueta: '—', tono: 'gris' };
  return ETIQUETAS[clave] ?? { etiqueta: clave, tono: 'gris' };
}

// Lo que hay que resolver: sin contrato firmado, vencido, por vencer, o
// prorrogado solo por no haber avisado.
const REQUIEREN_ATENCION = ['PREAVISO_VENCIDO', 'VENCIDO', 'POR_VENCER', 'SIN_CONTRATO'];

export const FILTROS_CONTRATO: { valor: string; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos los contratos' },
  { valor: 'atencion', etiqueta: 'Requieren atención' },
  { valor: 'PREAVISO_VENCIDO', etiqueta: 'Se prorrogaron solos' },
  { valor: 'VENCIDO', etiqueta: 'Vencidos' },
  { valor: 'POR_VENCER', etiqueta: 'Por vencer' },
  { valor: 'VIGENTE', etiqueta: 'Vigentes' },
  { valor: 'INDEFINIDO', etiqueta: 'Indefinidos' },
  { valor: 'SIN_CONTRATO', etiqueta: 'Sin contrato' },
];

export function cumpleFiltroContrato(filtro: string, estado: string | null | undefined): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'atencion') return !!estado && REQUIEREN_ATENCION.includes(estado);
  return estado === filtro;
}
