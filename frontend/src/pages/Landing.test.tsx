import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

// La landing rediseñada (14 de septiembre de 2026): la portada con el celular, la frase
// con tachado y resaltado, las partes del sistema, lo último del blog y el pie con las
// redes. Los artículos son de mentira para que la prueba no cambie cada vez que se
// publica uno.
vi.mock('../lib/api', () => ({ default: { get: vi.fn(() => new Promise(() => {})) } }));
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

  it('muestra seis partes del sistema, con sedes, geocerca y control antifraude', () => {
    abrir();
    for (const titulo of [
      'Liquida sin hacer cuentas',
      'Marcan con la cara, no con excusas',
      'Tus contratos avisan antes de vencerse',
      'Cada sede con su gente y sus reportes',
      'Marcan solo dentro de su sede',
      'Marcar por otro deja rastro',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    }
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
