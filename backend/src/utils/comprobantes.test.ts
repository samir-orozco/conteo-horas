import { describe, it, expect } from 'vitest';
import { comprobanteAGuardar } from './comprobantes';
import { MAX_DOC, MIME_DOCX } from './documentos';

const uri = (mime: string, bytes: number[]) =>
  `data:${mime};base64,${Buffer.from([...bytes, 0x41, 0x41, 0x41]).toString('base64')}`;

const PDF = uri('application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]);
const JPG = uri('image/jpeg', [0xff, 0xd8, 0xff]);
const PNG = uri('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// El comprobante de un pago manual o del retiro de un afiliado. Son las dos
// únicas columnas de archivo del producto que hasta ahora no se validaban: lo
// que llegaba se guardaba tal cual, sin mirar formato ni tamaño.
//
// Quien las escribe es el super admin, así que no era un agujero por el que
// entrara un cliente. Pero el archivo SALE hacia terceros: el afiliado ve el
// comprobante de su retiro y el admin de la empresa ve el de su pago.

describe('qué comprobante queda guardado', () => {
  it('un comprobante nuevo y válido reemplaza al anterior', () => {
    expect(comprobanteAGuardar(PDF, null)).toEqual({ ok: true, comprobante: PDF });
    expect(comprobanteAGuardar(JPG, PDF)).toEqual({ ok: true, comprobante: JPG });
    expect(comprobanteAGuardar(PNG, null)).toEqual({ ok: true, comprobante: PNG });
  });

  it('el PDF del banco entra, que es la mitad de los comprobantes reales', () => {
    // Un soporte de transferencia normalmente se baja del banco en PDF. Por eso
    // esta columna usa la regla de los documentos y no la de las fotos.
    expect(comprobanteAGuardar(PDF, null).ok).toBe(true);
  });

  it('si no viene ninguno, se conserva el que ya estaba', () => {
    expect(comprobanteAGuardar(undefined, PDF)).toEqual({ ok: true, comprobante: PDF });
    expect(comprobanteAGuardar(null, PDF)).toEqual({ ok: true, comprobante: PDF });
  });

  it('una cadena vacía NO borra el comprobante guardado', () => {
    // El agujero que tenía el `??` de la ruta: '' ?? viejo devuelve '', así que
    // un formulario que mandara el campo vacío borraba el soporte de un pago
    // que ya se había hecho. Aquí '' significa "no vino", no "bórralo".
    expect(comprobanteAGuardar('', PDF)).toEqual({ ok: true, comprobante: PDF });
    expect(comprobanteAGuardar('   ', PDF)).toEqual({ ok: true, comprobante: PDF });
  });

  it('sin comprobante nuevo ni viejo, queda en null', () => {
    expect(comprobanteAGuardar(undefined, null)).toEqual({ ok: true, comprobante: null });
    expect(comprobanteAGuardar('', null)).toEqual({ ok: true, comprobante: null });
  });

  it('uno inválido se rechaza en vez de guardarse', () => {
    expect(comprobanteAGuardar('data:image/svg+xml;base64,PHN2Zw', null).ok).toBe(false);
    expect(comprobanteAGuardar('data:text/html;base64,PGh0bWw', null).ok).toBe(false);
    expect(comprobanteAGuardar('https://ejemplo.co/pago.pdf', null).ok).toBe(false);
    expect(comprobanteAGuardar(42, null).ok).toBe(false);
  });

  it('un comprobante que miente sobre su formato se rechaza', () => {
    // Lo mismo que en los documentos: la etiqueta la escribe quien sube.
    expect(comprobanteAGuardar(uri('application/pdf', [0x3c, 0x68, 0x74, 0x6d, 0x6c]), null).ok).toBe(false);
  });

  it('uno inválido no borra el bueno que ya estaba', () => {
    // Es lo que separa "rechazar" de "descartar". Si se descartara, la ruta
    // seguiría adelante y escribiría null encima de un comprobante correcto.
    const r = comprobanteAGuardar('data:text/html;base64,PGh0bWw', PDF);
    expect(r.ok).toBe(false);
  });

  it('el motivo explica qué se puede subir', () => {
    const r = comprobanteAGuardar('data:image/svg+xml;base64,PHN2Zw', null);
    if (r.ok) throw new Error('debía rechazar');
    expect(r.motivo).toMatch(/PDF/i);
  });

  it('Word no es un comprobante de pago', () => {
    // Aquí sí se estrecha respecto de los documentos: un soporte de pago es
    // algo que el banco emite, no algo que se redacta. Aceptar Word solo
    // agregaría una forma más de que alguien suba cualquier zip.
    expect(comprobanteAGuardar(uri(MIME_DOCX, [0x50, 0x4b, 0x03, 0x04]), null).ok).toBe(false);
  });

  it('respeta el mismo tope que el resto de los documentos', () => {
    const enorme = 'data:application/pdf;base64,JVBERi' + 'A'.repeat(MAX_DOC);
    expect(comprobanteAGuardar(enorme, null).ok).toBe(false);
  });

  it('un comprobante viejo que hoy ya no pasaría no impide guardar el registro', () => {
    // Compatibilidad con lo que ya hay en producción. Estas dos columnas nunca
    // se validaron, así que puede haber cualquier cosa guardada: un HEIC, un
    // GIF, un data URI a medio formar. Al procesar un retiro sin adjuntar nada
    // nuevo, ese valor viejo se conserva TAL CUAL y no se vuelve a validar. Si
    // se validara, el admin no podría cerrar un retiro por culpa de un archivo
    // que subió otra persona hace meses.
    const viejo = 'data:image/heic;base64,AAAAAAAA';
    expect(comprobanteAGuardar(undefined, viejo)).toEqual({ ok: true, comprobante: viejo });
  });
});
