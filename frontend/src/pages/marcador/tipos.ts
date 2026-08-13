// Tipos compartidos del kiosco público (Marcador).
export type Sede = { id: string; nombre: string };

export type Colaborador = { id: string; nombre: string; apellido: string; cargo: string | null };
export type Estado = {
  dentroAhora: boolean;
  entradaAbierta: { entrada: string } | null;
  // Último turno YA COMPLETO de hoy (entrada + salida). Sirve para mostrar el
  // resumen del día y para confirmar antes de abrir un turno nuevo.
  turnoCerradoHoy: { entrada: string; salida: string } | null;
  // Ventana de almuerzo de este turno, solo si HOY se puede usar. Viene null
  // cuando el día no la tiene congelada o cuando ya se marcó: el servidor manda
  // la ventana exactamente cuando va a creerle a la marca.
  almuerzo: { inicio: string; fin: string } | null;
  // Salió a almorzar y todavía no vuelve.
  enAlmuerzo: boolean;
  salidaAlmuerzo: string | null;
};
export type Flash =
  | { tipo: 'ok'; accion: 'ENTRADA' | 'SALIDA'; hora: string; nombre: string; almuerzo?: boolean }
  | { tipo: 'error'; msg: string }
  | null;

export const TZ = 'America/Bogota';
