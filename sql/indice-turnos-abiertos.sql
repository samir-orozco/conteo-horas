-- Índice para el barrido de turnos sin salida (1 de septiembre de 2026)
--
-- El auto-cierre pregunta cada hora "¿qué turnos quedaron abiertos en días ya
-- pasados?":
--
--   WHERE salidaEstimada = 0 AND salida IS NULL AND entrada < medianoche_de_hoy
--
-- `registros` no tiene ningún índice que sirva para eso: solo la clave primaria
-- y las dos de llave foránea (colaboradorId, sedeId). El plan real, medido, es
-- `Table scan on registros`. Hoy son cientos de filas y da lo mismo; el problema
-- es que crece con TODO el historial de marcaciones de TODAS las empresas, y esa
-- es la tabla que más rápido crece del producto.
--
-- Medido sobre una tabla de prueba con la misma estructura y 1.048.576 filas:
--
--   sin índice   Table scan sobre 1,04M filas              233 ms
--   con índice   Covering index range scan, 30 filas         0 ms
--
-- El orden de las columnas importa y no es arbitrario: MySQL solo puede usar
-- todas las partes de un índice compuesto si las igualdades van primero y el
-- rango va último. `salidaEstimada = 0` y `salida IS NULL` son igualdades
-- (InnoDB indexa los NULL), y `entrada <` es el rango. Con ese orden la consulta
-- se resuelve leyendo solo el índice, sin tocar la tabla.
--
-- Se aplica AHORA, con la tabla pequeña, porque el ALTER es instantáneo con
-- pocas filas y caro con millones. Es aditivo: no cambia ni una fila, no toca
-- ninguna columna, y el backend viejo sigue funcionando igual (un índice no
-- cambia lo que la consulta devuelve, solo cómo se busca).

ALTER TABLE `registros`
  ADD INDEX `registros_salidaEstimada_salida_entrada_idx` (`salidaEstimada`, `salida`, `entrada`);

-- Comprobación: el plan tiene que decir "index range scan", no "Table scan".
--
--   EXPLAIN SELECT id FROM registros
--   WHERE salidaEstimada = 0 AND salida IS NULL AND entrada < NOW();

-- Para deshacer:
-- ALTER TABLE `registros` DROP INDEX `registros_salidaEstimada_salida_entrada_idx`;
