"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opcionesDeLog = opcionesDeLog;
const fastify_1 = require("fastify");
function opcionesDeLog(archivo) {
    // Una variable declarada pero vacía es un caso real: alguien la deja puesta sin valor en el panel
    // de cPanel. Sin esta guarda el destino sería la cadena vacía y el arranque fallaría.
    const ruta = archivo?.trim();
    if (!ruta)
        return { logger: true };
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
        logController: new fastify_1.LogController({ disableRequestLogging: true }),
    };
}
