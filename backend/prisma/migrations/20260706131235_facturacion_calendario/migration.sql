-- Precios editables de la plataforma (fila única) y retiro programado
CREATE TABLE `configuracion_plataforma` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `precioTramo1` DOUBLE NOT NULL DEFAULT 10000,
    `limiteTramo1` INTEGER NOT NULL DEFAULT 15,
    `precioTramo2` DOUBLE NOT NULL DEFAULT 2000,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `configuracion_plataforma` (`id`) VALUES (1);

ALTER TABLE `colaboradores` ADD COLUMN `retiroProgramado` DATETIME(3) NULL;
