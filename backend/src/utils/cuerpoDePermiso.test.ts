import { describe, it, expect } from 'vitest';
import { limpiarPermiso } from './cuerpoDePermiso';
import { cambioDeDocumento } from './documentos';

// El cuerpo de una novedad que manda la empresa, antes de pasárselo a Prisma (13 de septiembre de
// 2026). Sin tipo o sin fechas, o con valores que Prisma no entiende, crear o editar reventaba con
// un 500 y el mensaje interno de Prisma, que trae la ruta del archivo en el servidor. Ahora se dice
// qué falta con un 400.

// Un instante como lo manda el navegador: medianoche de Bogotá en ISO, con su zona.
const FECHA = (dia: number) => new Date(Date.UTC(2026, 8, dia, 5)).toISOString();
// Lo que manda la ficha del colaborador al crear una novedad (ColaboradorDetalle.tsx).
const NUEVA = { colaboradorId: 'c1', tipo: 'MEDICO', descripcion: 'Cita', aprobado: false, fechaInicio: FECHA(14), fechaFin: FECHA(15) };

// Un data URI con bytes de verdad, como en documentos.test.ts: lo que se comprueba es la cabecera.
const uri = (mime: string, bytes: number[]) =>
  `data:${mime};base64,${Buffer.concat([Buffer.from(bytes), Buffer.from('Hola')]).toString('base64')}`;
const PDF = uri('application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]);          // %PDF-
const EJECUTABLE = uri('application/pdf', [0x4d, 0x5a, 0x90]);               // un .exe que dice ser PDF

describe('limpiarPermiso al crear', () => {
  it('lo que manda la ficha pasa tal cual', () => {
    expect(limpiarPermiso(NUEVA, true)).toEqual({ ok: true, datos: NUEVA });
  });

  it('sin persona dice que falta', () => {
    const { colaboradorId: _c, ...sinPersona } = NUEVA;
    expect(limpiarPermiso(sinPersona, true)).toEqual({ ok: false, motivo: 'Falta la persona de la novedad.' });
  });

  it('sin tipo dice que falta', () => {
    const { tipo: _t, ...sinTipo } = NUEVA;
    expect(limpiarPermiso(sinTipo, true)).toEqual({ ok: false, motivo: 'Falta el tipo de la novedad.' });
  });

  it('sin fechas dice cuál falta', () => {
    const { fechaInicio: _i, ...sinInicio } = NUEVA;
    const { fechaFin: _f, ...sinFin } = NUEVA;
    expect(limpiarPermiso(sinInicio, true)).toEqual({ ok: false, motivo: 'Falta la fecha de inicio.' });
    expect(limpiarPermiso(sinFin, true)).toEqual({ ok: false, motivo: 'Falta la fecha de fin.' });
  });

  // Un campo de fecha vacío en el navegador: `new Date('T00:00:00-05:00')` es una fecha inválida, y
  // JSON la manda como null.
  it('una fecha que llega en null también falta', () => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: null }, true)).toEqual({ ok: false, motivo: 'Falta la fecha de inicio.' });
  });

  it('un tipo que no existe no pasa', () => {
    expect(limpiarPermiso({ ...NUEVA, tipo: 'VACACIONES_EXTRA' }, true)).toEqual({ ok: false, motivo: 'El tipo de la novedad no es válido.' });
  });

  // «2026-09-14» a secas: Prisma no la entiende, y leída como medianoche UTC sería el día anterior en Bogotá.
  it('una fecha sin hora ni zona no pasa', () => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: '2026-09-14' }, true)).toEqual({ ok: false, motivo: 'La fecha de inicio no es válida.' });
    expect(limpiarPermiso({ ...NUEVA, fechaFin: 'mañana' }, true)).toEqual({ ok: false, motivo: 'La fecha de fin no es válida.' });
  });

  it('el fin no puede ser antes del inicio', () => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: FECHA(15), fechaFin: FECHA(14) }, true))
      .toEqual({ ok: false, motivo: 'La fecha de fin no puede ser anterior a la de inicio.' });
  });

  it('una novedad de un solo día, con el mismo inicio y fin, sí pasa', () => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: FECHA(14), fechaFin: FECHA(14) }, true).ok).toBe(true);
  });

  it('la aprobación tiene que ser sí o no', () => {
    expect(limpiarPermiso({ ...NUEVA, aprobado: 'si' }, true)).toEqual({ ok: false, motivo: 'La aprobación tiene que ser sí o no.' });
  });
});

