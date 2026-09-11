// Dónde trabajó cada persona en un período, y el resumen por sede de los reportes
// de extras y de llegadas tarde.
//
// POR QUÉ EXISTE. Esos reportes filtraban los registros por sede ANTES de
// calcular, y eso daba números equivocados a quien trabajó en más de una sede:
// el tope semanal se medía sobre media semana, y la primera entrada del día
// podía ser el regreso del almuerzo en otra sede. Reproducido contra la ruta real
// (prisma/reproducir-sede-reportes.ts): quien trabajó de lunes a miércoles en una
// sede y de jueves a sábado en otra tenía $75.000 de extras sin filtro, y $0 en
// cada sede.
//
// LA REGLA, decidida con el dueño el 10 de septiembre de 2026: el filtro no
// reparte horas entre sedes. Decide QUIÉN aparece, y cada persona sale con sus
// números completos, calculados con todos sus turnos. Quien trabajó en más de un
// lugar es MIXTO: aparece al filtrar por cualquiera de sus sedes, y en el resumen
// va en su propia línea, sin repetirse en ninguna sede. Así las líneas suman
// exactamente el total de la empresa.

// Una sede, o null cuando el turno no guardó dónde se abrió: todo lo anterior a
// las sedes, la carga manual, los remotos y los híbridos fuera de sus sedes.
//
// Null es un lugar más y NO se completa con la sede asignada a la persona. La
// asignación es la de hoy: completar con ella movería los reportes viejos cada
// vez que alguien cambia de sede, que es el mismo defecto que ya se corrigió con
// los horarios.
export type Lugar = string | null;
export type TurnoConSede = { sedeId: string | null; sedeSalidaId: string | null };
export type SedeDelResumen = { id: string; nombre: string; activa: boolean };
export type LineaDeSede<K extends string> = { id: Lugar; nombre: string | null } & Record<K, number>;
export type ResumenPorSede<K extends string> = { porSede: LineaDeSede<K>[]; mixtos: Record<K, number>; todas: Record<K, number> };

// Los lugares donde trabajó alguien, sin repetir: primero las sedes, ordenadas por
// id para que el resultado no dependa del orden de los turnos, y al final null.
export function lugaresDeTrabajo(turnos: TurnoConSede[]): Lugar[] {
  const sedes = new Set<string>();
  let sinSede = false;
  for (const t of turnos) {
    if (t.sedeId === null) sinSede = true;
    else sedes.add(t.sedeId);
    // La sede de salida suma un lugar solo cuando se CONOCE: una salida sin sede
    // es «no se sabe», no «cerró en otra parte». Es la misma regla con la que la
    // tabla de Registros decide si una jornada cruzó de sede (`cruzoDeSede`).
    if (t.sedeSalidaId !== null) sedes.add(t.sedeSalidaId);
  }
  const orden: Lugar[] = [...sedes].sort();
  return sinSede ? [...orden, null] : orden;
}

// Sin filtro aparece todo el mundo, igual que siempre. Con filtro, quien trabajó
// en esa sede al menos una vez, aunque también haya trabajado en otra.
export function apareceConFiltro(lugares: Lugar[], sedeId?: string): boolean {
  if (!sedeId) return true;
  return lugares.includes(sedeId);
}

const aCentavos = (n: number) => Math.round(n * 100) / 100;

function ceros<K extends string>(claves: readonly K[]): Record<K, number> {
  return Object.fromEntries(claves.map(k => [k, 0])) as Record<K, number>;
}

function sumarEn<K extends string>(acumulado: Record<K, number>, fila: Record<K, number>, claves: readonly K[]): void {
  for (const k of claves) acumulado[k] = aCentavos(acumulado[k] + fila[k]);
}

// Una línea por sede con lo de quien trabajó ÚNICAMENTE en ella, una de mixtos y
// «Todas». Se arma sobre todas las filas, sin filtro: el resumen de la empresa no
// cambia según la sede que se esté mirando.
//
// Genérica en los montos porque sirve igual para extras (recargos, extra,
// adicional) que para llegadas tarde (días, minutos, monto).
export function resumirPorSede<K extends string>(
  filas: ({ lugares: Lugar[] } & Record<K, number>)[],
  claves: readonly K[],
  sedes: SedeDelResumen[],
): ResumenPorSede<K> {
  const porLugar = new Map<Lugar, Record<K, number>>();
  const mixtos = ceros(claves);
  const todas = ceros(claves);

  for (const fila of filas) {
    sumarEn(todas, fila, claves);
    // Tres casos y no hay un cuarto: no marcó, marcó en un solo lugar, o en varios.
    if (fila.lugares.length === 0) continue; // sus montos son cero: solo cuenta en «Todas»
    if (fila.lugares.length > 1) { sumarEn(mixtos, fila, claves); continue; }
    const lugar = fila.lugares[0];
    if (!porLugar.has(lugar)) porLugar.set(lugar, ceros(claves));
    sumarEn(porLugar.get(lugar)!, fila, claves);
  }

  const nombreDe = buscadorDeNombres(sedes);
  const lineas: LineaDeSede<K>[] = [];
  // Una sede activa sale aunque esté en cero: «¿cuánto costó Centro?» se responde
  // con $0, no con una sede que desaparece. Una desactivada sin nadie no sale.
  for (const s of sedes) {
    if (s.activa && !porLugar.has(s.id)) lineas.push({ id: s.id, nombre: s.nombre, ...ceros(claves) } as LineaDeSede<K>);
  }
  // Donde alguien trabajó sale siempre: una sede desactivada conserva lo que se
  // trabajó ahí, y una que no está en la lista va sin nombre. Si se perdiera, las
  // líneas dejarían de dar el total y nadie lo notaría.
  for (const [lugar, sumas] of porLugar) {
    lineas.push({ id: lugar, nombre: nombreDe(lugar), ...sumas } as LineaDeSede<K>);
  }

  return { porSede: enOrdenDeLectura(lineas), mixtos, todas };
}

export type LugarNombrado = { id: Lugar; nombre: string | null };

// Los lugares de una fila, con nombre y en orden de lectura. «Sin sede» lo
// escribe la pantalla: aquí es `id: null`.
export function nombrarLugares(lugares: Lugar[], sedes: { id: string; nombre: string }[]): LugarNombrado[] {
  const nombreDe = buscadorDeNombres(sedes);
  return enOrdenDeLectura(lugares.map(id => ({ id, nombre: nombreDe(id) })));
}

function buscadorDeNombres(sedes: { id: string; nombre: string }[]): (lugar: Lugar) => string | null {
  const nombres = new Map(sedes.map(s => [s.id, s.nombre]));
  return lugar => (lugar === null ? null : nombres.get(lugar) ?? null);
}

// El mismo orden en las filas y en el resumen: las sedes por nombre, después las
// que no están en la lista de la empresa, y al final lo que no tiene sede.
function enOrdenDeLectura<T extends { id: Lugar; nombre: string | null }>(items: T[]): T[] {
  const conNombre = items.filter(i => i.nombre !== null).sort((a, b) => a.nombre!.localeCompare(b.nombre!, 'es'));
  const desconocidas = items.filter(i => i.id !== null && i.nombre === null);
  const sinSede = items.filter(i => i.id === null);
  return [...conNombre, ...desconocidas, ...sinSede];
}
