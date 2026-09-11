-- Descanso no remunerado (septiembre de 2026)
--
-- Una segunda pausa en el horario, además del almuerzo: se marca en el kiosco al
-- salir y al volver, y no se paga. Seis columnas, todas seguras con el código
-- viejo corriendo, porque el código viejo no las lee:
--
--   horarios.fotoEnDescanso   booleano, NOT NULL DEFAULT 1
--       Si se guarda la foto al marcar el descanso. 1 es lo de siempre: toda
--       marcación guarda su foto.
--
--   franjas_horario.descansoInicio / descansoFin   texto "HH:MM", NULL
--       La ventana del descanso en cada franja. NULL = sin descanso, que es como
--       quedan todos los horarios que ya existen.
--
--   dias_esperados.descansoInicio / descansoFin   texto "HH:MM", NULL
--       La ventana congelada en cada día, igual que la del almuerzo. Los días
--       que ya existen quedan en NULL: nadie tiene descanso hasta que el
--       administrador lo configura y guarda el horario, y eso regenera los días
--       desde hoy. El pasado no se toca.
--
--   registros.salidaDescanso   booleano, NOT NULL DEFAULT 0
--       Esa salida fue al descanso. Lo viejo queda en 0, que es lo que era.
--
-- Ninguna lleva índice ni llave foránea. Son columnas nuevas al final de la tabla,
-- que MariaDB agrega con ALGORITHM=INSTANT sin copiar ni reconstruir nada. Cada
-- ALTER lo lleva escrito: si la versión de producción no pudiera hacerlo en línea,
-- falla al instante sin tocar nada, en vez de copiar `registros` —fotos incluidas—
-- con el kiosco bloqueado. Si sale un error 1845 o 1846, NO se le quita el
-- ALGORITHM para que pase: se para y se avisa.
--
-- IF NOT EXISTS en todo: si algo falla a la mitad, el paso se vuelve a correr y
-- salta lo que ya quedó hecho.
--
-- ORDEN DEL DESPLIEGUE (CLAUDE.md, sección 11). Toca schema.prisma, así que son
-- CUATRO ramas, y en este orden:
--   1. Este SQL.
--   2. prisma-build, con su comprobación ANTES del restart:
--        grep -c "salidaDescanso" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Cero = el cliente es el viejo y el kiosco se va a caer.
--   3. backend-build.
--   4. frontend-build.
-- Al revés es destructivo: un cliente de Prisma nuevo contra tablas sin estas
-- columnas son 500 en cada login y en cada marcación.
--
-- Entre el paso 3 y el 4 conviven backend nuevo y pantallas viejas. El kiosco
-- viejo sigue marcando igual (no conoce el descanso). El editor de jornadas viejo
-- manda el almuerzo con las claves de antes, y el backend nuevo lo RECHAZA con
-- «recarga la página» en vez de guardarlo como descanso: es a propósito.
--
-- Cada paso va en su propio envío de phpMyAdmin, y se mira el resultado antes de
-- seguir. Lo que hay DENTRO de un paso va en un solo envío, SET incluidos: cada
-- envío es una conexión nueva y un SET no llega al siguiente.

-- ============================ PASO 0: mirar antes ============================
-- Solo lectura. Las seis columnas NO tienen que existir todavía.

SELECT VERSION() AS version;
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'horarios' AND COLUMN_NAME = 'fotoEnDescanso')
    OR (TABLE_NAME IN ('franjas_horario', 'dias_esperados') AND COLUMN_NAME IN ('descansoInicio', 'descansoFin'))
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME = 'salidaDescanso'));
-- Tiene que devolver CERO filas. Si devuelve alguna, este SQL ya se corrió: parar.

-- ============================ PASO 1: horario ================================
-- TODO en un solo envío.
--
-- lock_wait_timeout: si en 10 segundos no consigue la tabla, porque hay una
-- consulta larga encima, falla en vez de quedarse esperando con las marcaciones
-- haciendo fila detrás. Se vuelve a intentar en un momento más tranquilo.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `horarios`
  ADD COLUMN IF NOT EXISTS `fotoEnDescanso` tinyint(1) NOT NULL DEFAULT '1',
  ALGORITHM=INSTANT;
ALTER TABLE `franjas_horario`
  ADD COLUMN IF NOT EXISTS `descansoInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `descansoFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 2: días esperados =========================
-- Un solo envío.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `dias_esperados`
  ADD COLUMN IF NOT EXISTS `descansoInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `descansoFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 3: registros ==============================
-- Un solo envío. Es la tabla que el kiosco escribe en cada marcación.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `registros`
  ADD COLUMN IF NOT EXISTS `salidaDescanso` tinyint(1) NOT NULL DEFAULT '0',
  ALGORITHM=INSTANT;

-- ============================ PASO 4: comprobar ==============================

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'horarios' AND COLUMN_NAME = 'fotoEnDescanso')
    OR (TABLE_NAME IN ('franjas_horario', 'dias_esperados') AND COLUMN_NAME IN ('descansoInicio', 'descansoFin'))
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME = 'salidaDescanso'))
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Seis filas.

SELECT fotoEnDescanso, COUNT(*) AS horarios FROM `horarios` GROUP BY fotoEnDescanso;
-- Todos en 1.

SELECT COUNT(*) AS con_salida_al_descanso FROM `registros` WHERE salidaDescanso = 1;
-- 0: el código viejo no la escribe.

-- ============================ Para deshacer ==================================
-- NO es lo primero que se hace. El código nuevo lee estas columnas en cada
-- marcación: borrarlas con él todavía arriba tumba el kiosco, igual que desplegar
-- al revés. El orden es el inverso del despliegue:
--
--   1. frontend-build de vuelta a master.
--   2. backend-build de vuelta a master.
--   3. prisma-build de vuelta a master y, ANTES del restart, en el servidor:
--        grep -c "salidaDescanso" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Tiene que dar 0. Si da otra cosa, el cliente sigue siendo el nuevo: parar.
--   4. Recién entonces esto, en un solo envío. Se pierden los descansos marcados
--      y configurados mientras estuvo arriba:
--
-- SET SESSION lock_wait_timeout = 10;
-- ALTER TABLE `registros` DROP COLUMN IF EXISTS `salidaDescanso`, ALGORITHM=INSTANT;
-- ALTER TABLE `dias_esperados` DROP COLUMN IF EXISTS `descansoInicio`, DROP COLUMN IF EXISTS `descansoFin`, ALGORITHM=INSTANT;
-- ALTER TABLE `franjas_horario` DROP COLUMN IF EXISTS `descansoInicio`, DROP COLUMN IF EXISTS `descansoFin`, ALGORITHM=INSTANT;
-- ALTER TABLE `horarios` DROP COLUMN IF EXISTS `fotoEnDescanso`, ALGORITHM=INSTANT;
