// El precio personalizado de un cliente, tal como lo edita el super admin.
//
// Vive aquí y no dentro de una pantalla porque el mismo formulario se usa en
// dos sitios desde el 4 de octubre de 2026: el menú de la lista de empresas y
// la ficha de la empresa. Dos copias del mismo formulario se separan solas, que
// es justo lo que dice la §9.3 del CLAUDE.md.

export type FormPrecio = {
  // GLOBAL = el de la plataforma · FIJO = un valor mensual · TRAMOS = tarifa
  // propia por colaborador. Son los tres modos que acepta
  // PUT /admin/empresas/:id/precio.
  modo: string;
  precioFijo: number;
  precioTramo1: number;
  limiteTramo1: number;
  precioTramo2: number;
};

export const PRECIO_GLOBAL: FormPrecio = {
  modo: 'GLOBAL', precioFijo: 0, precioTramo1: 0, limiteTramo1: 0, precioTramo2: 0,
};

// Lo que hace falta de la suscripción para prellenar el formulario. Los campos
// que no son del modo guardado llegan en null desde el servidor.
export type PrecioGuardado = {
  precioModo?: string | null;
  precioFijo?: number | null;
  precioTramo1?: number | null;
  limiteTramo1?: number | null;
  precioTramo2?: number | null;
};

// Un null se lee como cero y no se deja pasar: un input numérico con null
// dentro queda en NaN y no deja escribir.
const numero = (v: number | null | undefined) => v ?? 0;

export function precioDeLaSuscripcion(s: PrecioGuardado | null | undefined): FormPrecio {
  // Se devuelve una copia y no la constante: quien la reciba la va a meter en
  // un useState y la siguiente pantalla no tiene por qué heredar lo que otra
  // escribió encima.
  if (!s?.precioModo) return { ...PRECIO_GLOBAL };
  return {
    modo: s.precioModo,
    precioFijo: numero(s.precioFijo),
    precioTramo1: numero(s.precioTramo1),
    limiteTramo1: numero(s.limiteTramo1),
    precioTramo2: numero(s.precioTramo2),
  };
}
