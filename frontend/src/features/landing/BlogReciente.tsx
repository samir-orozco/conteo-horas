import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import portadas from 'virtual:blog-recientes';
import { losMasRecientes, fechaDeArticulo } from './portadasDelBlog';

// Lo último del blog en la landing. Se llena sola: un artículo nuevo aparece al volver a compilar.
//
// Va en una fila que se corre de lado, con tarjetas pequeñas (decisión del dueño del 14 de
// septiembre de 2026): con tres tarjetas a todo el ancho, en el celular cada artículo ocupaba
// la pantalla entera. En el celular se corre con el dedo; con el mouse, con las flechas.
//
// El enlace va en el título y cubre la tarjeta entera: así se toca en cualquier parte, y el
// lector de pantalla lo anuncia con el título y no con la foto, la fecha y el resumen juntos.
// Es <a> y no <Link>: el blog es HTML estático fuera de la SPA y necesita una navegación real.
const CUANTOS = 6;

export default function BlogReciente() {
  const fila = useRef<HTMLUListElement>(null);
  const recientes = losMasRecientes(portadas, CUANTOS);
  if (recientes.length === 0) return null;

  // Casi un ancho de fila por clic, para que la siguiente tarjeta quede asomada.
  const correr = (sentido: 1 | -1) => {
    const el = fila.current;
    if (!el) return;
    el.scrollBy({ left: sentido * Math.max(el.clientWidth * 0.8, 260), behavior: 'smooth' });
  };

  return (
    <section id="blog" aria-labelledby="titulo-blog" className="bg-primary">
      <div className="max-w-6xl mx-auto py-14 md:py-20">
        <div className="px-5 mb-8 flex items-end justify-between gap-4 hp-reveal">
          <div>
            <h2 id="titulo-blog" className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink">Lo último del blog</h2>
            <a href="/blog/" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/80 hover:text-ink hover:gap-2.5 transition-all">
              Ver todo el blog <ArrowRight size={15} />
            </a>
          </div>
          <div className="hidden md:flex gap-2">
            <button type="button" onClick={() => correr(-1)} aria-label="Artículos anteriores"
              className="w-11 h-11 rounded-full bg-white/70 hover:bg-white text-ink flex items-center justify-center shadow-sm">
              <ArrowLeft size={18} />
            </button>
            <button type="button" onClick={() => correr(1)} aria-label="Artículos siguientes"
              className="w-11 h-11 rounded-full bg-white/70 hover:bg-white text-ink flex items-center justify-center shadow-sm">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <ul ref={fila} aria-label="Artículos recientes"
          className="hp-tabs-scroll flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pb-3">
          {recientes.map(a => (
            <li key={a.slug} className="snap-start shrink-0 w-[250px] sm:w-[280px]">
              <article className="relative h-full flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                <img src={a.imagen} alt={a.imagenAlt} loading="lazy" width={640} height={400}
                  className="w-full aspect-[16/10] object-cover bg-ink/5" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/50 px-2 py-0.5 font-semibold text-ink">{a.categoria}</span>
                    <time dateTime={a.fecha} className="text-muted">{fechaDeArticulo(a.fecha)}</time>
                  </div>
                  <h3 className="mt-2.5 text-base font-bold leading-snug text-ink line-clamp-3">
                    <a href={`/blog/${a.slug}/`} className="after:absolute after:inset-0 hover:underline decoration-2 underline-offset-2">
                      {a.titulo}
                    </a>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-2">{a.descripcion}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
