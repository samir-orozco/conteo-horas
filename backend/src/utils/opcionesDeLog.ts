import { LogController } from 'fastify';

// A dónde escribe el log la aplicación (19 de septiembre de 2026).
//
// Descubierto mirando el servidor: `horapro-co-api` imprime a stdout con la configuración por
// defecto de Fastify (`logger: true`), y cPanel lo descarta. Su `stderr.log` llevaba congelado
// desde julio, y en `~/logs/` solo hay registros de acceso de Apache, uno por dominio. O sea que
// durante dos meses no quedó rastro de nada: ni de los barridos diarios, ni de un solo
// `app.log.error`.
//
// Eso explica el incidente de agosto mejor de lo que creíamos. El auto-cierre estuvo dos semanas
// sin cerrar turnos (CLAUDE.md, sección 8.3) y hasta ahora se atribuía a que el trabajo callaba
// cuando no hacía nada. Pero aunque hubiera hablado, nadie lo habría oído.
//
// El panel de Node de cPanel no ofrece campo de archivo de log (comprobado con el dueño el 19 de
// septiembre), así que el destino se configura aquí y se activa SOLO con la variable de entorno:
// en desarrollo se sigue imprimiendo a consola, que es lo cómodo, y en producción se escribe al
// archivo.

type TransporteAArchivo = {
  transport: { target: 'pino/file'; options: { destination: string; mkdir: boolean } };
};

export type OpcionesDeLog = {
  logger: true | TransporteAArchivo;
  logController?: LogController;
};

export function opcionesDeLog(archivo: string | undefined): OpcionesDeLog {
  // Una variable declarada pero vacía es un caso real: alguien la deja puesta sin valor en el panel
  // de cPanel. Sin esta guarda el destino sería la cadena vacía y el arranque fallaría.
  const ruta = archivo?.trim();
  if (!ruta) return { logger: true };

  return {
    // `pino/file` lo resuelve pino por su cuenta, así que no hace falta importarlo ni añadir
    // dependencia: pino ya viene con Fastify. Escribe en asíncrono, sin frenar las peticiones.
    // `mkdir` porque la carpeta puede no existir la primera vez.
    logger: { transport: { target: 'pino/file', options: { destination: ruta, mkdir: true } } },

    // Con archivo se apaga el registro de CADA petición. Con él, el archivo crece unos 75 MB al
    // mes y pide rotación; sin él son unas veinte líneas al día. Los errores se siguen
    // registrando, que es lo que de verdad hace falta.
    //
    // Va por `logController` y no por la opción `disableRequestLogging` suelta, que Fastify 5
    // marca como deprecada y elimina en la 6. Es la misma opción por el camino que sobrevive.
    logController: new LogController({ disableRequestLogging: true }),
  };
}
