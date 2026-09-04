import { describe, it, expect } from 'vitest';
import { procesarEvidencia, MAX_ARCHIVO_BYTES } from './evidencia';
import { MIME_DOCX } from './archivos';

// El único camino de subida de los cuatro formularios que adjuntan algo:
// el retiro de un colaborador, el contrato, la prórroga y la evidencia de una
// novedad. No tenía ninguna prueba.
//
// LO QUE AQUÍ NO SE PUEDE PROBAR, Y CONVIENE DECIRLO: la rama de imagen. jsdom
// no dispara el `onload` de un <img> (no carga recursos) ni implementa el
// canvas, así que una prueba de esa rama no falla, se cuelga hasta el tiempo
// límite. La decisión que esa rama toma vive extraída en imagenes.ts, que sí se
// prueba entera. La costura se verifica en el navegador, como dice la sección 5
// del CLAUDE.md.

const archivo = (nombre: string, tipo: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

describe('qué archivos acepta el campo de adjuntar', () => {
  it('un PDF pasa tal cual, sin tocarlo', async () => {
    const r = await procesarEvidencia(archivo('carta.pdf', 'application/pdf'));
    expect(r.tipo).toBe('application/pdf');
    expect(r.data.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('un Word pasa tal cual, que es lo que se vino a agregar', async () => {
    const r = await procesarEvidencia(archivo('contrato.docx', MIME_DOCX));
    expect(r.tipo).toBe(MIME_DOCX);
    expect(r.nombre).toBe('contrato.docx');
  });

  it('el nombre del Word se arregla si venía con otra extensión', async () => {
    const r = await procesarEvidencia(archivo('contrato.doc', MIME_DOCX));
    expect(r.nombre).toBe('contrato.docx');
  });

  it('el Word viejo y el de macros se rechazan, y se dice por qué', async () => {
    // Son los dos formatos de Word que pueden llevar macros. Rechazarlos aquí
    // ahorra subir 3 MB para recibir un 400.
    await expect(procesarEvidencia(archivo('viejo.doc', 'application/msword')))
      .rejects.toThrow(/\.docx/);
    await expect(procesarEvidencia(archivo('macros.docm', 'application/vnd.ms-word.document.macroEnabled.12')))
      .rejects.toThrow(/\.docx/);
  });

  it('el SVG se rechaza aunque el navegador lo llame imagen', async () => {
    await expect(procesarEvidencia(archivo('logo.svg', 'image/svg+xml')))
      .rejects.toThrow();
  });

  it('lo que no es ni foto ni documento se rechaza', async () => {
    await expect(procesarEvidencia(archivo('cosa.zip', 'application/zip'))).rejects.toThrow();
    await expect(procesarEvidencia(archivo('pagina.html', 'text/html'))).rejects.toThrow();
    await expect(procesarEvidencia(archivo('sin-tipo', ''))).rejects.toThrow();
  });

  it('un archivo demasiado grande se rechaza antes de leerlo', async () => {
    // El tope se mide sobre los bytes reales, antes de convertir a base64, que
    // es lo que hace que quepa en el tope del backend.
    await expect(procesarEvidencia(archivo('enorme.pdf', 'application/pdf', MAX_ARCHIVO_BYTES + 1)))
      .rejects.toThrow(/3 MB/);
    await expect(procesarEvidencia(archivo('enorme.docx', MIME_DOCX, MAX_ARCHIVO_BYTES + 1)))
      .rejects.toThrow(/3 MB/);
  });

  it('el tope cabe en el del backend', () => {
    // El backend rechaza por encima de 4.200.000 caracteres de base64, y base64
    // infla un tercio. Si alguien sube este número sin mirar el otro, un
    // archivo que aquí pasa se convierte allá en un 400 sin causa visible.
    expect(Math.ceil((MAX_ARCHIVO_BYTES * 4) / 3) + 100).toBeLessThan(4_200_000);
  });

  it('el nombre se recorta y no se queda vacío', async () => {
    const r = await procesarEvidencia(archivo('x'.repeat(300) + '.pdf', 'application/pdf'));
    expect(r.nombre.length).toBeLessThanOrEqual(124);
  });
});
