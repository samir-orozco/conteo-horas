import type { Tono } from './estadoContrato';

// Cómo trabaja una persona, que es lo que decide si se le valida la ubicación al
// marcar. Espejo del enum del backend (backend/src/utils/modalidad.ts).

export const MODALIDADES = ['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: 'Presencial',
  HIBRIDO: 'Híbrido',
  REMOTO: 'Remoto',
};

// Lo que de verdad hay que saber al elegir, porque del nombre no se deduce.
// Se muestra debajo del selector y cambia con lo elegido: la consecuencia no
// puede quedar escondida detrás de un clic.
export const AYUDA_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: 'Se le valida la ubicación al marcar. Si está fuera del sitio de trabajo, la marcación se rechaza.',
  HIBRIDO: 'Puede marcar desde donde sea. Se usa su ubicación solo para registrar desde qué sede marcó, nunca para bloquearlo.',
  REMOTO: 'No se le pide ni se le mira la ubicación. Marca desde donde esté.',
};

export const TONO_MODALIDAD: Record<Modalidad, Tono> = {
  PRESENCIAL: 'gris',
  HIBRIDO: 'ambar',
  REMOTO: 'verde',
};

export const OPCIONES_MODALIDAD: { valor: Modalidad; texto: string }[] =
  MODALIDADES.map(m => ({ valor: m, texto: ETIQUETA_MODALIDAD[m] }));

// Aquí sí se cae en PRESENCIAL ante cualquier cosa rara, al revés que en el
// backend: esto solo decide qué pintar y qué preseleccionar. Dejar el control
// en blanco haría que guardar cualquier otro dato cambiara la modalidad de
// alguien sin que nadie lo pidiera.
export function normalizarModalidad(v: unknown): Modalidad {
  return (MODALIDADES as readonly unknown[]).includes(v) ? (v as Modalidad) : 'PRESENCIAL';
}
