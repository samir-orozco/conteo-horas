-- Modalidad de trabajo del colaborador (1 de septiembre de 2026)
--
-- Hasta ahora la geocerca era una regla de la EMPRESA: si estaba configurada,
-- aplicaba a todo el mundo por igual, y quien trabaja desde la casa no podía
-- marcar nunca. Pasa a ser una regla de la PERSONA.
--
--   PRESENCIAL  se valida como siempre: fuera de la geocerca, la marca se rechaza.
--   HIBRIDO     nunca se bloquea. Si está dentro de una de sus sedes, queda
--               registrado en cuál; si no, marca igual y el registro no lleva sede.
--   REMOTO      no se le pide ni se le mira la ubicación.
--
-- El DDL no está escrito a mano: sale de correr `prisma db push` en local y
-- copiar el `SHOW CREATE TABLE colaboradores` resultante, para que producción
-- quede byte a byte como el esquema que Prisma espera.
--
-- ORDEN: este SQL va ANTES de subir el backend nuevo, y es seguro con el código
-- viejo corriendo. La columna tiene DEFAULT, así que los INSERT que no la nombran
-- (que son todos los del backend actual) siguen funcionando igual. Entre este
-- paso y el despliegue del código, el sistema se comporta exactamente como hoy.
--
-- Al revés SÍ es destructivo: cliente de Prisma nuevo contra tabla vieja son 500
-- en cada lectura de colaboradores, o sea el kiosco caído.

ALTER TABLE `colaboradores`
  ADD COLUMN `modalidad` enum('PRESENCIAL','HIBRIDO','REMOTO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESENCIAL';

-- Comprobación: todos los que ya existen tienen que quedar en PRESENCIAL, que es
-- como venían trabajando.
--
--   DESCRIBE colaboradores;
--   SELECT modalidad, COUNT(*) FROM colaboradores GROUP BY modalidad;

-- Para deshacer:
-- ALTER TABLE `colaboradores` DROP COLUMN `modalidad`;
