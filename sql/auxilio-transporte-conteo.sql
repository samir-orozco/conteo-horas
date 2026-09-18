-- CONTEO PREVIO al auxilio de transporte. SOLO LECTURA: no escribe nada.
--
-- Se corre ANTES de `auxilio-transporte.sql`, para saber a cuánta gente real afecta el cambio
-- antes de que se lo encuentren. Responde tres preguntas:
--
--   1. ¿A cuántas empresas se les va a bloquear el panel mañana?
--   2. ¿A cuántas personas les va a aparecer de golpe un auxilio en el reporte de nómina?
--   3. ¿A cuántas se las va a marcar como «parece incluir el auxilio»?
--
-- OJO CON LOS NÚMEROS ESCRITOS A MANO: esta consulta corre antes de que exista la tabla
-- `auxilios_vigencia`, así que el decreto de 2026 va literal y no leído de la base. Si se corre en
-- otro año, hay que cambiarlos:
--
--   auxilio 249.095 · tope 3.501.810 · salario mínimo 1.750.905   (Decreto 1470 de 2025)
--
-- Sin variables @ ni transacciones: en phpMyAdmin un SET no sobrevive al envío siguiente.
-- Entrar a la base ANTES de enviar cada bloque.

-- ===== 1. Empresas: cuántas verían el bloqueo =====
--
-- Bloquea a la que tiene gente activa. La que no tiene a nadie no tiene nada que revisar, y el SQL
-- de la migración la marca como revisada.
SELECT
  COUNT(*)                                                                   AS empresas_en_total,
  -- COALESCE y no `c.activos = 0` a secas: en un LEFT JOIN, la empresa sin colaboradores no trae
  -- un cero, trae NULL. Y `NULL = 0` no da falso, da NULL, así que esas empresas no entrarían en
  -- NINGUNO de los dos casos y desaparecerían del conteo sin avisar. Comprobado: sin el COALESCE
  -- esta consulta decía 0 empresas vacías donde hay 6, y contradecía al UPDATE de la migración,
  -- que las encuentra bien porque usa NOT EXISTS.
  SUM(CASE WHEN COALESCE(c.activos, 0) > 0 THEN 1 ELSE 0 END)                AS veran_el_bloqueo,
  SUM(CASE WHEN COALESCE(c.activos, 0) = 0 THEN 1 ELSE 0 END)                AS sin_gente_no_se_bloquean
FROM empresas e
LEFT JOIN (
  SELECT empresaId, COUNT(*) AS activos
  FROM colaboradores
  WHERE activo = 1
  GROUP BY empresaId
) c ON c.empresaId = e.id;

-- ===== 2. Personas: a cuántas les aparece un auxilio en el reporte =====
--
-- Hoy su campo queda en NULL, que significa «el del decreto si su básico da derecho». Así que a
-- todo el que gane hasta el tope le va a aparecer una línea de auxilio en la nómina desde el primer
-- día. No se le paga solo: aparece en el reporte.
SELECT
  COUNT(*)                                                                   AS activos_en_total,
  SUM(CASE WHEN salarioMensual <= 3501810 THEN 1 ELSE 0 END)                 AS les_aparece_auxilio,
  SUM(CASE WHEN salarioMensual >  3501810 THEN 1 ELSE 0 END)                 AS superan_el_tope
FROM colaboradores
WHERE activo = 1;

-- ===== 3. Personas marcadas como sospechosas =====
--
-- La marca NO adivina: es la aritmética exacta de quien escribió el total en vez del básico, o sea
-- básico menos auxilio igual al salario mínimo (1.750.905 + 249.095 = 2.000.000).
--
-- `ABS(... ) < 0.5` y no `=` porque la columna es `double`: comparar un decimal con igualdad es
-- pedir que el día de mañana un valor con cola de coma flotante se escape sin marcar.
SELECT
  COUNT(*)                                                                   AS personas_marcadas,
  COUNT(DISTINCT empresaId)                                                  AS empresas_con_marcados
FROM colaboradores
WHERE activo = 1
  AND ABS(salarioMensual - 249095 - 1750905) < 0.5;

-- ===== 4. El detalle, por si hay que avisarle a alguien =====
--
-- Las empresas con gente marcada, de mayor a menor. Son a las que conviene escribirles antes de
-- que se encuentren el bloqueo.
SELECT
  e.nombre                                                                   AS empresa,
  COUNT(*)                                                                   AS marcados,
  (SELECT COUNT(*) FROM colaboradores x WHERE x.empresaId = e.id AND x.activo = 1) AS activos
FROM colaboradores c
JOIN empresas e ON e.id = c.empresaId
WHERE c.activo = 1
  AND ABS(c.salarioMensual - 249095 - 1750905) < 0.5
GROUP BY e.id, e.nombre
ORDER BY marcados DESC;
