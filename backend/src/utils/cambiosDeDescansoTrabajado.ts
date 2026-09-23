import { claveDiaBogota } from './fechas';

// EL RASTRO DE QUIÉN CAMBIÓ QUÉ EN UNA DECISIÓN DE DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// Calcado de `cambiosRegistro.ts`, que es el patrón de auditoría que este producto ya tiene: una
// tabla de campos con su formateador, solo se miran los que LLEGAN, y un campo que llega con el
// mismo valor no ensucia el historial. Un segundo patrón para lo mismo sería una forma de que los
// dos se separen (CLAUDE.md §9.3).
//
// POR QUÉ NO ES OPCIONAL: el dueño pidió que el modal se pueda editar libremente, para no obligar a
// su cliente a vivir con un error. Editar libremente sin dejar rastro convierte la constancia en
// nada, porque solo sobrevive el estado final. Lo que protege a la empresa en un reclamo no es el
// estado: es poder mostrar quién decidió qué y cuándo.

export type EstadoDeDecision = {
  decision: string;
  fechaCompensatorio: Date | null;
  claseAlDecidir: string | null;
  nota: string | null;
};

export type Diferencia = { campo: string; antes: string; despues: string };

// El valor de cualquiera de los cuatro campos. Se escribe la unión de verdad en vez de un `any`
// porque el lint del backend está EN su tope de 173 con cero errores: un `any` nuevo lo rompe, y
// §10 dice que el tope no se sube.
type ValorDeCampo = string | Date | null;

// Se guarda en TEXTO y no en claves crudas: esto se lee dentro de dos años, posiblemente por alguien
// que ya no trabaja aquí. Una fecha en milisegundos no se entiende; «2026-10-07» sí.
const comoDia = (v: ValorDeCampo): string => (v instanceof Date ? claveDiaBogota(v) : 'sin día');
const comoTexto = (v: ValorDeCampo, siFalta: string): string =>
  (typeof v === 'string' && v !== '' ? v : siFalta);

const CAMPOS: { clave: keyof EstadoDeDecision; formato: (v: ValorDeCampo) => string }[] = [
  { clave: 'decision', formato: v => comoTexto(v, 'sin decisión') },
  { clave: 'fechaCompensatorio', formato: comoDia },
  { clave: 'claseAlDecidir', formato: v => comoTexto(v, 'sin clase') },
  { clave: 'nota', formato: v => comoTexto(v, 'sin nota') },
];

// Compara lo guardado contra los campos que trae la edición.
//
// Solo mira lo que VIENE: el PUT admite cambios parciales, y lo que no llega no cambió. Si se
// miraran todos, un cuerpo que solo trae la nota anotaría además que la decisión «cambió» a nada.
export function diferenciasDeDecision(
  antes: EstadoDeDecision,
  cambios: Partial<EstadoDeDecision>,
): Diferencia[] {
  const salida: Diferencia[] = [];
  for (const { clave, formato } of CAMPOS) {
    if (!(clave in cambios)) continue;
    const a = formato(antes[clave]);
    const b = formato(cambios[clave] ?? null);
    if (a !== b) salida.push({ campo: clave, antes: a, despues: b });
  }
  return salida;
}
