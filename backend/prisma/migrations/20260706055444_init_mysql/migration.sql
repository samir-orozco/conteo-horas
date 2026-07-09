-- CreateTable
CREATE TABLE `empresas` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresas_nit_key`(`nit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suscripciones` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `estado` ENUM('PRUEBA', 'ACTIVA', 'EN_MORA', 'SUSPENDIDA', 'CANCELADA') NOT NULL DEFAULT 'PRUEBA',
    `finPrueba` DATETIME(3) NOT NULL,
    `pagadoHasta` DATETIME(3) NULL,
    `suspendidaEn` DATETIME(3) NULL,
    `wompiFuentePagoId` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suscripciones_empresaId_key`(`empresaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id` VARCHAR(191) NOT NULL,
    `suscripcionId` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `colaboradoresFacturados` INTEGER NOT NULL,
    `periodoInicio` DATETIME(3) NOT NULL,
    `periodoFin` DATETIME(3) NOT NULL,
    `metodo` ENUM('TARJETA_RECURRENTE', 'LINK_WOMPI', 'MANUAL') NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'APROBADO',
    `wompiTransaccionId` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pagos_wompiTransaccionId_key`(`wompiTransaccionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jornadas_vigencia` (
    `id` VARCHAR(191) NOT NULL,
    `vigenteDesde` DATETIME(3) NOT NULL,
    `horasSemanales` DOUBLE NOT NULL,

    UNIQUE INDEX `jornadas_vigencia_vigenteDesde_key`(`vigenteDesde`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_hora` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `horaInicio` INTEGER NOT NULL,
    `horaFin` INTEGER NOT NULL,
    `recargo` DOUBLE NOT NULL,
    `aplica` JSON NOT NULL,
    `vigenteDesde` DATETIME(3) NOT NULL,
    `vigenteHasta` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `tipos_hora_codigo_vigenteDesde_key`(`codigo`, `vigenteDesde`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `colaboradores` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `cedula` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `salarioMensual` DOUBLE NOT NULL,
    `huellaTemplate` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `colaboradores_empresaId_cedula_key`(`empresaId`, `cedula`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros` (
    `id` VARCHAR(191) NOT NULL,
    `colaboradorId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `entrada` DATETIME(3) NULL,
    `salida` DATETIME(3) NULL,
    `tipo` ENUM('NORMAL', 'PERMISO', 'FESTIVO') NOT NULL DEFAULT 'NORMAL',
    `observacion` VARCHAR(191) NULL,
    `editadoPor` VARCHAR(191) NULL,
    `editadoEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `id` VARCHAR(191) NOT NULL,
    `colaboradorId` VARCHAR(191) NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NOT NULL,
    `tipo` ENUM('VACACIONES', 'INCAPACIDAD_EPS', 'INCAPACIDAD_ARL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD', 'LICENCIA_LUTO', 'CALAMIDAD', 'MEDICO', 'PERSONAL', 'NO_REMUNERADO', 'OTRO') NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `aprobado` BOOLEAN NOT NULL DEFAULT false,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dias_festivos` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dias_festivos_empresaId_fecha_key`(`empresaId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `valor` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `configuracion_empresaId_clave_key`(`empresaId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `empresaId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `rol` ENUM('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR') NOT NULL DEFAULT 'ADMIN',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `suscripciones` ADD CONSTRAINT `suscripciones_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_suscripcionId_fkey` FOREIGN KEY (`suscripcionId`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `colaboradores` ADD CONSTRAINT `colaboradores_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros` ADD CONSTRAINT `registros_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permisos` ADD CONSTRAINT `permisos_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dias_festivos` ADD CONSTRAINT `dias_festivos_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracion` ADD CONSTRAINT `configuracion_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

