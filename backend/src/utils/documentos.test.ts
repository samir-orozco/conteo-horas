import { describe, it, expect } from 'vitest';
import { documentoValido, tipoDeDocumento, nombreDeDocumento, MAX_DOC } from './documentos';

const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';
const jpg = 'data:image/jpeg;base64,/9j/4AAQ';
const png = 'data:image/png;base64,iVBORw0KGgo';

describe('qué documentos se aceptan', () => {
  it('PDF e imágenes de los formatos permitidos', () => {
    expect(documentoValido(pdf)).toBe(true);
    expect(documentoValido(jpg)).toBe(true);
    expect(documentoValido(png)).toBe(true);
    expect(documentoValido('data:image/webp;base64,UklGRg')).toBe(true);
  });

  it('rechaza formatos que no están en la lista', () => {
    // Un SVG puede llevar scripts dentro, y por eso no entra.
    expect(documentoValido('data:image/svg+xml;base64,PHN2Zw')).toBe(false);
    expect(documentoValido('data:text/html;base64,PGh0bWw')).toBe(false);
    expect(documentoValido('data:application/x-msdownload;base64,TVo')).toBe(false);
  });

  it('rechaza lo que no es un data URI', () => {
    expect(documentoValido('https://ejemplo.co/archivo.pdf')).toBe(false);
    expect(documentoValido('JVBERi0xLjQK')).toBe(false);
    expect(documentoValido('')).toBe(false);
    expect(documentoValido(null)).toBe(false);
    expect(documentoValido(undefined)).toBe(false);
    expect(documentoValido(12345)).toBe(false);
    expect(documentoValido({ documento: pdf })).toBe(false);
  });

  it('rechaza el que se pasa del tope', () => {
    const enorme = 'data:application/pdf;base64,' + 'A'.repeat(MAX_DOC);
    expect(documentoValido(enorme)).toBe(false);
  });

  it('el tope deja pasar un archivo real de unos 3 MB', () => {
    // base64 infla un tercio, así que el tope en bytes reales es MAX_DOC × 3/4.
    expect(Math.round((MAX_DOC * 3) / 4 / 1_000_000)).toBe(3);
  });
});

describe('tipo y nombre', () => {
  it('el tipo se lee del propio data URI, no de lo que diga el cliente', () => {
    expect(tipoDeDocumento(pdf)).toBe('application/pdf');
    expect(tipoDeDocumento(jpg)).toBe('image/jpeg');
    expect(tipoDeDocumento(png)).toBe('image/png');
  });

  it('el nombre se recorta y se limpia', () => {
    expect(nombreDeDocumento('  carta-renuncia.pdf  ')).toBe('carta-renuncia.pdf');
    expect(nombreDeDocumento('x'.repeat(200))).toHaveLength(120);
  });

  it('un nombre vacío o ausente queda en null, no en cadena vacía', () => {
    expect(nombreDeDocumento('')).toBeNull();
    expect(nombreDeDocumento('   ')).toBeNull();
    expect(nombreDeDocumento(undefined)).toBeNull();
    expect(nombreDeDocumento(42)).toBeNull();
  });
});
