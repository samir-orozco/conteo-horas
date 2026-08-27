// Preparación común de las pruebas del frontend.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cada prueba arranca con el DOM limpio. Sin esto, un componente montado en una
// prueba sigue ahí en la siguiente y las consultas encuentran dos elementos.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom no implementa matchMedia y algunos componentes lo consultan al montar.
if (!window.matchMedia) {
  window.matchMedia = ((consulta: string) => ({
    matches: false, media: consulta, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
