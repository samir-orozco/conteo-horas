// Dónde vive la política de privacidad, y si ya está publicada.
//
// El texto y el interruptor de publicación viven en `blog/legal/privacidad.mjs`,
// que es un módulo del generador de páginas estáticas. La aplicación de React no
// lo importa a propósito: arrastraría los 35 kB del documento entero al bundle
// para pintar un enlace de dos palabras en el pie.
//
// El precio de esa copia es que se puede quedar atrás, y el fallo sería mudo: se
// publica la política y el pie de la página de inicio sigue sin enlazarla, que es
// justo lo que la ley pide que no pase. Por eso existe `legal.test.ts`, que sí
// importa el módulo de verdad y se pone rojo si las dos dejan de coincidir.
//
// PARA PUBLICAR: se cambia `borrador` a false en `blog/legal/privacidad.mjs` y
// `publicada` a true aquí. La prueba obliga a hacer las dos cosas.
export const POLITICA_PRIVACIDAD = {
  ruta: '/legal/privacidad/',
  publicada: false,
};
