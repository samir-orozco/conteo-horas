import type { Notificacion } from './types';

// A dónde lleva un aviso al hacerle clic, o null si no lleva a ninguna parte.
//
// Va aparte del panel porque es una regla, no pintura: qué pantalla responde a
// cada aviso. Y porque el destino de los avisos de contrato es lo único que
// hace útil el aviso: aterrizar en el Resumen obliga a buscar el tab de
// contratos sabiendo ya a qué se venía.
export function rutaDeNotificacion(n: Notificacion): string | null {
  if (n.entidad === 'registro') return '/app/registros';
  if (n.entidad !== 'colaborador' || !n.entidadId) return null;

  const ficha = `/app/colaboradores/${n.entidadId}`;
  // Por prefijo y no por lista cerrada: el backend puede agregar otro aviso de
  // contrato sin que haya que acordarse de tocar este archivo.
  return n.tipo.startsWith('CONTRATO_') ? `${ficha}?tab=contratos` : ficha;
}
