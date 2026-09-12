-- La Sede principal de cada empresa (12 de septiembre de 2026)
--
-- DECISIÓN DEL DUEÑO del 12 de septiembre de 2026, que reemplaza a la del día 11:
-- la sede de un presencial se MUESTRA al leer y no se guarda. Los reportes y la
-- tabla de Registros le cuentan su sede con la etiqueta «por defecto»
-- (backend/src/utils/sedePrincipal.ts): su única sede, la más antigua de las suyas
-- o, si no tiene ninguna, la Sede principal de la empresa. «Sin sede» solo es
-- legítimo para un híbrido o un remoto.
--
-- Por eso este SQL hace UNA sola cosa: que cada empresa sin ninguna sede activa
-- tenga su «Sede principal», para que haya una sede por defecto que mostrarle a un
-- presencial sin sede. Las empresas nuevas ya nacen con ella
-- (backend/src/utils/sedesDeEmpresa.ts).
--
-- Lo que YA NO hace, a propósito:
--   - No le asigna la principal a ningún presencial: se le muestra sin asignársela,
--     y sigue marcando desde donde marca hoy.
--   - No completa la sede de las marcaciones viejas: se muestran al leer. La contra
--     que aceptó el dueño: si alguien cambia de sede, sus marcas sin ubicación pasan
--     a contar en la nueva.
--
-- NO cambia el esquema: no toca prisma-build. La Sede principal nace SIN ubicación,
-- igual que la crea el código, así que no le exige GPS a nadie y el kiosco no
-- cambia. Una empresa de plan de una sola sede configura su ubicación editando esta
-- sede: POST /sedes exige el plan Empresarial desde la segunda.
--
-- PROBADO: el INSERT es exactamente el del paso 1 de sede-principal-obligatoria.sql,
-- que se probó en MariaDB 12.3 el 11 de septiembre de 2026, y no se volvió a probar.
-- Lo que lo rodea (el conteo de antes en @antes, ROW_COUNT() y la fila final) es
-- nuevo y NO se corrió en ninguna base.
--
-- phpMyAdmin: cada envío es una conexión nueva, así que las variables y la
-- transacción no sobreviven entre envíos. Este archivo va ENTERO en un solo envío, y
-- la última consulta devuelve una fila con los tres números.

SELECT COUNT(*) INTO @antes
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM sedes s WHERE s.empresaId = e.id AND s.activa = 1);

START TRANSACTION;

-- Cada empresa sin ninguna sede activa recibe su «Sede principal», sin ubicación.
INSERT INTO sedes (id, empresaId, nombre, direccion, lat, lng, radio, activa, creadoEn, actualizadoEn)
SELECT REPLACE(UUID(), '-', ''), e.id, 'Sede principal', NULL, NULL, NULL, 150, 1, NOW(3), NOW(3)
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM sedes s WHERE s.empresaId = e.id AND s.activa = 1);

SET @creadas = ROW_COUNT();

COMMIT;

-- Tiene que dar: empresas_sin_sede_antes = sedes_principales_creadas, y
-- empresas_sin_sede_despues = 0.
SELECT
  @antes AS empresas_sin_sede_antes,
  @creadas AS sedes_principales_creadas,
  (SELECT COUNT(*) FROM empresas e
   WHERE NOT EXISTS (SELECT 1 FROM sedes s WHERE s.empresaId = e.id AND s.activa = 1)) AS empresas_sin_sede_despues;

-- PARA DESHACER, en otro envío. NOW(3) es el mismo instante para todas las filas de
-- una sentencia, así que las sedes que creó este archivo se reconocen por su hora:
--
--   SELECT creadoEn, COUNT(*) FROM sedes WHERE nombre = 'Sede principal'
--   GROUP BY creadoEn ORDER BY creadoEn DESC LIMIT 3;
--
-- y se borran solo las que nadie usa todavía. Las asignaciones cuelgan de la sede con
-- ON DELETE CASCADE, así que sin la primera guarda se irían con ella:
--
--   DELETE FROM sedes WHERE nombre = 'Sede principal' AND creadoEn = '<la hora de arriba>'
--     AND NOT EXISTS (SELECT 1 FROM colaboradores_sedes cs WHERE cs.sedeId = sedes.id)
--     AND NOT EXISTS (SELECT 1 FROM registros r WHERE r.sedeId = sedes.id OR r.sedeSalidaId = sedes.id);
