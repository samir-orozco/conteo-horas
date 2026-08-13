// Aviso interno para el admin (campana del menú). Backend: routes/notificaciones.ts
export type Notificacion = {
  id: string;
  tipo: 'NO_MARCO_SALIDA' | 'LLEGADA_TARDE' | 'NOVEDAD_PENDIENTE' | string;
  titulo: string;
  cuerpo: string | null;
  entidad: 'registro' | 'colaborador' | 'permiso' | null;
  entidadId: string | null;
  leida: boolean;
  creadoEn: string;
};
