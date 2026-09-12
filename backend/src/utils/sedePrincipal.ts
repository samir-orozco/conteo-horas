import { rangoDiaBogota } from './fechas';

// La sede de un trabajador PRESENCIAL cuando ninguna marca la probó.
//
// DECISIÓN DEL DUEÑO (12 de septiembre de 2026), «mostrarla al leer»: esa sede NO
// se guarda. El kiosco y la carga manual escriben en `registros.sedeId` solo la
// sede que identificó la ubicación, como siempre. Lo que se decide aquí se calcula
// al LEER, en los reportes y en la tabla de Registros, y viaja marcado `porDefecto`
// para que la pantalla lo diga. «Sin sede» solo es legítimo para un híbrido o un
// remoto.
//
// Por qué no se guarda: el 11 de septiembre se guardó la sede deducida en la misma
// columna que la probada, y tres rondas de revisión encontraron defectos siempre
// por la misma causa, cada parte del sistema adivinando cuál de las dos era (el
// kiosco llegó a frenar la salida de quien nunca marcó en la sede deducida).
// Calculada al leer, la columna vuelve a significar una sola cosa.
//
// La contra, aceptada por el dueño: se atribuye con la modalidad y las sedes de
// HOY, así que si alguien cambia de sede, sus marcas sin ubicación pasan a contar
// en la nueva. Cubre también las marcaciones viejas, que no se completan en la base.
//
// No hay una marca de «principal» en la base: la Sede principal es la sede activa
// más antigua de la empresa. Es la que se crea sola con la empresa, y si alguien la
// desactiva, la siguiente más antigua toma su lugar sin que haya que migrar nada.

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

// La sede por defecto de una persona: su única sede activa; con varias, la más
// antigua de las suyas, y no la principal de la empresa, donde quizá no trabaja; sin
// ninguna, la Sede principal, que se le muestra sin asignársela («mostrar la
// principal», 12 de septiembre de 2026). Null solo si la empresa no tiene ninguna
// sede activa.
export function sedePorDefecto(suyas: SedeParaElegir[], deLaEmpresa: SedeParaElegir[]): string | null {
  return sedePrincipal(suyas) ?? sedePrincipal(deLaEmpresa);
}

export type FilaConLugar = { fecha: Date; entrada: Date | null; sedeId: string | null; sedeSalidaId: string | null };
export type PersonaParaAtribuir = { modalidad: string; sedePorDefecto: string | null };
export type LugarDeEntrada = { id: string | null; porDefecto: boolean };

const comoEsta = (f: FilaConLugar): LugarDeEntrada => ({ id: f.sedeId, porDefecto: false });

// Dónde se abrió cada fila de UNA persona, en el orden en que llegan.
//
// Una sede guardada, de entrada o de salida, la probó la ubicación y se usa tal
// cual. Solo a un PRESENCIAL, y solo en una fila con hora de entrada y sin sede de
// entrada, se le atribuye una, marcada `porDefecto`, con la primera pista que haya:
//   a) la sede de salida de la misma fila;
//   b) la de la fila de ese mismo día de Bogotá que entró más temprano con alguna
//      sede probada, la de entrada antes que la de salida;
//   c) su sede por defecto (`sedePorDefecto`).
// Sin ninguna, queda sin sede. Una fila sin hora de entrada no es una marcación: no
// recibe sede ni le da la pista a otra.
export function lugaresDeEntrada(filas: FilaConLugar[], persona: PersonaParaAtribuir): LugarDeEntrada[] {
  if (persona.modalidad !== 'PRESENCIAL') return filas.map(comoEsta);
  const pistaDelDia = primeraSedeProbadaDeCadaDia(filas);
  return filas.map(f => {
    if (f.sedeId !== null || f.entrada === null) return comoEsta(f);
    const id = f.sedeSalidaId ?? pistaDelDia.get(diaDeBogota(f.fecha)) ?? persona.sedePorDefecto;
    return id === null ? comoEsta(f) : { id, porDefecto: true };
  });
}

// El día de una fila es el de su `fecha` en Bogotá, que es el de la jornada: el
// regreso del almuerzo de un turno nocturno queda anclado al día en que se entró.
const diaDeBogota = (fecha: Date) => rangoDiaBogota(fecha).inicioDia.getTime();

// Por día, la sede probada de la fila que entró más temprano. Si dos entraron en el
// mismo instante decide el id de la sede, para que no dependa del orden de la base.
function primeraSedeProbadaDeCadaDia(filas: FilaConLugar[]): Map<number, string> {
  const primera = new Map<number, { entrada: number; sede: string }>();
  for (const f of filas) {
    const sede = f.sedeId ?? f.sedeSalidaId;
    if (f.entrada === null || sede === null) continue;
    const dia = diaDeBogota(f.fecha);
    const entrada = f.entrada.getTime();
    const actual = primera.get(dia);
    if (!actual || entrada < actual.entrada || (entrada === actual.entrada && sede < actual.sede)) {
      primera.set(dia, { entrada, sede });
    }
  }
  return new Map([...primera].map(([dia, p]) => [dia, p.sede]));
}
