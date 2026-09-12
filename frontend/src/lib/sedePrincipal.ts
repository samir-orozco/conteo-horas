// La Sede principal y lo que avisa la pestaña de sedes al eliminar una.
//
// No hay una marca de «principal» guardada: es la sede activa más antigua de la
// empresa, y GET /sedes la marca con `principal` (backend/src/utils/sedePrincipal.ts).
// Si se elimina, toma su lugar la activa más antigua que quede, sin migrar nada.
//
// Decisión del dueño del 12 de septiembre de 2026: a quien se queda sin sede no se le
// asigna otra. Si trabaja presencial, sus marcaciones sin ubicación se cuentan al leer
// en su sede por defecto de HOY (la regla, en backend/src/utils/sedePrincipal.ts). Por
// eso el aviso no puede prometer que todo lo marcado en una sede se queda en ella: eso
// solo vale para lo que probó la ubicación. Lo demás pasa a contarse en otra sede,
// también en los reportes de fechas pasadas (revisión del mismo día).

export type SedeConAntiguedad = { id: string; nombre: string; creadoEn: string; principal?: boolean };

// El mismo orden que el servidor: por fecha de creación, y el id desempata dos sedes
// creadas en el mismo instante.
function masAntiguaPrimero(a: SedeConAntiguedad, b: SedeConAntiguedad): number {
  const porFecha = Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
  if (porFecha !== 0) return porFecha;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// `sedes` son las activas, que son las que lista GET /sedes.
export function principalTrasEliminar(sedes: SedeConAntiguedad[], idQueSeElimina: string): SedeConAntiguedad | null {
  return sedes.filter(s => s.id !== idQueSeElimina).sort(masAntiguaPrimero)[0] ?? null;
}

const MISMO_DIA = 'No cambian las de un día en que esa persona también marcó con ubicación.';

// Qué conserva su sede y qué pasa a contarse en otra al eliminar una sede, dicho sin
// jerga. Lo que probó la ubicación se queda donde se marcó. Las marcaciones sin
// ubicación de un presencial se cuentan en su sede por defecto: la más antigua de las
// suyas, o la principal si no le queda ninguna. La excepción es la regla b) y la a) de
// la atribución: un día con alguna marca con ubicación sigue contando donde se marcó.
export function avisoAlEliminarSede(sedes: SedeConAntiguedad[], eliminando: SedeConAntiguedad): string {
  // La principal que queda: la activa más antigua de las demás. Si la que se elimina
  // no es la principal, es la misma de hoy.
  const principal = principalTrasEliminar(sedes, eliminando.id);
  if (!principal) {
    return 'Es la única sede de la empresa: quien trabaja presencial siempre necesita una, así que no se puede eliminar.';
  }
  const x = eliminando.nombre;
  const conUbicacion = `Las marcaciones hechas con ubicación en ${x} siguen contando en ${x}.`;
  const destino = `pasan a contarse en otra de sus sedes, o en ${principal.nombre} si no les queda ninguna, también en fechas pasadas.`;
  if (eliminando.principal) {
    return `Es la sede principal: al eliminarla, la principal pasa a ser ${principal.nombre}. ${conUbicacion} `
      + `Las marcaciones sin ubicación de quienes trabajan presencial y tenían ${x}, o no tienen ninguna sede, ${destino} ${MISMO_DIA}`;
  }
  return `${conUbicacion} Las marcaciones sin ubicación de quienes trabajan presencial y tenían ${x} ${destino} ${MISMO_DIA}`;
}
