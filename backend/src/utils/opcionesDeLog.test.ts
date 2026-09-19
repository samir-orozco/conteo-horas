import { describe, it, expect } from 'vitest';
import { opcionesDeLog } from './opcionesDeLog';

// A DÓNDE ESCRIBE EL LOG LA APLICACIÓN (19 de septiembre de 2026).
//
// Descubierto mirando el servidor: `horapro-co-api` imprime a stdout con la configuración por
// defecto de Fastify (`logger: true`), y cPanel lo descarta. Su `stderr.log` está congelado en
// julio y en `~/logs/` solo hay registros de acceso de Apache. O sea que desde hace dos meses NO
// queda rastro de nada: ni de los barridos diarios, ni de un solo `app.log.error`.
//
// Eso explica el incidente de agosto mejor de lo que creíamos: el auto-cierre estuvo dos semanas
// roto y, aunque hubiera gritado, nadie lo habría oído.
//
// El panel de Node de cPanel no ofrece campo de log (comprobado con el dueño), así que el destino
// se configura aquí, y solo cuando existe la variable de entorno: en desarrollo se sigue
// imprimiendo a consola, que es lo cómodo, y en producción se escribe al archivo.
//
// El registro de CADA petición se apaga solo cuando hay archivo. Con él, el archivo crece unos
// 75 MB al mes y pide rotación; sin él son unas veinte líneas al día. En consola se conserva,
// porque ahí sí sirve para depurar y no cuesta disco.

describe('opcionesDeLog', () => {
  it('sin variable de entorno se comporta como hoy: consola y peticiones incluidas', () => {
    const o = opcionesDeLog(undefined);
    expect(o.logger).toBe(true);
    expect(o.logController).toBeUndefined();
  });

  it('con archivo, escribe a ese archivo', () => {
    const o = opcionesDeLog('/home/ewyfwxbg/logs/horapro-api.log');
    expect(o.logger).not.toBe(true);
    const t = (o.logger as { transport: { target: string; options: { destination: string; mkdir: boolean } } }).transport;
    expect(t.target).toBe('pino/file');
    expect(t.options.destination).toBe('/home/ewyfwxbg/logs/horapro-api.log');
    // La carpeta puede no existir la primera vez: sin esto, el arranque revienta.
    expect(t.options.mkdir).toBe(true);
  });

  it('con archivo, apaga el registro de cada petición', () => {
    const o = opcionesDeLog('/tmp/api.log');
    expect(o.logController).toBeDefined();
    expect(o.logController!.disableRequestLogging).toBe(true);
  });

  // Una variable declarada pero vacía es un caso real: alguien la deja puesta sin valor en el panel
  // de cPanel. Sin esta guarda, el destino sería la cadena vacía y el arranque fallaría.
  it('una variable vacía o en blanco vale lo mismo que no tenerla', () => {
    expect(opcionesDeLog('').logger).toBe(true);
    expect(opcionesDeLog('   ').logger).toBe(true);
    expect(opcionesDeLog('   ').logController).toBeUndefined();
  });

  it('le quita los espacios sobrantes a la ruta', () => {
    const o = opcionesDeLog('  /tmp/api.log  ');
    const t = (o.logger as { transport: { options: { destination: string } } }).transport;
    expect(t.options.destination).toBe('/tmp/api.log');
  });
});
