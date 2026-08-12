// Tipos compartidos del kiosco público (Marcador).
export type Sede = { id: string; nombre: string };

export type Colaborador = { id: string; nombre: string; apellido: string; cargo: string | null };
export type Estado = {
  dentroAhora: boolean;
  entradaAbierta: { entrada: string } | null;
  // Último turno YA COMPLETO de hoy (entrada + salida). Sirve para mostrar el
  // resumen del día y para confirmar antes de abrir un turno nuevo.
  turnoCerradoHoy: { entrada: string; salida: string } | null;
};
export type Flash =
  | { tipo: 'ok'; accion: 'ENTRADA' | 'SALIDA'; hora: string; nombre: string }
  | { tipo: 'error'; msg: string }
  | null;

export const TZ = 'America/Bogota';
