-- ¿ES CIERTO QUE EL FRAUDE PRODUCE UNA DISTANCIA "BAJA Y BUENA"?
--
-- `backend/src/utils/revisionMarcaciones.ts` descartó ordenar la cola de Revisión
-- por sospecha apoyándose en esta premisa, escrita antes de tener un solo dato:
--
--   "El fraude que se busca produce una marcación que se ve PERFECTA:
--    metodoEntrada = ROSTRO y una distancia baja y buena, porque el reconocedor
--    sí hizo match. [...] Cualquier puntaje armado con estos datos pondría el
--    fraude real de último en la cola."
--
-- Las dos marcaciones fraudulentas que sí se midieron dieron 0.4746 y 0.3947,
-- contra un umbral de rechazo de 0.50. Eso no es "baja y buena": está pegado al
-- techo. Si las honestas se agrupan bastante más abajo, la premisa es falsa y la
-- decisión de diseño hay que revisarla.
--
-- Dos puntos no son una distribución. Lo que decide es DÓNDE CAEN esos dos
-- dentro de la nube de las honestas, que es lo que responde la consulta C.
--
-- SOLO LECTURA. No modifica nada. Las cuatro van en un solo envío: phpMyAdmin
-- devuelve cuatro tablas.

-- A. cuánto material hay ya
SELECT
  COUNT(*)                                    AS `marcaciones con distancia`,
  COUNT(DISTINCT `colaboradorId`)             AS `personas distintas`,
  MIN(DATE(`fecha`))                          AS `desde`,
  MAX(DATE(`fecha`))                          AS `hasta`,
  ROUND(MIN(`distanciaEntrada`), 4)           AS `mínima`,
  ROUND(AVG(`distanciaEntrada`), 4)           AS `promedio`,
  ROUND(MAX(`distanciaEntrada`), 4)           AS `máxima`
FROM `registros`
WHERE `metodoEntrada` = 'ROSTRO' AND `distanciaEntrada` IS NOT NULL;

-- B. cómo se reparten las honestas
-- El agrupado va en una subconsulta y el formateo afuera. Escrito así porque
-- agrupar por FLOOR(x*20) y seleccionar FLOOR(x*20)/20 son expresiones DISTINTAS
-- para el planificador, y con sql_mode=only_full_group_by la consulta se cae.
-- Local (MySQL 9.7) lo rechaza; no quiero depender de cómo esté MariaDB en el
-- servidor.
SELECT
  CONCAT(LPAD(FORMAT(t.`b` / 20, 2), 5, ' '), ' a ', FORMAT(t.`b` / 20 + 0.05, 2)) AS `franja`,
  t.`n`                                                                            AS `n`,
  REPEAT('#', LEAST(60, t.`n`))                                                    AS `barra`
FROM (
  SELECT FLOOR(`distanciaEntrada` * 20) AS `b`, COUNT(*) AS `n`
  FROM `registros`
  WHERE `metodoEntrada` = 'ROSTRO' AND `distanciaEntrada` IS NOT NULL
  GROUP BY FLOOR(`distanciaEntrada` * 20)
) t
ORDER BY t.`b`;

-- C. LA QUE DECIDE: en qué percentil caen las dos fraudulentas conocidas.
-- Si caen arriba del percentil 90, la distancia SÍ separa y la premisa es falsa.
-- Si caen en la mitad de la nube, la premisa se sostiene y hay que dejarla en paz.
SELECT
  ROUND(f.`d`, 4)                                                            AS `distancia del fraude`,
  SUM(CASE WHEN r.`distanciaEntrada` <  f.`d` THEN 1 ELSE 0 END)             AS `honestas por debajo`,
  SUM(CASE WHEN r.`distanciaEntrada` >= f.`d` THEN 1 ELSE 0 END)             AS `honestas por encima`,
  ROUND(100 * SUM(CASE WHEN r.`distanciaEntrada` < f.`d` THEN 1 ELSE 0 END)
        / COUNT(*), 1)                                                       AS `percentil en el que cae`
FROM `registros` r
CROSS JOIN (SELECT 0.4746448041311579 AS `d` UNION ALL SELECT 0.3946627487574694) f
WHERE r.`metodoEntrada` = 'ROSTRO' AND r.`distanciaEntrada` IS NOT NULL
GROUP BY f.`d`
ORDER BY f.`d`;

-- D. la señal que NO depende de ninguna premisa: distancias exactamente repetidas.
-- Un descriptor reproducido (la misma foto mostrada dos veces) da SIEMPRE el
-- mismo número hasta el último decimal. Una cara viva jamás repite.
SELECT
  ROUND(`distanciaEntrada`, 12)      AS `distancia`,
  COUNT(*)                           AS `veces`,
  COUNT(DISTINCT `colaboradorId`)    AS `personas distintas`,
  MIN(DATE(`fecha`))                 AS `primera`,
  MAX(DATE(`fecha`))                 AS `última`
FROM `registros`
WHERE `metodoEntrada` = 'ROSTRO' AND `distanciaEntrada` IS NOT NULL
GROUP BY `distanciaEntrada`
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, `distanciaEntrada`;
