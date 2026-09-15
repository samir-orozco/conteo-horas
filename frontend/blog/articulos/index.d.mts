// Tipos de blog/articulos/index.mjs, para quien lo importa desde TypeScript (vite.config.ts arma con
// esto la portada de los artículos que muestra la landing). Solo se describen los campos que se leen
// desde allí; cada artículo trae además su contenido.
export declare const ARTICULOS: {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  // 'AAAA-MM-DD'
  fecha: string;
  imagen: string;
  imagenAlt: string;
  [campo: string]: unknown;
}[];

export declare const AUTOR: { nombre: string; cargo: string; bio: string; foto: string };

export declare const SITIO: { url: string; nombre: string; descripcionBlog: string };
