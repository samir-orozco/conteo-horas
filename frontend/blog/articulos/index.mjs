import software from './software-control-horarios-colombia.mjs';
import jornada from './jornada-laboral-colombia-2026.mjs';

// El orden de este arreglo es el orden del índice del blog.
export const ARTICULOS = [jornada, software];

export const AUTOR = {
  nombre: 'Samir Orozco',
  cargo: 'CEO de HoraPro',
  bio: 'Monté HoraPro porque lo necesitaba en mi propia empresa. Llevaba los permisos en Excel, vivía pendiente de si la gente llegaba a tiempo, y cada quincena terminaba sacando las cuentas a mano. En algún momento entendí que eso no se arreglaba con más disciplina, sino con una herramienta que me lo quitara de encima. Lo que salió de ahí es lo que hoy usan otras empresas colombianas con el mismo problema.',
  foto: null, // '/blog/img/samir-orozco.jpg' cuando esté
};

export const SITIO = {
  url: 'https://horapro.co',
  nombre: 'HoraPro',
  descripcionBlog:
    'Normativa laboral colombiana, control de horarios y liquidación de nómina, explicados para quien tiene que tomar la decisión y pagar la cuenta.',
};
