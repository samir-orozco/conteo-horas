import { describe, it, expect } from 'vitest';
import { precioDeLaSuscripcion, PRECIO_GLOBAL } from './precioDelCliente';

// Lo que el formulario de «Precio del cliente» lee de la suscripción que trae
// GET /admin/empresas/:id. Es la misma lectura en la lista de empresas y en la
// ficha, y por eso vive en un solo sitio: el 4 de octubre de 2026 el formulario
// pasó a estar en los dos lados y una segunda copia se habría separado sola.

describe('precioDeLaSuscripcion', () => {
  it('una empresa sin suscripción usa el precio global', () => {
    expect(precioDeLaSuscripcion(null)).toEqual(PRECIO_GLOBAL);
    expect(precioDeLaSuscripcion(undefined)).toEqual(PRECIO_GLOBAL);
  });

  it('precioModo en null es el precio global de la plataforma', () => {
    expect(precioDeLaSuscripcion({ precioModo: null })).toEqual(PRECIO_GLOBAL);
  });

  it('un precio fijo se lee con su valor', () => {
    expect(precioDeLaSuscripcion({ precioModo: 'FIJO', precioFijo: 250000 })).toEqual({
      modo: 'FIJO', precioFijo: 250000, precioTramo1: 0, limiteTramo1: 0, precioTramo2: 0,
    });
  });

  it('una tarifa por tramos se lee con los tres valores', () => {
    expect(precioDeLaSuscripcion({
      precioModo: 'TRAMOS', precioTramo1: 9000, limiteTramo1: 20, precioTramo2: 1500,
    })).toEqual({ modo: 'TRAMOS', precioFijo: 0, precioTramo1: 9000, limiteTramo1: 20, precioTramo2: 1500 });
  });

  // Los campos que no son de ese modo vienen en null desde el servidor, y un
  // null en un input numérico lo deja en NaN y sin poder escribir.
  it('los campos que no aplican se leen como cero, nunca como null', () => {
    const leido = precioDeLaSuscripcion({ precioModo: 'FIJO', precioFijo: 250000, precioTramo1: null, limiteTramo1: null, precioTramo2: null });
    expect(leido.precioTramo1).toBe(0);
    expect(leido.limiteTramo1).toBe(0);
    expect(leido.precioTramo2).toBe(0);
  });
});
