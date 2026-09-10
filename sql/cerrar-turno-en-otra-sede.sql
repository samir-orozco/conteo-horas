-- Cerrar el turno en otra sede, y guardar dónde se cerró (septiembre de 2026)
--
-- Dos columnas, las dos seguras con el código viejo corriendo:
--
--   colaboradores.puedeCerrarEnOtraSede   booleano, NOT NULL DEFAULT 0
--       Permiso por persona. 0 es la regla de siempre, así que todos los que ya
--       existen quedan exactamente como están.
--
--   registros.sedeSalidaId   texto, NULL
--       Dónde se cerró el turno. Lo viejo queda en NULL, que significa NO SE
--       SABE, nunca "cerró en otra sede".
--
-- El DDL no está escrito a mano: sale de correr `prisma db push` en local y
-- comparar el `SHOW CREATE TABLE` de antes y de después. La diferencia fueron
-- exactamente estas líneas y ninguna otra.
--
-- VALIDADO EN LOCAL (MySQL 9.7.1), no solo escrito. El "deshacer" de abajo dejó
-- las dos tablas idénticas byte a byte a como estaban antes del cambio, y correr
-- este archivo dejó `colaboradores` idéntica a lo que deja `prisma db push`.
--
-- En `registros`, `SHOW CREATE TABLE` escribe la columna nueva como
--   varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
-- y no como
--   varchar(191) COLLATE utf8mb4_unicode_ci
-- Es solo cómo la escribe MySQL, y NO es una diferencia: medido en
-- information_schema, el tipo, el juego de caracteres, la intercalación, la
-- nulabilidad y el valor por defecto son los mismos de `sedeId`. Y la llave
-- foránea hacia `sedes.id` se creó, cosa que MySQL no permite si las
-- intercalaciones no casan. Si al comprobarlo en producción se ve esa línea
-- distinta, es esto.
--
-- ORDEN DEL DESPLIEGUE (CLAUDE.md, sección 11). Toca schema.prisma, así que son
-- CUATRO ramas, y en este orden:
--   1. Este SQL.
--   2. prisma-build, con su comprobación ANTES del restart.
--   3. backend-build.
--   4. frontend-build.
-- Al revés es destructivo: un cliente de Prisma nuevo contra una tabla sin estas
-- columnas son 500 en cada login y en cada marcación, o sea el kiosco caído.
--
-- Cada paso va en su propio envío de phpMyAdmin, y se mira el resultado antes de
-- seguir con el siguiente.

-- ============================ PASO 0: mirar antes ============================
-- Solo lectura. Las dos columnas NO tienen que existir todavía.

SELECT VERSION() AS version;
SELECT COUNT(*) AS colaboradores FROM `colaboradores`;
SELECT COUNT(*) AS registros FROM `registros`;
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'colaboradores' AND COLUMN_NAME = 'puedeCerrarEnOtraSede')
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME = 'sedeSalidaId'));
-- Tiene que devolver CERO filas. Si devuelve alguna, este SQL ya se corrió: parar.

-- ============================ PASO 1: colaboradores ==========================

ALTER TABLE `colaboradores`
  ADD COLUMN `puedeCerrarEnOtraSede` tinyint(1) NOT NULL DEFAULT '0';

-- ============================ PASO 2: registros ==============================
-- Columna, índice y llave foránea, calcadas de las de `sedeId` que ya existen.
-- ON DELETE SET NULL: si alguien borra una sede, los turnos no se borran; pierden
-- el dato de dónde se cerraron, igual que ya pasa con dónde se abrieron.

ALTER TABLE `registros`
  ADD COLUMN `sedeSalidaId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD KEY `registros_sedeSalidaId_fkey` (`sedeSalidaId`),
  ADD CONSTRAINT `registros_sedeSalidaId_fkey` FOREIGN KEY (`sedeSalidaId`) REFERENCES `sedes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================ PASO 3: comprobar ==============================

SELECT puedeCerrarEnOtraSede, COUNT(*) AS colaboradores
FROM `colaboradores` GROUP BY puedeCerrarEnOtraSede;
-- Todos en 0.

SELECT COUNT(*) AS con_sede_de_salida FROM `registros` WHERE sedeSalidaId IS NOT NULL;
-- 0: el código viejo no la escribe.

SHOW INDEX FROM `registros` WHERE Key_name = 'registros_sedeSalidaId_fkey';
-- Una fila.

-- ============================ Para deshacer ==================================
-- En este orden: primero la llave, después el índice y la columna.
--
-- ALTER TABLE `registros` DROP FOREIGN KEY `registros_sedeSalidaId_fkey`;
-- ALTER TABLE `registros` DROP KEY `registros_sedeSalidaId_fkey`, DROP COLUMN `sedeSalidaId`;
-- ALTER TABLE `colaboradores` DROP COLUMN `puedeCerrarEnOtraSede`;
