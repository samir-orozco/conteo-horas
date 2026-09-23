-- De qué turno del catálogo salió un día materializado (21 de septiembre de 2026).
--
-- ACTUALIZADO el 22 de septiembre de 2026, porque este encabezado quedó falso. Decía que la columna
-- no la escribía nadie y que el calendario deducía la etiqueta del turno («Mañana», «Tarde»,
-- «Noche») de las horas del día. Las dos cosas dejaron de ser ciertas:
--
--   · el planificador YA existe y la escribe (`pintarDiaDeColaborador`), junto con `origen = MANUAL`;
--   · la deducción por horas se quitó, porque se leía como un turno asignado que nadie había
--     asignado. Un día sin pintar muestra ahora el nombre de su HORARIO, y solo el que no tiene ni
--     turno ni horario dice «Sin asignar».
--
-- Sigue siendo cierto que las filas viejas tienen NULL y que eso es correcto: significa «este día no
-- lo pintó ningún turno».
--
-- ANULABLE y sin relleno hacia atrás, por lo mismo que `esDescanso`: NULL significa «este día no lo
-- pintó ningún turno», que es la verdad de todo lo que existe hoy. Inventar una plantilla para las
-- filas viejas sería afirmar algo que nadie decidió.
--
-- La clave foránea es RESTRICT por omisión, que es lo que se quiere: una plantilla que ya pintó
-- días no se puede borrar y dejar días apuntando al vacío. El catálogo ya desactiva en vez de
-- borrar (`PlantillaTurno.activa`) justo por esto.

ALTER TABLE `dias_esperados`
  ADD COLUMN `plantillaId` varchar(191) DEFAULT NULL,
  ADD INDEX `dias_esperados_plantillaId_idx` (`plantillaId`),
  ADD CONSTRAINT `dias_esperados_plantillaId_fkey`
    FOREIGN KEY (`plantillaId`) REFERENCES `plantillas_turno` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comprobación del EFECTO, no de que el ALTER no se quejara (CLAUDE.md §12.1):
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dias_esperados' AND COLUMN_NAME = 'plantillaId';
-- SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
-- WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'dias_esperados';
