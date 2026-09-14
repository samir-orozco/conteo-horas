-- Registro facial por enlace: la persona registra su rostro ella misma y queda constancia
-- (14 de septiembre de 2026)
--
-- Pedido del dueño del 14 de septiembre de 2026: desde la ficha del colaborador, el
-- administrador crea un enlace que dura una hora y sirve una sola vez. Con él, la persona
-- confirma su cédula, lee la autorización y decide: registra su rostro, o dice que no
-- autoriza el uso de sus datos biométricos. Lo que decida queda como constancia, con la
-- fecha, el texto exacto que leyó y desde dónde lo hizo. Si ya tenía rostro y no autoriza,
-- el registro se borra (decisión del dueño). Las tomas del escaneo NO se guardan.
--
-- Tres cambios, todos seguros con el código viejo corriendo, porque el código viejo no los
-- lee:
--
--   colaboradores.rostroRechazadoEn   datetime(3), NULL
--       Cuándo dijo que no autoriza. Todos quedan en NULL: nadie lo ha dicho todavía.
--
--   enlaces_registro_facial   tabla nueva, vacía
--       Un enlace por fila: la huella SHA-256 del token (nunca el token), cuándo vence,
--       cuándo se usó o se anuló, los intentos de cédula equivocada y quién lo creó.
--
--   constancias_biometricas   tabla nueva, vacía
--       Una fila por decisión: AUTORIZA o NO_AUTORIZA, desde el ENLACE o por el
--       ADMINISTRADOR, el texto exacto, la casilla de mayor de edad y quién.
--
-- Los registros faciales que ya existen NO reciben constancia hacia atrás: no hay con qué
-- escribirla con verdad. La ficha los muestra con sus tomas y sin decir quién los hizo.
--
-- Las dos tablas nuevas tienen llave foránea a `colaboradores` con ON DELETE CASCADE, como
-- las demás tablas de la persona, y la llave va DENTRO del CREATE TABLE. No hay ningún
-- ALTER ... ADD CONSTRAINT sobre una tabla con filas, que es lo que dio el #1846 del 13 de
-- septiembre de 2026.
--
-- Cada sentencia lleva su tiempo de espera del candado con SET STATEMENT ... FOR, y no con
-- SET SESSION: en phpMyAdmin un SET SESSION no llegó a la sentencia siguiente, ni siquiera
-- dentro del mismo envío (13 de septiembre de 2026). El ALTER lleva ALGORITHM=INSTANT
-- escrito. Si sale un error, NO se le quita el ALGORITHM para que pase: se para y se avisa.
--
-- Todos los nombres van con la base escrita (`ewyfwxbg_horapro`.`tabla`): el 13 de
-- septiembre de 2026 un envío que mezclaba information_schema con tablas sin base corrió
-- dentro de information_schema (#1109).
--
-- IF NOT EXISTS en todo: si algo falla a la mitad, el paso se vuelve a correr y salta lo
-- que ya quedó hecho.
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. El abogado aprobó el texto de la autorización del enlace (src/utils/registroFacial.ts,
--    textoAutorizacionEnlace) y los cambios de la política de privacidad. Sin eso, no se
--    despliega: la política publicada hoy dice cosas que esto contradice.
-- 2. Copia de seguridad de la base desde cPanel.
-- 3. Lo que corre hoy en producción es el despliegue del 13 de septiembre de 2026, de
--    develop d01f35a:
--
--      prisma-build   4728a26
--      backend-build  e91769f
--      frontend-build 09c0c51
--
--    Ese cliente de Prisma NO conoce `rostroRechazadoEn` ni las dos tablas.
--    [EN EL SERVIDOR], tiene que dar 0:
--        grep -c "rostroRechazadoEn" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--    [EN TU MÁQUINA], tiene que dar OBLIGATORIO:
--        git diff --name-only d01f35a..HEAD | grep -q 'schema.prisma' && echo "OBLIGATORIO actualizar prisma-build" || echo "prisma-build no se toca"
--        git diff d01f35a..HEAD -- backend/prisma/schema.prisma
--    El diff del esquema tiene que traer SOLO la columna y las dos tablas de este archivo,
--    con sus dos enums. Si aparece otra cosa, se para.
--
-- ============================================================================
-- ORDEN DEL DESPLIEGUE (CLAUDE.md §11): SQL, prisma-build, backend, frontend
-- ============================================================================
-- Solo con permiso explícito del dueño. En phpMyAdmin, primero se selecciona la base
-- ewyfwxbg_horapro en el panel izquierdo, y cada paso va en su propio envío.
--
-- El paso 1 toca `colaboradores`, que el kiosco lee en cada ingreso. Mientras el ALTER
-- espera su candado, los ingresos hacen fila detrás de él, hasta 10 segundos. Por eso se
-- corre fuera de las horas de entrada y salida.
--
--   1. [phpMyAdmin] El PASO 0, y anotar lo que devuelve.
--   2. [phpMyAdmin] Los PASOS 1, 2 y 3, cada uno en su envío, y el PASO 4.
--   3. prisma-build, generado desde un árbol limpio en HEAD, con rsync SIN --delete.
--      Sobre el artefacto, antes de subirlo:
--        grep -c "rostroRechazadoEn" deploy-prisma-client/index.d.ts      (distinto de 0)
--      [EN EL SERVIDOR], después de copiarlo y ANTES del restart:
--        grep -c "rostroRechazadoEn" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Cero = el cliente es el viejo y el backend nuevo va a fallar: se para.
--   4. backend-build, desde el mismo árbol limpio. [EN EL SERVIDOR], antes del restart:
--        grep -c "registro-facial" ~/horapro-co-api/dist/index.js          (distinto de 0)
--      LiteSpeed no mata los procesos viejos con el restart: se buscan con ps y se matan
--      por PID, nunca con pkill. Lo que demuestra que vive el código nuevo, repetido 20
--      veces por los procesos viejos que puedan quedar:
--        una ruta pública que consulta la base: GET /api/registro-facial/ seguido de 43
--        letras x, responde 404 con ENLACE_NO_EXISTE en el cuerpo (el código viejo
--        también da 404, pero sin ese código);
--        una ruta con sesión: POST /api/colaboradores/x/enlace-rostro sin token responde
--        401 (el viejo da 404).
--   5. frontend-build. La trampa del .env.local (CLAUDE.md §4). Las tabletas del kiosco NO
--      necesitan recargarse: el ingreso facial no cambió.
--
-- Al revés es destructivo: un cliente de Prisma nuevo contra una base sin estas tablas da
-- 500 en la ficha del colaborador y en el registro facial desde la ficha.
--
-- NO se corre en la misma ventana que ningún otro ALTER.

-- ============================ PASO 0: mirar antes ============================
-- Solo lectura. Envío 0a:

SELECT VERSION() AS version, DATABASE() AS base_seleccionada;
SELECT COUNT(*) AS colaboradores FROM `ewyfwxbg_horapro`.`colaboradores`;
SHOW COLUMNS FROM `ewyfwxbg_horapro`.`colaboradores` LIKE 'rostroRechazadoEn';
-- CERO filas.
SHOW TABLES FROM `ewyfwxbg_horapro` LIKE 'enlaces_registro_facial';
-- CERO filas.
SHOW TABLES FROM `ewyfwxbg_horapro` LIKE 'constancias_biometricas';
-- CERO filas. Si alguna de las tres devuelve algo, esto ya corrió en parte: parar y mirar.
SHOW COLUMNS FROM `ewyfwxbg_horapro`.`colaboradores` LIKE 'id';
-- Una fila, varchar(191): es el tipo al que apuntan las llaves nuevas.

-- Envío 0b (aparte, porque si la variable no existe da error):
SELECT @@innodb_instant_alter_column_allowed AS instant_permitido;
-- Anotarlo. Si dice never: parar. Para agregar una columna al final basta add_last.

-- ============================ PASO 1: la marca de no autorizó ================
-- Un solo envío.

SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`colaboradores`
  ADD COLUMN IF NOT EXISTS `rostroRechazadoEn` datetime(3) DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 2: los enlaces ============================
-- Un solo envío.

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`enlaces_registro_facial` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `venceEn` datetime(3) NOT NULL,
  `usadoEn` datetime(3) DEFAULT NULL,
  `anuladoEn` datetime(3) DEFAULT NULL,
  `intentosCedula` int NOT NULL DEFAULT '0',
  `usuarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `enlaces_registro_facial_tokenHash_key` (`tokenHash`),
  KEY `enlaces_registro_facial_colaboradorId_idx` (`colaboradorId`),
  CONSTRAINT `enlaces_registro_facial_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================ PASO 3: las constancias ========================
-- Un solo envío.

SET STATEMENT lock_wait_timeout=10 FOR
CREATE TABLE IF NOT EXISTS `ewyfwxbg_horapro`.`constancias_biometricas` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colaboradorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decision` enum('AUTORIZA','NO_AUTORIZA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `origen` enum('ENLACE','ADMINISTRADOR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mayorDeEdad` tinyint(1) DEFAULT NULL,
  `usuarioId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enlaceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creadoEn` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `constancias_biometricas_colaboradorId_creadoEn_idx` (`colaboradorId`,`creadoEn`),
  CONSTRAINT `constancias_biometricas_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================ PASO 4: comprobar ==============================

SHOW COLUMNS FROM `ewyfwxbg_horapro`.`colaboradores` LIKE 'rostroRechazadoEn';
-- Una fila: datetime(3), Null YES, Default NULL.
SHOW CREATE TABLE `ewyfwxbg_horapro`.`enlaces_registro_facial`;
SHOW CREATE TABLE `ewyfwxbg_horapro`.`constancias_biometricas`;
-- Las dos con su llave foránea a colaboradores ON DELETE CASCADE y sus índices.
SELECT COUNT(*) AS colaboradores, SUM(rostroRechazadoEn IS NOT NULL) AS con_rechazo FROM `ewyfwxbg_horapro`.`colaboradores`;
-- El mismo número del envío 0a, y 0 con rechazo.

-- ============================ Para deshacer ==================================
-- Nada se borra para deshacer. El código viejo no lee la columna ni las tablas, así que
-- dejarlas es inofensivo. Y una vez que alguien usó un enlace, `constancias_biometricas`
-- guarda la prueba de lo que la persona autorizó o no: borrarla es perder esa prueba.
-- Deshacer es volver el código, en orden inverso al despliegue:
--
--   1. frontend-build a 09c0c51.
--   2. backend-build a e91769f.
--   3. prisma-build a 4728a26 y, ANTES del restart, en el servidor:
--        grep -c "rostroRechazadoEn" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Tiene que dar 0. Si da otra cosa, el cliente sigue siendo el nuevo: parar.

-- ============================================================================
-- Lo que se midió (14 de septiembre de 2026)
-- ============================================================================
-- En una MariaDB 12.3.2 desechable de esta máquina, NO en la 11.4.13 de producción. Con el
-- DDL real de colaboradores (sin la columna nueva), empresas, horarios, sedes y registros,
-- este último con su llave hacia colaboradores, y 20.000 colaboradores con una foto de unos
-- 2 KB cada uno. Cada envío salió de este archivo tal cual, entre sus marcas, y corrió en
-- su propia conexión del cliente, como en phpMyAdmin.
--
--   - Envío 0a: sin la columna ni las tablas; colaboradores.id varchar(191).
--   - Envío 0b: innodb_instant_alter_column_allowed = add_drop_reorder.
--   - Pasos 1, 2 y 3: 0,07, 0,06 y 0,06 s, sin error. Los TABLE_ID de colaboradores y de
--     registros fueron los MISMOS antes y después: ninguna tabla se reconstruyó.
--   - Segunda pasada de los pasos 1 a 3: sin error, con una nota por sentencia (1060 columna
--     repetida, 1050 tabla existente) y los mismos TABLE_ID.
--   - Paso 4: la columna datetime(3) NULL; las dos tablas con su llave ON DELETE CASCADE y
--     sus índices; 20.000 colaboradores y 0 con rechazo.
--
--   Con una transacción abierta que ya leyó colaboradores, que es lo que hace un ingreso del
--   kiosco mientras dura:
--   - El paso 1 falla solo a los 10,1 s con ERROR 1205 y no agrega la columna: el
--     SET STATEMENT sí lleva el tiempo de espera hasta el ALTER.
--   - Una lectura de colaboradores lanzada 1 s después del ALTER tardó 9,08 s: hizo fila
--     detrás del ALTER que esperaba. Con el ALTER ya caído, la misma lectura tardó 0,05 s
--     aunque la transacción seguía abierta. Por eso el paso 1 va fuera de las horas de
--     entrada y salida.
--   - El paso 2, un CREATE TABLE con llave hacia colaboradores, NO esperó: 0,06 s.
--
--   Las llaves, con 20.000 enlaces y 40.000 constancias:
--   - Borrar a una persona se llevó sus enlaces y sus constancias.
--   - Una constancia de alguien que no existe: ERROR 1452, no se guardó.
--
--   EXPLAIN de las consultas nuevas (CLAUDE.md §8.4), en esa misma base:
--   - Ficha, la última constancia: ref sobre constancias_biometricas_colaboradorId_creadoEn_idx,
--     2 filas, sin ordenar aparte.
--   - Ficha, el enlace vigente: ref sobre enlaces_registro_facial_colaboradorId_idx, 1 fila.
--   - Crear un enlace, anular los anteriores: range sobre el mismo índice, 1 fila.
--   - Abrir el enlace por su huella: const sobre enlaces_registro_facial_tokenHash_key.
--
--   La brecha entre 12.3 y 11.4 SIGUE ABIERTA: por eso va el envío 0b.
--
-- ============================================================================
-- Base local de desarrollo (MySQL 9.7)
-- ============================================================================
-- La columna y las dos tablas se crearon con `prisma db push --skip-generate`, después de
-- un respaldo con mysqldump. El conteo de filas de cada tabla fue el mismo antes y después.
-- El DDL de los pasos 2 y 3 es el que quedó en esa base (SHOW CREATE TABLE).
