-- SOLO LECTURA (15 de octubre de 2026). Cuántas entradas de turnos nocturnos quedaron en la jornada equivocada.
-- El kiosco fecha la primera entrada con el día del reloj (backend/src/routes/worker.ts, `fecha: ... ?? inicioDia`):
-- quien tenía turno de 22:00 a 06:00 el día 14 y llegó a las 00:30 queda con su marcación en el 15. Entonces el 14 sale
-- como falta (asistencia del Inicio, «no ha llegado» de Telegram), el 15 como «llegó», y la llegada tarde no aparece.
--
-- Cuenta las primeras entradas de su fecha, de los últimos 60 días, hechas antes de la hora de salida de un turno
-- nocturno (salida antes que entrada) programado el día ANTERIOR, en el que la persona no tiene ninguna entrada.
SELECT COUNT(*) AS entradas, COUNT(DISTINCT r.colaboradorId) AS personas, COUNT(DISTINCT c.empresaId) AS empresas,
  MIN(DATE(r.fecha - INTERVAL 5 HOUR)) AS desde, MAX(DATE(r.fecha - INTERVAL 5 HOUR)) AS hasta
FROM registros r
JOIN colaboradores c ON c.id = r.colaboradorId
JOIN dias_esperados ant ON ant.colaboradorId = r.colaboradorId AND ant.fecha = r.fecha - INTERVAL 1 DAY
WHERE r.fecha >= UTC_TIMESTAMP() - INTERVAL 60 DAY AND r.entrada IS NOT NULL
  AND ant.programado = 1 AND ant.horaEntrada IS NOT NULL AND ant.horaSalida IS NOT NULL AND ant.horaSalida < ant.horaEntrada
  AND TIME(r.entrada - INTERVAL 5 HOUR) < TIME(ant.horaSalida)
  AND NOT EXISTS (SELECT 1 FROM registros r2 WHERE r2.colaboradorId = r.colaboradorId AND r2.fecha = ant.fecha AND r2.entrada IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM registros r0 WHERE r0.colaboradorId = r.colaboradorId AND r0.fecha = r.fecha AND r0.entrada IS NOT NULL AND r0.entrada < r.entrada);
