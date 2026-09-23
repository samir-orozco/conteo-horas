-- El día de descanso obligatorio de cada colaborador (20 de septiembre de 2026)
--
-- TRES COLUMNAS NUEVAS EN `colaboradores`, todas con valor por defecto o NULL. El código que corre
-- hoy no las conoce y las ignora, así que este SQL se puede correr ANTES de desplegar el backend y
-- no cambia el comportamiento de nada.
--
-- POR QUÉ HACEN FALTA. Hoy el motor decide el recargo dominical con el domingo escrito a mano
-- (`esDomingo = diaSemana === 'DOMINGO'`, horasColombiana.ts). Eso acierta por una razón frágil:
-- nadie ha podido registrar nunca otro día, así que la presunción legal se cumple sola. Pero la ley
-- presume el domingo SALVO acuerdo escrito, y medido en producción el 20 de septiembre de 2026:
--
--   22 horarios activos incluyen el domingo, en 8 empresas.
--   En 10 de ellos se trabajan los SIETE días: 26 personas de las que el sistema no puede saber
--   cuál es su descanso, porque la herramienta nunca les dejó decirlo.
--
-- QUÉ GUARDA CADA UNA:
--
--   descansoTipo       PRESUMIDO | FIJO | ROTATIVO
--                      PRESUMIDO es el domingo por presunción legal, y es el valor de TODOS hasta
--                      que alguien declare otra cosa. FIJO es otro día de la semana. ROTATIVO es
--                      «lo define el turno planificado de esa semana».
--
--   descansoDia        Solo con FIJO: "MIERCOLES". NULL en los otros dos.
--
--   descansoAcuerdoEn  Cuándo se firmó el acuerdo escrito. NULL = no hay acuerdo.
--                      Es la guarda legal: mover el descanso fuera del domingo solo vale con
--                      acuerdo, así que un FIJO o un ROTATIVO sin esta fecha se trata como
--                      PRESUMIDO y se le sigue pagando el recargo del domingo. El error tiene que
--                      poder equivocarse hacia pagar de más, nunca hacia pagar de menos.
--
-- POR QUÉ TEXTO Y NO ENUM. `Suscripcion.plan`, `cicloPago` y `DiaEsperado.origen` ya son texto con
-- los valores anotados en un comentario. El único enum de esta familia es `modalidad`, y su DDL
-- muestra el costo: agregar un cuarto valor obligaría a un ALTER de `colaboradores`, que es una
-- tabla con gente. Con texto es una línea de código.
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. Copia de seguridad de la base desde cPanel (Backup → Download a MySQL Database Backup).
-- 2. Entra a la base `ewyfwxbg_horapro` en phpMyAdmin ANTES de enviar. Aun así todos los nombres
--    van con la base escrita, que es la guarda de verdad (#1109 del 13 de septiembre de 2026).
-- 3. Este SQL va ANTES del backend nuevo, y DESPUÉS hay que actualizar `prisma-build`: el esquema
--    cambió, así que el despliegue lleva CUATRO ramas y no tres (CLAUDE.md §11).
--
-- ============================================================================
-- EL ALTER
-- ============================================================================
-- Las tres columnas en UNA sola sentencia: MariaDB las agrega en una pasada en vez de tres.
-- ALGORITHM=INSTANT va escrito: son columnas nuevas al final, sin llaves y sin índices, que es el
-- caso que MariaDB resuelve sin copiar la tabla. Si diera error, NO se le quita el ALGORITHM para
-- que pase: se para y se avisa.
--
-- El tiempo de espera del candado va con SET STATEMENT ... FOR y no con SET SESSION: en phpMyAdmin
-- un SET SESSION no llegó a la sentencia siguiente ni dentro del mismo envío (13/09/2026).

SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`colaboradores`
  ADD COLUMN `descansoTipo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESUMIDO',
  ADD COLUMN `descansoDia` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN `descansoAcuerdoEn` datetime(3) DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================================================================
-- COMPROBACIÓN (no es opcional: un comando puede informar éxito y no haber hecho nada)
-- ============================================================================
-- Tienen que salir las TRES columnas:
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
--   FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'colaboradores'
--    AND COLUMN_NAME LIKE 'descanso%';
--
-- Y TODO el mundo tiene que quedar en PRESUMIDO, que es lo que garantiza que no cambió nada:
-- SELECT descansoTipo, COUNT(*) FROM `ewyfwxbg_horapro`.`colaboradores` GROUP BY descansoTipo;

-- ============================================================================
-- PARA REVERTIR
-- ============================================================================
-- Sin riesgo mientras nadie haya declarado un día distinto; con declaraciones hechas, se pierden.
-- ALTER TABLE `ewyfwxbg_horapro`.`colaboradores`
--   DROP COLUMN `descansoTipo`, DROP COLUMN `descansoDia`, DROP COLUMN `descansoAcuerdoEn`;
