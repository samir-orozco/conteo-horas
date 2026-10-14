-- FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2). Una tabla nueva, vacía al crearla:
-- las funciones que una empresa tiene POR UN TIEMPO por encima de su plan (lo que da el super admin y, en la
-- fase 3, la prueba gratis del clima).
--
-- No toca ninguna tabla existente ni ninguna fila. La llave hacia `empresas` va DENTRO del CREATE, como en
-- sql/resenas.sql, y no en un ALTER aparte: así es un solo paso sobre una tabla que nace vacía.
--
-- SALIÓ DE `prisma migrate diff` contra el esquema de HEAD: mismas columnas, tipos, índice y llave (ON DELETE
-- CASCADE ON UPDATE CASCADE). Lo único cambiado es la forma: la llave dentro del CREATE en vez del ALTER, el
-- IF NOT EXISTS y la guarda de espera.
--
-- `SET STATEMENT ... FOR` y no un SET suelto: en phpMyAdmin un SET no llegó a la sentencia siguiente (#1846).
-- Acota a 10 s la espera del candado de metadatos sobre `empresas`, que la llave necesita.
-- ESTA FORMA ES DE MARIADB. No se corre contra la base local de desarrollo, que es MySQL.
--
-- ORDEN DEL DESPLIEGUE (CLAUDE.md §11). Toca schema.prisma: CUATRO ramas, en este orden:
--   1. Este SQL.
--   2. prisma-build, con su comprobación ANTES del restart:
--        grep -c "otorgadaPorNombre" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--   3. backend-build.
--   4. frontend-build.
-- Al revés es destructivo: el cliente nuevo pide `concesiones` en CADA cálculo de funciones de cada empresa,
-- o sea en casi toda la aplicación, y sin la tabla son 500 en todas partes.

-- ============================ PASO 0: mirar antes (solo lectura) =============
-- SELECT COUNT(*) FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'concesiones_funcion';
-- Tiene que dar 0. Si da 1, este SQL ya se corrió: parar.

-- ============================ PASO 1: la tabla ===============================

SET STATEMENT lock_wait_timeout=10 FOR CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`concesiones_funcion` ( `id` VARCHAR(191) NOT NULL, `empresaId` VARCHAR(191) NOT NULL, `funcion` VARCHAR(191) NOT NULL, `desde` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `hasta` DATETIME(3) NOT NULL, `origen` VARCHAR(191) NOT NULL, `otorgadaPorId` VARCHAR(191) NULL, `otorgadaPorNombre` VARCHAR(191) NULL, `revocadaEn` DATETIME(3) NULL, `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `actualizadoEn` DATETIME(3) NOT NULL, INDEX `concesiones_funcion_empresaId_funcion_idx`(`empresaId`, `funcion`), PRIMARY KEY (`id`), CONSTRAINT `concesiones_funcion_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================ PASO 2: comprobar ==============================
-- Once columnas:
-- SELECT COUNT(*) FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'concesiones_funcion';
-- La llave, con CASCADE en los dos:
-- SELECT CONSTRAINT_NAME, DELETE_RULE, UPDATE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
--  WHERE CONSTRAINT_SCHEMA = 'ewyfwxbg_horapro' AND CONSTRAINT_NAME = 'concesiones_funcion_empresaId_fkey';

-- ============================ PARA DESHACER ==================================
-- NO es lo primero: el backend nuevo lee esta tabla en cada cálculo de funciones. Primero frontend, backend y
-- prisma-build de vuelta (con el grep de arriba en 0 ANTES del restart), y recién entonces:
-- SET STATEMENT lock_wait_timeout=10 FOR DROP TABLE IF EXISTS `ewyfwxbg_horapro`.`concesiones_funcion`;
