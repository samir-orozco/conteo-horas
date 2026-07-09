-- Link único del kiosco por empresa (backfill para filas existentes)
ALTER TABLE `empresas` ADD COLUMN `marcadorToken` VARCHAR(191) NULL;
UPDATE `empresas` SET `marcadorToken` = LOWER(REPLACE(UUID(), '-', '')) WHERE `marcadorToken` IS NULL;
ALTER TABLE `empresas` MODIFY `marcadorToken` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `empresas_marcadorToken_key` ON `empresas`(`marcadorToken`);
