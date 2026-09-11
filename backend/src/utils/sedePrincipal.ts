// Un trabajador PRESENCIAL siempre tiene sede: «Sin sede» solo tiene sentido
// para un híbrido o un remoto (decisión del dueño, 11 de septiembre de 2026).
//
// No hay una marca de «principal» en la base: la Sede principal es la sede
// activa más antigua de la empresa. Es la que se crea sola con la empresa, y si
// alguien la desactiva, la siguiente más antigua toma su lugar sin que haya que
// migrar nada.

export interface SedeParaElegir {
  id: string;
  activa: boolean;
  creadoEn: Date;
}

// El id desempata dos sedes creadas en el mismo instante, para que la principal
// no dependa del orden en que las devuelva la base.
function masAntiguaPrimero(a: SedeParaElegir, b: SedeParaElegir): number {
  const porFecha = a.creadoEn.getTime() - b.creadoEn.getTime();
  if (porFecha !== 0) return porFecha;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sedePrincipal(sedes: SedeParaElegir[]): string | null {
  return sedes.filter(s => s.activa).sort(masAntiguaPrimero)[0]?.id ?? null;
}

// Qué sedes le quedan guardadas a alguien al crearlo, editarlo o importarlo.
export function sedesParaGuardar(modalidad: string, elegidas: string[], principal: string | null): string[] {
  if (elegidas.length > 0) return elegidas;
  if (modalidad !== 'PRESENCIAL' || !principal) return [];
  return [principal];
}

// A qué sede va una marca cuando la ubicación no identificó ninguna: las sedes
// del presencial no tienen coordenadas, o la marca es manual.
export function sedeDeMarcaSinUbicacion(p: {
  modalidad: string;
  sedeIdentificada: string | null;
  asignadas: SedeParaElegir[];
  principal: string | null;
  // La sede de la otra marca de la misma jornada, cuando un administrador la
  // completa a mano: la tarde no pasó por el kiosco, pero la mañana sí.
  sedeDeLaJornada?: string | null;
}): string | null {
  if (p.sedeIdentificada) return p.sedeIdentificada;
  if (p.modalidad !== 'PRESENCIAL') return null;
  if (p.sedeDeLaJornada) return p.sedeDeLaJornada;

  const suyas = p.asignadas.filter(s => s.activa);
  if (suyas.length === 0) return p.principal;
  // Con varias sedes y sin ubicación no se sabe en cuál está: va a la más antigua
  // de las suyas. Si la principal es una de ellas, es esa, porque la principal es
  // la más antigua de la empresa; y si no, no se la manda a la principal, donde
  // esta persona no trabaja.
  return sedePrincipal(suyas);
}
