import { describe, it, expect } from 'vitest';
import { decidirTrasErrorDeMarca, textosDelMotivo } from './motivoDeMarca';

// Qué hace el kiosco cuando el servidor NO marcó. Dos de esas respuestas no son
// fallos sino preguntas: el servidor pide el motivo antes de escribir nada, una
// vez al salir antes de hora y otra al llegar tarde, y cada una abre su pantalla.
const respuesta = (status: number, data: { codigo?: string; error?: string }) => ({ response: { status, data } });

describe('decidirTrasErrorDeMarca', () => {
  it('una salida temprana sin motivo abre la pantalla del motivo de salida', () => {
    expect(decidirTrasErrorDeMarca(respuesta(409, { codigo: 'REQUIERE_MOTIVO' }), false))
      .toEqual({ accion: 'PEDIR_MOTIVO', caso: 'SALIDA_TEMPRANA' });
  });

  it('una llegada tarde sin motivo abre la pantalla del motivo de llegada', () => {
    expect(decidirTrasErrorDeMarca(respuesta(409, { codigo: 'REQUIERE_MOTIVO_TARDANZA' }), false))
      .toEqual({ accion: 'PEDIR_MOTIVO', caso: 'LLEGADA_TARDE' });
  });

  it('si ya traía motivo y lo vuelve a pedir, falla en vez de reabrir la pantalla', () => {
    // Reabrirla en silencio deja a la persona dando vueltas frente al kiosco,
    // con la fila esperando y sin entender por qué no le sirvió.
    const r = decidirTrasErrorDeMarca(respuesta(409, { codigo: 'REQUIERE_MOTIVO_TARDANZA' }), true);
    expect(r).toEqual({ accion: 'FALLAR', mensaje: 'No pudimos registrar el motivo de tu llegada tarde. Avisa a tu supervisor.' });
  });

  it('la salida temprana conserva su mensaje cuando el motivo no sirvió', () => {
    const r = decidirTrasErrorDeMarca(respuesta(409, { codigo: 'REQUIERE_MOTIVO' }), true);
    expect(r).toEqual({ accion: 'FALLAR', mensaje: 'No pudimos registrar el motivo de tu salida. Avisa a tu supervisor.' });
  });

  it('un código de motivo que no llega con 409 no abre la pantalla', () => {
    // El servidor solo pregunta con 409. Otro estado con ese código es un error
    // de verdad, y abrir la pantalla escondería lo que dijo.
    expect(decidirTrasErrorDeMarca(respuesta(400, { codigo: 'REQUIERE_MOTIVO', error: 'Solicitud inválida.' }), false))
      .toEqual({ accion: 'FALLAR', mensaje: 'Solicitud inválida.' });
  });

  it('cualquier otro error muestra lo que dijo el servidor', () => {
    expect(decidirTrasErrorDeMarca(respuesta(403, { codigo: 'SEDE_DISTINTA', error: 'Abriste el turno en otra sede.' }), false))
      .toEqual({ accion: 'FALLAR', mensaje: 'Abriste el turno en otra sede.' });
  });

  it('sin respuesta del servidor muestra un mensaje genérico', () => {
    expect(decidirTrasErrorDeMarca({}, false))
      .toEqual({ accion: 'FALLAR', mensaje: 'No pudimos registrar tu marcación. Intenta de nuevo.' });
  });
});

describe('textosDelMotivo', () => {
  it('la llegada tarde habla de la entrada, no de irse', () => {
    const t = textosDelMotivo('LLEGADA_TARDE');
    expect(t.titulo).toBe('Llegada tarde');
    expect(t.boton).toBe('Registrar mi entrada');
  });

  it('la salida temprana conserva sus textos de siempre', () => {
    const t = textosDelMotivo('SALIDA_TEMPRANA');
    expect(t.titulo).toBe('Salida antes del horario');
    expect(t.boton).toBe('Registrar mi salida');
  });
});
