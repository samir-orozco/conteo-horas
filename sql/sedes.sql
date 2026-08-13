-- Sedes (12 de agosto de 2026) — plan Empresarial
--
-- Hasta ahora la geocerca era UNA sola por empresa, guardada en `Configuracion`
-- (GEO_LAT/LNG/RADIO). Una empresa con tres locales tenía que elegir uno o
-- apagar el GPS. Con sedes, cada local tiene su punto y su radio, y cada
-- colaborador marca en las que tenga asignadas.
--
-- ORDEN: este SQL va ANTES del backend nuevo. Es seguro con el código viejo
-- corriendo: no conoce las tablas y las ignora.
--
-- DESPUÉS de desplegar el backend, correr UNA vez:
--   node dist/scripts/migrar-geocerca-a-sede.js
-- Convierte la geocerca de cada empresa en su "Sede principal" y asigna a todos
-- los colaboradores. Si no se corre, no se rompe nada: sin sedes asignadas el
-- kiosco sigue usando la geocerca de la empresa, igual que siempre.
--
-- Los tres bloques son copia literal del `SHOW CREATE TABLE` que Prisma generó
-- en local.

CREATE TABLE IF NOT EXISTS `sedes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `radio` int NOT NULL DEFAULT '150',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sedes_empresaId_idx` (`empresaId`),
  CONSTRAINT `sedes_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Qué colaborador puede marcar en qué sede. Varias por persona a propósito:
-- quien rota entre locales abre y cierra turno en cualquiera de las suyas.
CREATE TABLE IF NOT EXISTS `colaboradores_sedes` (
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sedeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`colaboradorId`,`sedeId`),
  KEY `colaboradores_sedes_sedeId_idx` (`sedeId`),
  CONSTRAINT `colaboradores_sedes_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`)
    REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `colaboradores_sedes_sedeId_fkey` FOREIGN KEY (`sedeId`)
    REFERENCES `sedes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dónde OCURRIÓ cada marcación. Es distinto de las sedes asignadas al
-- colaborador: el filtro por sede de los reportes tiene que decir dónde marcó de
-- verdad, no dónde debería. Null en todo lo anterior a esta función.
ALTER TABLE `registros`
  ADD COLUMN `sedeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD KEY `registros_sedeId_fkey` (`sedeId`),
  ADD CONSTRAINT `registros_sedeId_fkey` FOREIGN KEY (`sedeId`)
    REFERENCES `sedes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Comprobación:
-- SHOW TABLES LIKE 'sedes';
-- SHOW TABLES LIKE 'colaboradores_sedes';
-- DESCRIBE registros;   -- debe aparecer `sedeId` al final

-- Para revertir:
-- ALTER TABLE `registros` DROP FOREIGN KEY `registros_sedeId_fkey`, DROP COLUMN `sedeId`;
-- DROP TABLE `colaboradores_sedes`;
-- DROP TABLE `sedes`;
