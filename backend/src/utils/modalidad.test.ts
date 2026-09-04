import { describe, it, expect } from 'vitest';
import { normalizarModalidad, decidirUbicacionDeMarca } from './modalidad';

// Quién puede marcar desde dónde. Es la regla que antes era de la EMPRESA (si
// había geocerca, aplicaba a todos por igual) y ahora es de la PERSONA.
//
// La mitad de estas pruebas no son de la funcionalidad nueva: son la regresión
// de PRESENCIAL, que tiene que responder EXACTAMENTE lo mismo que respondía
// antes, con los mismos textos. El bloque de geolocalización de /marcar no tenía
// ni una sola prueba.

// Dos sedes reales de Medellín, a ~2 km una de otra. Las mismas de sedes.test.ts.
const POBLADO = { id: 's1', nombre: 'El Poblado', lat: 6.2087, lng: -75.5674, radio: 150 };
const LAURELES = { id: 's2', nombre: 'Laureles', lat: 6.2447, lng: -75.5916, radio: 150 };
const EN_POBLADO = { lat: 6.2087, lng: -75.5674 };
const EN_LAURELES = { lat: 6.2447, lng: -75.5916 };
// Bogotá: lejos de cualquier sede de Medellín. Es "la casa" de estas pruebas.
const LEJOS = { lat: 4.711, lng: -74.0721 };

const GEOCERCA_EMPRESA = { lat: 6.2087, lng: -75.5674, radio: 150 };

const ctx = (extra: Partial<Parameters<typeof decidirUbicacionDeMarca>[0]>) => ({
  modalidad: 'PRESENCIAL' as const,
  sedes: [],
  geocercaEmpresa: null,
  coords: null,
  ...extra,
});

describe('normalizarModalidad', () => {
  it('acepta las tres', () => {
    expect(normalizarModalidad('PRESENCIAL')).toBe('PRESENCIAL');
    expect(normalizarModalidad('HIBRIDO')).toBe('HIBRIDO');
    expect(normalizarModalidad('REMOTO')).toBe('REMOTO');
  });

  it('vacío o ausente es PRESENCIAL, que es como trabaja todo el mundo hoy', () => {
    expect(normalizarModalidad('')).toBe('PRESENCIAL');
    expect(normalizarModalidad(undefined)).toBe('PRESENCIAL');
    expect(normalizarModalidad(null)).toBe('PRESENCIAL');
  });

  it('lo que no reconoce lo rechaza, no lo adivina', () => {
    // Llega del cuerpo de una petición sin validar. Si esto devolviera
    // PRESENCIAL por defecto, un error de digitación pondría a alguien a
    // marcar con geocerca sin que nadie se entere.
    expect(normalizarModalidad('HIBRIDA')).toBeNull();
    expect(normalizarModalidad('hibrido')).toBeNull();
    expect(normalizarModalidad('remoto ')).toBeNull();
    expect(normalizarModalidad(42)).toBeNull();
    expect(normalizarModalidad({ modalidad: 'REMOTO' })).toBeNull();
  });
});

