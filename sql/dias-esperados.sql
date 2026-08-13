-- Tabla `dias_esperados` — historial de horarios (12 de agosto de 2026)
--
-- Guarda lo que el horario de cada colaborador exigía UN día concreto, congelado.
-- Sin ella, editar un horario reescribe el pasado: los reportes de meses
-- anteriores se recalculan con la configuración actual y mueven dinero ya
-- liquidado.
--
-- ORDEN DE DESPLIEGUE: este SQL va **ANTES** de subir el backend nuevo.
-- Las rutas /liquidacion, /tardanzas, /tardanzas-resumen y /registros ya
-- consultan esta tabla; si el código llega antes que la tabla, las cuatro
-- responden 500.
--
-- Es seguro con el backend VIEJO corriendo: el código actual no la conoce y la
-- ignora por completo. Se puede crear en cualquier momento previo.
--
-- Se escribe a mano y no con `prisma migrate deploy` porque las migraciones de
-- este proyecto están desfasadas del schema (se evolucionó con `db push`), así
-- que `migrate deploy` NO reproduce el estado de producción.
--
-- Este DDL es copia literal del `SHOW CREATE TABLE` de la tabla que Prisma
-- generó en la base local, así que coincide con lo que el cliente espera.

CREATE TABLE IF NOT EXISTS `dias_esperados` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime(3) NOT NULL,
  `programado` tinyint(1) NOT NULL DEFAULT '0',
  `horaEntrada` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `horaSalida` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toleranciaMin` int NOT NULL DEFAULT '0',
  `almuerzoMin` int NOT NULL DEFAULT '0',
  `minutosEsperados` int NOT NULL DEFAULT '0',
  `horarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origen` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AUTO',
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actualizadoEn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dias_esperados_colaboradorId_fecha_key` (`colaboradorId`,`fecha`),
  KEY `dias_esperados_colaboradorId_fecha_idx` (`colaboradorId`,`fecha`),
  CONSTRAINT `dias_esperados_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`)
    REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comprobación: debe devolver 0 filas y las 13 columnas de arriba.
-- SELECT COUNT(*) FROM dias_esperados;
-- DESCRIBE dias_esperados;

-- Para revertir (solo si hay que volver atrás; se pierden los días congelados,
-- y el sistema vuelve a calcular con el horario vigente como antes):
-- DROP TABLE `dias_esperados`;
