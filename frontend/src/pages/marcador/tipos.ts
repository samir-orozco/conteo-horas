// Tipos compartidos del kiosco público (Marcador).
import type { Modalidad } from '../../features/colaboradores/modalidad';
export type Sede = { id: string; nombre: string };

export type Colaborador = { id: string; nombre: string; apellido: string; cargo: string | null;
  // Decide si se le valida la ubicación al marcar. El kiosco NO puede saberla
  // antes del login: GET /kiosco/:token es por empresa, y ahí todavía no se sabe
  // quién va a marcar. Llega en la respuesta del login, que es el primer momento.
  modalidad: Modalidad };
export type Estado = {
  dentroAhora: boolean;
  entradaAbierta: { entrada: string } | null;
  // Último turno YA COMPLETO de hoy (entrada + salida). Sirve para mostrar el
  // resumen del día y para confirmar antes de abrir un turno nuevo.
  turnoCerradoHoy: { entrada: string; salida: string } | null;
  // Ventana de almuerzo de este turno, solo si HOY se puede usar. Viene null
  // cuando el día no la tiene congelada o cuando ya se marcó: el servidor manda
  // la ventana exactamente cuando va a creerle a la marca.
  // `ahora` dice si está DENTRO de la ventana en este instante. Lo decide el
  // servidor, que es quien sabe la fecha del turno: la ventana de un nocturno
  // cae en la madrugada del día siguiente al que ancla su fila.
  almuerzo: { inicio: string; fin: string; ahora: boolean } | null;
  // Salió a almorzar y todavía no vuelve.
  enAlmuerzo: boolean;
  salidaAlmuerzo: string | null;
  // Se le pasó la hora de volver: el kiosco le pregunta a qué hora regresó en
  // vez de abrirle el turno a esta hora. null = está a tiempo, nada que preguntar.
  regresoSugerido: string | null;
};
export type Flash =
  | { tipo: 'ok'; accion: 'ENTRADA' | 'SALIDA'; hora: string; nombre: string; almuerzo?: boolean }
  | { tipo: 'error'; msg: string }
  | null;

export const TZ = 'America/Bogota';
