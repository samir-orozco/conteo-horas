-- Auxilio de transporte (17 de septiembre de 2026)
--
-- El valor de la hora se calcula sobre el salario, y hasta hoy el salario era UN SOLO campo. Eso
-- dejaba al administrador con dos salidas y las dos malas:
--
--   * No meter el auxilio en ninguna parte: el reporte nunca muestra lo que la persona recibe.
--   * Meterlo dentro del salario para que aparezca: el valor de la hora sube, y con él CADA hora
--     extra y CADA recargo. En el salario mínimo son 249.095 sobre 1.750.905, o sea 14,2% de más
--     en todo lo que se pague por encima de la jornada.
--
-- El auxilio no es salario (Ley 15 de 1959). No entra en la base de las horas extra ni de los
-- recargos, ni en seguridad social ni en parafiscales. Sí entra en cesantías, sus intereses y la
-- prima. No se paga en vacaciones, incapacidad ni licencia, porque no hubo desplazamiento.
--
-- Este SQL hace tres cosas:
--   1. La columna del auxilio en cada persona (NULL = el del decreto si su básico da derecho,
--      0 = esta empresa no lo paga, otro número = un valor pactado).
--   2. La marca de «esta empresa ya revisó sus salarios», en NULL para todas las que existen hoy.
--   3. La tabla de vigencias del decreto, con sus dos filas. Va en tabla y no en el código por la
--      misma razón que la jornada legal: un reporte de diciembre tiene que seguir mostrando el
--      valor de diciembre, y el decreto de enero no puede reescribir la historia.
--
-- El DDL no está escrito a mano: sale de correr `prisma db push` en local y copiar el
-- `SHOW CREATE TABLE` resultante, para que producción quede byte a byte como el esquema que Prisma
-- espera.
--
-- ORDEN: este SQL va ANTES de subir el backend nuevo, y es seguro con el código viejo corriendo.
-- La columna admite NULL y la tabla nueva no la lee nadie todavía, así que entre este paso y el
-- despliegue el sistema se comporta exactamente como hoy.
--
-- Al revés SÍ es destructivo: backend nuevo contra base vieja son 500 en cada lectura de
-- colaboradores y en el reporte de nómina.
--
-- OJO: este cambio toca `schema.prisma`, así que el despliegue lleva CUATRO ramas y no tres.
-- `prisma-build` va ANTES del backend (CLAUDE.md, sección 11).

-- ===== 1. La columna del auxilio en cada persona =====
ALTER TABLE `colaboradores`
  ADD COLUMN `auxilioTransporte` double DEFAULT NULL;

-- ===== 2. La marca de «esta empresa ya revisó sus salarios» =====
--
-- Las empresas que ya existen tienen los salarios capturados con UN solo campo, así que no se sabe
-- cuáles incluyen el auxilio por dentro. El panel les va a pedir revisarlos, y esta columna recuerda
-- quién ya lo hizo.
--
-- Queda en NULL para todas las que existen hoy, que es justo lo que se quiere: todas pendientes.
-- Las que se creen a partir del despliegue nacen con fecha puesta desde el código (auth.ts y
-- admin.ts), porque capturan el básico y el auxilio por separado desde el primer día.
--
-- Vive en la empresa y no en el navegador a propósito: limpiar el localStorage o entrar desde otro
-- equipo no puede hacer que el aviso reaparezca, ni que una persona lo descarte y el resto de la
-- empresa nunca se entere de que los datos están mal.
ALTER TABLE `empresas`
  ADD COLUMN `auxilioRevisadoEn` datetime(3) DEFAULT NULL;

-- Pero NO todas quedan pendientes: las que hoy no tienen NI UN colaborador activo no tienen nada
-- que revisar. La sospecha que persigue todo esto es aritmética sobre un salario (básico menos
-- auxilio igual al mínimo), y sin salarios no hay aritmética posible. A esas el modal les saldría
-- con la tabla vacía y nada que corregir.
--
-- Salió de correr el diagnóstico contra la base real antes de desplegar: de 10 empresas que
-- quedaban bloqueadas, 6 estaban así.
--
-- Va DESPUÉS del ALTER de arriba. Es idempotente: no toca a quien ya tenga fecha, así que
-- reenviarlo no cambia nada.
UPDATE `empresas` e
SET e.`auxilioRevisadoEn` = NOW(3)
WHERE e.`auxilioRevisadoEn` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `colaboradores` c
    WHERE c.`empresaId` = e.`id` AND c.`activo` = 1
  );

-- Comprobación: las que quedan pendientes son exactamente las que tienen gente activa.
--
--   SELECT COUNT(*) FROM empresas WHERE auxilioRevisadoEn IS NULL;
--   SELECT COUNT(DISTINCT empresaId) FROM colaboradores WHERE activo = 1;   -- los dos dan igual

-- ===== 3. Las vigencias del decreto =====
CREATE TABLE `auxilios_vigencia` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vigenteDesde` datetime(3) NOT NULL,
  `valor` double NOT NULL,
  `tope` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auxilios_vigencia_vigenteDesde_key` (`vigenteDesde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Las fechas van a medianoche de BOGOTÁ, que son las 05:00 UTC. El tope es dos salarios mínimos
-- del año. Reenviar esto no duplica nada: la fecha es única.
INSERT INTO `auxilios_vigencia` (`id`, `vigenteDesde`, `valor`, `tope`) VALUES
  ('aux-vig-2025', '2025-01-01 05:00:00.000', 200000, 2847000),  -- Decreto 1573 de 2024
  ('aux-vig-2026', '2026-01-01 05:00:00.000', 249095, 3501810)   -- Decreto 1470 de 2025
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`), `tope` = VALUES(`tope`);

-- Comprobaciones:
--
--   DESCRIBE colaboradores;                       -- auxilioTransporte, double, NULL, default NULL
--   SELECT COUNT(*) FROM colaboradores WHERE auxilioTransporte IS NOT NULL;   -- 0: nadie tiene valor propio todavía
--   SELECT vigenteDesde, valor, tope FROM auxilios_vigencia ORDER BY vigenteDesde;  -- las dos filas

-- Para deshacer:
-- ALTER TABLE `colaboradores` DROP COLUMN `auxilioTransporte`;
-- DROP TABLE `auxilios_vigencia`;
