-- QUÉ SE DECIDIÓ SOBRE UN DÍA DE DESCANSO QUE SE TRABAJÓ (22 de septiembre de 2026).
--
-- Antes de esto no existía NINGÚN registro de estas decisiones. El sistema sabía que alguien había
-- trabajado su día de descanso y le pagaba el recargo, pero no qué se acordó hacer al respecto. En
-- un reclamo laboral eso deja a la empresa sin con qué contestar, y el registro es justamente lo
-- que la protege.
--
-- NO ES UN `permiso`, aunque se le parezca. Esa tabla clasifica ausencias por QUIÉN PAGA
-- (remunerado por ley / nunca / según política de la empresa). Un día compensatorio no es ninguna
-- de las tres: ya está pagado, porque el recargo se pagó cuando se trabajó el descanso. Meterlo ahí
-- corrompería una clasificación que decide dinero.
--
-- LO QUE ESTA TABLA NO PUEDE HACER, y es lo que permite que la pantalla se edite libremente: quitar
-- plata. El recargo sale de `dias_esperados.esDescanso`, que esto no toca. Aquí solo vive la
-- decisión de compensación, así que corregir un error nunca borra un recargo ya causado.
--
-- LAS COLUMNAS QUE NO SON OBVIAS:
--
--   decision        PENDIENTE | DINERO | COMPENSATORIO. Texto y no enum, por la misma razón que
--                   `colaboradores.descansoTipo`: un cuarto valor obligaría a un ALTER de una tabla
--                   con datos. Y aquí ese cuarto valor es plausible de verdad: está sin resolver si
--                   un mes que cruza a habitual reabre las decisiones anteriores.
--   claseAlDecidir  OCASIONAL | HABITUAL en el momento de decidir, CONGELADA. Es la mitad del
--                   mecanismo: el sistema no decide si reabrir, AVISA cuando la clase actual ya no
--                   coincide. Sin este dato no habría con qué comparar.
--
-- LA LEY detrás de todo esto, leída y citada: art. 179 §1 (hasta 2 al mes es ocasional, 3 o más es
-- habitual), art. 180 (siendo ocasional elige EL TRABAJADOR entre dinero y compensatorio) y art.
-- 181 (siendo habitual van los dos, «sin perjuicio de»).
--
-- EL ÍNDICE: el `UNIQUE (colaboradorId, fecha)` es a la vez la invariante (una sola decisión por
-- persona y día) y el índice que la pantalla necesita, con la igualdad primero y el rango después,
-- que es la única forma de que MySQL use las dos partes (CLAUDE.md §8.4). Por eso NO lleva un
-- `INDEX` encima: sería el mismo índice escrito dos veces.
--
-- El DDL de abajo NO está escrito a mano: sale de `prisma migrate diff`, para que los tipos sean
-- exactamente los que el cliente de Prisma espera. Se recortaron a propósito dos cosas que ese
-- comando proponía y que NO pertenecen a este cambio: revertir la clave foránea de
-- `dias_esperados.plantillaId` a ON DELETE SET NULL (se puso RESTRICT a propósito, ver
-- `dia-esperado-plantilla.sql`) y un MODIFY sobre `plantillas_turno.descansos`. Las dos eran el
-- desfase entre el esquema y la base que advierte CLAUDE.md §4.
--
-- YA ESTÁN RESUELTAS, el mismo día y SIN tocar la base: el desfasado era el esquema, así que se le
-- declaró `onDelete: Restrict` a la relación y `@db.Text` a la columna. Desde entonces
-- `prisma migrate diff` devuelve «This is an empty migration». O sea que este archivo es lo ÚNICO
-- que hay que correr en producción para este cambio.

CREATE TABLE `descansos_trabajados` (
    `id` VARCHAR(191) NOT NULL,
    `colaboradorId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `decision` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    `fechaCompensatorio` DATETIME(3) NULL,
    `claseAlDecidir` VARCHAR(191) NULL,
    `nota` TEXT NULL,
    `decididoPor` VARCHAR(191) NULL,
    `decididoNombre` VARCHAR(191) NULL,
    `decididoEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `descansos_trabajados_colaboradorId_fecha_key`(`colaboradorId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- El rastro de quién cambió qué. Copia deliberada de `registro_cambios`, incluido el borrado en
-- cascada: es el patrón de auditoría que este producto ya tiene, y un segundo patrón para lo mismo
-- sería una forma de que los dos se separen.
CREATE TABLE `descansos_trabajados_cambios` (
    `id` VARCHAR(191) NOT NULL,
    `descansoTrabajadoId` VARCHAR(191) NOT NULL,
    `campo` VARCHAR(191) NOT NULL,
    `antes` TEXT NOT NULL,
    `despues` TEXT NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `usuarioNombre` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `descansos_trabajados_cambios_descansoTrabajadoId_creadoEn_idx`(`descansoTrabajadoId`, `creadoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `descansos_trabajados`
  ADD CONSTRAINT `descansos_trabajados_colaboradorId_fkey`
    FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `descansos_trabajados_cambios`
  ADD CONSTRAINT `descansos_trabajados_cambios_descansoTrabajadoId_fkey`
    FOREIGN KEY (`descansoTrabajadoId`) REFERENCES `descansos_trabajados`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Comprobación del EFECTO, no de que el CREATE no se quejara (CLAUDE.md §12.1):
--
-- SELECT TABLE_NAME FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'descansos_trabajados%';
--   -> tienen que salir las DOS.
--
-- SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
-- WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'descansos_trabajados%';
--   -> RESTRICT en la primera, CASCADE en la de cambios.
--
-- SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'descansos_trabajados' ORDER BY SEQ_IN_INDEX;
--   -> el UNIQUE con colaboradorId en la posición 1 y fecha en la 2, en ese orden.
