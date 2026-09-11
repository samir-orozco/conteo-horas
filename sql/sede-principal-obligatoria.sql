-- Quien trabaja presencial siempre tiene sede (11 de septiembre de 2026)
--
-- Decisión del dueño: «Sin sede» solo tiene sentido para un híbrido o un remoto.
-- En producción había 10 empresas sin ninguna sede y 33 presenciales activos sin
-- sede, porque nada lo aseguraba. El código nuevo lo asegura de aquí en adelante
-- (backend/src/utils/sedePrincipal.ts); este SQL arregla lo que ya existe.
--
-- NO cambia el esquema: no hay columnas nuevas, así que no toca prisma-build y es
-- seguro con el backend viejo o con el nuevo corriendo. La Sede principal nace SIN
-- ubicación, igual que la crea el código: no le exige GPS a nadie, y quien usaba la
-- ubicación general de la empresa la sigue usando igual.
--
-- La Sede principal no es una columna: es la sede ACTIVA más antigua de la empresa
-- (por creadoEn, y el id para desempatar). Es la misma regla del código.
--
-- phpMyAdmin: cada envío es una conexión nueva, así que los pasos 1 y 2 van en UN
-- SOLO envío, de START TRANSACTION a COMMIT.

-- ANTES, para anotar los números:
--
--   SELECT COUNT(*) AS empresas_sin_sede FROM empresas e
--   WHERE NOT EXISTS (SELECT 1 FROM sedes s WHERE s.empresaId = e.id AND s.activa = 1);
--
--   SELECT COUNT(*) AS presenciales_sin_sede FROM colaboradores c
--   WHERE c.modalidad = 'PRESENCIAL' AND NOT EXISTS (
--     SELECT 1 FROM colaboradores_sedes cs JOIN sedes s ON s.id = cs.sedeId
--     WHERE cs.colaboradorId = c.id AND s.activa = 1);

START TRANSACTION;

-- 1. Cada empresa sin ninguna sede activa recibe su «Sede principal».
INSERT INTO sedes (id, empresaId, nombre, direccion, lat, lng, radio, activa, creadoEn, actualizadoEn)
SELECT REPLACE(UUID(), '-', ''), e.id, 'Sede principal', NULL, NULL, NULL, 150, 1, NOW(3), NOW(3)
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM sedes s WHERE s.empresaId = e.id AND s.activa = 1);

-- 2. Cada presencial sin ninguna sede activa queda en la principal de su empresa.
-- Incluye a los retirados: si reingresan, ya tienen sede.
INSERT INTO colaboradores_sedes (colaboradorId, sedeId, creadoEn)
SELECT c.id,
       (SELECT s.id FROM sedes s
        WHERE s.empresaId = c.empresaId AND s.activa = 1
        ORDER BY s.creadoEn, s.id
        LIMIT 1),
       NOW(3)
FROM colaboradores c
WHERE c.modalidad = 'PRESENCIAL'
  AND NOT EXISTS (
    SELECT 1 FROM colaboradores_sedes cs JOIN sedes s ON s.id = cs.sedeId
    WHERE cs.colaboradorId = c.id AND s.activa = 1);

COMMIT;

-- DESPUÉS: las dos consultas de arriba tienen que dar 0.

-- 3. PENDIENTE DE LA DECISIÓN DEL DUEÑO, NO CORRER TODAVÍA.
--
-- Completar la sede de las marcaciones VIEJAS de presenciales (499 de 1.055 en
-- producción al 11 de septiembre de 2026). Ojo con lo que afirma: usa la modalidad
-- y las sedes de HOY, no las del día de la marca. Quien fue híbrido y hoy es
-- presencial, o cambió de sede, queda con la de hoy. Va después del paso 2, que
-- es el que garantiza que todo presencial tenga una sede activa.
--
--   UPDATE registros r
--   JOIN colaboradores c ON c.id = r.colaboradorId
--   SET r.sedeId = (
--     SELECT s.id FROM colaboradores_sedes cs JOIN sedes s ON s.id = cs.sedeId
--     WHERE cs.colaboradorId = c.id AND s.activa = 1
--     ORDER BY s.creadoEn, s.id
--     LIMIT 1)
--   WHERE c.modalidad = 'PRESENCIAL' AND r.sedeId IS NULL AND r.entrada IS NOT NULL;

-- PARA DESHACER los pasos 1 y 2. NOW(3) es el mismo instante para todas las filas
-- de una sentencia, así que cada paso se reconoce por su hora:
--
--   SELECT creadoEn, COUNT(*) FROM sedes WHERE nombre = 'Sede principal'
--   GROUP BY creadoEn ORDER BY creadoEn DESC LIMIT 3;
--   SELECT creadoEn, COUNT(*) FROM colaboradores_sedes
--   GROUP BY creadoEn ORDER BY creadoEn DESC LIMIT 3;
--
--   DELETE FROM colaboradores_sedes WHERE creadoEn = '<hora del paso 2>';
--   DELETE FROM sedes WHERE nombre = 'Sede principal' AND creadoEn = '<hora del paso 1>'
--     AND NOT EXISTS (SELECT 1 FROM registros r WHERE r.sedeId = sedes.id OR r.sedeSalidaId = sedes.id);
