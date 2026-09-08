// El generador de páginas estáticas vive fuera de `src` y es JavaScript sin
// tipos. `tsconfig.app.json` solo incluye `src`, así que sin esta declaración
// `tsc -b` no sabe qué es `privacidad.mjs` y la prueba que mantiene sincronizado
// el pie de página no compila.
declare module '*/blog/legal/privacidad.mjs' {
  export const PRIVACIDAD: {
    ruta: string;
    borrador: boolean;
    version: string;
    fechaVigencia: string;
  };
}
