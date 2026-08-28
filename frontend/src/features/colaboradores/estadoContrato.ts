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

// Valores especiales del filtro. No son estados que devuelva el servidor: son
// atajos que agrupan varios.
export const ATENCION = 'ATENCION';
export const SIN_SEDE = 'SIN_SEDE';

// "Requieren atención" va primero porque es el que de verdad se usa: no
// interesa la taxonomía, interesa sobre quién hay que actuar esta semana.
export const OPCIONES_CONTRATO: { valor: string; texto: string }[] = [
  { valor: ATENCION, texto: 'Requieren atención' },
  { valor: 'PREAVISO_VENCIDO', texto: 'Se prorrogaron solos' },
  { valor: 'VENCIDO', texto: 'Vencidos' },
  { valor: 'POR_VENCER', texto: 'Por vencer' },
  { valor: 'VIGENTE', texto: 'Vigentes' },
  { valor: 'INDEFINIDO', texto: 'Indefinidos' },
  { valor: 'SIN_CONTRATO', texto: 'Sin contrato' },
];

type Filtrable = { estadoContrato?: string | null; sedeIds?: string[] };

// ¿Esta persona pasa los filtros marcados?
//
// Dentro de un grupo es "o" (nadie tiene dos estados de contrato a la vez);
// entre grupos es "y" ("por vencer" Y "de la sede norte"). Un grupo sin nada
// marcado no filtra: marcar cero cosas no puede significar "ninguna".
export function cumpleFiltros(persona: Filtrable, seleccion: Record<string, string[]>): boolean {
  const contrato = seleccion.contrato ?? [];
  if (contrato.length) {
    const estado = persona.estadoContrato;
    const pasa = contrato.some(v =>
      v === ATENCION ? !!estado && REQUIEREN_ATENCION.includes(estado) : estado === v);
    if (!pasa) return false;
  }

  const sede = seleccion.sede ?? [];
  if (sede.length) {
    const suyas = persona.sedeIds ?? [];
    const pasa = sede.some(v => (v === SIN_SEDE ? suyas.length === 0 : suyas.includes(v)));
    if (!pasa) return false;
  }

  return true;
}
