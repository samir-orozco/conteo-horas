import software from './software-control-horarios-colombia.mjs';
import jornada from './jornada-laboral-colombia-2026.mjs';

// El orden de este arreglo es el orden del índice del blog.
export const ARTICULOS = [jornada, software];

export const AUTOR = {
  nombre: 'Samir Orozco',
  cargo: 'CEO de HoraPro',
  bio: 'Fundador de HoraPro. Lleva años construyendo software de control de horarios y liquidación de nómina para empresas colombianas, con la normativa laboral del país metida en el cálculo.',
  foto: null, // '/blog/img/samir-orozco.jpg' cuando esté
};

export const SITIO = {
  url: 'https://horapro.co',
  nombre: 'HoraPro',
  descripcionBlog:
    'Normativa laboral colombiana, control de horarios y liquidación de nómina, explicados para quien tiene que tomar la decisión y pagar la cuenta.',
};