describe('decidirUbicacionDeMarca · PRESENCIAL (la regresión: tiene que dar lo mismo que antes)', () => {
  describe('con sedes asignadas', () => {
    it('dentro de una de sus sedes: pasa y queda registrada esa sede', () => {
      const d = decidirUbicacionDeMarca(ctx({ sedes: [POBLADO, LAURELES], coords: EN_LAURELES }));
      expect(d).toEqual({ accion: 'PASA', sedeId: 's2' });
    });

    it('sin coordenadas: las exige', () => {
      const d = decidirUbicacionDeMarca(ctx({ sedes: [POBLADO], coords: null }));
      expect(d.accion).toBe('EXIGIR_COORDENADAS');
    });

    it('fuera de todas: rechaza nombrando la más cercana y la distancia', () => {
      const d = decidirUbicacionDeMarca(ctx({ sedes: [POBLADO, LAURELES], coords: LEJOS }));
      expect(d.accion).toBe('RECHAZAR');
      if (d.accion !== 'RECHAZAR') return;
      expect(d.mensaje).toBe(`Estás a ${d.distancia} m de El Poblado. Debes marcar desde una de tus sedes.`);
      expect(d.radio).toBe(150);
      expect(d.distancia).toBeGreaterThan(150);
    });
  });

  describe('sin sedes, con la geocerca única de la empresa', () => {
    it('dentro del radio: pasa, y sin sede porque la geocerca de empresa no identifica ninguna', () => {
      const d = decidirUbicacionDeMarca(ctx({ geocercaEmpresa: GEOCERCA_EMPRESA, coords: EN_POBLADO }));
      expect(d).toEqual({ accion: 'PASA', sedeId: null });
    });

    it('sin coordenadas: las exige', () => {
      const d = decidirUbicacionDeMarca(ctx({ geocercaEmpresa: GEOCERCA_EMPRESA, coords: null }));
      expect(d.accion).toBe('EXIGIR_COORDENADAS');
    });

    it('fuera del radio: rechaza con el mensaje de la empresa, que es otro', () => {
      const d = decidirUbicacionDeMarca(ctx({ geocercaEmpresa: GEOCERCA_EMPRESA, coords: LEJOS }));
      expect(d.accion).toBe('RECHAZAR');
      if (d.accion !== 'RECHAZAR') return;
      expect(d.mensaje).toBe(`Estás fuera de la ubicación de la empresa (a ${d.distancia} m). Debes marcar desde el sitio de trabajo.`);
      expect(d.radio).toBe(150);
    });
  });

  it('sin sedes y sin geocerca: no hay nada que validar', () => {
    const d = decidirUbicacionDeMarca(ctx({ coords: null }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });
});

describe('decidirUbicacionDeMarca · HIBRIDO (nunca bloquea, pero anota dónde estaba)', () => {
  it('dentro de una de sus sedes: pasa y queda registrada', () => {
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'HIBRIDO', sedes: [POBLADO, LAURELES], coords: EN_POBLADO }));
    expect(d).toEqual({ accion: 'PASA', sedeId: 's1' });
  });

  it('fuera de todas sus sedes: marca igual, y el registro no lleva sede', () => {
    // Ese null es el dato: "ese día trabajó desde fuera".
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'HIBRIDO', sedes: [POBLADO, LAURELES], coords: LEJOS }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });

  it('sin coordenadas: pasa igual, NO las exige', () => {
    // Si negó el permiso del navegador no se le puede impedir trabajar. Se
    // pierde el dato de dónde estaba, no la marcación.
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'HIBRIDO', sedes: [POBLADO], coords: null }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });

  it('sin sedes asignadas no hay sede que anotar, aunque dé coordenadas', () => {
    // Empresa que usa la geocerca única en vez de sedes: no hay ninguna sede que
    // nombrar, así que del híbrido no queda rastro de dónde estaba. Es el límite
    // conocido de la funcionalidad en ese tipo de empresa.
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'HIBRIDO', geocercaEmpresa: GEOCERCA_EMPRESA, coords: EN_POBLADO }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });

  it('la geocerca de la empresa tampoco lo bloquea', () => {
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'HIBRIDO', geocercaEmpresa: GEOCERCA_EMPRESA, coords: LEJOS }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });
});

describe('decidirUbicacionDeMarca · REMOTO (no se le mira la ubicación)', () => {
  it('pasa sin coordenadas', () => {
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'REMOTO', coords: null }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });

  it('pasa aunque esté en la otra punta del país', () => {
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'REMOTO', geocercaEmpresa: GEOCERCA_EMPRESA, coords: LEJOS }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });

  it('con sedes asignadas y estando dentro de una, tampoco registra sede', () => {
    // Estado contradictorio pero alcanzable: el script que migró la geocerca a
    // sedes le asignó la sede principal a TODOS los colaboradores. La modalidad
    // manda, y no se le anota una sede a quien no se le está mirando la ubicación.
    const d = decidirUbicacionDeMarca(ctx({ modalidad: 'REMOTO', sedes: [POBLADO], coords: EN_POBLADO }));
    expect(d).toEqual({ accion: 'PASA', sedeId: null });
  });
});
