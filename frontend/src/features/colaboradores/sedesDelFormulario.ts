import type { Modalidad } from './modalidad';

// Un trabajador PRESENCIAL siempre tiene sede (decisión del dueño, 11 de
// septiembre de 2026): si nadie le elige una, el servidor le asigna la Sede
// principal (backend/src/utils/sedePrincipal.ts). El formulario la MUESTRA, pero
// no la mete en lo que se guarda: la primera versión la preseleccionaba, y quien
// cambiaba a remoto antes de guardar le dejaba la principal a alguien que ya no
// veía el selector.

export type SedeDelFormulario = { id: string; principal?: boolean };

export function sedeImplicita(modalidad: Modalidad, seleccionadas: string[], sedes: SedeDelFormulario[]): string | null {
  if (modalidad !== 'PRESENCIAL' || seleccionadas.length > 0) return null;
  return sedes.find(s => s.principal)?.id ?? null;
}
