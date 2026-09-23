import {
  horaValida, franjasConVentanaImposible, mensajeVentanasImposibles,
  ventanasParaGuardar, type TramoConVentanas,
} from './ventanasDeHorario';

// EL CATÁLOGO DE PLANTILLAS DE TURNO (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Una plantilla es una FRANJA SIN DÍAS. Los días se los pone el planificador al pintar el
// calendario, no la plantilla: esa es toda la diferencia, y es la que permite que «Mañana
// 06:00-14:00» sirva para cualquier persona en cualquier fecha.
//
// De ahí el reparto, que es deliberado:
//
//   - La PLANTILLA lleva lo de la franja: horas, ventana de almuerzo, descansos, sede.
//   - El HORARIO sigue llevando lo de política: tolerancias y `ajustaEntrada`, que son de la
//     empresa y no del turno.
//
// Y de ahí que aquí casi no haya código. Todo lo que revisa las pausas (que el almuerzo quepa,
// que los tres descansos no se crucen, la forma canónica con que se guardan) ya existe en
// `ventanasDeHorario` y se usa tal cual. Lo único nuevo es el nombre, el color y la regla de que
// un descanso no lleva horas.
//
// Se manda ENTERA en cada guardado, sin distinguir crear de editar. `esDescanso` y las horas
// están acopladas —un descanso con horas es una contradicción, no un cambio parcial— y las
// franjas del horario ya se reemplazan completas por esta misma razón (routes/horarios.ts).

// La paleta es CERRADA a propósito. El color se pinta en una celda de la rejilla del planificador
// con texto encima, así que tiene que garantizar contraste: un selector libre deja elegir amarillo
// sobre blanco. Y se guarda la CLAVE, no el hex, para poder retocar la paleta sin migrar datos.
//
// El frontend tiene su propia copia de esta lista, en `lib/coloresDeTurno.ts`, que es la que la
// traduce a color. SIN GUARDA AUTOMÁTICA: el frontend no importa nada del backend (su tsconfig
// incluye solo `src`) y esa es la convención de todos los espejos que ya existen entre los dos
// lados (`modalidad.ts`, `sedesDeReporte.ts`, `sedePrincipal.ts`, `archivos.ts`).
//
// Lo que pasa si las dos listas se separan, para que quede dicho y no se descubra después: un color
// que solo conozca el frontend se guarda aquí como el de por defecto, y uno que solo conozca el
// backend simplemente no se ofrece. Es visible al instante en la celda y no mueve ningún número.
// Si algún día esta lista gobernara algo que sí mueva dinero, esto deja de ser aceptable.
export const COLORES_DE_PLANTILLA = [
  'grafito', 'ambar', 'indigo', 'esmeralda', 'rubi', 'cobalto', 'violeta', 'ocre',
] as const;

export type ColorDePlantilla = typeof COLORES_DE_PLANTILLA[number];

// El neutro de la marca: el que toma una plantilla a la que nadie le eligió color.
export const COLOR_POR_DEFECTO: ColorDePlantilla = 'grafito';

export type DatosDePlantilla = {
  nombre: string;
  color: ColorDePlantilla;
  esDescanso: boolean;
  sedeId: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  tieneAlmuerzo: boolean;
  almuerzoInicio: string | null;
  almuerzoFin: string | null;
  // El texto canónico, igual que `FranjaHorario.descansos`. NULL es «sin descansos», nunca "[]".
  descansos: string | null;
};

type PlantillaLimpia = { ok: true; datos: DatosDePlantilla } | { ok: false; motivo: string };

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const colorDe = (v: unknown): ColorDePlantilla =>
  (COLORES_DE_PLANTILLA as readonly unknown[]).includes(v) ? (v as ColorDePlantilla) : COLOR_POR_DEFECTO;

// El ancho de `plantillas_turno.nombre`, que es varchar(191) como todo el texto corto de este
// esquema. Se revisa AQUÍ y no se deja para la base: un nombre más largo pasaba y reventaba en MySQL
// con P2000, y la ruta lo devolvía como un 500 con el mensaje interno de Prisma, que trae la ruta del
// archivo en el servidor. Encontrado probando contra la base el 19 de septiembre de 2026, el mismo
// día que se escribió esto, y ya estaba documentado en `cuerpoDePermiso.ts`.
const LARGO_MAXIMO_DEL_NOMBRE = 191;

export function limpiarPlantilla(data: Record<string, unknown>): PlantillaLimpia {
  const nombre = texto(data.nombre);
  if (!nombre) return { ok: false, motivo: 'Falta el nombre de la plantilla.' };
  // Sobre el nombre YA RECORTADO: los espacios de los extremos no se guardan, así que tampoco
  // pueden gastar el tope. Y no se recorta en silencio: el administrador creería que guardó lo que
  // escribió.
  if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
    return { ok: false, motivo: `El nombre del turno es demasiado largo: máximo ${LARGO_MAXIMO_DEL_NOMBRE} caracteres.` };
  }

  const color = colorDe(data.color);
  const sedeId = texto(data.sedeId) || null;

  // Un día de descanso no tiene horas, y las que lleguen NO se miran: la pantalla las oculta al
  // marcar «descanso», así que si llegan son residuo de lo que el administrador había escrito
  // antes de cambiar de idea. Guardarlas dejaría una plantilla que el planificador pinta como
  // libre mientras el kiosco le exige entrada.
  if (data.esDescanso === true) {
    return {
      ok: true,
      datos: {
        nombre, color, esDescanso: true, sedeId,
        horaEntrada: null, horaSalida: null, tieneAlmuerzo: false,
        almuerzoInicio: null, almuerzoFin: null, descansos: null,
      },
    };
  }

  // Sin horas no hay turno que planificar: el día quedaría materializado sin nada que exigir.
  if (data.horaEntrada === undefined && data.horaSalida === undefined) {
    return { ok: false, motivo: 'Un turno de trabajo necesita hora de entrada y de salida.' };
  }
  const horaEntrada = horaValida(data.horaEntrada);
  if (horaEntrada === null) return { ok: false, motivo: 'La hora de entrada no es válida.' };
  const horaSalida = horaValida(data.horaSalida);
  if (horaSalida === null) return { ok: false, motivo: 'La hora de salida no es válida.' };
  // Mismo criterio que `leerVentana` en descansos.ts: inicio igual a fin no es un tramo de cero,
  // es uno de veinticuatro horas.
  if (horaEntrada === horaSalida) {
    return { ok: false, motivo: 'La entrada y la salida no pueden ser la misma hora.' };
  }

  const tramo: TramoConVentanas = {
    horaEntrada, horaSalida,
    tieneAlmuerzo: data.tieneAlmuerzo as boolean | undefined,
    almuerzoInicio: data.almuerzoInicio as string | null | undefined,
    almuerzoFin: data.almuerzoFin as string | null | undefined,
    ...(data.descansos !== undefined ? { descansos: data.descansos } : {}),
  };

  // El motivo no se redacta aquí: es el mismo que ya da la ruta de horarios ante la misma falla,
  // o el administrador leería dos explicaciones distintas del mismo error.
  const imposibles = franjasConVentanaImposible([tramo]);
  if (imposibles.length > 0) return { ok: false, motivo: mensajeVentanasImposibles(imposibles) };

  return {
    ok: true,
    datos: { nombre, color, esDescanso: false, sedeId, horaEntrada, horaSalida, ...ventanasParaGuardar(tramo) },
  };
}
