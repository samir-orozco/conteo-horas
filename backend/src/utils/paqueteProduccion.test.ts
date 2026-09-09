import { describe, it, expect } from 'vitest';
// @ts-expect-error el script de compilación es .mjs y no tiene tipos: no forma
// parte del código de la aplicación, solo se ejecuta al armar el artefacto.
import { paqueteDeProduccion } from '../../scripts/generar-paquete-produccion.mjs';
import paqueteReal from '../../package.json';

// Qué se le manda al servidor y qué NO.
//
// El 4 de septiembre de 2026 el `npm install` del servidor reventó con
// `Cannot read properties of null (reading 'edgesOut')`, y el log señalaba a las
// dependencias peer de vitest. `--omit=dev` no sirve: npm construye el árbol
// ideal completo desde el package.json y solo después omite las de desarrollo.
// La salida es no darle devDependencies que resolver.
//
// LO QUE ESTA PRUEBA NO GARANTIZA, y conviene decirlo: que el error del servidor
// desaparezca. No se pudo reproducir en esta máquina, ni con el package.json
// completo ni sin él, así que la única prueba de que la cura funciona es correr
// el install allá. Lo que sí garantiza es que al servidor no le llega nada de
// desarrollo, que es la causa que señalaba el log.

const base = {
  name: 'backend',
  version: '1.0.0',
  main: 'index.js',
  scripts: { start: 'node dist/index.js', dev: 'nodemon', test: 'vitest run' },
  dependencies: { fastify: '^5.8.5' },
  devDependencies: { vitest: '^4.1.11', typescript: '^6.0.3' },
};

describe('el package.json que se le manda al servidor', () => {
  it('no lleva devDependencies, que es el motivo entero de este archivo', () => {
    expect(paqueteDeProduccion(base)).not.toHaveProperty('devDependencies');
  });

  it('conserva las dependencias de producción tal cual', () => {
    expect(paqueteDeProduccion(base).dependencies).toEqual({ fastify: '^5.8.5' });
  });

  it('deja solo el script start', () => {
    // Los demás (dev, test, build, prisma:*) necesitan devDependencies que ya no
    // van a estar. Dejarlos escritos sería ofrecer comandos que fallan.
    expect(paqueteDeProduccion(base).scripts).toEqual({ start: 'node dist/index.js' });
  });

  it('revienta si no hay script start, en vez de generar un paquete que no arranca', () => {
    const { scripts, ...sinScripts } = base;
    expect(() => paqueteDeProduccion(sinScripts)).toThrow(/start/);
    expect(() => paqueteDeProduccion({ ...base, scripts: { dev: 'nodemon' } })).toThrow(/start/);
  });

  it('revienta si no hay dependencies, que significaría dejar al servidor sin fastify', () => {
    const { dependencies, ...sinDeps } = base;
    expect(() => paqueteDeProduccion(sinDeps)).toThrow(/dependencies/);
    expect(() => paqueteDeProduccion({ ...base, dependencies: {} })).toThrow(/dependencies/);
  });

  it('sobre el package.json de verdad: excluye vitest y conserva fastify y prisma', () => {
    // Un fixture inventado prueba la función; esta prueba comprueba que la
    // función sirve para el archivo real, que es lo que se va a desplegar.
    const salida = paqueteDeProduccion(paqueteReal);
    expect(salida.dependencies).toHaveProperty('fastify');
    expect(salida.dependencies).toHaveProperty('@prisma/client');
    expect(JSON.stringify(salida)).not.toContain('vitest');
    expect(JSON.stringify(salida)).not.toContain('nodemon');
    expect(JSON.stringify(salida)).not.toContain('typescript');
  });
});
