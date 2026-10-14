import { describe, it, expect } from 'vitest';
import {
  DIAS_DE_PRUEBA, finDePrueba, decidirPrueba, estadoDePrueba, avisoDePrueba, textoDeAviso,
} from './pruebaClima';

// LA PRUEBA GRATIS DEL CLIMA LABORAL (14 de octubre de 2026, PENDIENTES nº 39, fase 3). Una empresa sin el plan la
// pide sola, una vez, y tiene el panel completo 30 días. Va sobre las concesiones con fecha (utils/concesiones.ts):
// es una concesión de `clima` con origen PRUEBA.

const bog = (a: number, mes: number, d: number, h = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5));
const prueba = (o: Partial<{ desde: Date; hasta: Date; revocadaEn: Date | null }> = {}) => ({
  desde: bog(2026, 10, 14, 9), hasta: bog(2026, 11, 13), revocadaEn: null, ...o,
});

describe('finDePrueba', () => {
  // 30 días contando hoy: pedida el 14 de octubre, el último día es el 12 de noviembre, y el fin exclusivo es
  // la medianoche de Bogotá del 13.
  it('son 30 días contando hoy', () => {
    expect(DIAS_DE_PRUEBA).toBe(30);
    expect(finDePrueba('2026-10-14')).toEqual(bog(2026, 11, 13));
    expect(finDePrueba('2026-12-20')).toEqual(bog(2027, 1, 19));
  });
});

describe('decidirPrueba', () => {
  it('sin el clima y sin prueba previa, se puede', () => {
    expect(decidirPrueba({ tieneClima: false, pruebasPrevias: 0 })).toEqual({ ok: true });
  });

  it('una sola vez por empresa, aunque ya haya vencido o se la hayan quitado', () => {
    expect(decidirPrueba({ tieneClima: false, pruebasPrevias: 1 }))
      .toEqual({ ok: false, codigo: 'YA_USO', error: 'Esta empresa ya usó su prueba gratis del clima laboral.' });
  });

  it('quien ya tiene el clima, por su plan o por el super admin, no necesita prueba', () => {
    expect(decidirPrueba({ tieneClima: true, pruebasPrevias: 0 }))
      .toEqual({ ok: false, codigo: 'YA_TIENE', error: 'Tu empresa ya tiene el clima laboral.' });
  });
});

describe('estadoDePrueba', () => {
  const ahora = bog(2026, 10, 20, 10);
  it('sin pruebas, está disponible', () => {
    expect(estadoDePrueba([], ahora)).toEqual({ disponible: true, vigente: null, terminada: null });
  });

  it('con una vigente, dice hasta cuándo', () => {
    const p = prueba();
    expect(estadoDePrueba([p], ahora)).toEqual({ disponible: false, vigente: { hasta: p.hasta }, terminada: null });
  });

  it('con una vencida o quitada, ya no está disponible y dice cuándo terminó', () => {
    const vencida = prueba({ hasta: bog(2026, 10, 18) });
    expect(estadoDePrueba([vencida], ahora)).toEqual({ disponible: false, vigente: null, terminada: { hasta: vencida.hasta } });
    const quitada = prueba({ revocadaEn: bog(2026, 10, 16, 8) });
    expect(estadoDePrueba([quitada], ahora)).toEqual({ disponible: false, vigente: null, terminada: { hasta: quitada.revocadaEn! } });
  });
});

describe('avisoDePrueba', () => {
  it('antes de los 20 días no toca ninguno', () => {
    expect(avisoDePrueba(prueba(), bog(2026, 11, 2, 7))).toBeNull();
  });

  it('desde los 20 días, el de avance', () => {
    expect(avisoDePrueba(prueba(), bog(2026, 11, 3, 9))).toBe('AVANCE');
  });

  it('desde 3 días antes del fin, el de por terminar: el de avance ya no sirve', () => {
    expect(avisoDePrueba(prueba(), bog(2026, 11, 10, 7))).toBe('POR_TERMINAR');
  });

  it('desde el fin, el de terminó', () => {
    expect(avisoDePrueba(prueba(), bog(2026, 11, 13, 7))).toBe('TERMINO');
  });

  it('una prueba quitada no avisa nada', () => {
    expect(avisoDePrueba(prueba({ revocadaEn: bog(2026, 10, 20) }), bog(2026, 11, 13, 7))).toBeNull();
  });
});

describe('textoDeAviso', () => {
  const hasta = bog(2026, 11, 13);
  it('el de inicio dice hasta qué día, con el último día incluido', () => {
    expect(textoDeAviso('INICIO', { hasta })).toEqual({
      tipo: 'PRUEBA_CLIMA_INICIO',
      titulo: 'Empezó tu prueba gratis del clima laboral',
      cuerpo: 'Hasta el 12 de noviembre ves el panel completo: cómo está el ánimo de tu equipo, por qué y quién necesita atención.',
    });
  });

  it('el de avance dice lo que se ha encontrado', () => {
    expect(textoDeAviso('AVANCE', { hasta, respuestas: 143, promedio: 3.84 }).cuerpo)
      .toBe('Tu equipo ha dejado 143 respuestas, con un ánimo promedio de 3,8 de 5. Tu prueba va hasta el 12 de noviembre.');
  });

  it('el de avance sin respuestas no inventa un promedio', () => {
    expect(textoDeAviso('AVANCE', { hasta, respuestas: 0, promedio: null }).cuerpo)
      .toBe('Tu equipo todavía no ha calificado su día. Revisa que la calificación del día esté encendida en Configuración › Marcación. Tu prueba va hasta el 12 de noviembre.');
  });

  it('el de por terminar y el de terminó invitan al plan Empresarial', () => {
    expect(textoDeAviso('POR_TERMINAR', { hasta }).titulo).toBe('Tu prueba del clima laboral termina en 3 días');
    expect(textoDeAviso('POR_TERMINAR', { hasta }).cuerpo).toContain('plan Empresarial');
    expect(textoDeAviso('TERMINO', { hasta }).titulo).toBe('Terminó tu prueba del clima laboral');
    expect(textoDeAviso('TERMINO', { hasta }).cuerpo).toContain('plan Empresarial');
  });
});
