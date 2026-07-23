import { prisma } from '../index';

// Tipos de aviso interno que alimentan la campana del menú del admin.
export type TipoNotif = 'NO_MARCO_SALIDA' | 'LLEGADA_TARDE' | 'NOVEDAD_PENDIENTE';

type NuevaNotif = {
  tipo: TipoNotif;
  titulo: string;
  cuerpo?: string;
  entidad?: 'registro' | 'permiso' | 'colaborador';
  entidadId?: string;
};

// Crea una notificación para el admin. Es "fire-and-forget": nunca debe romper
// el flujo que la dispara (marcar, reportar novedad, auto-cierre), así que
// cualquier error se traga en silencio.
export async function notificar(empresaId: string, n: NuevaNotif): Promise<void> {
  try {
    await prisma.notificacion.create({
      data: {
        empresaId,
        tipo: n.tipo,
        titulo: n.titulo,
        cuerpo: n.cuerpo ?? null,
        entidad: n.entidad ?? null,
        entidadId: n.entidadId ?? null,
      },
    });
  } catch {
    /* una notificación fallida no debe afectar la operación principal */
  }
}
