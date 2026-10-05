import type { EstadoDeSeguimiento } from './tipos';

// Los tres estados de un caso de seguimiento (decisión del dueño del 4 de octubre de 2026), con su
// nombre y su color. El color acompaña al nombre, nunca lo reemplaza.
export const ESTADOS: EstadoDeSeguimiento[] = ['SIN_REVISAR', 'EN_SEGUIMIENTO', 'CERRADO'];

export const NOMBRE_DE_ESTADO: Record<EstadoDeSeguimiento, string> = {
  SIN_REVISAR: 'Sin revisar',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADO: 'Cerrado',
};

export const TONO_DE_ESTADO: Record<EstadoDeSeguimiento, string> = {
  SIN_REVISAR: 'bg-orange-50 border-orange-200 text-orange-800',
  EN_SEGUIMIENTO: 'bg-sky-50 border-sky-200 text-sky-800',
  CERRADO: 'bg-green-50 border-green-200 text-green-800',
};
