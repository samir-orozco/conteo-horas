-- Registro del sistema: errores, intentos de acceso y auditoría de acciones.
-- 23 de septiembre de 2026.
--
-- Se corre EN phpMyAdmin, dentro de la base, antes de desplegar el backend.
-- Es puramente aditivo: crea una tabla nueva y no toca ninguna existente, así que no bloquea el
-- kiosco ni copia tablas con datos (a diferencia de un ALTER sobre `registros`).
--
-- Los índices van en el propio CREATE y no en un ALTER posterior a propósito: la tabla nace vacía,
-- que es cuando ponerlos sale gratis. Esperar a tener el problema es esperar a que la cura también
-- duela (CLAUDE.md §8.4).
--
-- `huella` es UNIQUE y admite NULL: MySQL permite tantos NULL como haga falta en un índice único.
-- Los errores y los accesos llevan huella y se agrupan por ella (una fila con un contador); las
-- acciones auditadas la llevan en NULL y cada una es una fila suya.

CREATE TABLE `eventos_sistema` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ERROR', 'ACCESO', 'AUDITORIA') NOT NULL,
    `origen` ENUM('SERVIDOR', 'NAVEGADOR') NOT NULL DEFAULT 'SERVIDOR',
    `huella` VARCHAR(32) NULL,
    `veces` INTEGER NOT NULL DEFAULT 1,
    `primeraVez` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimaVez` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metodo` VARCHAR(10) NULL,
    `ruta` VARCHAR(255) NULL,
    `estado` INTEGER NULL,
    `mensaje` VARCHAR(500) NOT NULL,
    `detalle` TEXT NULL,
    `ip` VARCHAR(64) NULL,
    `navegador` VARCHAR(255) NULL,
    `usuarioId` VARCHAR(40) NULL,
    `usuarioEmail` VARCHAR(255) NULL,
    `usuarioNombre` VARCHAR(255) NULL,
    `empresaId` VARCHAR(40) NULL,
    `empresaNombre` VARCHAR(255) NULL,

    UNIQUE INDEX `eventos_sistema_huella_key`(`huella`),
    INDEX `eventos_sistema_tipo_ultimaVez_idx`(`tipo`, `ultimaVez`),
    INDEX `eventos_sistema_ultimaVez_idx`(`ultimaVez`),
    INDEX `eventos_sistema_empresaId_ultimaVez_idx`(`empresaId`, `ultimaVez`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
