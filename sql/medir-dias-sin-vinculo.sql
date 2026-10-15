-- SOLO LECTURA (15 de octubre de 2026). Cuánta gente le exige el reporte por persona (/reportes/liquidacion) días en
-- que NO estaba vinculada, y cuánto vale. Los días del período anteriores a su alta (o a su reingreso), y los
-- posteriores a su retiro, no tienen fila en dias_esperados y se exigen con el horario: salen como faltante. Para una
-- alta, un reingreso o un retiro de verdad eso hace de prorrateo (por horas, inexacto); para alguien que YA
-- trabajaba y la empresa registró tarde (tiene un contrato anterior a su alta), es un descuento indebido.
-- Ver backend/prisma/diagnostico-salario-a-mitad-de-periodo.ts.
--
-- Estimación: días hábiles según las franjas de su horario ACTIVO de hoy, sin los festivos nacionales; minutos de cada
-- franja menos el almuerzo; valor de la hora con 210 h al mes (jornada de 42 h). Quien no tiene horario activo (solo
-- turnos programados) no entra. Un reingreso cuenta desde el inicio del período hasta su fecha.
WITH RECURSIVE n AS (SELECT 0 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 15),
p AS (SELECT DATE('2026-09-01') AS desde, DATE('2026-09-15') AS hasta UNION ALL SELECT DATE('2026-09-16'), DATE('2026-09-30') UNION ALL SELECT DATE('2026-10-01'), DATE('2026-10-15')),
t AS (
  SELECT p.desde, IF(EXISTS(SELECT 1 FROM contratos k WHERE k.colaboradorId = c.id AND DATE(k.fechaInicio - INTERVAL 5 HOUR) < DATE(c.creadoEn - INTERVAL 5 HOUR)), 'ALTA_YA_TRABAJABA', 'ALTA_NUEVA') AS tipo, c.id, p.desde AS t0, DATE(c.creadoEn - INTERVAL 5 HOUR) AS t1
  FROM p JOIN colaboradores c ON DATE(c.creadoEn - INTERVAL 5 HOUR) > p.desde AND DATE(c.creadoEn - INTERVAL 5 HOUR) <= p.hasta
  UNION ALL
  SELECT p.desde, 'REINGRESO', e.colaboradorId, p.desde, DATE(e.fecha - INTERVAL 5 HOUR)
  FROM p JOIN vinculacion_eventos e ON e.tipo = 'REINGRESO' AND DATE(e.fecha - INTERVAL 5 HOUR) > p.desde AND DATE(e.fecha - INTERVAL 5 HOUR) <= p.hasta
  UNION ALL
  SELECT p.desde, 'RETIRO', e.colaboradorId, DATE(e.fecha - INTERVAL 5 HOUR) + INTERVAL 1 DAY, p.hasta + INTERVAL 1 DAY
  FROM p JOIN vinculacion_eventos e ON e.tipo = 'RETIRO' AND DATE(e.fecha - INTERVAL 5 HOUR) >= p.desde AND DATE(e.fecha - INTERVAL 5 HOUR) < p.hasta
),
d AS (SELECT t.desde, t.tipo, t.id, t.t0 + INTERVAL n.i DAY AS dia FROM t JOIN n ON t.t0 + INTERVAL n.i DAY < t.t1),
m AS (
  SELECT d.desde, d.tipo, d.id, c.empresaId, c.salarioMensual,
    SUM((TIME_TO_SEC(TIMEDIFF(f.horaSalida, f.horaEntrada)) + IF(f.horaSalida <= f.horaEntrada, 86400, 0)) / 60 - IF(f.tieneAlmuerzo, h.almuerzoMin, 0)) AS minutos
  FROM d JOIN colaboradores c ON c.id = d.id JOIN horarios h ON h.id = c.horarioId AND h.activo = 1
  JOIN franjas_horario f ON f.horarioId = h.id AND JSON_CONTAINS(f.dias, JSON_QUOTE(ELT(DAYOFWEEK(d.dia), 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO')))
  WHERE NOT EXISTS (SELECT 1 FROM dias_festivos x WHERE x.empresaId IS NULL AND DATE(x.fecha - INTERVAL 5 HOUR) = d.dia)
  GROUP BY d.desde, d.tipo, d.id, c.empresaId, c.salarioMensual
)
SELECT desde AS periodo, tipo, COUNT(*) AS personas, COUNT(DISTINCT empresaId) AS empresas, ROUND(SUM(minutos) / 60) AS horas, ROUND(SUM(minutos / 60 * salarioMensual / 210)) AS pesos_aprox
FROM m GROUP BY desde, tipo ORDER BY desde, tipo;
