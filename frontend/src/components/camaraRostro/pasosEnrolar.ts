import { flechaDelReto } from './reto';
import type { PasoEnrolar, TipoPose } from './rostroCliente';

// LOS PASOS DEL REGISTRO FACIAL GUIADO, CON SU DIBUJO Y SU FLECHA (14 de septiembre de 2026).
//
// El paso decía «Gira tu rostro a la derecha» para la pose que el sistema llama derecha. Esa pose se
// hace girando hacia la izquierda propia: el giro se mide sobre el video sin espejar y la vista que ve
// la persona sí está espejada (ver reto.ts). Quien obedecía giraba al revés, y el paso esperaba sin
// avanzar.
//
// Ahora ningún texto dice derecha ni izquierda. El lado lo dicen la flecha y el dibujo, y los dos salen
// de `flechaDelReto`, la misma regla de la flecha del reto del kiosco: si algún día se corrige esa
// constante después de probar en un teléfono, se corrigen juntos y no pueden contradecirse. La detección
// no se toca.
//
// El orden no cambia: primero como la persona llega al kiosco (con gafas, si las usa) y los dos giros
// así; al final, sin gafas. Quitarlas antes dejaría los giros sin ellas.

export type TarjetaPose = 'frente-con-gafas' | 'frente-sin-gafas' | 'gira-izquierda' | 'gira-derecha';
export type PasoGuiado = PasoEnrolar & { tarjeta: TarjetaPose; flecha: 'izq' | 'der' | null };

const TEXTO_GIRO = 'Gira levemente la cabeza hacia la flecha';

function giro(tipo: Exclude<TipoPose, 'frontal'>): PasoGuiado {
  const flecha = flechaDelReto(tipo);
  return {
    id: tipo, tipo, texto: TEXTO_GIRO, flecha,
    etiqueta: flecha === 'izq' ? 'Giro ←' : 'Giro →',
    tarjeta: flecha === 'izq' ? 'gira-izquierda' : 'gira-derecha',
  };
}

export function pasosDeEnrolamiento(pasoGafas: boolean): PasoGuiado[] {
  const frente: PasoGuiado = {
    id: 'frente', etiqueta: 'Frente', tipo: 'frontal', flecha: null,
    texto: pasoGafas ? 'Mira de frente a la cámara, con tus gafas puestas' : 'Mira de frente a la cámara',
    tarjeta: pasoGafas ? 'frente-con-gafas' : 'frente-sin-gafas',
  };
  const sinGafas: PasoGuiado = {
    id: 'singafas', etiqueta: 'Sin gafas', tipo: 'frontal', flecha: null,
    texto: 'Quítate las gafas y mira de frente', tarjeta: 'frente-sin-gafas',
  };
  return [frente, giro('derecha'), giro('izquierda'), ...(pasoGafas ? [sinGafas] : [])];
}

// La instrucción del paso ya se lee en la tarjeta: debajo de los pasos solo va lo que cambia
// («Mantente quieto», «Acércate un poco»), para no leer lo mismo dos veces.
export function mensajeBajoLaTarjeta(mensaje: string, textoDelPaso: string | undefined): string {
  if (!textoDelPaso || !mensaje.startsWith(textoDelPaso)) return mensaje;
  const resto = mensaje.slice(textoDelPaso.length).replace(/^\s*·\s*/, '');
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
}
