// Cuándo se abren las novedades, y bajo qué llaves se recuerda.
//
// Vive aparte del componente para poder probarlo: la decisión son cuatro
// condiciones y tres lecturas de localStorage, y equivocarse significa o taparle
// la pantalla a quien ya dijo que no, o no contarle a un cliente lo que cambió.

// Lote de novedades que se está mostrando. Subirla hace que vuelvan a aparecer,
// salvo a quien pidió no verlas más (ver `LOTE_INELUDIBLE`).
export const VERSION = '2026-10-03';

// EL LOTE QUE SE LE MUESTRA A TODOS, INCLUIDO A QUIEN APAGÓ LAS NOVEDADES.
//
// Pedido del dueño para el lanzamiento del módulo de turnos (30 de septiembre de 2026): «quiero que
// aparezca a todos los usuarios».
//
// ES UNA MARCA POR LOTE Y NO UNA REGLA NUEVA, a propósito. Pisar «no volver a mostrarme las
// novedades» es pisar una decisión que alguien tomó a conciencia, y escrito como regla permanente esa
// opción dejaría de significar nada. Así solo se pisa cuando alguien viene aquí y lo escribe.
//
// AL SUBIR VERSION HAY QUE DECIDIR ESTO TAMBIÉN: dejar la constante apuntando al lote viejo haría que
// el nuevo no fuera ineludible —correcto y silencioso— pero dejarla en `VERSION` por inercia haría
// ineludibles todos los lotes futuros, que es justo lo que no se quiere. Por eso se escribe la fecha
// a mano y no se pone `= VERSION`.
//
// El lote del kiosco (3 de octubre de 2026) NO es ineludible: le llega a quien no las apagó.
//
// El `: string` hace falta cuando las dos fechas difieren: con los tipos literales, TypeScript da la
// comparación de `loteEsIneludible` por imposible y no compila.
const LOTE_INELUDIBLE: string = '2026-09-30';

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
  // Si ESTE lote es de los que se muestran aunque las tenga apagadas.
  ineludible: boolean;
};

// Si el lote que se está mostrando es ineludible. Se calcula aquí y no en el componente para que
// `debeMostrarNovedades` siga siendo pura y se pueda probar sin tocar `localStorage`.
export const loteEsIneludible = () => VERSION === LOTE_INELUDIBLE;

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

  // Un lote ineludible se salta el apagado, pero NO el "ya lo vi": se muestra UNA vez, como
  // cualquier otro. Repetirlo en cada carga a quien lo cerró no es insistir, es acosar.
  if (c.vioEstaVersion) return false;
  if (c.ineludible) return true;

  // Dos llaves distintas a propósito: "ya vi las de septiembre" y "no me
  // muestres novedades nunca" son decisiones distintas. Mezclarlas obligaría a
  // elegir entre repetirle a alguien lo que ya leyó, o no contarle nunca lo que
  // viene después.
  return !c.apagadas;
}
