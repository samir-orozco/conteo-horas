-- Catálogo de turnos de la empresa (19 de septiembre de 2026) — turnos rotativos, paso 1
--
-- UNA TABLA NUEVA Y VACÍA. Es el caso más seguro que existe en esta base: el código que
-- corre hoy no la conoce y la ignora, así que se puede correr ANTES de desplegar el
-- backend nuevo y no cambia el comportamiento de nada.
--
-- Qué guarda: «Mañana 06:00-14:00», «Noche 22:00-06:00», «Descanso». Una plantilla es una
-- FRANJA SIN DÍAS; los días se los pone el planificador al pintar el calendario. Por eso
-- las columnas son las de `franjas_horario` menos `dias`, más nombre, color, si es un día
-- de descanso y en qué sede se cumple.
--
-- Las horas van en NULL cuando `esDescanso` = 1: un día libre no tiene horario, y eso es
-- distinto de «todavía sin configurar».
--
-- `descansos` es la MISMA columna de texto de `franjas_horario` y `dias_esperados`, con el
-- mismo formato y leída con el mismo código:
--   [{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]
-- NULL es «sin descansos»; nunca se guarda "[]".
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. Copia de seguridad de la base desde cPanel (Backup → Download a MySQL Database Backup).
--    Es la única marcha atrás real, aunque aquí el riesgo sea el mínimo posible.
-- 2. Entra a la base `ewyfwxbg_horapro` en phpMyAdmin ANTES de enviar: el 13 de septiembre
--    de 2026 un envío corrió dentro de information_schema (#1109). Aun así, todos los
--    nombres van con la base escrita, que es la guarda de verdad.
-- 3. Este SQL va ANTES del backend nuevo, y DESPUÉS hay que actualizar `prisma-build`:
--    el esquema cambió, así que el despliegue lleva CUATRO ramas y no tres (CLAUDE.md §11).
--    Sin el cliente de Prisma nuevo, el backend le pide a Prisma una tabla que no conoce.
--
-- ============================================================================
-- POR QUÉ NO HAY NI UN `ALTER`
-- ============================================================================
-- La llave foránea va DENTRO del `CREATE TABLE`. Un `ALTER ... ADD CONSTRAINT` sobre una
-- tabla con filas es lo que dio el #1846 del 13 de septiembre de 2026; aquí ni siquiera
-- hace falta, porque la tabla nace vacía y con sus llaves puestas.
--
-- El tiempo de espera del candado va con `SET STATEMENT ... FOR` y no con `SET SESSION`:
-- en phpMyAdmin un `SET SESSION` no llegó a la sentencia siguiente, ni siquiera dentro del
-- mismo envío (13 de septiembre de 2026).
--
-- `IF NOT EXISTS` para que, si algo falla a la mitad, el paso se pueda volver a correr.

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`plantillas_turno` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'grafito',
  `esDescanso` tinyint(1) NOT NULL DEFAULT '0',
  `horaEntrada` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `horaSalida` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tieneAlmuerzo` tinyint(1) NOT NULL DEFAULT '1',
  `almuerzoInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `almuerzoFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descansos` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sedeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plantillas_turno_empresaId_idx` (`empresaId`),
  KEY `plantillas_turno_sedeId_idx` (`sedeId`),
  CONSTRAINT `plantillas_turno_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `plantillas_turno_sedeId_fkey` FOREIGN KEY (`sedeId`)
    REFERENCES `ewyfwxbg_horapro`.`sedes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- COMPROBACIÓN (no es opcional: un comando puede informar éxito y no haber hecho nada)
-- ============================================================================
-- Tiene que devolver UNA fila:
-- SELECT TABLE_NAME FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'plantillas_turno';
--
-- Tiene que devolver 15 columnas:
-- SELECT COUNT(*) FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'plantillas_turno';
--
-- Tienen que salir las DOS llaves foráneas:
-- SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'plantillas_turno'
--    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================================
-- PARA REVERTIR
-- ============================================================================
-- Sin riesgo mientras nadie haya creado plantillas; con plantillas creadas, se pierden.
-- DROP TABLE `ewyfwxbg_horapro`.`plantillas_turno`;
