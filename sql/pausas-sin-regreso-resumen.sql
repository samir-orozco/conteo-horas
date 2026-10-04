-- PAUSAS SIN REGRESO A TIEMPO, RESUMEN (4 de octubre de 2026). SOLO LECTURA, no cambia nada.
--
-- Cuenta las salidas a almorzar o al descanso cuya siguiente entrada del mismo día llegó cuando la
-- pausa ya no esperaba regreso (fin del turno o la hora de volver, más una hora, nunca más de 18).
-- Hoy la nómina toma esa entrada como regreso y no descuenta lo fijado de la pausa. Para el descanso
-- el límite es el que ya usa el kiosco. Para el almuerzo es la regla PROPUESTA, que no existe aún.
--
-- Cómo correrla. En phpMyAdmin, entrar primero a la base, pestaña SQL, pegar y Continuar. Fuera de la
-- hora pico del kiosco. Tarda unos segundos.
--
-- Validada en una MariaDB desechable contra las funciones reales del backend (9.261 casos generados,
-- 12 sabotajes detectados). Los scripts de la prueba vivieron en el scratchpad de la sesión 7d238e55.
SELECT
  ca.tipo AS pausa,
  COUNT(*) AS salidas_a_la_pausa,
  SUM(ca.trasLimite = 1 AND ca.otroDia = 0) AS volvio_tras_el_limite_mismo_dia,
  SUM(ca.trasLimite = 1 AND ca.otroDia = 1) AS entrada_del_dia_siguiente_pegada,
  COUNT(DISTINCT IF(ca.trasLimite = 1, ca.colaboradorId, NULL)) AS personas,
  COUNT(DISTINCT IF(ca.trasLimite = 1, ca.empresaId, NULL)) AS empresas,
  IF(ca.tipo = 'ALMUERZO', SUM(IF(ca.trasLimite = 1, ca.minutosFijados, 0)), NULL) AS minutos_de_almuerzo_en_juego,
  SUM(ca.declaradoTrasLimite) AS hora_propuesta_aceptada_tarde,
  ROUND(SUM(IF(ca.declaradoTrasLimite = 1, TIMESTAMPDIFF(MINUTE, ca.sigEntrada, ca.sigCreado), 0)) / 60, 1) AS horas_en_juego,
  DATE(MIN(ca.fecha) - INTERVAL 5 HOUR) AS desde,
  DATE(MAX(ca.fecha) - INTERVAL 5 HOUR) AS hasta
