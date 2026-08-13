-- AlterTable
ALTER TABLE `empresas` ADD COLUMN `afiliadoId` VARCHAR(191) NULL,
    ADD COLUMN `atribuidoEn` DATETIME(3) NULL,
    ADD COLUMN `primerPagoComisionEn` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `afiliadoId` VARCHAR(191) NULL,
    MODIFY `rol` ENUM('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'AFILIADO') NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE `afiliados` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `porcentaje` DOUBLE NOT NULL DEFAULT 20,
    `duracionMeses` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `telefono` VARCHAR(191) NULL,
    `pagoMetodo` ENUM('NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'OTRO') NULL,
    `pagoBanco` VARCHAR(191) NULL,
    `pagoTipoCuenta` ENUM('AHORROS', 'CORRIENTE') NULL,
    `pagoNumero` VARCHAR(191) NULL,
    `pagoTitular` VARCHAR(191) NULL,
    `pagoDocumento` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `afiliados_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comisiones` (
    `id` VARCHAR(191) NOT NULL,
    `afiliadoId` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `pagoId` VARCHAR(191) NOT NULL,
    `montoBase` DOUBLE NOT NULL,
    `porcentaje` DOUBLE NOT NULL,
    `monto` DOUBLE NOT NULL,
    `estado` ENUM('CAUSADA', 'ANULADA') NOT NULL DEFAULT 'CAUSADA',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `comisiones_pagoId_key`(`pagoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitudes_retiro` (
    `id` VARCHAR(191) NOT NULL,
    `afiliadoId` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `estado` ENUM('SOLICITADO', 'APROBADO', 'PAGADO', 'RECHAZADO') NOT NULL DEFAULT 'SOLICITADO',
    `comprobanteBase64` LONGTEXT NULL,
    `nota` VARCHAR(191) NULL,
    `solicitadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `procesadoEn` DATETIME(3) NULL,
    `procesadoPor` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_afiliadoId_fkey` FOREIGN KEY (`afiliadoId`) REFERENCES `afiliados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_afiliadoId_fkey` FOREIGN KEY (`afiliadoId`) REFERENCES `afiliados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comisiones` ADD CONSTRAINT `comisiones_afiliadoId_fkey` FOREIGN KEY (`afiliadoId`) REFERENCES `afiliados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comisiones` ADD CONSTRAINT `comisiones_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comisiones` ADD CONSTRAINT `comisiones_pagoId_fkey` FOREIGN KEY (`pagoId`) REFERENCES `pagos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_retiro` ADD CONSTRAINT `solicitudes_retiro_afiliadoId_fkey` FOREIGN KEY (`afiliadoId`) REFERENCES `afiliados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

