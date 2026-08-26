-- Retiro de colaboradores: cuándo salió y por qué.
--
-- Antes del cambio, retirar a alguien solo ponía `activo = 0`. La fecha se
-- perdía, y esa fecha es la que se necesita para liquidar, para expedir un
-- certificado laboral y para responderle a una inspección del Ministerio.
--
-- Dos columnas nuevas sobre una tabla que ya existe. No borra ni modifica nada
-- de lo que hay: ambas nacen en NULL para las filas actuales.
--
-- DDL copiado de lo que produjo `prisma db push` en local y verificado con
-- SHOW CREATE TABLE, no escrito a mano.

ALTER TABLE `colaboradores`
  ADD COLUMN `fechaRetiro` datetime(3) DEFAULT NULL,
  ADD COLUMN `motivoRetiro` enum('RENUNCIA','FIN_CONTRATO','SIN_JUSTA_CAUSA','JUSTA_CAUSA','FIN_OBRA','OTRO')
    COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- Comprobación: debe devolver las dos columnas nuevas.
-- SHOW COLUMNS FROM `colaboradores` WHERE Field IN ('fechaRetiro','motivoRetiro');
