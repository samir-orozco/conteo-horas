import { describe, it, expect } from 'vitest';
import { identificarRostro, UMBRAL_COINCIDENCIA, MARGEN_AMBIGUO } from './rostro';

// QUIÉN ES ESTA CARA, Y CUÁNDO ES MEJOR NO RESPONDER.
//
// El kiosco no pregunta «¿este es Julián?» sino «¿quién es este?», contra TODAS
// las personas enroladas de la empresa. Son dos problemas distintos y el segundo
// es mucho más difícil: cuantas más personas hay, más probable es que alguien
// caiga por debajo del umbral por casualidad.
//
// El código anterior se quedaba con el más parecido que bajara de 0,5 y no
// miraba nada más. Si el segundo estaba a 0,001 de distancia, daba igual: elegía
// al primero. Eso es exactamente confundir una persona con otra, que es lo que
// el dueño reportó que pasa.
//
// LA ASIMETRÍA QUE MANDA AQUÍ: un rechazo falso cuesta ocho segundos y marcar con
// la cédula. Una identificación falsa le abona las horas de una persona a otra, y
// nadie se entera hasta que alguien reclama su nómina. Ante la duda, no se
// responde.

const desc = (v: number) => Array.from({ length: 128 }, () => v);
// Un descriptor a distancia euclídea `d` del de referencia: 128 dimensiones, así
// que mover cada una en d/sqrt(128) da exactamente d.
const aDistancia = (base: number, d: number) => {
  const paso = d / Math.sqrt(128);
  return Array.from({ length: 128 }, () => base + paso);
};
const persona = (id: string, muestras: number[][]) => ({ id, rostroDescriptor: muestras });

describe('identificar de quién es una cara', () => {
  const entrante = desc(0);

  it('con una sola persona lo bastante parecida, la acepta', () => {
    const r = identificarRostro(entrante, [persona('a', [aDistancia(0, 0.30)])]);
    expect(r.tipo).toBe('ACEPTADA');
    if (r.tipo === 'ACEPTADA') expect(r.colaborador.id).toBe('a');
  });

  it('si nadie baja del umbral, no inventa una respuesta', () => {
    const r = identificarRostro(entrante, [persona('a', [aDistancia(0, UMBRAL_COINCIDENCIA + 0.05)])]);
    expect(r.tipo).toBe('SIN_COINCIDENCIA');
  });

  it('sin nadie enrolado tampoco', () => {
    expect(identificarRostro(entrante, []).tipo).toBe('SIN_COINCIDENCIA');
  });

  it('LO QUE ARREGLA ESTO: dos personas demasiado cerca es AMBIGUA, no la primera', () => {
    // Las dos bajan del umbral y las separa menos que el margen. El código
    // anterior devolvía la más cercana sin dudar, y ahí es donde se confunde a
    // una persona con otra.
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.40)]),
      persona('b', [aDistancia(0, 0.42)]),
    ]);
    expect(r.tipo).toBe('AMBIGUA');
  });

  it('si el segundo está lo bastante lejos, sí responde', () => {
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.30)]),
      persona('b', [aDistancia(0, 0.30 + MARGEN_AMBIGUO + 0.02)]),
    ]);
    expect(r.tipo).toBe('ACEPTADA');
    if (r.tipo === 'ACEPTADA') expect(r.colaborador.id).toBe('a');
  });

  it('EL MATIZ QUE IMPORTA: dos muestras de la MISMA persona no son ambigüedad', () => {
    // Cada persona se enrola con varias tomas (frente, perfiles, sin gafas), y
    // esas están cerca entre sí POR DISEÑO. Si el margen se midiera entre
    // muestras en vez de entre personas, enrolar bien haría imposible marcar.
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.30), aDistancia(0, 0.31), aDistancia(0, 0.33)]),
    ]);
    expect(r.tipo).toBe('ACEPTADA');
  });

  it('y con varias personas, cada una cuenta por su MEJOR muestra', () => {
    // `a` tiene una toma mala y una buena; `b` una regular. Gana `a` por su
    // buena, y el margen se mide contra la mejor de `b`.
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.49), aDistancia(0, 0.20)]),
      persona('b', [aDistancia(0, 0.45)]),
    ]);
    expect(r.tipo).toBe('ACEPTADA');
    if (r.tipo === 'ACEPTADA') {
      expect(r.colaborador.id).toBe('a');
      expect(r.distancia).toBeCloseTo(0.20, 2);
    }
  });

  it('el segundo que NO baja del umbral no genera ambigüedad', () => {
    // Alguien a 0,60 no es un candidato: está descartado. Que esté «cerca» del
    // aceptado no significa nada.
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.48)]),
      persona('b', [aDistancia(0, 0.52)]),
    ]);
    expect(r.tipo).toBe('ACEPTADA');
  });

  it('devuelve el margen, para poder medirlo y afinar el número con datos', () => {
    const r = identificarRostro(entrante, [
      persona('a', [aDistancia(0, 0.20)]),
      persona('b', [aDistancia(0, 0.45)]),
    ]);
    if (r.tipo !== 'ACEPTADA') throw new Error('debería aceptar');
    expect(r.margen).toBeCloseTo(0.25, 2);
  });

  it('un descriptor guardado con forma inesperada no revienta ni acepta', () => {
    const r = identificarRostro(entrante, [
      { id: 'a', rostroDescriptor: null },
      { id: 'b', rostroDescriptor: 'basura' },
      { id: 'c', rostroDescriptor: [1, 2, 3] },
    ]);
    expect(r.tipo).toBe('SIN_COINCIDENCIA');
  });
});
