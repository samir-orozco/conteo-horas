-- AlterTable
ALTER TABLE `empresas` ADD COLUMN `exentaPago` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `pagos` ADD COLUMN `comprobanteBase64` LONGTEXT NULL,
    ADD COLUMN `nota` VARCHAR(191) NULL,
    ADD COLUMN `registradoPor` VARCHAR(191) NULL;

