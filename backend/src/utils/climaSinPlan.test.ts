import { describe, it, expect } from 'vitest';
import { DIAS_ENTRE_AVISOS, avisoDeAtencionSinPlan, textoDelAvisoSinPlan, vistazoDelClima } from './climaSinPlan';

// EL CLIMA PARA UNA EMPRESA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4). Ve cifras sin nombres, y
// la campana le avisa cuando alguien entra a «necesita atención», sin decir quién.

// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h: number, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));
const DIA = 24 * 60 * 60 * 1000;

describe('vistazoDelClima: lo único del resumen que sale sin el plan', () => {
  const completo = {
    total: 12, personas: 5, promedio: 3.4, variacion: -0.3, jornadas: 20, negativas: 4,
    distribucion: { 1: 2, 2: 2, 3: 3, 4: 3, 5: 2 },
    motivos: [{ motivo: 'Mucho trabajo', veces: 3, porcentaje: 75 }],
    semanas: [], dias: [], porSede: [{ sedeId: 's1', nombre: 'Bodega Norte', promedio: 3, total: 4, jornadas: 6, participacion: 66 }],
    atencion: [
      { colaboradorId: 'c1', nombre: 'Andrea Gómez', cargo: 'Cajera', sedes: ['Norte'], dias: 4, desde: bog(2026, 10, 1, 0), motivo: 'Mucho trabajo' },
      { colaboradorId: 'c2', nombre: 'Jorge Vargas', cargo: null, sedes: [], dias: 3, desde: bog(2026, 10, 2, 0), motivo: null },
    ],
    recientes: [{ colaboradorId: 'c1', nombre: 'Andrea Gómez', fecha: bog(2026, 10, 7, 0), carita: 1, motivos: [], observacion: 'Me dejaron sola en el cierre' }],
  };

  it('promedio, su variación, respuestas, personas, jornadas y CUÁNTOS necesitan atención', () => {
    expect(vistazoDelClima(completo)).toEqual({ total: 12, personas: 5, promedio: 3.4, variacion: -0.3, jornadas: 20, atencion: 2 });
  });

  it('ni un nombre, ni un motivo, ni una observación, ni una sede viajan', () => {
    const json = JSON.stringify(vistazoDelClima(completo));
    for (const dato of ['Andrea', 'Jorge', 'Cajera', 'Mucho trabajo', 'Me dejaron sola', 'Bodega Norte', 'c1', 'c2']) {
      expect(json).not.toContain(dato);
    }
  });
});

describe('avisoDeAtencionSinPlan: cuándo la campana avisa que alguien necesita atención', () => {
  const ahora = bog(2026, 10, 20, 7);
  const persona = (dia: number) => ({ entro: bog(2026, 10, dia, 0) });

  it('sin nadie en atención, no avisa', () => {
    expect(avisoDeAtencionSinPlan({ enAtencion: [], ultimo: null, ahora })).toBeNull();
  });

  it('la primera vez, avisa con cuántas personas, y anota hasta qué día entraron', () => {
    expect(avisoDeAtencionSinPlan({ enAtencion: [persona(12), persona(18)], ultimo: null, ahora }))
      .toEqual({ personas: 2, hastaDia: '2026-10-18' });
  });

  it('no repite si nadie entró después del último aviso, aunque haya pasado mucho', () => {
    const ultimo = { creadoEn: bog(2026, 9, 1, 7), hastaDia: '2026-10-18' };
    expect(avisoDeAtencionSinPlan({ enAtencion: [persona(12), persona(18)], ultimo, ahora })).toBeNull();
  });

  it('vuelve a avisar cuando alguien entra después del último, contando a todos los que están', () => {
    const ultimo = { creadoEn: bog(2026, 10, 10, 7), hastaDia: '2026-10-09' };
    expect(avisoDeAtencionSinPlan({ enAtencion: [persona(5), persona(15)], ultimo, ahora }))
      .toEqual({ personas: 2, hastaDia: '2026-10-15' });
  });

  it(`pero no antes de ${DIAS_ENTRE_AVISOS} días desde el último: no se insiste a diario`, () => {
    const enAtencion = [persona(19)];
    const hace = (dias: number) => ({ creadoEn: new Date(ahora.getTime() - dias * DIA), hastaDia: '2026-10-09' });
    expect(avisoDeAtencionSinPlan({ enAtencion, ultimo: hace(DIAS_ENTRE_AVISOS - 1), ahora })).toBeNull();
    expect(avisoDeAtencionSinPlan({ enAtencion, ultimo: hace(DIAS_ENTRE_AVISOS), ahora })).toEqual({ personas: 1, hastaDia: '2026-10-19' });
  });

  it('el día de entrada se lee en Bogotá, no en UTC', () => {
    // Las 04:59 UTC del 18 todavía son las 11:59 p. m. del 17 en Bogotá.
    expect(avisoDeAtencionSinPlan({ enAtencion: [{ entro: new Date(Date.UTC(2026, 9, 18, 4, 59)) }], ultimo: null, ahora })?.hastaDia).toBe('2026-10-17');
  });
});

describe('textoDelAvisoSinPlan', () => {
  it('dice cuántas personas, sin decir quiénes, y qué da el plan', () => {
    const t = textoDelAvisoSinPlan(2, false);
    expect(t.tipo).toBe('CLIMA_ATENCION_SIN_PLAN');
    expect(t.titulo).toBe('2 personas reportaron días malos seguidos');
    expect(t.cuerpo).toContain('Con el plan Empresarial ves quiénes son');
    expect(t.cuerpo).not.toContain('gratis');
  });

  it('en singular con una persona', () => {
    expect(textoDelAvisoSinPlan(1, false).titulo).toBe('1 persona reportó días malos seguidos');
  });

  it('si la empresa no ha usado la prueba, la ofrece', () => {
    expect(textoDelAvisoSinPlan(3, true).cuerpo).toContain('Puedes probarlo gratis 30 días.');
  });
});
