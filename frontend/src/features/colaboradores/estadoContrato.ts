import { normalizarModalidad } from './modalidad';
import { sedeImplicita, type SedeDelFormulario } from './sedesDelFormulario';

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

type Filtrable = { estadoContrato?: string | null; sedeIds?: string[]; modalidad?: string };

// Las sedes con las que se muestra y se filtra a alguien en la lista: las suyas, o a
// un presencial sin ninguna, la Sede principal, por defecto («mostrar la principal»,
// decisión del dueño del 12 de septiembre de 2026). No se le asigna: sigue marcando
// desde donde marca hoy. Es la misma regla con la que el formulario la muestra
// (`sedeImplicita`). Un híbrido o un remoto sin sedes sigue sin sede, y es a quien
// encuentra la opción «Sin sede».
export function sedesQueCuentan(persona: { sedeIds?: string[]; modalidad?: string }, sedes: SedeDelFormulario[]): { ids: string[]; porDefecto: boolean } {
  const suyas = persona.sedeIds ?? [];
  const principal = sedeImplicita(normalizarModalidad(persona.modalidad), suyas, sedes);
  return principal ? { ids: [principal], porDefecto: true } : { ids: suyas, porDefecto: false };
}

// Las sedes que ofrece el filtro de la lista: donde cuenta alguien, porque ofrecer
// una en la que nadie cuenta solo da resultados vacíos. La principal entra si algún
// presencial sin sedes cuenta en ella, aunque nadie la tenga asignada.
export function sedesParaFiltrar(
  personas: (Filtrable & { sedeNombres?: string[] })[],
  sedes: (SedeDelFormulario & { nombre: string })[],
): { valor: string; texto: string }[] {
  const nombres = new Map<string, string>();
  for (const p of personas) {
    const { ids, porDefecto } = sedesQueCuentan(p, sedes);
    ids.forEach((id, i) => nombres.set(id, (porDefecto ? sedes.find(s => s.id === id)?.nombre : p.sedeNombres?.[i]) ?? 'Sede'));
  }
  return [...nombres].map(([valor, texto]) => ({ valor, texto })).sort((a, b) => a.texto.localeCompare(b.texto));
}

// ¿Esta persona pasa los filtros marcados?
//
// Dentro de un grupo es "o" (nadie tiene dos estados de contrato a la vez);
// entre grupos es "y" ("por vencer" Y "de la sede norte"). Un grupo sin nada
// marcado no filtra: marcar cero cosas no puede significar "ninguna".
//
// `sedes` son las de GET /sedes, que dicen cuál es la principal. Sin ellas no se le
// supone sede a nadie.
export function cumpleFiltros(persona: Filtrable, seleccion: Record<string, string[]>, sedes: SedeDelFormulario[] = []): boolean {
  const contrato = seleccion.contrato ?? [];
  if (contrato.length) {
    const estado = persona.estadoContrato;
    const pasa = contrato.some(v =>
      v === ATENCION ? !!estado && REQUIEREN_ATENCION.includes(estado) : estado === v);
    if (!pasa) return false;
  }

  const sede = seleccion.sede ?? [];
  if (sede.length) {
    const suyas = sedesQueCuentan(persona, sedes).ids;
    const pasa = sede.some(v => (v === SIN_SEDE ? suyas.length === 0 : suyas.includes(v)));
    if (!pasa) return false;
  }

  return true;
}
