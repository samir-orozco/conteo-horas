// Tipos compartidos del kiosco público (Marcador).
export type Colaborador = { id: string; nombre: string; apellido: string; cargo: string | null };
export type Estado = { dentroAhora: boolean; entradaAbierta: { entrada: string } | null };
export type Flash =
  | { tipo: 'ok'; accion: 'ENTRADA' | 'SALIDA'; hora: string; nombre: string }
  | { tipo: 'error'; msg: string }
  | null;

export const TZ = 'America/Bogota';
