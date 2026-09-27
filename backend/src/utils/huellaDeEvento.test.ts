import { describe, it, expect } from 'vitest';
import { rutaNormalizada, mensajeNormalizado, huellaDeEvento, recortar } from './huellaDeEvento';

// Lo que decide que dos ocurrencias son "el mismo problema" y se cuentan juntas en vez de
// escribir una fila cada vez. Es la pieza que hace viable un registro sin borrado automático:
// un bot que golpea 10.000 veces tiene que dejar UNA fila con veces=10.000, no 10.000 filas.

describe('rutaNormalizada', () => {
  it('quita la consulta', () => {
    expect(rutaNormalizada('/api/reportes/nomina?desde=2026-09-01&hasta=2026-09-15')).toBe('/api/reportes/nomina');
  });

  it('reemplaza el id de un recurso, para que dos colaboradores distintos no sean dos problemas', () => {
    expect(rutaNormalizada('/api/colaboradores/ckv123abc456def789ghi012j')).toBe('/api/colaboradores/:id');
    expect(rutaNormalizada('/api/colaboradores/cm4x8k2p90001abcdefghijkl/horario'))
      .toBe('/api/colaboradores/:id/horario');
  });

  it('reemplaza también los tokens hexadecimales largos del kiosco y los identificadores numéricos', () => {
    expect(rutaNormalizada('/api/worker/marcar/9f2c1e7ab3d4c5e6f7a8b9c0d1e2f3a4b5c6d7e8')).toBe('/api/worker/marcar/:id');
    expect(rutaNormalizada('/api/festivos/2026')).toBe('/api/festivos/:id');
    expect(rutaNormalizada('/api/registros/dia/2026-09-23')).toBe('/api/registros/dia/:id');
  });

  it('NO toca los segmentos que son parte del nombre de la ruta', () => {
    expect(rutaNormalizada('/api/registro-facial/verificar')).toBe('/api/registro-facial/verificar');
    expect(rutaNormalizada('/api/reportes/llegadas-tarde')).toBe('/api/reportes/llegadas-tarde');
    expect(rutaNormalizada('/api/plantillas-turno')).toBe('/api/plantillas-turno');
  });

  it('una ruta vacía o ausente no revienta', () => {
    expect(rutaNormalizada(undefined)).toBe('');
    expect(rutaNormalizada('')).toBe('');
    expect(rutaNormalizada('/')).toBe('/');
  });
});

describe('mensajeNormalizado', () => {
  it('quita el número de línea, que cambia con cada despliegue', () => {
    const a = mensajeNormalizado('Invalid `prisma.permiso.create()` invocation in /srv/app/dist/routes/permisos.js:91:24');
    const b = mensajeNormalizado('Invalid `prisma.permiso.create()` invocation in /srv/app/dist/routes/permisos.js:118:12');
    expect(a).toBe(b);
  });

  it('quita los identificadores que cambian en cada ocurrencia', () => {
    const a = mensajeNormalizado('No existe el colaborador ckv123abc456def789ghi012j');
    const b = mensajeNormalizado('No existe el colaborador cm4x8k2p90001abcdefghijkl');
    expect(a).toBe(b);
  });

  it('deja intacto lo que distingue un problema de otro', () => {
    expect(mensajeNormalizado("Cannot read properties of null (reading 'salario')"))
      .not.toBe(mensajeNormalizado("Cannot read properties of null (reading 'horario')"));
  });

  it('se queda con la primera línea: el resto del rastro varía entre ocurrencias', () => {
    const conRastro = 'Cannot read properties of null\n    at liquidar (/srv/app/dist/utils/liquidar.js:12:5)\n    at async POST';
    expect(mensajeNormalizado(conRastro)).toBe(mensajeNormalizado('Cannot read properties of null'));
  });
});

describe('huellaDeEvento', () => {
  it('el mismo problema en la misma ruta da la misma huella', () => {
    const a = huellaDeEvento('POST', '/api/colaboradores/ckv123abc456def789ghi012j', "Cannot read properties of null (reading 'salario')");
    const b = huellaDeEvento('POST', '/api/colaboradores/cm4x8k2p90001abcdefghijkl', "Cannot read properties of null (reading 'salario')");
    expect(a).toBe(b);
  });

  it('dos problemas distintos en la misma ruta dan huellas distintas', () => {
    const a = huellaDeEvento('POST', '/api/registros', 'Unique constraint failed');
    const b = huellaDeEvento('POST', '/api/registros', "Cannot read properties of null (reading 'salario')");
    expect(a).not.toBe(b);
  });

  it('el mismo problema en rutas distintas da huellas distintas', () => {
    const a = huellaDeEvento('POST', '/api/registros', 'Unique constraint failed');
    const b = huellaDeEvento('POST', '/api/permisos', 'Unique constraint failed');
    expect(a).not.toBe(b);
  });

  it('el método también distingue', () => {
    expect(huellaDeEvento('POST', '/api/registros', 'x')).not.toBe(huellaDeEvento('DELETE', '/api/registros', 'x'));
  });

  it('cabe en la columna: 32 caracteres', () => {
    const h = huellaDeEvento('POST', '/api/registros', 'Unique constraint failed on the fields: (`colaboradorId`,`fecha`)');
    expect(h).toHaveLength(32);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('recortar', () => {
  it('deja intacto lo que cabe', () => {
    expect(recortar('hola', 10)).toBe('hola');
  });

  it('corta lo que no cabe y avisa de que está cortado', () => {
    const largo = 'a'.repeat(100);
    const r = recortar(largo, 20);
    expect(r).toHaveLength(20);
    expect(r.endsWith('…')).toBe(true);
  });

  it('un valor ausente sale como cadena vacía, no como "undefined"', () => {
    expect(recortar(undefined, 10)).toBe('');
    expect(recortar(null, 10)).toBe('');
  });
});
