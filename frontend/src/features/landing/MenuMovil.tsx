import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import logoP from '../../assets/logo-p.svg';
import { REDES } from '../../../blog/redes.mjs';

// El menú del celular (14 de septiembre de 2026): tapa toda la pantalla, como el ejemplo que
// dejó el dueño. En el celular el encabezado no cabe entero y los enlaces se perdían.
//
// Mientras está abierto la página de atrás no se desplaza, y se cierra con la X, con Escape o
// al elegir un destino. Los enlaces son <a> y no <Link> salvo los de la app: las secciones son
// anclas de esta página, y el blog y las calculadoras son HTML estático fuera de la SPA.
const DESTINOS = [
  { texto: 'Funciones', href: '#funciones' },
  { texto: 'Cómo funciona', href: '#como' },
  { texto: 'Precios', href: '#precios' },
  { texto: 'Calculadoras', href: '/calculadoras/' },
  { texto: 'Blog', href: '/blog/' },
];

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  conSesion: boolean;
  panelUrl: string;
  dias: number;
};

export default function MenuMovil({ abierto, onCerrar, conSesion, panelUrl, dias }: Props) {
  const botonCerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const desplazamiento = document.body.style.overflow;
    const antes = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    botonCerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = desplazamiento;
      // Sin mover la página: al elegir una sección, el navegador ya la llevó hasta allá.
      antes?.focus?.({ preventScroll: true });
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="h-16 px-5 flex items-center justify-between">
        {/* La P recortada y no la del círculo blanco: sobre el blanco el círculo no se ve, y la P
            quedaba chica y corrida a la derecha. */}
        <img src={logoP} alt="HoraPro" className="h-10 w-auto" />
        <button ref={botonCerrar} type="button" onClick={onCerrar} aria-label="Cerrar menú"
          className="-mr-2 p-2 rounded-xl text-ink hover:bg-gray-100">
          <X size={28} />
        </button>
      </div>

      <nav aria-label="Secciones" className="flex-1 flex flex-col items-center justify-center gap-7">
        {DESTINOS.map(d => (
          <a key={d.href} href={d.href} onClick={onCerrar} className="text-3xl font-semibold tracking-tight text-ink hover:text-ink/70">
            {d.texto}
          </a>
        ))}
      </nav>

      <div className="px-5 pb-8 space-y-6">
        {conSesion ? (
          <Link to={panelUrl} onClick={onCerrar}
            className="flex items-center justify-center gap-2 w-full bg-ink hover:bg-ink/90 text-white font-bold py-3.5 rounded-xl">
            Ir a mi panel <ArrowRight size={18} />
          </Link>
        ) : (
          <Link to="/registro" onClick={onCerrar}
            className="flex items-center justify-center gap-2 w-full bg-ink hover:bg-ink/90 text-white font-bold py-3.5 rounded-xl">
            Prueba gratis {dias} días <ArrowRight size={18} />
          </Link>
        )}
        <div className="flex items-center justify-center gap-10 text-sm text-muted">
          {REDES.map(red => (
            <a key={red.nombre} href={red.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">{red.nombre}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
