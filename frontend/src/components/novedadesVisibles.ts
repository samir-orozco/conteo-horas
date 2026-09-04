// Cuándo se abren las novedades, y bajo qué llaves se recuerda.
//
// Vive aparte del componente para poder probarlo: la decisión son cuatro
// condiciones y tres lecturas de localStorage, y equivocarse significa o taparle
// la pantalla a quien ya dijo que no, o no contarle a un cliente lo que cambió.

// Lote de novedades que se está mostrando. Subirla hace que vuelvan a aparecer,
// salvo a quien pidió no verlas más.
export const VERSION = '2026-09';

export const vistaKey = (id: string) => `horapro_novedades_${VERSION}_${id}`;
export const apagadoKey = (id: string) => `horapro_novedades_off_${id}`;
export const guiaKey = (id: string) => `horapro_guia_vista_${id}`;

export type ContextoNovedades = {
  rol: string | null;
  // Ya pasó por el video de bienvenida.
  vioLaGuia: boolean;
  vioEstaVersion: boolean;
  // Pidió no volver a ver novedades, nunca.
  apagadas: boolean;
  // Las está pidiendo desde el menú de ayuda.
  forzado: boolean;
};

export function debeMostrarNovedades(c: ContextoNovedades): boolean {
  // El super admin no es cliente del producto: no le interesa lo que cambió
  // para los clientes, y el botón ni siquiera le aparece.
  if (!c.rol || c.rol === 'SUPER_ADMIN') return false;

  // Si las pide él, se abren aunque las tenga apagadas o ya las haya visto.
  if (c.forzado) return true;

  // A quien acaba de llegar le toca el video de bienvenida. Para él TODO es
  // nuevo, así que un anuncio de "lo que cambió" no le dice nada y le tapa la
  // pantalla encima.
  if (!c.vioLaGuia) return false;

  // Dos llaves distintas a propósito: "ya vi las de septiembre" y "no me
  // muestres novedades nunca" son decisiones distintas. Mezclarlas obligaría a
  // elegir entre repetirle a alguien lo que ya leyó, o no contarle nunca lo que
  // viene después.
  return !c.apagadas && !c.vioEstaVersion;
}
