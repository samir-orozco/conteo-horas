-- Almuerzo por ventana horaria + campos para lo que viene (13 de agosto de 2026)
--
-- El almuerzo deja de ser solo "cuántos minutos" y pasa a ser "de qué hora a qué
-- hora". Con eso, una sola regla resuelve tres errores que hoy cuestan dinero:
--
--   Se descuentan los minutos de la ventana durante los cuales la persona
--   estuvo MARCADA.
--
--  - Quien se va temprano por una novedad deja de pagar un almuerzo que nunca
--    tomó. Hoy alguien que trabaja de 08:00 a 10:00 termina con UNA hora
--    contada de las dos que trabajó.
--  - Quien marca su almuerzo deja de pagarlo dos veces (el hueco ya estaba
--    fuera de lo trabajado y encima se restaban los minutos fijos).
--  - Quien no marca nada sigue perdiendo la ventana completa: no marcar no es
--    negocio.
--
-- TODOS los campos entran vacíos o en falso, así que NADA cambia hasta que el
-- admin configure la ventana en Configuración → Horario. Y como la ventana se
-- congela en `dias_esperados`, los días ya materializados conservan su
-- comportamiento: los reportes ya emitidos no se mueven.
--
-- Se aplica con el backend viejo corriendo: no conoce las columnas y las ignora.
-- Como siempre, el SQL va ANTES que el código.

-- 1) La ventana vive en la franja, junto a las horas de entrada y salida: el
--    sábado corto puede no tener almuerzo, y un turno nocturno almuerza en la
--    madrugada. En el horario no se podrían expresar esos dos casos.
ALTER TABLE `franjas_horario`
  ADD COLUMN `almuerzoInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN `almuerzoFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 2) Congelada en el día, igual que el resto del historial de horarios.
ALTER TABLE `dias_esperados`
  ADD COLUMN `almuerzoInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN `almuerzoFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- 3) Qué fue esa salida y si el regreso lo puso el sistema. Un regreso estimado
--    es una hora que nadie marcó: tiene que constar en el DATO y no solo en el
--    color de la pantalla, o el día que alguien reclame no habrá cómo saberlo.
ALTER TABLE `registros`
  ADD COLUMN `salidaAlmuerzo` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `entradaEstimada` tinyint(1) NOT NULL DEFAULT 0;

-- 4) Novedades de parte del día ("cita médica de 14:00 a 17:00"). Vacías = día
--    completo, como siempre. Solo aplican a novedades de UN día.
ALTER TABLE `permisos`
  ADD COLUMN `horaInicio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN `horaFin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- Comprobación:
-- DESCRIBE franjas_horario;
-- DESCRIBE dias_esperados;
-- DESCRIBE registros;
-- DESCRIBE permisos;

-- Para revertir:
-- ALTER TABLE `franjas_horario` DROP COLUMN `almuerzoInicio`, DROP COLUMN `almuerzoFin`;
-- ALTER TABLE `dias_esperados` DROP COLUMN `almuerzoInicio`, DROP COLUMN `almuerzoFin`;
-- ALTER TABLE `registros` DROP COLUMN `salidaAlmuerzo`, DROP COLUMN `entradaEstimada`;
-- ALTER TABLE `permisos` DROP COLUMN `horaInicio`, DROP COLUMN `horaFin`;
