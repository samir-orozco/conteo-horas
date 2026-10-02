-- CUÁNTO SE SEPARAN LAS TOMAS DE UNA MISMA PERSONA. SOLO LECTURA: no escribe nada.
--
-- Se corre ANTES de desplegar la revisión del rostro nuevo (2 de octubre de 2026), para fijar
-- `MAX_ENTRE_TOMAS` en `backend/src/utils/revisionEnrolamiento.ts`, que hoy es 0,6 PROVISIONAL.
-- Con ese tope el servidor rechaza un registro cuya toma más lejana de la de FRENTE lo supere.
-- Si el tope queda por debajo de lo que dan las personas honestas, nadie de esa empresa podrá
-- volver a registrarse.
--
-- Mide lo mismo que la regla: cada toma contra la primera, que en el registro guiado es la de
-- frente (pasosEnrolar.ts). No una contra todas: el giro a un lado y el giro al otro pueden quedar
-- a 0,43 del frente cada uno y a más de 0,6 entre sí, y esa persona es honesta. En la base local,
-- una persona dio 0,513 todas contra todas y 0,419 contra el frente.
--
-- Probada contra la base local: da al tercer decimal lo mismo que `tomasCoherentes` en código.
--
-- CÓMO SE LEE. Una fila por persona, la más alejada primero. El tope va por encima de lo que dan
-- las personas honestas, con margen. Una fila muy por encima del resto (0,7 o más cuando las
-- demás andan por 0,4) no es un dato para el tope: es un registro que quedó con la cara de otra
-- persona, y hay que volver a registrarlo.
--
-- Filtra por la empresa de la sede LA DOCE. Para otra empresa, cambiar ese filtro en los dos
-- lugares. Solo mira `colaboradores`, que es pequeña: no toca `registros`.
--
-- OJO: las subconsultas llevan LIMIT 4000000000 a propósito. Sin él, MariaDB las funde y el join
-- se vuelve un producto cartesiano (medido en una MariaDB local en la revisión del 1 de octubre).

SELECT t.quien, COUNT(*) AS tomas_contra_el_frente, ROUND(MAX(t.d), 3) AS maxima
FROM (
  SELECT a.cid, a.quien, SQRT(SUM(POW(a.x - b.x, 2))) AS d
  FROM (SELECT c.id AS cid, CONCAT(c.nombre, ' ', c.apellido) AS quien, jt.m, jt.i, jt.x
        FROM colaboradores c
        JOIN JSON_TABLE(c.rostroDescriptor, '$[*]' COLUMNS (m FOR ORDINALITY, NESTED PATH '$[*]' COLUMNS (i FOR ORDINALITY, x DOUBLE PATH '$'))) jt
        WHERE c.empresaId IN (SELECT empresaId FROM sedes WHERE nombre LIKE '%DOCE%') AND c.activo = 1
          AND JSON_TYPE(JSON_EXTRACT(c.rostroDescriptor, '$[0]')) = 'ARRAY'
        LIMIT 4000000000) a
  JOIN (SELECT c.id AS cid, jt.m, jt.i, jt.x
        FROM colaboradores c
        JOIN JSON_TABLE(c.rostroDescriptor, '$[*]' COLUMNS (m FOR ORDINALITY, NESTED PATH '$[*]' COLUMNS (i FOR ORDINALITY, x DOUBLE PATH '$'))) jt
        WHERE c.empresaId IN (SELECT empresaId FROM sedes WHERE nombre LIKE '%DOCE%') AND c.activo = 1
          AND JSON_TYPE(JSON_EXTRACT(c.rostroDescriptor, '$[0]')) = 'ARRAY'
        LIMIT 4000000000) b
    ON b.cid = a.cid AND b.i = a.i AND a.m = 1 AND b.m > 1
  GROUP BY a.cid, a.quien, b.m
) t
GROUP BY t.cid, t.quien
ORDER BY maxima DESC;
