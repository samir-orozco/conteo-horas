-- MARCAR FUERA DE LA GEOCERCA, CON ALERTA, POR SEDE (11 de octubre de 2026). PENDIENTES nº 11.
--
-- Tres columnas, las tres seguras con el código viejo corriendo (el código viejo no las lee):
--
--   sedes.margenFuera            entero, NOT NULL DEFAULT 0
--       Metros más allá del radio en los que un presencial todavía puede marcar, con alerta.
--       0 es la regla de siempre (fuera del radio se rechaza), así que todas las sedes que ya
--       existen quedan exactamente como están.
--
--   registros.fueraGeocercaEntrada   booleano, NOT NULL DEFAULT 0
--   registros.fueraGeocercaSalida    booleano, NOT NULL DEFAULT 0
--       La marca de que esa entrada o esa salida se hizo fuera de la geocerca, dentro del margen.
--       Solo la marca, sin metros: guardar a cuánto estaba toca la política de datos (decisión del
--       dueño, 11 de octubre). Aquí `false` no reinterpreta nada: hasta hoy nadie podía marcar
--       fuera de la geocerca, así que es cierto para todas las filas que existen.
--
-- SALIÓ DE `prisma migrate diff` contra el esquema de HEAD, no se escribió a mano. La diferencia
-- fueron exactamente estas tres columnas y ninguna otra.
--
-- ALGORITHM=INSTANT escrito: si la versión de producción no pudiera hacerlo sin copiar, el ALTER
-- falla al instante sin tocar nada, en vez de copiar `registros` (fotos incluidas) en silencio con
-- el kiosco bloqueado. Si sale un error 1845 o 1846, NO se le quita el ALGORITHM: se para y se avisa.
--
-- `SET STATEMENT ... FOR` y no un SET suelto: en phpMyAdmin un SET no llegó al ALTER siguiente ni en
-- el mismo envío (#1846). Acota a 10 s la espera del candado de metadatos: `registros` está en el
-- camino vivo del kiosco, y sin tope la espera es de un día con todo lo demás en fila detrás.
--
-- ESTA FORMA ES DE MARIADB. No se corre contra la base local de desarrollo, que es MySQL.
--
-- ORDEN DEL DESPLIEGUE (CLAUDE.md, sección 11). Toca schema.prisma: CUATRO ramas, en este orden:
--   1. Este SQL.
--   2. prisma-build, con su comprobación ANTES del restart:
--        grep -c "fueraGeocercaSalida" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--   3. backend-build.
--   4. frontend-build.
-- Al revés es destructivo: un cliente de Prisma nuevo contra tablas sin estas columnas son 500 en
-- cada marcación, o sea el kiosco caído.

-- ============================ PASO 0: mirar antes (solo lectura) =============
-- SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro'
--    AND ((TABLE_NAME = 'sedes' AND COLUMN_NAME = 'margenFuera')
--      OR (TABLE_NAME = 'registros' AND COLUMN_NAME IN ('fueraGeocercaEntrada', 'fueraGeocercaSalida')));
-- Tiene que devolver CERO filas. Si devuelve alguna, este SQL ya se corrió: parar.

-- ============================ PASO 1: las columnas ===========================
-- Un solo envío. IF NOT EXISTS: si falla a la mitad, se vuelve a correr y salta lo que ya quedó.

SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`sedes`
  ADD COLUMN IF NOT EXISTS `margenFuera` INT NOT NULL DEFAULT 0,
  ALGORITHM=INSTANT;
SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`registros`
  ADD COLUMN IF NOT EXISTS `fueraGeocercaEntrada` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `fueraGeocercaSalida` BOOLEAN NOT NULL DEFAULT false,
  ALGORITHM=INSTANT;

-- ============================ PASO 2: comprobar ==============================
-- Tres filas: int(11) e tinyint(1), NOT NULL, default 0.
-- SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
--   FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro'
--    AND COLUMN_NAME IN ('margenFuera', 'fueraGeocercaEntrada', 'fueraGeocercaSalida');
--
-- Y ninguna marcada, que es lo que garantiza que no cambió nada de lo que había:
-- SELECT (SELECT COUNT(*) FROM `ewyfwxbg_horapro`.`sedes` WHERE margenFuera <> 0) AS sedes_con_margen,
--        (SELECT COUNT(*) FROM `ewyfwxbg_horapro`.`registros`
--          WHERE fueraGeocercaEntrada OR fueraGeocercaSalida) AS registros_marcados;
-- Los dos en 0.

-- ============================ PARA DESHACER ==================================
-- NO es lo primero. El backend nuevo lee y escribe estas columnas en cada marcación: borrarlas con
-- él arriba tumba el kiosco. Primero frontend, backend y prisma-build de vuelta a master (con el
-- grep de arriba en 0 ANTES del restart), y recién entonces, en un solo envío:
--
-- SET STATEMENT lock_wait_timeout=10 FOR
-- ALTER TABLE `ewyfwxbg_horapro`.`registros` DROP COLUMN IF EXISTS `fueraGeocercaEntrada`,
--   DROP COLUMN IF EXISTS `fueraGeocercaSalida`, ALGORITHM=INSTANT;
-- SET STATEMENT lock_wait_timeout=10 FOR
-- ALTER TABLE `ewyfwxbg_horapro`.`sedes` DROP COLUMN IF EXISTS `margenFuera`, ALGORITHM=INSTANT;
