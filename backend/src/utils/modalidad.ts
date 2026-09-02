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
