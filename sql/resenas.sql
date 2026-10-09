-- Reseñas de clientes (7 de octubre de 2026) — docs/RESENAS.md
--
-- UNA TABLA NUEVA, y ni un cambio a una tabla existente. Nace con tres filas: los testimonios de
-- hoy, SIN publicar (ver más abajo). El código que corre hoy no la conoce y la ignora, así que se
-- puede correr ANTES de desplegar el backend nuevo. No se toca
-- `registros` ni `empresas`: el kiosco no se bloquea mientras esto corre.
--
--   resenas   una por empresa como máximo (la llave única de `empresaId` lo garantiza): la que la
--             empresa envió, la que omitió (fila OMITIDA, sin estrellas) o la que el dueño cargó a
--             mano. Las manuales sin empresa dejan `empresaId` en NULL, y el índice único admite
--             varios NULL. Comprobado el 8 de octubre de 2026 en el MySQL 9.7 local y en una
--             MariaDB 12.3 desechable, con este archivo tal cual y corrido dos veces: dos manuales
--             sin empresa entran, una segunda fila de la misma empresa da 1062, y borrar la
--             empresa se lleva su reseña. DESPUÉS de esa prueba, el mismo 8 de octubre, cambiaron
--             los ids de los tres testimonios (solo el texto del id, ver más abajo); el SQL con los
--             ids nuevos no se volvió a correr en MariaDB.
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. Copia de seguridad de la base desde cPanel (Backup → Download a MySQL Database Backup).
-- 2. Entra a la base `ewyfwxbg_horapro` en phpMyAdmin ANTES de enviar. Aun así, todos los nombres
--    van con la base escrita, que es la guarda de verdad.
-- 3. Este SQL va ANTES del backend nuevo, y DESPUÉS hay que actualizar `prisma-build`: el esquema
--    cambió, así que el despliegue lleva CUATRO ramas y no tres (CLAUDE.md §11). La comprobación
--    del cliente en el servidor: grep -c "nombreRetiradoEn" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--
-- ============================================================================
-- POR QUÉ NO HAY NI UN `ALTER`
-- ============================================================================
-- La llave foránea va DENTRO del `CREATE TABLE`, igual que en clima-laboral.sql: la tabla nace vacía
-- y con su llave puesta. El candado se acota con `SET STATEMENT ... FOR`, porque en phpMyAdmin un
-- `SET SESSION` no llega a la sentencia siguiente. `IF NOT EXISTS` para poder volver a correrlo.
--
-- ON DELETE CASCADE, como dice el esquema: si se borra una empresa, su reseña se va con ella y sale
-- de la landing. Igual el borrado de empresas la borra a mano, para contarla.
--
-- Las columnas y sus tipos son los que genera Prisma para `model Resena` (prisma migrate diff
-- --from-empty, sin tocar ninguna base), con la colación de `empresas.id`, que es utf8mb4_unicode_ci.

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`resenas` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `origen` enum('CLIENTE','MANUAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('OMITIDA','POR_REVISAR','PUBLICADA','OCULTA','ARCHIVADA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POR_REVISAR',
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estrellas` int DEFAULT NULL,
  `texto` varchar(600) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `comoAparece` enum('CON_NOMBRE','ANONIMA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombrePublico` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargoPublico` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `textoAutorizacion` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `versionPolitica` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `canal` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `autorizacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fechaOpinion` datetime(3) DEFAULT NULL,
  `registradaPor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planAlEnviar` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mesesPagadosAlEnviar` int DEFAULT NULL,
  `nombreRetiradoEn` datetime(3) DEFAULT NULL,
  `publicadaEn` datetime(3) DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resenas_empresaId_key` (`empresaId`),
  -- La landing pide «las publicadas». Sin este índice, cada vuelta a la base sería un recorrido de
  -- la tabla entera (CLAUDE.md §8.4); el EXPLAIN de esa consulta está en el comentario de la ruta.
  KEY `resenas_estado_idx` (`estado`),
  CONSTRAINT `resenas_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- LOS TRES TESTIMONIOS QUE HOY ESTÁN ESCRITOS EN LA LANDING
-- ============================================================================
-- Decisión del dueño: entran como reseñas MANUALES y POR REVISAR, NO publicadas, hasta que confirme
-- uno por uno que la persona es real, por qué canal lo dijo y cómo autorizó su nombre (R32). El
-- arreglo del código se borra en el mismo cambio (R34), así que sin estas filas el texto se perdería.
--
-- Texto literal, con las faltas a propósito del tercero (R33). Sin estrellas: las cinco del código
-- eran fijas y nadie las dio (R28). Con nombre, así que para publicarlas el dueño tiene que llenar
-- «Dónde quedó» y «Cómo autorizó» desde el super admin: el servidor no deja publicar sin eso (R27).
--
-- Con id fijo y `ON DUPLICATE KEY UPDATE id = id`: correrlo dos veces no las duplica, y a diferencia
-- de `INSERT IGNORE`, un texto que no cupiera daría error en vez de guardarse recortado en silencio.
--
-- Los ids son OPACOS, con la forma de los de Prisma, y no dicen de quién es cada una, a propósito:
-- el id viaja tal cual en el JSON público de la landing, también el día que se le quite el nombre a
-- la reseña (R42, R23), y se guarda en la ruta del registro del sistema, que no se borra. Y tienen
-- que llevar dígitos, porque es lo que hace que la auditoría los reconozca como identificador: con
-- un id de solo letras, «Quitar el nombre» quedaba registrado como «Creó una reseña» (R24). Los
-- comprueba backend/src/utils/resenas.test.ts, que lee este archivo. En orden: Mateo Vera,
-- Carolina Calle y Santiago Botero.
INSERT INTO `ewyfwxbg_horapro`.`resenas`
  (`id`, `origen`, `estado`, `estrellas`, `texto`, `comoAparece`, `nombrePublico`, `cargoPublico`, `canal`, `fechaOpinion`, `actualizadoEn`)
VALUES
  ('c4bv1s9w54vcy8y0d5wum30qk', 'MANUAL', 'POR_REVISAR', NULL,
   'Liquidar la nómina nos tomaba dos días y siempre había reclamos por los recargos. Con HoraPro es cuestión de minutos y los números cuadran. Dejamos de improvisar con hojas de cálculo.',
   'CON_NOMBRE', 'Mateo Vera', 'CEO Grupo MSM · Founder Fem Probiotics', 'Landing anterior', '2026-07-19 05:00:00.000', CURRENT_TIMESTAMP(3)),
  ('cty1d3d0r2xet6dfdvmcrmn0j', 'MANUAL', 'POR_REVISAR', NULL,
   'Lo que más me gustó es que la gente marca con la cara y se acabaron las excusas de "se me olvidó firmar". Los reportes de quién llegó tarde me los reviso desde el celular en la mañana.',
   'CON_NOMBRE', 'Carolina Calle', 'CEO Tuercas & Pernos', 'Landing anterior', '2026-07-19 05:00:00.000', CURRENT_TIMESTAMP(3)),
  ('cikrhefh3ufx0wrxs20u1b7tc', 'MANUAL', 'POR_REVISAR', NULL,
   'la verdad no soy de tecnologia y pense q iba ser complicado pero no. mis muchachos marcan con la cara y yo veo todo desde el telefono. me ahorro un monton de tiempo y ya no peleo con el excel jaja. muy recomendado',
   'CON_NOMBRE', 'Santiago Botero', 'Gerente Lavadora Las Brisas', 'Landing anterior', '2026-07-19 05:00:00.000', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ============================================================================
-- COMPROBACIÓN (no es opcional: un comando puede informar éxito y no haber hecho nada)
-- ============================================================================
-- Tiene que devolver UNA fila, con 23:
-- SELECT TABLE_NAME, COUNT(*) FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'resenas'
--  GROUP BY TABLE_NAME;
--
-- Tiene que salir la llave foránea hacia `empresas`, con DELETE_RULE = CASCADE:
-- SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
--  WHERE CONSTRAINT_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'resenas';
--
-- Tienen que salir los TRES testimonios, POR_REVISAR y sin estrellas:
-- SELECT id, estado, estrellas, nombrePublico, CHAR_LENGTH(texto) FROM `ewyfwxbg_horapro`.`resenas`
--  WHERE id IN ('c4bv1s9w54vcy8y0d5wum30qk', 'cty1d3d0r2xet6dfdvmcrmn0j', 'cikrhefh3ufx0wrxs20u1b7tc');
--
-- Y la comprobación de todo el esquema, que es la que de verdad cuenta (DESPLIEGUE.md):
--   npx ts-node prisma/sql-contra-esquema.ts > /tmp/comprobar.sql

-- ============================================================================
-- PARA REVERTIR
-- ============================================================================
-- Se pierden las reseñas que haya, incluidas las que el dueño cargó a mano. Primero el backend viejo,
-- después esto.
-- DROP TABLE `ewyfwxbg_horapro`.`resenas`;
