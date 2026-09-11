import { distanciaMetros } from './geo';
import { resolverSedeDeMarcacion, type SedeGeocerca } from './sedes';

// Cómo trabaja una persona, y qué implica eso para su ubicación al marcar.
//
// Antes la geocerca era una regla de la EMPRESA: si estaba configurada, aplicaba
// a todos por igual, y quien trabajaba desde la casa no podía marcar nunca.
// Ahora la regla es de la PERSONA.

export const MODALIDADES = ['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const MODALIDAD_POR_DEFECTO: Modalidad = 'PRESENCIAL';

// Lo que llega del cuerpo de una petición, que no está validado.
//
// Vacío o ausente cae en PRESENCIAL, que es como trabajaba todo el mundo antes
// de que este campo existiera. Pero un valor que NO se reconoce devuelve null y
// no se adivina: si un 'HIBRIDA' cayera en PRESENCIAL por defecto, alguien
// quedaría marcando con geocerca sin que nadie se enterara, y al revés es peor.
export function normalizarModalidad(v: unknown): Modalidad | null {
  if (v === undefined || v === null || v === '') return MODALIDAD_POR_DEFECTO;
  return (MODALIDADES as readonly unknown[]).includes(v) ? (v as Modalidad) : null;
}

export type GeocercaEmpresa = { lat: number; lng: number; radio: number };

export type ContextoMarca = {
  modalidad: Modalidad;
  // Las sedes del trabajador que TIENEN coordenadas. Una sede sin lat/lng no
  // puede verificarse, así que quien llama ya las dejó fuera.
  sedes: SedeGeocerca[];
  // Respaldo de la empresa, para quien no tiene sedes. Es como funcionó siempre.
  geocercaEmpresa: GeocercaEmpresa | null;
  coords: { lat: number; lng: number } | null;
};

// Qué hacer con esta marcación.
//
// El mensaje viaja DENTRO de la decisión y no como un código que la ruta
// traduzca: son dos textos distintos, con dos fuentes de radio distintas, y lo
// que hay que garantizar es que un PRESENCIAL siga leyendo exactamente lo mismo
// que leía antes.
export type DecisionUbicacion =
  | { accion: 'EXIGIR_COORDENADAS' }
  | { accion: 'RECHAZAR'; mensaje: string; distancia: number; radio: number }
  | { accion: 'PASA'; sedeId: string | null };

const PASA_SIN_SEDE: DecisionUbicacion = { accion: 'PASA', sedeId: null };

export function decidirUbicacionDeMarca(ctx: ContextoMarca): DecisionUbicacion {
  const { modalidad, sedes, geocercaEmpresa, coords } = ctx;

  // No se le mira la ubicación, ni siquiera para anotarla.
  if (modalidad === 'REMOTO') return PASA_SIN_SEDE;

  if (modalidad === 'HIBRIDO') {
    // Nunca bloquea. Lo único que hace con las coordenadas es dejar constancia
    // de en qué sede estaba, cuando estaba en alguna. Sin coordenadas o fuera de
    // todas, marca igual y el registro no lleva sede: ese null ES el dato de que
    // ese día trabajó desde fuera.
    if (!coords || sedes.length === 0) return PASA_SIN_SEDE;
    const r = resolverSedeDeMarcacion(sedes, coords.lat, coords.lng);
    return { accion: 'PASA', sedeId: r.dentro ? (r.sede?.id ?? null) : null };
  }

  // PRESENCIAL: igual que siempre.
  //
  // Si tiene sedes asignadas manda la geocerca de SUS sedes: basta estar dentro
  // de cualquiera, porque quien rota entre locales marca en la que le toca ese
  // día. Si no tiene sedes, rige la geocerca única de la empresa.
  if (sedes.length > 0) {
    if (!coords) return { accion: 'EXIGIR_COORDENADAS' };
    const r = resolverSedeDeMarcacion(sedes, coords.lat, coords.lng);
    if (!r.dentro) {
      // Se nombra la sede más cercana y la distancia: "fuera de ubicación" a
      // secas no le dice a la persona qué hacer.
      return {
        accion: 'RECHAZAR',
        mensaje: `Estás a ${r.distancia} m de ${r.sede?.nombre}. Debes marcar desde una de tus sedes.`,
        distancia: r.distancia,
        radio: r.sede?.radio ?? 0,
      };
    }
    return { accion: 'PASA', sedeId: r.sede?.id ?? null };
  }

  if (geocercaEmpresa) {
    if (!coords) return { accion: 'EXIGIR_COORDENADAS' };
    const distancia = Math.round(
      distanciaMetros(coords.lat, coords.lng, geocercaEmpresa.lat, geocercaEmpresa.lng),
    );
    if (distancia > geocercaEmpresa.radio) {
      return {
        accion: 'RECHAZAR',
        mensaje: `Estás fuera de la ubicación de la empresa (a ${distancia} m). Debes marcar desde el sitio de trabajo.`,
        distancia,
        radio: geocercaEmpresa.radio,
      };
    }
  }

  return PASA_SIN_SEDE;
}

// ===== ¿Se puede cerrar el turno en la sede donde se está marcando? =====
//
// Es la condición que vivía suelta en /marcar, sin una sola prueba. Bloquea solo
// cuando se cumplen TODAS a la vez: es PRESENCIAL, no tiene el permiso, el turno
// abierto tiene sede, la marca identifica una sede, y son distintas.
//
// Cada «pasa» tiene su razón, y ninguna es nueva salvo la del permiso:
//   - HIBRIDO y REMOTO: la regla ya no les aplicaba.
//   - turno abierto sin sede: son los de antes de que existieran las sedes, y
//     bloquearlos los dejaría atrapados sin poder cerrarse desde ningún lado.
//   - turno con una sede deducida y no probada por la ubicación: la ruta la
//     convierte en «sin sede» antes de llamar, con `sedeQueAtaElCierre`.
//   - marca sin sede: el presencial cuyas sedes no tienen coordenadas, al que la
//     geocerca de la empresa deja pasar sin identificar ninguna sede.
//   - el permiso: el supervisor que recorre varias sedes en el mismo turno.
//
// Lo que esta función NO decide es DESDE DÓNDE se puede marcar: eso lo resolvió
// antes `decidirUbicacionDeMarca`, así que con el permiso la salida igual tiene
// que caer dentro de una de sus sedes.
export type ContextoCierre = {
  modalidad: Modalidad;
  puedeCerrarEnOtraSede: boolean;
  sedeDelTurno: string | null;
  sedeDeLaMarca: string | null;
};

export function puedeCerrarAqui(ctx: ContextoCierre): boolean {
  if (ctx.modalidad !== 'PRESENCIAL') return true;
  if (ctx.puedeCerrarEnOtraSede) return true;
  if (!ctx.sedeDelTurno || !ctx.sedeDeLaMarca) return true;
  return ctx.sedeDelTurno === ctx.sedeDeLaMarca;
}

// La sede del turno abierto que obliga a cerrarlo ahí: solo la que la ubicación
// pudo probar al abrir, es decir, una entrada que marcó la persona en el kiosco
// (ROSTRO o CEDULA) en una sede que tiene coordenadas.
//
// Desde el 11 de septiembre de 2026 un presencial siempre tiene sede, así que la
// entrada que escribe un administrador, o la que se marca en una sede sin
// coordenadas, guarda una sede DEDUCIDA (utils/sedePrincipal.ts). Tomarla como
// probada frenaría en el kiosco a quien nunca marcó en ella, cuando antes esa
// entrada iba sin sede y la salida pasaba. Una entrada sin método es de antes de
// que se midiera, y no hay cómo saber de dónde salió su sede.
export function sedeQueAtaElCierre(t: {
  sedeDelTurno: string | null;
  metodoEntrada: string | null;
  sedesConUbicacion: string[];
}): string | null {
  if (!t.sedeDelTurno) return null;
  if (t.metodoEntrada !== 'ROSTRO' && t.metodoEntrada !== 'CEDULA') return null;
  return t.sedesConUbicacion.includes(t.sedeDelTurno) ? t.sedeDelTurno : null;
}

// Lo que llega del cuerpo al crear o editar un colaborador.
//
// AUSENTE devuelve undefined, que Prisma lee como «no tocar». Si ausente fuera
// false, un formulario que no manda el campo le quitaría el permiso a un
// supervisor en silencio al corregirle cualquier otro dato.
//
// Y lo que no es un booleano devuelve null, para responder 400: POST y PUT pasan
// el cuerpo a Prisma sin lista blanca, así que un "true" en texto llegaría crudo
// y saldría como un 500 sin explicación.
export function normalizarPermisoOtraSede(v: unknown): boolean | null | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'boolean' ? v : null;
}

