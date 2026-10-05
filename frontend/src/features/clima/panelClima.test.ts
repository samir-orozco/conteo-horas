import { describe, it, expect } from 'vitest';
import {
  COLOR_DE_CARITA, decimal, variacion, respondieron, caritaDelPromedio, puntosDeLaLinea, rangoDelMes, etiquetaDeSemana,
  notasRecientes, porcentajeNegativas, sedeMasBaja, POCAS_RESPUESTAS, granularidad,
} from './panelClima';

describe('números del panel', () => {
  it('los decimales van con coma, como se escriben en Colombia', () => {
    expect(decimal(3.8)).toBe('3,8');
    expect(decimal(4)).toBe('4,0');
  });

  it('la variación dice para dónde fue, y subir es bueno', () => {
    expect(variacion(0.2)).toEqual({ texto: '▲ 0,2', sube: true });
    expect(variacion(-0.5)).toEqual({ texto: '▼ 0,5', sube: false });
    expect(variacion(0)).toEqual({ texto: '= 0,0', sube: null });
    expect(variacion(null)).toBeNull();
  });

  it('respondieron: cuántas de las jornadas cerradas en el kiosco terminaron con una carita', () => {
    // Por JORNADAS y no por personas (4 de octubre de 2026): por personas, en un rango largo casi
    // todos responden alguna vez y la tarjeta se quedaba en 100 % sin decir nada.
    expect(respondieron(1210, 1730)).toEqual({ texto: '1.210 de 1.730 jornadas', porcentaje: 70 });
    // Nadie cerró jornada: no hay porcentaje que inventar.
    expect(respondieron(0, 0)).toEqual({ texto: '0 de 0 jornadas', porcentaje: null });
    // Una persona puede calificar sin que su salida caiga en el filtro (turno nocturno): nunca más de 100.
    expect(respondieron(5, 4).porcentaje).toBe(100);
  });

  it('la carita de un promedio es la más cercana', () => {
    expect(caritaDelPromedio(3.8)).toBe(4);
    expect(caritaDelPromedio(1.2)).toBe(1);
    expect(caritaDelPromedio(2.5)).toBe(3);
    expect(caritaDelPromedio(null)).toBeNull();
  });

  it('los colores de las caritas son cinco, de Muy mal a Muy bien', () => {
    expect(Object.keys(COLOR_DE_CARITA)).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('la línea de las semanas', () => {
  const caja = { ancho: 400, alto: 200, margen: 20 };

  it('el 5 va arriba, el 1 abajo, y las semanas de izquierda a derecha', () => {
    const p = puntosDeLaLinea([{ promedio: 1 }, { promedio: 5 }, { promedio: 3 }], caja);
    expect(p.map(q => q.x)).toEqual([20, 200, 380]);
    expect(p.map(q => q.y)).toEqual([180, 20, 100]);
  });

  it('una sola semana va al centro', () => {
    expect(puntosDeLaLinea([{ promedio: 3 }], caja)).toEqual([{ x: 200, y: 100 }]);
  });
});

describe('fechas del panel, en hora de Bogotá', () => {
  it('el rango por defecto es del 1 del mes a hoy', () => {
    expect(rangoDelMes(new Date('2026-10-14T15:00:00Z'))).toEqual({ desde: '2026-10-01', hasta: '2026-10-14' });
  });

  it('a las 8 p. m. de Bogotá sigue siendo el mismo día, aunque en UTC ya sea mañana', () => {
    // 31 de octubre, 8 p. m. en Bogotá = 1 de noviembre, 01:00 UTC.
    expect(rangoDelMes(new Date('2026-11-01T01:00:00Z'))).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
  });

  it('la semana se nombra por su lunes', () => {
    // Lunes 5 de octubre a medianoche de Bogotá. Las pruebas corren en Los Ángeles a propósito.
    expect(etiquetaDeSemana('2026-10-05T05:00:00.000Z')).toBe('Semana del 5 de oct');
  });
});

describe('notasRecientes — la tarjeta del buzón', () => {
  // Miércoles 21 de octubre de 2026, mediodía en Bogotá. Su lunes es el 19; el anterior, el 12.
  const ahora = new Date('2026-10-21T17:00:00Z');
  const semana = (iso: string, n: number) => ({ semana: iso, notas: Array.from({ length: n }, (_, i) => `nota ${i}`) });

  it('cuenta las notas de esta semana y de la anterior', () => {
    const buzon = { semanas: [semana('2026-10-19T05:00:00.000Z', 1), semana('2026-10-12T05:00:00.000Z', 2), semana('2026-10-05T05:00:00.000Z', 7)] };
    expect(notasRecientes(buzon, ahora)).toBe(3);
  });

  it('notas de hace semanas no son recientes: la tarjeta dice 0 (revisión adversarial)', () => {
    expect(notasRecientes({ semanas: [semana('2026-09-28T05:00:00.000Z', 3)] }, ahora)).toBe(0);
  });

  it('sin buzón cargado no hay número', () => {
    expect(notasRecientes(null, ahora)).toBeNull();
  });
});

describe('porcentajeNegativas', () => {
  it('es la parte de las respuestas que fue Muy mal o Mal, con un decimal', () => {
    expect(porcentajeNegativas(537, 3403)).toBe('15,8 %');
    expect(porcentajeNegativas(0, 10)).toBe('0,0 %');
  });

  it('sin respuestas no hay porcentaje', () => {
    expect(porcentajeNegativas(0, 0)).toBeNull();
  });
});

describe('sedeMasBaja', () => {
  const s = (sedeId: string | null, promedio: number, total: number) => ({ sedeId, nombre: String(sedeId), promedio, total, jornadas: total, participacion: 100 });

  it('es la de menor promedio', () => {
    expect(sedeMasBaja([s('a', 4.1, 40), s('b', 3.2, 20), s('c', 3.9, 30)])).toBe('b');
  });

  it('no cuenta una sede con pocas respuestas: ese promedio no alcanza para concluir', () => {
    expect(POCAS_RESPUESTAS).toBe(10);
    expect(sedeMasBaja([s('a', 4.1, 40), s('b', 3.2, 20), s('c', 2.5, 4)])).toBe('b');
  });

  it('con una sola sede comparable no hay «más baja»', () => {
    expect(sedeMasBaja([s('a', 4.1, 40), s('c', 2.5, 4)])).toBeUndefined();
    expect(sedeMasBaja([])).toBeUndefined();
  });

  it('«Sin sede» también puede ser la más baja', () => {
    expect(sedeMasBaja([s('a', 4.1, 40), s(null, 2.9, 15)])).toBeNull();
  });
});

describe('granularidad — la evolución por día o por semana', () => {
  it('un mes o menos va por día: el mes en curso al comienzo del mes era un solo punto', () => {
    expect(granularidad('2026-10-01', '2026-10-04')).toBe('DIA');
    expect(granularidad('2026-10-01', '2026-10-31')).toBe('DIA');
    expect(granularidad('2026-10-05', '2026-10-05')).toBe('DIA');
  });

  it('más de un mes va por semana', () => {
    expect(granularidad('2026-10-01', '2026-11-01')).toBe('SEMANA');
    expect(granularidad('2026-07-06', '2026-10-04')).toBe('SEMANA');
  });
});
