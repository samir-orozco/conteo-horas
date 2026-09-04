-- Contratos laborales (20 de agosto de 2026)
--
-- Dos tablas nuevas para el módulo de contratos de Colaboradores. No modifica
-- ninguna tabla existente y no toca un solo dato, así que se puede aplicar con
-- el backend viejo corriendo: no conoce estas tablas y las ignora.
-- Como siempre, el SQL va ANTES que el código.
--
-- No hay migración de datos a propósito. Registrar el contrato es opcional: quien
-- no lo cargue no pierde ninguna función, y crearle un contrato inventado a cada
-- colaborador que ya está en el sistema sería peor que dejarlo en blanco.
--
-- El DDL se copió del que genera `prisma db push` en local, comprobado con
-- SHOW CREATE TABLE, para que producción quede idéntica.

CREATE TABLE `contratos` (
  `id` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` ENUM('INDEFINIDO','FIJO','OBRA_LABOR','APRENDIZAJE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fechaInicio` DATETIME(3) NOT NULL,
  `fechaFin` DATETIME(3) NULL,
  `fechaInicioPractica` DATETIME(3) NULL,
  `estado` ENUM('VIGENTE','TERMINADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VIGENTE',
  `convertidoAIndefinidoEn` DATETIME(3) NULL,
  `documento` LONGTEXT COLLATE utf8mb4_unicode_ci NULL,
  `documentoTipo` VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL,
  `documentoNombre` VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL,
  `observacion` TEXT COLLATE utf8mb4_unicode_ci NULL,
  `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `contratos_colaboradorId_estado_idx` (`colaboradorId`,`estado`),
  CONSTRAINT `contratos_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`)
    REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `prorrogas_contrato` (
  `id` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contratoId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `desde` DATETIME(3) NOT NULL,
  `hasta` DATETIME(3) NOT NULL,
  `documento` LONGTEXT COLLATE utf8mb4_unicode_ci NULL,
  `documentoTipo` VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL,
  `documentoNombre` VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL,
  `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `prorrogas_contrato_contratoId_idx` (`contratoId`),
  CONSTRAINT `prorrogas_contrato_contratoId_fkey` FOREIGN KEY (`contratoId`)
    REFERENCES `contratos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comprobación: las dos tablas deben existir y estar vacías.
-- SHOW TABLES LIKE 'contratos';
-- SHOW TABLES LIKE 'prorrogas_contrato';
-- SELECT COUNT(*) FROM contratos;            -> 0
-- SELECT COUNT(*) FROM prorrogas_contrato;   -> 0

-- Para revertir (solo tiene sentido si nadie ha cargado contratos todavía):
-- DROP TABLE `prorrogas_contrato`;
-- DROP TABLE `contratos`;
