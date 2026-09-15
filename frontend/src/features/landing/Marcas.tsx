// Los detalles de letra de la landing (14 de septiembre de 2026): una palabra resaltada
// como con marcador y otra tachada a mano. Son solo dibujo: el texto sigue ahí, y un
// lector de pantalla lee la frase completa.

// El fondo se repite en cada renglón si la frase se parte, en vez de quedar como un
// bloque que se sale de la pantalla en un celular.
//
// Y va DEBAJO de toda la letra (el dueño lo pidió el 14 de septiembre de 2026). En su orden
// normal, el fondo de cada renglón se pinta encima del renglón de arriba, y le tapaba la cola
// a la «y» de «horarios y». Por eso el -z-10; la letra del propio resaltado va en su span
// para quedar también encima de su segundo renglón. El -z-10 baja hasta el contexto de
// apilamiento más cercano: el título que lo contiene tiene que llevar `isolate`, o el
// resaltado queda detrás del fondo de la sección y desaparece.
export function Resaltado({ children, tono = 'amarillo' }: { children: React.ReactNode; tono?: 'amarillo' | 'blanco' }) {
  const fondo = tono === 'blanco' ? 'bg-white' : 'bg-primary';
  return (
    <span className={`relative -z-10 ${fondo} text-ink rounded-md px-1.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]`}>
      <span className="relative">{children}</span>
    </span>
  );
}

// Un trazo a mano alzada encima de las palabras. Va sin romper la línea: son pocas
// palabras, y partidas el trazo quedaría cortado.
export function Tachado({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden="true" viewBox="0 0 200 20" preserveAspectRatio="none"
        className="absolute left-[-4%] top-[40%] w-[108%] h-[0.5em] overflow-visible pointer-events-none">
        <path d="M3 13 C 40 4, 78 17, 118 8 S 176 9, 197 5" fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
