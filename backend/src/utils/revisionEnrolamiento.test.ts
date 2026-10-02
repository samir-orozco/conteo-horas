import { describe, it, expect } from 'vitest';
import { tomasCoherentes, parecidosAlRegistrar, MAX_ENTRE_TOMAS, UMBRAL_PARECIDO_AL_REGISTRAR } from './revisionEnrolamiento';

// LO QUE SE REVISA ANTES DE GUARDAR UN ROSTRO (2 de octubre de 2026).
//
// Hasta hoy el servidor solo miraba la forma: 1 a 6 listas de 128 números. Una
// toma con la cara de OTRA persona —alguien al lado, el teléfono pasado de mano—
// quedaba dentro del registro, y como el cotejo usa la mejor muestra, esa otra
// persona pasaba a ser la dueña del registro para siempre.

const desc = (v: number) => Array.from({ length: 128 }, () => v);
// A distancia euclídea `d` de desc(base): 128 dimensiones movidas en d/sqrt(128).
const aDistancia = (base: number, d: number) => {
  const paso = d / Math.sqrt(128);
  return Array.from({ length: 128 }, () => base + paso);
};

describe('las tomas de un registro son de una misma persona', () => {
  it('tomas cercanas entre sí son coherentes', () => {
    const r = tomasCoherentes([desc(0), aDistancia(0, 0.25), aDistancia(0, 0.35)]);
    expect(r.coherentes).toBe(true);
    expect(r.maxima).toBeCloseTo(0.35, 2);
  });

  it('una toma lejos de las demás no lo es', () => {
    const r = tomasCoherentes([desc(0), aDistancia(0, 0.25), aDistancia(0, MAX_ENTRE_TOMAS + 0.05)]);
    expect(r.coherentes).toBe(false);
  });

  // Una milésima por dentro del tope y no el tope exacto: con 128 dimensiones la
  // suma en coma flotante no devuelve 0,6 al último decimal.
  it('al borde del tope todavía es coherente', () => {
    expect(tomasCoherentes([desc(0), aDistancia(0, MAX_ENTRE_TOMAS - 0.001)]).coherentes).toBe(true);
  });

  // CADA TOMA SE MIDE CONTRA LA DE FRENTE, que es la primera del registro guiado
  // (pasosEnrolar.ts). No una contra todas: el giro a un lado y el giro al otro
  // pueden quedar a 0,43 del frente cada uno y a más de 0,6 entre sí, y esa persona
  // es honesta. Quien la rechazaba así no tenía forma de registrarse.
  it('dos giros opuestos, cada uno cerca del frente, son coherentes aunque estén lejos entre sí', () => {
    const giroA = desc(0); giroA[0] += 0.43;
    const giroB = desc(0); giroB[1] += 0.43;
    const r = tomasCoherentes([desc(0), giroA, giroB]);
    expect(r.coherentes).toBe(true);
    expect(r.maxima).toBeCloseTo(0.43, 2);
  });

  it('una toma ajena en el último lugar no es coherente', () => {
    expect(tomasCoherentes([desc(0), aDistancia(0, 0.2), aDistancia(0, MAX_ENTRE_TOMAS + 0.2)]).coherentes).toBe(false);
  });

  it('una toma ajena en el PRIMER lugar tampoco: todas las demás quedan lejos de ella', () => {
    expect(tomasCoherentes([aDistancia(0, MAX_ENTRE_TOMAS + 0.2), desc(0), aDistancia(0, 0.1)]).coherentes).toBe(false);
  });

  it('una sola toma no tiene con qué contradecirse', () => {
    expect(tomasCoherentes([desc(0)])).toEqual({ coherentes: true, maxima: 0 });
  });
});

describe('a quién de la empresa se parece un rostro nuevo', () => {
  const otra = (id: string, nombre: string, muestras: unknown) => ({ id, nombre, rostroDescriptor: muestras });

  it('avisa de quien queda por debajo del umbral, la más parecida primero', () => {
    const r = parecidosAlRegistrar([desc(0)], [
      otra('b', 'Beatriz', [aDistancia(0, 0.40)]),
      otra('c', 'Carmen', [aDistancia(0, 0.30)]),
      otra('d', 'Diana', [aDistancia(0, 0.70)]),
    ], 'a');
    expect(r.map(p => p.id)).toEqual(['c', 'b']);
    expect(r[0].distancia).toBeCloseTo(0.30, 2);
  });

  it('se compara cada toma nueva contra cada muestra guardada y cuenta la mejor', () => {
    // La toma de frente queda lejos de Beatriz, pero el perfil queda cerca.
    const r = parecidosAlRegistrar([desc(0), desc(1)], [otra('b', 'Beatriz', [aDistancia(1, 0.20)])], 'a');
    expect(r).toHaveLength(1);
    expect(r[0].distancia).toBeCloseTo(0.20, 2);
  });

  it('cuenta la mejor de VARIAS muestras guardadas, no solo la primera', () => {
    const r = parecidosAlRegistrar([desc(0), desc(1)], [otra('b', 'Beatriz', [desc(5), aDistancia(1, 0.20)])], 'a');
    expect(r.map(p => p.id)).toEqual(['b']);
    expect(r[0].distancia).toBeCloseTo(0.20, 2);
  });

  it('no se compara consigo misma: volver a registrar a alguien no es un parecido', () => {
    expect(parecidosAlRegistrar([desc(0)], [otra('a', 'Ana', [desc(0)])], 'a')).toEqual([]);
  });

  it('al borde del umbral cuenta, por encima no', () => {
    expect(parecidosAlRegistrar([desc(0)], [otra('b', 'B', [aDistancia(0, UMBRAL_PARECIDO_AL_REGISTRAR - 0.001)])], 'a')).toHaveLength(1);
    expect(parecidosAlRegistrar([desc(0)], [otra('b', 'B', [aDistancia(0, UMBRAL_PARECIDO_AL_REGISTRAR + 0.01)])], 'a')).toEqual([]);
  });

  it('acepta el formato viejo de un solo descriptor y descarta lo que no sirve', () => {
    const r = parecidosAlRegistrar([desc(0)], [
      otra('b', 'Vieja', aDistancia(0, 0.30)),
      otra('c', 'Rota', 'basura'),
      otra('d', 'Vacía', null),
    ], 'a');
    expect(r.map(p => p.id)).toEqual(['b']);
  });
});