// Las formas de escribir un instante que acepta y que rechaza el cliente de Prisma de este backend,
// medidas el 13 de septiembre de 2026 con un findFirst contra MySQL. La validación no puede rechazar
// nada de lo que hoy se guarda, ni dejar pasar algo que después revienta en Prisma.
describe('limpiarPermiso con las fechas que entiende Prisma', () => {
  const FIN = '2030-12-31T05:00:00Z';
  it.each([
    '2030-01-14T05:00:00.000Z', '2030-01-14T05:00:00Z', '2030-01-14T00:00:00-05:00',
    '2030-01-14T05:00:00.123456789+00:00', '2030-01-14 05:00:00Z', '2030-01-14t05:00:00z',
    '2030-01-14T05:59:59Z', '2028-02-29T05:00:00Z',
  ])('«%s» pasa', (fecha) => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: fecha, fechaFin: FIN }, true).ok).toBe(true);
  });

  it.each([
    '2030-01-14T05:00Z', '2030-01-14T05:00:00', '2030-01-14', '2030-02-30T05:00:00Z', '2030-01-14T24:00:00Z',
    '2030-01-14T05:00:60Z', '2030-01-14T05:00:00+0500', '+002030-01-14T05:00:00Z', ' 2030-01-14T05:00:00Z',
    '2030-01-14T05:60:00Z', '2030-02-29T05:00:00Z',
  ])('«%s» no pasa', (fecha) => {
    expect(limpiarPermiso({ ...NUEVA, fechaInicio: fecha, fechaFin: FIN }, true)).toEqual({ ok: false, motivo: 'La fecha de inicio no es válida.' });
  });

  it('un número no es una fecha', () => {
    expect(limpiarPermiso({ ...NUEVA, fechaFin: Date.UTC(2030, 0, 15) }, true)).toEqual({ ok: false, motivo: 'La fecha de fin no es válida.' });
  });
});

describe('limpiarPermiso al editar', () => {
  it('aprobar manda solo la aprobación, y pasa', () => {
    expect(limpiarPermiso({ aprobado: true }, false)).toEqual({ ok: true, datos: { aprobado: true } });
  });

  it('cambiar el motivo manda solo el tipo, y pasa', () => {
    expect(limpiarPermiso({ tipo: 'PERSONAL' }, false)).toEqual({ ok: true, datos: { tipo: 'PERSONAL' } });
  });

  it('lo que manda la ficha al editar pasa, sin cambiar de persona', () => {
    const { colaboradorId: _c, ...sinPersona } = NUEVA;
    expect(limpiarPermiso({ ...NUEVA, colaboradorId: 'otra' }, false)).toEqual({ ok: true, datos: sinPersona });
  });

  it('un tipo o una fecha inválidos tampoco pasan al editar', () => {
    expect(limpiarPermiso({ tipo: 'X' }, false)).toEqual({ ok: false, motivo: 'El tipo de la novedad no es válido.' });
    expect(limpiarPermiso({ fechaFin: '2026-09-14' }, false)).toEqual({ ok: false, motivo: 'La fecha de fin no es válida.' });
  });

  it('el tipo y las fechas no se pueden vaciar', () => {
    expect(limpiarPermiso({ tipo: '' }, false)).toEqual({ ok: false, motivo: 'Falta el tipo de la novedad.' });
    expect(limpiarPermiso({ fechaFin: null }, false)).toEqual({ ok: false, motivo: 'Falta la fecha de fin.' });
  });

  it('con las dos fechas, el fin tampoco puede ser antes del inicio', () => {
    expect(limpiarPermiso({ fechaInicio: FECHA(15), fechaFin: FECHA(14) }, false))
      .toEqual({ ok: false, motivo: 'La fecha de fin no puede ser anterior a la de inicio.' });
  });

  it('sin nada que cambiar no falla', () => {
    expect(limpiarPermiso({}, false)).toEqual({ ok: true, datos: {} });
  });
});

// La evidencia ya se validaba en la ruta; se mudó con la función y se prueba aquí por primera vez.
describe('limpiarPermiso con la evidencia', () => {
  it('un documento válido se guarda con su tipo y su nombre', () => {
    const limpio = limpiarPermiso({ ...NUEVA, evidencia: PDF, evidenciaNombre: 'incapacidad.pdf' }, true);
    expect(limpio).toMatchObject({ ok: true, datos: { evidencia: PDF, evidenciaTipo: 'application/pdf', evidenciaNombre: 'incapacidad.pdf' } });
  });

  it('en null quita el adjunto', () => {
    expect(limpiarPermiso({ evidencia: null }, false))
      .toEqual({ ok: true, datos: { evidencia: null, evidenciaTipo: null, evidenciaNombre: null } });
  });

  it('un archivo que no es un documento se rechaza con el motivo de documentos.ts', () => {
    const { motivo } = cambioDeDocumento(EJECUTABLE, 'incapacidad.pdf') as { motivo: string };
    expect(limpiarPermiso({ ...NUEVA, evidencia: EJECUTABLE, evidenciaNombre: 'incapacidad.pdf' }, true)).toEqual({ ok: false, motivo });
  });

  it('una descripción vacía se guarda como null', () => {
    expect(limpiarPermiso({ descripcion: '' }, false)).toEqual({ ok: true, datos: { descripcion: null } });
  });
});
