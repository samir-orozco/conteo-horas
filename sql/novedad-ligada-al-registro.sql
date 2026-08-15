-- Novedad ligada a su marcación (15 de agosto de 2026)
--
-- Cuando alguien se va antes de su horario, el kiosco le pide el motivo y crea
-- una novedad. Hasta ahora esa novedad se guardaba solo con el colaborador y la
-- fecha, sin ninguna referencia a la marcación que la originó. Al borrar la
-- marcación, la novedad quedaba huérfana y pendiente de aprobar: quien la
-- aprobaba después excusaba una jornada cuya marcación ya no existe.
--
-- No se puede resolver identificándolas por colaborador y día, porque un día
-- puede tener VARIAS novedades legítimas —cita médica en la mañana, una urgencia
-- en la tarde—. Hace falta el vínculo explícito.
--
-- `registroId` es NULL para todo lo que ya existe, que es lo correcto: las
-- novedades históricas y las que carga un admin a mano no pertenecen a ninguna
-- marcación y deben seguir viviendo por su cuenta. Solo las nuevas, creadas
-- desde el kiosco, quedan ligadas.
--
-- ON DELETE CASCADE: borrar la marcación borra su novedad. La pantalla avisa en
-- el diálogo de confirmación antes de hacerlo — si la novedad ya estaba
-- aprobada, borrarla mueve la liquidación, y eso no puede pasar en silencio.
--
-- Se puede aplicar con el backend viejo corriendo: no conoce la columna y la
-- ignora. Como siempre, el SQL va ANTES que el código.

-- La colación se declara explícita: si no coincide con la de `registros`.`id`
-- (utf8mb4_unicode_ci) MySQL rechaza la llave foránea, y el error que da no
-- menciona la colación por ningún lado.
ALTER TABLE `permisos`
  ADD COLUMN `registroId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL;

-- Sin CREATE INDEX aparte: la llave foránea crea el suyo, y así la base de
-- producción queda idéntica a la que genera `prisma db push` en local — mismo
-- nombre de índice incluido. Comprobado con SHOW CREATE TABLE.
ALTER TABLE `permisos`
  ADD CONSTRAINT `permisos_registroId_fkey`
  FOREIGN KEY (`registroId`) REFERENCES `registros`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Comprobación: la columna nueva debe aparecer al final, en NULL en todas las filas.
-- DESCRIBE permisos;
-- SELECT COUNT(*) AS total, COUNT(registroId) AS ligadas FROM permisos;
--   → `ligadas` tiene que dar 0 justo después de aplicar esto.

-- Las novedades huérfanas que dejó el comportamiento anterior NO se recuperan:
-- no hay dato que diga de qué marcación vinieron. Para encontrarlas y revisarlas
-- a mano (novedades sin aprobar de un día sin ninguna marcación del colaborador):
--
-- SELECT p.id, p.colaboradorId, p.fechaInicio, p.tipo, p.descripcion
--   FROM permisos p
--   LEFT JOIN registros r
--     ON r.colaboradorId = p.colaboradorId AND DATE(r.fecha) = DATE(p.fechaInicio)
--  WHERE p.aprobado = 0 AND p.registroId IS NULL AND r.id IS NULL;

-- Para revertir:
-- ALTER TABLE `permisos` DROP FOREIGN KEY `permisos_registroId_fkey`;
-- ALTER TABLE `permisos` DROP COLUMN `registroId`;
