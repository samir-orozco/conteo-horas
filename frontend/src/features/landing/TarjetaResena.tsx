import { Quote, Star, UserRound } from 'lucide-react';
import { NOMBRE_ANONIMO, type TarjetaPublica } from '../resenas/api';

// La tarjeta de una reseña (docs/RESENAS.md, R25, R28, R40, R42 y R43).
//
// Es LA tarjeta: la usan el carrusel de la landing y la vista previa del super admin, para que lo que
// el dueño aprueba sea exactamente lo que sale publicado y no una copia que se parece (CLAUDE.md §13).
// Salió del <figure> de los testimonios fijos de Landing.tsx, con tres cambios:
//
//   - Las estrellas son las que la persona dio, y sin calificación no hay estrellas. Antes eran cinco
//     fijas para todos, y poner un cinco que nadie dio es fabricar un dato (R28).
//   - El texto va con sus saltos de línea y siempre como texto: React lo escapa, y aquí no hay ni
//     habrá `dangerouslySetInnerHTML`. Lo escribe un cliente y lo lee cualquiera (R43).
//   - Sin `hp-reveal`. `useReveal` solo observa lo que existe al cargar la página, y estas tarjetas
//     llegan después, del servidor: con esa clase se quedarían invisibles para siempre.

type Props = Pick<TarjetaPublica, 'estrellas' | 'texto' | 'nombre' | 'detalle'>;

// Primer nombre y último apellido, como las iniciales de cualquier avatar. Por letras y no por
// posiciones de la cadena, para que una tilde o un carácter compuesto no se parta a la mitad.
function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '';
  const primera = [...palabras[0]][0];
  const ultima = palabras.length > 1 ? [...palabras[palabras.length - 1]][0] : '';
  return (primera + ultima).toLocaleUpperCase('es');
}

export default function TarjetaResena({ estrellas, texto, nombre, detalle }: Props) {
  // De una anónima no llega ni el nombre ni la empresa (R42), y «CH» parecerían las iniciales de una
  // persona de verdad: va un ícono.
  const anonima = nombre === NOMBRE_ANONIMO;

  return (
    <figure className="h-full bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
      <Quote size={26} className="text-primary shrink-0" aria-hidden="true" />
      {estrellas != null && (
        // `data-llena` es para las pruebas, que no miran clases de CSS. Los dibujos no le dicen nada a
        // un lector de pantalla; la frase de abajo sí (R40).
        <div data-testid="estrellas" className="flex gap-0.5 mt-3 mb-2">
          {Array.from({ length: 5 }, (_, s) => {
            const llena = s < estrellas;
            return (
              <Star key={s} size={14} aria-hidden="true" data-llena={llena}
                className={llena ? 'fill-primary text-primary' : 'text-gray-300'} />
            );
          })}
          <span className="sr-only">{`${estrellas} de 5 estrellas`}</span>
        </div>
      )}
      {/* `pre-line` en línea y no como clase: es parte de lo que se promete (R43) y así la prueba lo
          puede comprobar, cosa que con una clase de Tailwind en jsdom no se puede. */}
      <blockquote style={{ whiteSpace: 'pre-line' }}
        className={`text-sm text-ink/90 leading-relaxed flex-1 break-words ${estrellas == null ? 'mt-3' : ''}`}>
        "{texto}"
      </blockquote>
      <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
        {/* Las iniciales no se le leen a un lector de pantalla: el nombre está justo al lado. */}
        <span aria-hidden="true" className="w-10 h-10 rounded-full bg-ink text-white font-bold text-sm flex items-center justify-center shrink-0">
          {anonima ? <UserRound size={18} data-testid="icono-anonimo" /> : inicialesDe(nombre)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{nombre}</span>
          {detalle && <span data-detalle className="block text-xs text-muted">{detalle}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
