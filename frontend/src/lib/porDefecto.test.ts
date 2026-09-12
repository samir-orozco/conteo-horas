import { describe, it, expect } from 'vitest';
import { nombreConDefecto } from './porDefecto';

// La etiqueta de una sede que ninguna marca probó y que se le muestra a un
// presencial al leer (decisión del dueño del 12 de septiembre de 2026). Una sola
// forma de escribirla en reportes, registros y colaboradores.

describe('nombreConDefecto', () => {
  it('pone «por defecto» entre paréntesis, pegado al nombre de la sede', () => {
    expect(nombreConDefecto('Sede principal')).toBe('Sede principal (por defecto)');
  });
});
