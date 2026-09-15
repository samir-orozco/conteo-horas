import { Link } from 'react-router-dom';
import logoAmarillo from '../../assets/logo-completo-amarillo.svg';
import CreditoKrumlab from '../../components/CreditoKrumlab';
import { POLITICA_PRIVACIDAD } from '../../lib/legal';
import { REDES } from '../../../blog/redes.mjs';

// El pie de la landing en columnas (14 de septiembre de 2026), con las redes de HoraPro. Las
// direcciones de las redes viven en blog/redes.mjs, que también lee el pie del blog.

// Un dibujo por red y ninguno para una red que no esté aquí: con un `? :` la tercera red
// saldría con el ícono de otra.
function IconoRed({ nombre }: { nombre: string }) {
  const trazo = { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (nombre) {
    case 'Instagram':
      return (
        <svg {...trazo}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'Facebook':
      return (
        <svg {...trazo}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    default:
      return null;
  }
}

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <nav aria-label={titulo}>
      <h2 className="text-sm font-semibold text-white/50 mb-4">{titulo}</h2>
      <div className="flex flex-col items-start gap-3 text-sm [&>a]:text-white/85 [&>a:hover]:text-primary">{children}</div>
    </nav>
  );
}

export default function PieDePagina({ conSesion, panelUrl }: { conSesion: boolean; panelUrl: string }) {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div>
          <img src={logoAmarillo} alt="HoraPro" className="h-8" />
          <p className="text-sm text-white/60 mt-4 max-w-xs">Control de horas y liquidación de nómina para empresas colombianas.</p>
        </div>
        <Columna titulo="Producto">
          <a href="#funciones">Funciones</a>
          <a href="#como">Cómo funciona</a>
          <a href="#precios">Precios</a>
          {conSesion ? (
            <Link to={panelUrl}>Ir a mi panel</Link>
          ) : (
            <>
              <Link to="/registro">Prueba gratis</Link>
              <Link to="/login">Iniciar sesión</Link>
            </>
          )}
        </Columna>
        <Columna titulo="Recursos">
          <a href="/blog/">Blog</a>
          <a href="/calculadoras/">Calculadoras</a>
        </Columna>
        <Columna titulo="Legal">
          {/* Aparece sola el día que la política deje de ser borrador: el interruptor vive en
              blog/legal/privacidad.mjs y `legal.test.ts` impide que las dos copias se separen. */}
          {POLITICA_PRIVACIDAD.publicada && <a href={POLITICA_PRIVACIDAD.ruta}>Política de privacidad</a>}
        </Columna>
        <Columna titulo="Síguenos">
          {REDES.map(red => (
            <a key={red.nombre} href={red.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              <IconoRed nombre={red.nombre} /> {red.nombre}
            </a>
          ))}
        </Columna>
      </div>
      {/* El relleno de abajo deja libre el botón flotante de WhatsApp (fijo a 20 px del borde y de 56 px
          de alto), que tapaba el © en el celular. Desde xl el contenido termina antes de llegar a él. */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 pt-5 pb-24 xl:pb-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} HoraPro · Control de horas para Colombia</p>
          <CreditoKrumlab oscuro />
        </div>
      </div>
    </footer>
  );
}
