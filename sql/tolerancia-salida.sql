-- Tolerancia de salida (12 de agosto de 2026)
--
-- Minutos que un trabajador puede quedarse de más SIN que se paguen como hora
-- extra: por debajo del umbral se toma la hora de salida programada. Resuelve el
-- goteo de quien se queda 10 minutos sin orden previa y el sistema se los liquida
-- con recargo del 25%.
--
-- Los cuatro campos entran con valores que NO cambian el cálculo de nadie:
-- `toleranciaSalidaMin = 0` significa desactivado, que es el comportamiento
-- actual. Solo empieza a aplicar cuando el admin lo configura en el horario.
--
-- Se añaden también a `dias_esperados` porque la tolerancia se congela con el
-- día: es política de la empresa, y si la cambian mañana no puede mover lo que
-- ya se liquidó — la misma regla que rige todo el historial de horarios.
--
-- Se puede aplicar con el backend viejo corriendo: no conoce las columnas y las
-- ignora. Como siempre, el SQL va ANTES que el código.

ALTER TABLE `horarios`
  ADD COLUMN `toleranciaSalidaMin` INT NOT NULL DEFAULT 0,
  ADD COLUMN `ajustaEntrada` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `dias_esperados`
  ADD COLUMN `toleranciaSalidaMin` INT NOT NULL DEFAULT 0,
  ADD COLUMN `ajustaEntrada` TINYINT(1) NOT NULL DEFAULT 0;

-- Comprobación: las dos deben mostrar las columnas nuevas al final.
-- DESCRIBE horarios;
-- DESCRIBE dias_esperados;

-- Para revertir:
-- ALTER TABLE `horarios` DROP COLUMN `toleranciaSalidaMin`, DROP COLUMN `ajustaEntrada`;
-- ALTER TABLE `dias_esperados` DROP COLUMN `toleranciaSalidaMin`, DROP COLUMN `ajustaEntrada`;
