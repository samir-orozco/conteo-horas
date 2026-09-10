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
-- POR QUÉ LA TABLA `registros` VA EN TRES SENTENCIAS, CON EL ALGORITMO ESCRITO.
-- La primera versión era un solo ALTER con columna, índice y llave foránea. En
-- MariaDB eso COPIA `registros` entera, fotos incluidas, y bloquea las
-- escrituras mientras dura: el kiosco no puede marcar. Medido, no supuesto, en un
-- MariaDB 12.3.2 desechable con el esquema de local y filas de relleno:
--
--   un solo ALTER, como estaba          copia la tabla: «5 rows affected» y le
--                                       cambia el TABLE_ID
--   ese mismo pidiendo LOCK=NONE        lo rechaza: «Reason: ON UPDATE CASCADE»
--   un solo ALTER, INPLACE, sin checks  no bloquea, pero igual reconstruye la tabla
--   las tres sentencias del PASO 2      ni copia ni reconstruye: mismo TABLE_ID
--
-- El resultado del PASO 1 y el PASO 2 quedó idéntico, en SHOW CREATE TABLE, al de
-- `prisma db push`.
--
-- Producción corre MariaDB 11.4, no la 12.3 donde se midió. Por eso cada ALTER
-- lleva ALGORITHM y LOCK escritos: si esa versión no pudiera hacerlo en línea, el
-- ALTER falla al instante sin tocar nada, en vez de copiar la tabla en silencio.
-- Si sale un error 1845 o 1846, NO se le quita el ALGORITHM para que pase: se
-- para y se avisa.
--
-- IF NOT EXISTS en todo: si una sentencia falla a la mitad (por ejemplo por el
-- lock_wait_timeout), el paso entero se puede volver a correr y salta lo que ya
-- quedó hecho. Probado corriéndolo dos veces seguidas.
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
-- seguir con el siguiente. Y lo que hay DENTRO de un paso va en un solo envío,
-- SET incluidos: cada envío es una conexión nueva y un SET no llega al siguiente.

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
-- Una columna con valor por defecto: instantánea, no reescribe ninguna fila.
--
-- lock_wait_timeout: si en 10 segundos no consigue la tabla, porque hay una
-- consulta larga encima, falla en vez de quedarse esperando con las marcaciones
-- haciendo fila detrás. Se vuelve a intentar en un momento más tranquilo.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `colaboradores`
  ADD COLUMN IF NOT EXISTS `puedeCerrarEnOtraSede` tinyint(1) NOT NULL DEFAULT '0',
  ALGORITHM=INSTANT;

-- ============================ PASO 2: registros ==============================
-- TODO en un solo envío, los SET incluidos.
--
-- Columna, índice y llave foránea, calcadas de las de `sedeId` que ya existen.
-- ON DELETE SET NULL: si alguien borra una sede, los turnos no se borran; pierden
-- el dato de dónde se cerraron, igual que ya pasa con dónde se abrieron.
--
-- La llave se agrega con foreign_key_checks en 0 porque es la única forma en que
-- MariaDB la crea sin copiar la tabla. Lo que se salta es revisar las filas que
-- YA existen, y en ese momento todas tienen la columna en NULL, que no apunta a
-- ninguna sede. Las filas que se escriban después sí se revisan: se comprobó que
-- una sede inexistente se rechaza.
--
-- Al agregar la llave sale una nota «Duplicate key name». Es esperada: la llave
-- reutiliza el índice de la sentencia anterior, que se llama igual.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `registros`
  ADD COLUMN IF NOT EXISTS `sedeSalidaId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;
ALTER TABLE `registros`
  ADD KEY IF NOT EXISTS `registros_sedeSalidaId_fkey` (`sedeSalidaId`),
  ALGORITHM=NOCOPY, LOCK=NONE;
SET SESSION foreign_key_checks = 0;
ALTER TABLE `registros`
  ADD CONSTRAINT `registros_sedeSalidaId_fkey` FOREIGN KEY IF NOT EXISTS (`sedeSalidaId`) REFERENCES `sedes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ALGORITHM=NOCOPY, LOCK=NONE;
SET SESSION foreign_key_checks = 1;

-- ============================ PASO 3: comprobar ==============================

SELECT puedeCerrarEnOtraSede, COUNT(*) AS colaboradores
FROM `colaboradores` GROUP BY puedeCerrarEnOtraSede;
-- Todos en 0.

SELECT COUNT(*) AS con_sede_de_salida FROM `registros` WHERE sedeSalidaId IS NOT NULL;
-- 0: el código viejo no la escribe.

SHOW INDEX FROM `registros` WHERE Key_name = 'registros_sedeSalidaId_fkey';
-- Una fila.

SELECT CONSTRAINT_NAME, DELETE_RULE, UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'registros_sedeSalidaId_fkey';
-- Una fila, con SET NULL y CASCADE. La llave va en su propia sentencia, así que
-- se comprueba aparte: que exista el índice no dice que exista la llave.

-- ============================ Para deshacer ==================================
-- NO es lo primero que se hace. El código nuevo lee estas dos columnas en cada
-- login y en cada marcación: borrarlas con él todavía arriba tumba el kiosco,
-- igual que desplegar al revés. El orden es el inverso del despliegue:
--
--   1. frontend-build de vuelta a master.
--   2. backend-build de vuelta a master.
--   3. prisma-build de vuelta a master y, ANTES del restart, en el servidor:
--        grep -c "puedeCerrarEnOtraSede" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Tiene que dar 0. Si da otra cosa, el cliente sigue siendo el nuevo: parar.
--   4. Recién entonces esto, en un solo envío:
--
-- SET SESSION lock_wait_timeout = 10;
-- ALTER TABLE `registros` DROP FOREIGN KEY IF EXISTS `registros_sedeSalidaId_fkey`, ALGORITHM=NOCOPY, LOCK=NONE;
-- ALTER TABLE `registros` DROP KEY IF EXISTS `registros_sedeSalidaId_fkey`, ALGORITHM=NOCOPY, LOCK=NONE;
-- ALTER TABLE `registros` DROP COLUMN IF EXISTS `sedeSalidaId`, ALGORITHM=INSTANT;
-- ALTER TABLE `colaboradores` DROP COLUMN IF EXISTS `puedeCerrarEnOtraSede`, ALGORITHM=INSTANT;
--
-- Probado igual que la ida: deja las dos tablas idénticas a como estaban, sin
-- reconstruir ninguna, y se puede correr dos veces.
