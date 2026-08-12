"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
// El cliente vive aquí y no en `index.ts` porque importar `index.ts` ARRANCA el
// servidor: llama a `start()` al evaluarse. Mientras el cliente estuvo ahí, todo
// lo que lo necesitara arrastraba el arranque completo — los scripts de
// `prisma/` no podían usar un servicio, y `index.ts → utils → index.ts` era un
// ciclo que solo funcionaba porque el cliente se lee dentro de las funciones.
//
// `index.ts` lo reexporta, así que los `import { prisma } from '../index'` que
// ya existen siguen valiendo.
exports.prisma = new client_1.PrismaClient();
