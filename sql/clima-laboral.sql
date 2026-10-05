-- Clima laboral, primera etapa (4 de octubre de 2026) — docs/CLIMA_LABORAL.md
--
-- CUATRO TABLAS NUEVAS Y VACÍAS, y ni un cambio a una tabla existente. El código que corre hoy no las
-- conoce y las ignora, así que se pueden correr ANTES de desplegar el backend nuevo. En particular
-- no se toca `registros`: el kiosco no se bloquea mientras esto corre.
--
--   calificaciones_clima          la carita del día de cada persona, CON nombre: una fila por
--                                 persona y por día (la llave única lo garantiza).
--   observaciones_confidenciales  la observación confidencial, SIN la persona a la vista y SIN la
--                                 hora en que se escribió: solo la semana y desde cuándo se ve. Quién
--                                 la escribió va cifrado en `autorCifrado` con la CLAVE_CONFIDENCIAL
--                                 del .env. Por eso tampoco tiene `creadoEn`, y su id es un uuid al
--                                 azar y no un cuid, que lleva la hora dentro.
--   seguimientos_clima            el caso de cada persona en «Necesitan atención»: estado (Sin revisar,
--                                 En seguimiento, Cerrado), responsable y desde cuándo. Uno por persona y
--                                 por racha (la llave única lo garantiza).
--   comentarios_seguimiento_clima los comentarios de cada caso, con el nombre de quien los escribió.
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. Copia de seguridad de la base desde cPanel (Backup → Download a MySQL Database Backup).
-- 2. Entra a la base `ewyfwxbg_horapro` en phpMyAdmin ANTES de enviar. Aun así, todos los nombres
--    van con la base escrita, que es la guarda de verdad.
-- 3. Este SQL va ANTES del backend nuevo, y DESPUÉS hay que actualizar `prisma-build`: el esquema
--    cambió, así que el despliegue lleva CUATRO ramas y no tres (CLAUDE.md §11).
-- 4. La variable CLAVE_CONFIDENCIAL tiene que estar en el .env del servidor ANTES del backend nuevo
--    (DESPLIEGUE.md §6). Sin ella el kiosco no guarda observaciones confidenciales.
--
-- ============================================================================
-- POR QUÉ NO HAY NI UN `ALTER`
-- ============================================================================
-- Las llaves foráneas van DENTRO del `CREATE TABLE`, igual que en plantillas-turno.sql: las tablas
-- nacen vacías y con sus llaves puestas. El candado se acota con `SET STATEMENT ... FOR`, porque en
-- phpMyAdmin un `SET SESSION` no llega a la sentencia siguiente. `IF NOT EXISTS` para poder volver a
-- correrlo si algo falla a la mitad.
--
-- ON DELETE CASCADE, como dice el esquema: si se borra una empresa o una persona, sus calificaciones
-- se van con ella. Igual el borrado de empresas las borra a mano, para contarlas.

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`calificaciones_clima` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime(3) NOT NULL,
  `carita` int NOT NULL,
  `motivos` json NOT NULL,
  `observacion` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `calificaciones_clima_colaboradorId_fecha_key` (`colaboradorId`, `fecha`),
  KEY `calificaciones_clima_empresaId_fecha_idx` (`empresaId`, `fecha`),
  CONSTRAINT `calificaciones_clima_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `calificaciones_clima_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`)
    REFERENCES `ewyfwxbg_horapro`.`colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`observaciones_confidenciales` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semana` datetime(3) NOT NULL,
  `visibleDesde` datetime(3) NOT NULL,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `autorCifrado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `observaciones_confidenciales_empresaId_visibleDesde_idx` (`empresaId`, `visibleDesde`),
  CONSTRAINT `observaciones_confidenciales_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`seguimientos_clima` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresaId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `desde` datetime(3) NOT NULL,
  `estado` enum('SIN_REVISAR','EN_SEGUIMIENTO','CERRADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SIN_REVISAR',
  `responsableId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `abiertoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cerradoEn` datetime(3) DEFAULT NULL,
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seguimientos_clima_colaboradorId_desde_key` (`colaboradorId`, `desde`),
  KEY `seguimientos_clima_empresaId_estado_idx` (`empresaId`, `estado`),
  CONSTRAINT `seguimientos_clima_empresaId_fkey` FOREIGN KEY (`empresaId`)
    REFERENCES `ewyfwxbg_horapro`.`empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `seguimientos_clima_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`)
    REFERENCES `ewyfwxbg_horapro`.`colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`comentarios_seguimiento_clima` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seguimientoId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `autorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `autorNombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `editadoEn` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `comentarios_seguimiento_clima_seguimientoId_creadoEn_idx` (`seguimientoId`, `creadoEn`),
  CONSTRAINT `comentarios_seguimiento_clima_seguimientoId_fkey` FOREIGN KEY (`seguimientoId`)
    REFERENCES `ewyfwxbg_horapro`.`seguimientos_clima` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- COMPROBACIÓN (no es opcional: un comando puede informar éxito y no haber hecho nada)
-- ============================================================================
-- Tiene que devolver CUATRO filas:
-- SELECT TABLE_NAME FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro'
--    AND TABLE_NAME IN ('calificaciones_clima', 'observaciones_confidenciales', 'seguimientos_clima', 'comentarios_seguimiento_clima');
--
-- Tiene que devolver 9, 6, 9 y 7 (calificaciones, observaciones, seguimientos, comentarios):
-- SELECT TABLE_NAME, COUNT(*) FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro'
--    AND TABLE_NAME IN ('calificaciones_clima', 'observaciones_confidenciales', 'seguimientos_clima', 'comentarios_seguimiento_clima')
--  GROUP BY TABLE_NAME;
--
-- Tienen que salir las SEIS llaves foráneas:
-- SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro'
--    AND TABLE_NAME IN ('calificaciones_clima', 'observaciones_confidenciales', 'seguimientos_clima', 'comentarios_seguimiento_clima')
--    AND REFERENCED_TABLE_NAME IS NOT NULL;
--
-- Y la comprobación de todo el esquema, que es la que de verdad cuenta (DESPLIEGUE.md):
--   npx ts-node prisma/sql-contra-esquema.ts > /tmp/comprobar.sql

-- ============================================================================
-- PARA REVERTIR
-- ============================================================================
-- Se pierden las calificaciones, las observaciones y los seguimientos que haya. Primero el backend
-- viejo, después esto, en este orden (los comentarios cuelgan de los seguimientos).
-- DROP TABLE `ewyfwxbg_horapro`.`comentarios_seguimiento_clima`;
-- DROP TABLE `ewyfwxbg_horapro`.`seguimientos_clima`;
-- DROP TABLE `ewyfwxbg_horapro`.`observaciones_confidenciales`;
-- DROP TABLE `ewyfwxbg_horapro`.`calificaciones_clima`;
