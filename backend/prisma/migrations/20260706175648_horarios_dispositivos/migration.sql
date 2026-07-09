-- AlterTable
ALTER TABLE `colaboradores` ADD COLUMN `horarioId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `horarios` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `horaEntrada` VARCHAR(191) NOT NULL,
    `horaSalida` VARCHAR(191) NOT NULL,
    `dias` JSON NOT NULL,
    `toleranciaMin` INTEGER NOT NULL DEFAULT 10,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispositivos_kiosco` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimoUso` DATETIME(3) NULL,

    UNIQUE INDEX `dispositivos_kiosco_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `horarios` ADD CONSTRAINT `horarios_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispositivos_kiosco` ADD CONSTRAINT `dispositivos_kiosco_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `colaboradores` ADD CONSTRAINT `colaboradores_horarioId_fkey` FOREIGN KEY (`horarioId`) REFERENCES `horarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

