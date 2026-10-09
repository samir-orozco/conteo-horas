import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';
import type { TarjetaPublica } from '../features/resenas/api';

// La landing rediseñada (14 de septiembre de 2026): la portada con el celular, la frase
// con tachado y resaltado, las partes del sistema, lo último del blog y el pie con las
// redes. Los artículos son de mentira para que la prueba no cambie cada vez que se
// publica uno.
//
// El servidor simulado responde según la ruta. Los precios no llegan nunca, y las reseñas
// tampoco salvo en las pruebas del carrusel, que dicen qué responde (8 de octubre de 2026).
const servidor = vi.hoisted(() => ({
  resenas: (): Promise<unknown> => new Promise(() => {}),
}));
vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn((ruta: string) => (ruta === '/resenas/publicas' ? servidor.resenas() : new Promise(() => {}))),
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: null }) }));
vi.mock('../components/VideoVSL', () => ({ default: () => <div>Video de HoraPro</div> }));
// El scroll suave necesita un navegador de verdad (jsdom no trae ResizeObserver); se prueba aparte en
// useScrollSuave.test.ts.
vi.mock('../features/landing/useScrollSuave', () => ({ useScrollSuave: () => {} }));
vi.mock('virtual:blog-recientes', () => ({
  default: [
    { slug: 'viejo', titulo: 'Artículo viejo', descripcion: 'Resumen viejo', categoria: 'Guías', fecha: '2026-08-01', imagen: '/blog/img/viejo.jpg', imagenAlt: 'Foto vieja' },
    { slug: 'nuevo', titulo: 'Artículo nuevo', descripcion: 'Resumen nuevo', categoria: 'Normativa', fecha: '2026-09-02', imagen: '/blog/img/nuevo.jpg', imagenAlt: 'Foto nueva' },
    { slug: 'medio', titulo: 'Artículo del medio', descripcion: 'Resumen medio', categoria: 'Guías', fecha: '2026-08-20', imagen: '/blog/img/medio.jpg', imagenAlt: 'Foto del medio' },
    { slug: 'otro', titulo: 'Otro artículo', descripcion: 'Resumen otro', categoria: 'Guías', fecha: '2026-08-25', imagen: '/blog/img/otro.jpg', imagenAlt: 'Otra foto' },
  ],
}));

const abrir = () => render(<MemoryRouter><Landing /></MemoryRouter>);

describe('Landing', () => {
  it('la portada muestra el celular con HoraPro', () => {
    abrir();
    expect(screen.getByRole('img', { name: /celular con horapro/i }).getAttribute('src')).toContain('home-horapro');
  });

  it('dice el problema tachado y la solución resaltada, y se lee como una sola frase', () => {
    abrir();
    expect(screen.getByRole('heading', { name: 'Tu nómina no necesita otra hoja de Excel. Necesita un sistema.' })).toBeInTheDocument();
  });

  // Nueve y no siete (4 de octubre de 2026): la del clima quedaba sola en su fila, y el dueño eligió
  // acompañarla con las tardanzas y los turnos. La fila se lee Tardanzas, Clima, Turnos.
  it('muestra nueve partes del sistema, y la última fila es tardanzas, clima y turnos', () => {
    abrir();
    const titulos = [
      'Liquida sin hacer cuentas',
      'Marcan con la cara, no con excusas',
      'Tus contratos avisan antes de vencerse',
      'Cada sede con su gente y sus reportes',
      'Marcan solo dentro de su sede',
      'Marcar por otro deja rastro',
      'La llegada tarde pide un motivo',
      'Cómo le fue a tu equipo, en una carita',
      'Turnos con aviso de horas de más',
    ];
    const seccion = document.getElementById('funciones')!;
    expect(within(seccion).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(titulos);
    // El subtítulo cuenta las partes: decía «Siete» y con nueve habría mentido.
    expect(within(seccion).getByText(/^Nueve partes del sistema/)).toBeInTheDocument();
  });

  // La del clima decía «quién lleva días seguidos mal» y «el ánimo por semana»: la cuenta es de
  // RESPUESTAS y no de días (decisión del dueño), y la evolución va por día en los rangos cortos.
  // Y «dejar una observación confidencial» se leía como si toda observación lo fuera.
  it('la tarjeta del clima cuenta caritas, no días, y la observación puede ir con nombre', () => {
    abrir();
    const tarjeta = screen.getByRole('heading', { name: 'Cómo le fue a tu equipo, en una carita' }).closest('article')!;
    expect(tarjeta).toHaveTextContent('tres caritas seguidas en Muy mal o Mal');
    expect(tarjeta).toHaveTextContent('con su nombre o confidencial');
    expect(tarjeta).not.toHaveTextContent(/días seguidos|por semana/);
  });

  it('el pie va en columnas y trae las redes de HoraPro, que abren en otra pestaña', () => {
    abrir();
    const pie = screen.getByRole('contentinfo');
    for (const columna of ['Producto', 'Recursos', 'Legal', 'Síguenos']) {
      expect(within(pie).getByRole('heading', { name: columna })).toBeInTheDocument();
    }
    const instagram = within(pie).getByRole('link', { name: /instagram/i });
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/horapro.co/');
    expect(instagram).toHaveAttribute('target', '_blank');
    const facebook = within(pie).getByRole('link', { name: /facebook/i });
    expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/profile.php?id=61592442193557');
    expect(facebook).toHaveAttribute('target', '_blank');
  });
});

// El blog va en una fila que se corre de lado, con tarjetas pequeñas (decisión del dueño del
// 14 de septiembre de 2026): con tres tarjetas a todo el ancho, en el celular cada una ocupaba
// la pantalla entera.
describe('Landing · lo último del blog', () => {
  it('muestra los artículos en una fila, del más nuevo al más viejo, cada uno con su enlace', () => {
    abrir();
    const blog = screen.getByRole('region', { name: /lo último del blog/i });
    const fila = within(blog).getByRole('list', { name: /artículos recientes/i });
    const enlaces = within(fila).getAllByRole('link');
    expect(enlaces.map(e => e.getAttribute('href'))).toEqual(['/blog/nuevo/', '/blog/otro/', '/blog/medio/', '/blog/viejo/']);
    expect(within(blog).getByRole('link', { name: /ver todo el blog/i })).toHaveAttribute('href', '/blog/');
  });

  it('con el mouse, las flechas corren la fila de lado', async () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy });
    const usuario = userEvent.setup();
    abrir();
    const blog = screen.getByRole('region', { name: /lo último del blog/i });
    await usuario.click(within(blog).getByRole('button', { name: 'Artículos siguientes' }));
    await usuario.click(within(blog).getByRole('button', { name: 'Artículos anteriores' }));
    expect(scrollBy.mock.calls.map(([opciones]) => Math.sign(opciones.left))).toEqual([1, -1]);
  });
});

