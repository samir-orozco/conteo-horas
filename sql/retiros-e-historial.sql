-- Retiro y reingreso de colaboradores, con su historia.
--
-- Antes, retirar a alguien solo ponía `activo = 0`: se perdía la fecha, el
-- motivo y cualquier soporte. Esa fecha es la que se necesita para liquidar,
-- para expedir un certificado laboral y para responderle a una inspección.
--
-- Son dos cosas: dos columnas de ESTADO en `colaboradores` (para que la lista
-- pinte quién trabaja hoy sin cruzar tablas) y una tabla de EVENTOS con la
-- historia completa, porque una persona puede entrar, salir y volver, y el
-- estado de hoy solo recuerda lo último.
--
-- DDL copiado de lo que produjo `prisma db push` en local y verificado con
-- SHOW CREATE TABLE, no escrito a mano. No borra ni modifica nada existente.

-- 1. Estado actual, sobre la tabla que ya existe. Ambas nacen en NULL.
ALTER TABLE `colaboradores`
  ADD COLUMN `fechaRetiro` datetime(3) DEFAULT NULL,
  ADD COLUMN `motivoRetiro` enum('RENUNCIA','FIN_CONTRATO','SIN_JUSTA_CAUSA','JUSTA_CAUSA','FIN_OBRA','OTRO')
    COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 2. La historia. El soporte cuelga del evento y no de la persona: la carta de
--    renuncia de un retiro no es la del siguiente.
CREATE TABLE `vinculacion_eventos` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('INGRESO','RETIRO','REINGRESO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime(3) NOT NULL,
  `motivo` enum('RENUNCIA','FIN_CONTRATO','SIN_JUSTA_CAUSA','JUSTA_CAUSA','FIN_OBRA','OTRO')
    COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nota` text COLLATE utf8mb4_unicode_ci,
  `documento` longtext COLLATE utf8mb4_unicode_ci,
  `documentoTipo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentoNombre` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `vinculacion_eventos_colaboradorId_fecha_idx` (`colaboradorId`,`fecha`),
  CONSTRAINT `vinculacion_eventos_colaboradorId_fkey`
    FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Historia inicial de quienes ya están en la base.
--    Sin esto, todo el mundo arranca con una línea de tiempo vacía y parecería
--    que nadie ingresó nunca. Se usa `creadoEn` como fecha de ingreso, que es
--    lo más cercano que hay guardado, y se marca en la nota para que quede
--    claro que es una fecha aproximada y no un dato que alguien registró.
INSERT INTO `vinculacion_eventos` (`id`, `colaboradorId`, `tipo`, `fecha`, `nota`, `creadoEn`)
SELECT
  CONCAT('mig-ing-', `id`), `id`, 'INGRESO', `creadoEn`,
  'Fecha tomada de la creación de la ficha, antes de que se registraran los ingresos',
  NOW(3)
FROM `colaboradores`;

-- Comprobación: debe devolver una fila por colaborador.
-- SELECT COUNT(*) AS eventos FROM `vinculacion_eventos`;
-- SELECT COUNT(*) AS colaboradores FROM `colaboradores`;

-- 4. Qué se cambió al editar una marcación.
--
-- `registros` ya tenía `editadoPor` y `editadoEn`, así que se sabía QUE alguien
-- la tocó, pero no qué hizo. Eso no sirve el día que un trabajador reclama una
-- llegada tarde: hay que poder decir que la entrada pasó de 8:15 a 8:00.
--
-- El nombre del usuario se copia en la fila a propósito: si esa cuenta se borra,
-- el historial tiene que seguir diciendo quién fue.
CREATE TABLE `registro_cambios` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registroId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `antes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `despues` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuarioNombre` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `registro_cambios_registroId_creadoEn_idx` (`registroId`,`creadoEn`),
  CONSTRAINT `registro_cambios_registroId_fkey`
    FOREIGN KEY (`registroId`) REFERENCES `registros` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No hay historia que sembrar aquí: de las ediciones anteriores solo quedó
-- `editadoPor`, sin el detalle de qué se cambió. La bitácora arranca vacía y se
-- llena desde la primera edición que se haga con esto puesto.
