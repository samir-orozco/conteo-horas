// El módulo virtual que arma vite.config.ts con la portada de cada artículo del blog.
declare module 'virtual:blog-recientes' {
  const portadas: {
    slug: string;
    titulo: string;
    descripcion: string;
    categoria: string;
    // 'AAAA-MM-DD', tal como está en el artículo.
    fecha: string;
    imagen: string;
    imagenAlt: string;
  }[];
  export default portadas;
}