FROM (
  -- trasLimite. La siguiente entrada llegó cuando la pausa ya no esperaba regreso. Hoy la nómina la toma
    -- como regreso y no descuenta lo fijado de la pausa.
    -- otroDia. Esa entrada cayó en otro día de Bogotá y quedó pegada al día de la pausa.
    -- declaradoTrasLimite. La persona eligió en el kiosco la hora propuesta (A las 13:00) cuando ya había
    -- pasado el límite. Se registró a la hora de creadoEn.
    SELECT cl.*,
      COALESCE(cl.sigEntrada > cl.limite, 0) AS trasLimite,
      COALESCE(DATE(cl.sigEntrada - INTERVAL 5 HOUR) <> DATE(cl.fecha - INTERVAL 5 HOUR), 0) AS otroDia,
      COALESCE(cl.sigEstimada = 1 AND cl.sigCreado > cl.limite, 0) AS declaradoTrasLimite
    FROM (
    SELECT r.id, r.colaboradorId, r.empresaId, r.fecha, r.salida, r.siguienteId, r.sigEntrada, r.sigCreado, r.sigEstimada, r.sigEditado,
        IF(r.salidaDescanso = 1, 'DESCANSO', 'ALMUERZO') AS tipo,
        -- Lo fijado del almuerzo, que es lo máximo que la nómina deja de descontar. Para los descansos no
        -- se calcula, porque se cobran juntos y una entrada tardía perdona todos los del día.
        IF(r.salidaDescanso = 1, NULL, r.almuerzoMin) AS minutosFijados,
        -- Hasta cuándo espera el regreso. El fin del turno, o la hora de volver si es más tarde, más una
        -- hora de gracia, y nunca más de 18 horas. Sin franja del día, 18 horas. Es la regla que el kiosco
        -- ya usa para el descanso (limiteDeEsperaDelDescanso). Para el almuerzo es la PROPUESTA.
        IF(r.finTurno IS NULL, r.salida + INTERVAL 18 HOUR,
           LEAST(r.salida + INTERVAL 18 HOUR,
                 GREATEST(r.finTurno, IF(r.salidaDescanso = 1, r.regresoDescanso, r.regresoAlmuerzo)) + INTERVAL 60 MINUTE)) AS limite
      FROM (
      -- A qué hora le tocaba volver (regresoEsperadoDelDescanso), igual para las dos pausas. El fin de la
        -- ventana si salió dentro de ella, y si no, la salida más lo que dura la ventana. Sin ventana, la salida.
        SELECT i.*,
          IF(i.dvOk AND i.diaFecha IS NOT NULL,
             IF((i.salida >= i.dI AND i.salida < i.dF) OR (i.salida >= i.dI + INTERVAL 1 DAY AND i.salida < i.dF + INTERVAL 1 DAY),
                IF(i.salida > i.dF, i.dF + INTERVAL 1 DAY, i.dF),
                i.salida + INTERVAL IF(i.mDF > i.mDI, i.mDF - i.mDI, 1440 - i.mDI + i.mDF) MINUTE),
             i.salida) AS regresoDescanso,
          IF(i.alOk AND i.diaFecha IS NOT NULL,
             IF((i.salida >= i.aI AND i.salida < i.aF) OR (i.salida >= i.aI + INTERVAL 1 DAY AND i.salida < i.aF + INTERVAL 1 DAY),
                IF(i.salida > i.aF, i.aF + INTERVAL 1 DAY, i.aF),
                i.salida + INTERVAL IF(i.mAF > i.mAI, i.mAF - i.mAI, 1440 - i.mAI + i.mAF) MINUTE),
             i.salida) AS regresoAlmuerzo
        FROM (
        SELECT m.*,
            -- Fin del turno del día de la fila. La franja que cruza la medianoche termina al día siguiente.
            IF(m.diaFecha IS NOT NULL AND m.entOk AND m.salOk,
               m.diaFecha + INTERVAL (m.mE + IF(m.mS > m.mE, m.mS - m.mE, 1440 - m.mE + m.mS)) MINUTE, NULL) AS finTurno,
            -- Inicio y fin de cada ventana. El fin pasa al día siguiente si no es mayor que el inicio.
            m.diaFecha + INTERVAL m.mDI MINUTE AS dI,
            m.diaFecha + INTERVAL m.mDF MINUTE + INTERVAL IF(m.mDF <= m.mDI, 1, 0) DAY AS dF,
            m.diaFecha + INTERVAL m.mAI MINUTE AS aI,
            m.diaFecha + INTERVAL m.mAF MINUTE + INTERVAL IF(m.mAF <= m.mAI, 1, 0) DAY AS aF
          FROM (
          SELECT v.*,
              IF(v.entOk, CAST(SUBSTRING(v.horaEntrada, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.horaEntrada, 4, 2) AS UNSIGNED), NULL) AS mE,
              IF(v.salOk, CAST(SUBSTRING(v.horaSalida, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.horaSalida, 4, 2) AS UNSIGNED), NULL) AS mS,
              IF(v.dvOk, CAST(SUBSTRING(v.dvIni, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.dvIni, 4, 2) AS UNSIGNED), NULL) AS mDI,
              IF(v.dvOk, CAST(SUBSTRING(v.dvFin, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.dvFin, 4, 2) AS UNSIGNED), NULL) AS mDF,
              IF(v.alOk, CAST(SUBSTRING(v.almuerzoInicio, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.almuerzoInicio, 4, 2) AS UNSIGNED), NULL) AS mAI,
              IF(v.alOk, CAST(SUBSTRING(v.almuerzoFin, 1, 2) AS UNSIGNED) * 60 + CAST(SUBSTRING(v.almuerzoFin, 4, 2) AS UNSIGNED), NULL) AS mAF
            FROM (
            -- Una hora vale si es HH:MM, cinco caracteres, con HH de 00 a 23 y MM de 00 a 59 (horaValida).
              -- Una ventana vale si sus dos horas valen y no son iguales (leerVentana).
              SELECT x.*,
                COALESCE(CHAR_LENGTH(x.horaEntrada) = 5 AND x.horaEntrada REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.horaEntrada, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.horaEntrada, 4, 2) AS UNSIGNED) <= 59, 0) AS entOk,
                COALESCE(CHAR_LENGTH(x.horaSalida) = 5 AND x.horaSalida REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.horaSalida, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.horaSalida, 4, 2) AS UNSIGNED) <= 59, 0) AS salOk,
                COALESCE(CHAR_LENGTH(x.dvIni) = 5 AND x.dvIni REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.dvIni, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.dvIni, 4, 2) AS UNSIGNED) <= 59
                  AND CHAR_LENGTH(x.dvFin) = 5 AND x.dvFin REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.dvFin, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.dvFin, 4, 2) AS UNSIGNED) <= 59
                  AND x.dvIni <> x.dvFin, 0) AS dvOk,
                COALESCE(CHAR_LENGTH(x.almuerzoInicio) = 5 AND x.almuerzoInicio REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.almuerzoInicio, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.almuerzoInicio, 4, 2) AS UNSIGNED) <= 59
                  AND CHAR_LENGTH(x.almuerzoFin) = 5 AND x.almuerzoFin REGEXP '^[0-9]{2}:[0-9]{2}$' AND CAST(SUBSTRING(x.almuerzoFin, 1, 2) AS UNSIGNED) <= 23 AND CAST(SUBSTRING(x.almuerzoFin, 4, 2) AS UNSIGNED) <= 59
                  AND x.almuerzoInicio <> x.almuerzoFin, 0) AS alOk
              FROM (
              SELECT cs.*, c.empresaId,
                  n.entrada AS sigEntrada, n.creadoEn AS sigCreado, n.entradaEstimada AS sigEstimada, n.editadoEn AS sigEditado,
                  d.fecha AS diaFecha, d.horaEntrada, d.horaSalida, d.almuerzoMin, d.almuerzoInicio, d.almuerzoFin,
                  -- La ventana del descanso al que salió, guardada como 09:00-09:15
                  IF(LENGTH(cs.descansoVentana) - LENGTH(REPLACE(cs.descansoVentana, '-', '')) = 1,
                     TRIM(SUBSTRING_INDEX(cs.descansoVentana, '-', 1)), NULL) AS dvIni,
                  IF(LENGTH(cs.descansoVentana) - LENGTH(REPLACE(cs.descansoVentana, '-', '')) = 1,
                     TRIM(SUBSTRING_INDEX(cs.descansoVentana, '-', -1)), NULL) AS dvFin
                FROM (
                -- La primera entrada del MISMO día después de la salida, que es la que la nómina toma como regreso.
                  -- Y el día esperado de ese día (el primero, si por error hubiera dos).
                  SELECT pa.*,
                    (SELECT n.id FROM registros n
                      WHERE n.colaboradorId = pa.colaboradorId
                        AND n.fecha >= pa.dia0 AND n.fecha < pa.dia0 + INTERVAL 1 DAY
                        AND n.entrada > pa.salida
                      ORDER BY n.entrada, n.id LIMIT 1) AS siguienteId,
                    (SELECT d2.id FROM dias_esperados d2
                      WHERE d2.colaboradorId = pa.colaboradorId
                        AND d2.fecha >= pa.dia0 AND d2.fecha < pa.dia0 + INTERVAL 1 DAY
                      -- Sin desempate por id: la llave única (colaboradorId, fecha) no deja dos en el mismo instante, y
                      -- ordenar solo por fecha deja usar el índice. Con el id, recorría el índice entero en cada pausa.
                      ORDER BY d2.fecha LIMIT 1) AS diaId
                  FROM (
                  -- Cada salida a una pausa (almuerzo o descanso) con su entrada, como la toma la nómina.
                    -- dia0 es la medianoche de Bogotá de su día.
                    SELECT p.id, p.colaboradorId, p.fecha, p.salida, p.salidaDescanso, p.descansoVentana,
                           TIMESTAMP(DATE(p.fecha - INTERVAL 5 HOUR)) + INTERVAL 5 HOUR AS dia0
                    FROM registros p
                    WHERE (p.salidaAlmuerzo = 1 OR p.salidaDescanso = 1) AND p.salida IS NOT NULL AND p.entrada IS NOT NULL
                ) pa
                  -- Este LIMIT no recorta nada. Obliga a hacer las dos búsquedas UNA vez por pausa, porque sin él
                  -- MariaDB las repite. En la prueba con 78 mil marcaciones, 4 segundos con él y 7,5 sin él.
                  LIMIT 18446744073709551615
              ) cs
                JOIN colaboradores c ON c.id = cs.colaboradorId
                LEFT JOIN registros n ON n.id = cs.siguienteId
                LEFT JOIN dias_esperados d ON d.id = cs.diaId
            ) x
          ) v
        ) m
      ) i
    ) r
  ) cl
) ca
GROUP BY ca.tipo;