// En el celular el encabezado no cabe: queda la P de HoraPro, el botón de ingresar y un menú
// que tapa toda la pantalla (decisión del dueño del 14 de septiembre de 2026).
describe('Landing · menú del celular', () => {
  const abrirMenu = async () => {
    const usuario = userEvent.setup();
    abrir();
    await usuario.click(screen.getByRole('button', { name: 'Abrir menú' }));
    return usuario;
  };
  const menu = () => screen.queryByRole('dialog', { name: 'Menú' });

  it('abre un menú con las secciones, el blog, las calculadoras y la prueba gratis', async () => {
    await abrirMenu();
    const abierto = menu()!;
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'true');
    for (const [nombre, href] of [
      ['Funciones', '#funciones'], ['Cómo funciona', '#como'], ['Precios', '#precios'],
      ['Calculadoras', '/calculadoras/'], ['Blog', '/blog/'],
    ]) {
      expect(within(abierto).getByRole('link', { name: nombre })).toHaveAttribute('href', href);
    }
    expect(within(abierto).getByRole('link', { name: /prueba gratis/i })).toHaveAttribute('href', '/registro');
  });

  it('se cierra con la X', async () => {
    const usuario = await abrirMenu();
    await usuario.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(menu()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('se cierra con Escape', async () => {
    const usuario = await abrirMenu();
    await usuario.keyboard('{Escape}');
    expect(menu()).not.toBeInTheDocument();
  });

  it('se cierra al elegir una sección, para que se vea a dónde llevó', async () => {
    const usuario = await abrirMenu();
    await usuario.click(within(menu()!).getByRole('link', { name: 'Precios' }));
    expect(menu()).not.toBeInTheDocument();
  });

  it('mientras está abierto, la página de atrás no se desplaza', async () => {
    const usuario = await abrirMenu();
    expect(document.body.style.overflow).toBe('hidden');
    await usuario.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});

// ────────── LAS RESEÑAS DE CLIENTES (8 de octubre de 2026) ──────────
//
// Reemplazan a los tres testimonios que estaban escritos en el código (docs/RESENAS.md, sección 5).
// Las reseñas las publica el dueño desde el super admin, así que la landing tiene que aguantar los
// tres casos del servidor: con reseñas, sin ninguna y caído. El detalle del carrusel se prueba en
// CarruselResenas.test.tsx; aquí, que la landing lo monta en su lugar y con su título.
describe('Landing · reseñas de clientes', () => {
  const TITULO = 'Negocios que ya dejaron el Excel';
  const resenas = (n: number): TarjetaPublica[] => Array.from({ length: n }, (_, i) => ({
    id: `r${i + 1}`, estrellas: 4, texto: `Opinión ${i + 1}`, nombre: `Persona ${i + 1}`, detalle: `Empresa ${i + 1}`,
  }));

  // Tres a la vez es en el computador; jsdom no trae matchMedia y por omisión responde «celular».
  const enComputador = () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(consulta => ({
      matches: consulta === '(min-width: 768px)', media: consulta, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);
  };

  const abrirCon = async (respuesta: () => Promise<unknown>) => {
    servidor.resenas = respuesta;
    abrir();
    await act(async () => {});
  };
  const conLista = (lista: TarjetaPublica[]) => () => Promise.resolve({ data: { resenas: lista } });
  const visibles = () => within(screen.getByRole('region', { name: TITULO }))
    .getAllByRole('group').map(g => g.getAttribute('aria-label'));

  afterEach(() => {
    servidor.resenas = () => new Promise(() => {});
    vi.useRealTimers();
    delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
  });

  it('con reseñas publicadas, muestra el título y se pueden leer todas', async () => {
    enComputador();
    await abrirCon(conLista(resenas(15)));
    expect(screen.getByRole('heading', { level: 2, name: TITULO })).toBeInTheDocument();
    expect(screen.getByText('Lo que dicen quienes liquidan sus horas con HoraPro.')).toBeInTheDocument();
    expect(visibles()).toEqual(Array.from({ length: 15 }, (_, i) => `${i + 1} de 15`));
  });

  // D7: justo antes de Precios, donde estaban los testimonios.
  it('van justo antes de Precios', async () => {
    enComputador();
    await abrirCon(conLista(resenas(4)));
    expect(screen.getByRole('region', { name: TITULO }).nextElementSibling).toHaveAttribute('id', 'precios');
  });

  it('con dos, se ven las dos y no hay flechas', async () => {
    enComputador();
    await abrirCon(conLista(resenas(2)));
    expect(visibles()).toEqual(['1 de 2', '2 de 2']);
    expect(screen.queryByRole('button', { name: 'Reseñas siguientes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reseñas anteriores' })).not.toBeInTheDocument();
  });

  // R39 y R34: sin reseñas no queda ni el título ni los testimonios que estaban escritos a mano.
  it('sin reseñas publicadas, la sección no está', async () => {
    await abrirCon(conLista([]));
    expect(screen.queryByRole('heading', { name: TITULO })).not.toBeInTheDocument();
    expect(screen.queryByText(/Mateo Vera|Carolina Calle|Santiago Botero/)).not.toBeInTheDocument();
  });

  it('si el servidor de las reseñas falla, la sección no está y el resto de la página sí', async () => {
    await abrirCon(() => Promise.reject(new Error('Network Error')));
    expect(screen.queryByRole('heading', { name: TITULO })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Un plan para cada tamaño' })).toBeInTheDocument();
  });

  // Pedido del dueño (8 de octubre de 2026): la fila se desliza sola, sin botón de pausa ni puntos.
  it('con más de tres, solo hay flechas: ni botón de pausa ni puntos', async () => {
    enComputador();
    await abrirCon(conLista(resenas(15)));
    const botones = within(screen.getByRole('region', { name: TITULO })).getAllByRole('button');
    expect(botones.map(b => b.getAttribute('aria-label'))).toEqual(['Reseñas anteriores', 'Reseñas siguientes']);
  });

  // R43: lo escribe un cliente y lo lee cualquiera. Si se interpretara como HTML, una reseña podría
  // ejecutar código en la landing el día que el dueño la publique.
  it('el texto de una reseña se ve tal cual, sin volverse HTML', async () => {
    const malicioso = '<img src=x onerror=alert(1)>';
    await abrirCon(conLista([{ ...resenas(1)[0], texto: malicioso }]));
    const seccion = screen.getByRole('region', { name: TITULO });
    expect(within(seccion).getByText(malicioso, { exact: false })).toBeInTheDocument();
    expect(seccion.querySelector('img')).toBeNull();
  });
});

// ────────── LO QUE LA LANDING PROMETE DE CADA PLAN (30 de septiembre de 2026) ──────────
//
// ESTA LISTA ES UNA SEGUNDA VERDAD, y conviene saberlo antes de tocarla: los planes de verdad viven
// en `backend/src/utils/planes.ts`, y la landing lleva su propia copia a mano —precios, límites y lo
// que incluye cada uno— porque es pública y no pide sesión. Son dos sitios que dicen lo mismo, que es
// justo lo que advierte el §9.3.
//
// NO SE RESUELVE AQUÍ, pero sí se ata lo que se acaba de prometer: si algún día el módulo de turnos
// deja de ser del plan Empresarial y nadie se acuerda de esta lista, la página pública seguiría
// vendiéndolo. Esta prueba se pone roja ese día.
describe('los planes de la página pública', () => {
  it('el plan Empresarial anuncia el módulo de turnos', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByText(/Turnos y programación por calendario/i)).toBeInTheDocument();
  });

  it('y los de abajo NO lo anuncian: es lo que distingue al Empresarial', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    // Una sola mención en toda la página de precios. Si apareciera en dos, es que se coló en otro plan.
    expect(screen.getAllByText(/Turnos y programación por calendario/i)).toHaveLength(1);
  });

  // Clima laboral (3 de octubre de 2026): «Solo en el empresarial», decisión del dueño. La misma
  // segunda verdad que turnos, atada de la misma forma.
  it('el plan Empresarial anuncia el clima laboral, y solo él', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const items = screen.getAllByText('Clima laboral: cómo se siente tu equipo');
    expect(items).toHaveLength(1);
    // Y en la tarjeta del Empresarial, no en otra: una sola mención no dice en cuál plan quedó.
    const tarjeta = items[0].closest('ul')!.parentElement!;
    expect(within(tarjeta).getByRole('heading', { name: 'Empresarial' })).toBeInTheDocument();
  });
});
