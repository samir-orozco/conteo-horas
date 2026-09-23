import { medianocheBogota, claveDiaBogota } from './fechas';

// EL ÚNICO CAMINO DE ESCRITURA SOBRE LA DECISIÓN DE UN DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// El cuerpo llega de la red, así que toda la validación vive aquí y no puede apoyarse en que la
// pantalla la haya hecho antes.
//
// QUÉ ESTÁ EN JUEGO, y no es un recargo: esta tabla no mueve plata, porque el recargo sale de
// `dias_esperados.esDescanso` y esto no lo toca. Lo que está en juego es el REGISTRO, que es lo
// único que la empresa podrá mostrar el día que alguien reclame que le debían un día libre. Un dato
// mal validado aquí no rompe una pantalla: deja una constancia que afirma algo que no pasó.

// Guarda de ABUSO, no regla de negocio: la nota es texto libre que viaja por la red. Es la misma
// clase de tope que `MAXIMO_DE_RESPUESTAS` en `cuerpoDeRespuestaDescanso`.
export const MAXIMO_DE_NOTA = 500;

export type DecisionDeDescanso = 'PENDIENTE' | 'DINERO' | 'COMPENSATORIO';

export type DecisionLimpia = {
  colaboradorId: string;
  // "YYYY-MM-DD" de Bogotá, ya comprobada. Quien llama la convierte con `medianocheBogota`.
  fecha: string;
  decision: DecisionDeDescanso;
  fechaCompensatorio: string | null;
  nota: string | null;
};

type Resultado = { ok: true; datos: DecisionLimpia } | { ok: false; motivo: string };

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// Una fecha de verdad, no solo con la forma de una.
//
// El formato no alcanza: "2026-13-40" pasa el regex y JavaScript lo NORMALIZA a febrero de 2027 sin
// quejarse. Por eso se comprueba la ida y la vuelta con las mismas funciones que usa el resto del
// backend, en vez de escribir aquí una validación de calendario propia.
function fechaDeBogota(v: unknown): string | null {
  const s = texto(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return claveDiaBogota(medianocheBogota(s)) === s ? s : null;
}

export function limpiarDecisionDeDescanso(data: unknown, colaboradoresValidos: readonly string[]): Resultado {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, motivo: 'Falta el cuerpo de la decisión.' };
  }
  const fila = data as Record<string, unknown>;

  // La guarda de ALCANCE, y va primero. Sin ella, un cuerpo armado a mano escribiría decisiones
  // sobre la gente de otra empresa.
  const colaboradorId = texto(fila.colaboradorId);
  if (!colaboradorId || !colaboradoresValidos.includes(colaboradorId)) {
    return { ok: false, motivo: 'Esa persona no existe o no es de esta empresa.' };
  }

  const fecha = fechaDeBogota(fila.fecha);
  if (fecha === null) {
    return { ok: false, motivo: 'La fecha del descanso trabajado no es válida.' };
  }

  // Un caso por valor con rechazo explícito de todo lo demás (§9.4). Aceptar un valor raro dejaría
  // una constancia ilegible el día que alguien la lea en un juzgado.
  const decision = texto(fila.decision).toUpperCase();
  if (decision !== 'PENDIENTE' && decision !== 'DINERO' && decision !== 'COMPENSATORIO') {
    return { ok: false, motivo: 'La decisión tiene que ser pendiente, dinero o compensatorio.' };
  }

  const notaCruda = texto(fila.nota);
  if (notaCruda.length > MAXIMO_DE_NOTA) {
    return { ok: false, motivo: `La nota es demasiado larga: el máximo son ${MAXIMO_DE_NOTA} caracteres.` };
  }
  // `null` y `''` significan lo mismo para quien lee, pero solo uno se distingue en la base de
  // «nadie escribió nada».
  const nota = notaCruda === '' ? null : notaCruda;

  if (decision === 'COMPENSATORIO') {
    const dia = fechaDeBogota(fila.fechaCompensatorio);
    if (dia === null) {
      // Es la mitad del dato. Guardar «se le debe un día» sin decir cuál deja una constancia que no
      // prueba nada, que es peor que no tenerla, porque parece que sí.
      return { ok: false, motivo: 'Un compensatorio necesita el día que se le asignó.' };
    }
    if (dia === fecha) {
      return { ok: false, motivo: 'El día compensatorio no puede ser el mismo que se trabajó.' };
    }
    return { ok: true, datos: { colaboradorId, fecha, decision, fechaCompensatorio: dia, nota } };
  }

  // El día que llegue NO se mira: es residuo de la pantalla, del administrador que eligió un día y
  // después cambió a dinero. Misma doctrina que `cuerpoDeRespuestaDescanso` con `dia` cuando el tipo
  // es ROTATIVO: guardarlo dejaría una decisión que dice dos cosas a la vez.
  return { ok: true, datos: { colaboradorId, fecha, decision, fechaCompensatorio: null, nota } };
}
