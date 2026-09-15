import { describe, it, expect } from 'vitest';
import { losMasRecientes, fechaDeArticulo } from './portadasDelBlog';

// Lo que la landing muestra del blog (14 de septiembre de 2026): los artículos más
// nuevos primero, y la fecha tal como está escrita en el artículo.

const articulo = (slug: string, fecha: string) => ({
  slug, titulo: slug, descripcion: '', categoria: 'Guías', fecha, imagen: '', imagenAlt: '',
});

describe('losMasRecientes', () => {
  it('ordena del más nuevo al más viejo y se queda con los que caben', () => {
    const lista = [articulo('viejo', '2026-08-20'), articulo('nuevo', '2026-09-02'), articulo('medio', '2026-08-27'), articulo('otro', '2026-08-25')];
    expect(losMasRecientes(lista, 3).map(a => a.slug)).toEqual(['nuevo', 'medio', 'otro']);
  });

  it('no desordena la lista que recibe', () => {
    const lista = [articulo('viejo', '2026-08-20'), articulo('nuevo', '2026-09-02')];
    losMasRecientes(lista, 3);
    expect(lista.map(a => a.slug)).toEqual(['viejo', 'nuevo']);
  });

  it('con menos artículos que el tope, muestra los que haya', () => {
    expect(losMasRecientes([articulo('unico', '2026-09-02')], 3)).toHaveLength(1);
  });
});

describe('fechaDeArticulo', () => {
  it('pinta el mismo día del artículo, aunque la prueba corra al occidente de Colombia', () => {
    // '2026-09-02' leído como medianoche UTC es el 1 de septiembre en Bogotá.
    const texto = fechaDeArticulo('2026-09-02');
    expect(texto).toMatch(/^2 /);
    expect(texto).toMatch(/2026$/);
  });
});
