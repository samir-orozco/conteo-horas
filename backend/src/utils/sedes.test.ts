import { describe, it, expect } from 'vitest';
import { resolverSedeDeMarcacion } from './sedes';

// ¿Desde qué sede está marcando? De esto dependen dos cosas: si la marcación se
// acepta, y qué sede queda guardada en el registro para el filtro de reportes.
//
// La regla del dueño: "si marca en otro lado no se registra". Y como un mismo
// trabajador puede rotar entre locales, basta con estar dentro de CUALQUIERA de
// las suyas.

// Dos sedes reales de Medellín, a ~2 km una de otra.
const POBLADO = { id: 's1', nombre: 'El Poblado', lat: 6.2087, lng: -75.5674, radio: 150 };
const LAURELES = { id: 's2', nombre: 'Laureles', lat: 6.2447, lng: -75.5916, radio: 150 };

describe('resolverSedeDeMarcacion', () => {
  it('dentro de su sede: acepta y dice cuál es', () => {
    const r = resolverSedeDeMarcacion([POBLADO, LAURELES], 6.2087, -75.5674);
    expect(r.dentro).toBe(true);
    expect(r.sede?.nombre).toBe('El Poblado');
    expect(r.distancia).toBe(0);
  });

  it('quien rota entre locales puede marcar en la otra', () => {
    const r = resolverSedeDeMarcacion([POBLADO, LAURELES], 6.2447, -75.5916);
    expect(r.dentro).toBe(true);
    expect(r.sede?.nombre).toBe('Laureles');
  });

  it('fuera de todas: rechaza e informa la más cercana y a cuánto', () => {
    // Un punto lejos de ambas.
    const r = resolverSedeDeMarcacion([POBLADO, LAURELES], 6.3000, -75.5000);
    expect(r.dentro).toBe(false);
    expect(r.sede).not.toBeNull();          // la más cercana, para el mensaje
    expect(r.distancia).toBeGreaterThan(150);
  });

  it('justo en el borde del radio se acepta', () => {
    // ~0.00134° de latitud ≈ 149 m.
    const r = resolverSedeDeMarcacion([POBLADO], 6.2087 + 0.00134, -75.5674);
    expect(r.distancia).toBeLessThanOrEqual(150);
    expect(r.dentro).toBe(true);
  });

  it('elige la sede MÁS CERCANA cuando dos se solapan', () => {
    // Dos sedes con radios grandes que se pisan; debe ganar la de menos distancia.
    const a = { ...POBLADO, radio: 5000 };
    const b = { ...LAURELES, radio: 5000 };
    const r = resolverSedeDeMarcacion([a, b], 6.2100, -75.5680);
    expect(r.dentro).toBe(true);
    expect(r.sede?.nombre).toBe('El Poblado');
  });

  it('sin sedes con coordenadas no hay nada que validar', () => {
    const r = resolverSedeDeMarcacion([], 6.2087, -75.5674);
    expect(r.dentro).toBe(true);
    expect(r.sede).toBeNull();
  });

  it('cada sede respeta SU radio, no uno global', () => {
    const amplia = { ...POBLADO, radio: 1000 };
    // A ~400 m: fuera del radio de 150 pero dentro del de 1000.
    const lat = 6.2087 + 0.0036;
    expect(resolverSedeDeMarcacion([POBLADO], lat, -75.5674).dentro).toBe(false);
    expect(resolverSedeDeMarcacion([amplia], lat, -75.5674).dentro).toBe(true);
  });
});
