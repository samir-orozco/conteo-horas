-- Descansos no remunerados: hasta 3 por franja (12 de septiembre de 2026)
--
-- Decisión del dueño del 12 de septiembre de 2026: varios descansos por franja del
-- horario, además del almuerzo, cada uno con su desde y su hasta. NINGUNO se paga:
-- restan de lo exigido igual que el almuerzo, y lo trabajado dentro de sus horas se
-- descuenta. Se marcan en el kiosco al salir y al volver; la persona solo toca
-- «descanso» y el servidor anota a cuál salió según la hora.
--
-- Reemplaza al SQL de UN descanso (ee7a0c7, sql/descanso-no-remunerado.sql), que
-- nunca corrió en producción: donde aquel ponía dos columnas con una ventana, aquí
-- va una LISTA guardada como texto. Cinco columnas, todas seguras con el código
-- viejo corriendo, porque el código viejo no las lee:
--
--   horarios.fotoEnDescanso   booleano, NOT NULL DEFAULT 1
--       Si se guarda la foto al marcar los descansos. 1 es lo de siempre.
--
--   franjas_horario.descansos   texto, NULL
--       [{"inicio":"09:00","fin":"09:15"},{"inicio":"15:00","fin":"15:10"}]
--       NULL = sin descansos, que es como quedan todos los horarios que ya existen.
--
--   dias_esperados.descansos   texto, NULL
--       La misma lista, congelada en cada día. Los días que ya existen quedan en
--       NULL: nadie tiene descansos hasta que el administrador los configura y
--       guarda el horario, y eso regenera los días desde hoy. El pasado no se toca.
--
--   registros.salidaDescanso   booleano, NOT NULL DEFAULT 0
--       Esa salida fue a un descanso. Lo viejo queda en 0.
--
--   registros.descansoVentana   texto "HH:MM-HH:MM", NULL
--       A cuál descanso salió. Lo viejo queda en NULL.
--
-- Ninguna lleva índice ni llave foránea. Cada ALTER lleva ALGORITHM=INSTANT escrito,
-- a secas, igual que sql/cerrar-turno-en-otra-sede.sql, que es la forma medida en
-- MariaDB 12.3. Sin cláusula LOCK: con INSTANT no hay copia que evitar, y en
-- `registros` un LOCK=NONE ya fue rechazado por sus llaves ON UPDATE CASCADE. Si la
-- versión de producción no pudiera hacerlo en línea, el ALTER falla al instante sin
-- tocar nada. Si sale un error (1845, 1846 o cualquier otro), NO se le quita el
-- ALGORITHM para que pase: se para y se avisa.
--
-- IF NOT EXISTS en todo: si algo falla a la mitad, el paso se vuelve a correr y
-- salta lo que ya quedó hecho.
--
-- Por qué varchar(191) y no JSON ni TEXT: es el tipo que ya se agregó con INSTANT
-- en MariaDB 12.3; en MariaDB un JSON es LONGTEXT con un CHECK que no se midió; y
-- tres ventanas escritas ocupan menos de 100 caracteres (una prueba lo fija en
-- 191). Si algún día los descansos llevan nombre, hay que pasar a TEXT: es otro
-- cambio de esquema.
--
-- ============================================================================
-- VALIDACIÓN EN LOCAL (12 de septiembre de 2026)
-- ============================================================================
-- Se corrió en una MariaDB 12.3.2 desechable, NO en la 11.4 de producción. El
-- resultado está escrito al final de este archivo, en «Lo que se midió».
--
-- En el MySQL 9.7 de desarrollo las columnas se agregaron con estas mismas
-- sentencias; ver «Base local de desarrollo» al final.
--
-- ============================================================================
-- ANTES DE CORRER NADA: QUÉ CORRE HOY EN PRODUCCIÓN (puerta D0)
-- ============================================================================
-- Lo que corre hoy NO es develop. Anotado el 12 de septiembre de 2026, y a
-- comprobar en el servidor antes de empezar, porque es también el «deshacer»:
--
--   backend   compilado de 5bbf0bb  = origin/backend-build  83f8085
--   frontend  compilado de 67d6fe6  = origin/frontend-build dd9a3cd
--   cliente de Prisma               = origin/prisma-build   e3aeb52
--                                     (el de las columnas de método de marcación)
--
-- Ese backend y ese cliente NO conocen `colaboradores.puedeCerrarEnOtraSede` ni
-- `registros.sedeSalidaId`: llegaron después (sql/cerrar-turno-en-otra-sede.sql),
-- con develop. Y el backend nuevo las lee en cada login y en cada marcación,
-- porque varias lecturas de `registros` van sin `select`. Si la base de
-- producción no las tiene, cada marcación responde 500.
--
-- [EN EL SERVIDOR] qué app está viva:
--     grep PassengerAppRoot ~/horapro.co/api/.htaccess
-- [EN EL SERVIDOR] el cliente vivo es el de e3aeb52 (1 o más) y no conoce las de sedes (0):
--     grep -c "metodoEntrada" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--     grep -c "puedeCerrarEnOtraSede" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
-- [EN EL SERVIDOR] el backend vivo tampoco (0):
--     grep -c "sedeSalidaId" ~/horapro-co-api/dist/routes/worker.js
-- Si alguno no da lo esperado, lo que corre no es lo anotado arriba: se para.
--
-- [EN TU MÁQUINA] qué cambia en el esquema entre lo que corre y lo que se sube:
--     git diff --name-only 5bbf0bb..HEAD | grep -q 'schema.prisma' && echo "OBLIGATORIO actualizar prisma-build" || echo "prisma-build no se toca"
--     git diff 5bbf0bb..HEAD -- backend/prisma/schema.prisma
-- Da OBLIGATORIO. Las columnas que agrega son las de este SQL y las de
-- sql/cerrar-turno-en-otra-sede.sql, y nada más. Si aparece otra, se para.
--
-- El lockfile no cambió entre 5bbf0bb y develop (a9f982a): solo package.json, por
-- el tope del lint. No hace falta adaptarlo al npm 10 del servidor (CLAUDE.md
-- §9.7); si el día del despliegue el diff de backend/package-lock.json no sale
-- vacío, sí.
--
-- ============================================================================
-- ORDEN DEL DESPLIEGUE (CLAUDE.md §11): SQL, prisma-build, backend, frontend
-- ============================================================================
-- Solo con permiso explícito del dueño. Cada envío de phpMyAdmin es una conexión
-- nueva: un SET no llega al siguiente, así que cada paso lleva el suyo.
--
--   1. [phpMyAdmin] El PASO 0 de este archivo. Si falta alguna de las dos columnas
--      de sedes, se corre ANTES sql/cerrar-turno-en-otra-sede.sql, con sus propios
--      pasos, y se vuelve a este PASO 0.
--   2. [phpMyAdmin] Los PASOS 1 a 5 de este archivo, cada uno en su envío.
--   3. [phpMyAdmin] sql/sede-principal.sql, ENTERO en un solo envío y releído antes:
--      solo crea la Sede principal de las empresas sin sede activa; no cambia el
--      esquema. Nunca en el mismo envío que un ALTER de `registros`.
--   4. prisma-build, generado desde un árbol limpio en HEAD (nunca desde el de
--      trabajo), con rsync SIN --delete. Sobre el artefacto, antes de subirlo:
--        grep -c "descansoVentana" deploy-prisma-client/index.d.ts          (distinto de 0)
--        el motor libquery_engine-rhel-openssl-1.1.x presente
--        git show --stat con solo deploy-prisma-client/
--      [EN EL SERVIDOR], después de copiarlo y ANTES del restart:
--        grep -c "descansoVentana" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Cero = el cliente es el viejo y el kiosco se va a caer: se para.
--   5. backend-build, desde el mismo árbol limpio. [EN EL SERVIDOR], antes del
--      restart:
--        grep -c "descansoVentana" ~/horapro-co-api/dist/routes/worker.js     (distinto de 0)
--      Después del restart, el proceso de Node con el tiempo reiniciado:
--        ps -eo pid,etime,cmd | grep -i node | grep -v grep
--      No hay ninguna ruta nueva, así que la prueba 404 a 401 no demuestra nada. Lo
--      que demuestra que vive: un ingreso de kiosco con /estado en 200, y con sesión
--      de administrador GET /api/horarios con `descansos` como arreglo en cada franja.
--      Passenger recarga en la siguiente petición: si la primera respuesta es vieja,
--      se repite.
--   6. frontend-build. La trampa del .env.local (CLAUDE.md §4), y sobre el bundle:
--        grep -o "localhost:[0-9]*"      (tiene que salir vacío)
--   7. RECARGAR EL KIOSCO EN CADA TABLETA, y recién después configurar descansos.
--      La tableta sin recargar es la de 67d6fe6: no conoce el descanso, y su cuerpo
--      de marcación solo trae `almuerzo`. Una salida al desayuno desde ahí quedaría
--      como almuerzo, y al mediodía le pediría motivo de salida temprana. Nada la
--      recarga sola. Se reconoce en la pantalla: dentro de la ventana del almuerzo,
--      la recargada dice «Salgo a almorzar».
--
-- Al revés es destructivo: un cliente de Prisma nuevo contra tablas sin estas
-- columnas son 500 en cada login y en cada marcación.
--
-- Entre el paso 5 y la recarga de las tabletas conviven backend nuevo y pantallas
-- de 67d6fe6:
--   - el kiosco de 67d6fe6 sigue marcando entrada, almuerzo y salida igual, pero no
--     sabe marcar descansos: no se configuran descansos hasta recargarlas;
--   - la pantalla de horarios abierta de antes no puede borrar descansos que otro ya
--     configuró: responde «recarga la página» (FORMATO_VIEJO);
--   - el editor de jornadas de 67d6fe6 manda el almuerzo con las claves de antes y
--     el backend nuevo lo RECHAZA con «recarga la página» (FORMATO_VIEJO): es a
--     propósito.
--
-- NO se corre en la misma ventana que ningún UPDATE sobre `registros`.

-- ============================ PASO 0: mirar antes ============================
-- Solo lectura. Envío 0a:

SELECT VERSION() AS version;
SELECT COUNT(*) AS registros FROM `registros`;
SELECT COUNT(*) AS dias_esperados FROM `dias_esperados`;

SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'registros'
  AND COLUMN_NAME IN ('metodoEntrada', 'metodoSalida', 'distanciaEntrada', 'distanciaSalida');
-- Tiene que devolver CUATRO filas: es el esquema de lo que corre (5bbf0bb). Si
-- falta alguna, producción no está donde se anotó: parar.

SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'colaboradores' AND COLUMN_NAME = 'puedeCerrarEnOtraSede')
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME = 'sedeSalidaId'));
-- DOS filas: sql/cerrar-turno-en-otra-sede.sql ya corrió. Si devuelve menos, se
-- corre ese SQL completo ANTES de seguir con este, y se vuelve a este paso.

SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'horarios' AND COLUMN_NAME = 'fotoEnDescanso')
    OR (TABLE_NAME IN ('franjas_horario', 'dias_esperados') AND COLUMN_NAME IN ('descansos', 'descansoInicio', 'descansoFin'))
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME IN ('salidaDescanso', 'descansoVentana')));
-- CERO filas. Si devuelve alguna, algo de esto (o del SQL de un solo descanso, que
-- nunca debió correr) ya está: parar y mirar antes de seguir.

-- Envío 0b (aparte, porque si la variable no existe da error):
SELECT @@innodb_instant_alter_column_allowed AS instant_permitido;
-- Anotarlo. Si dice never: parar. Para AGREGAR al final basta add_last o
-- add_drop_reorder. El deshacer de este SQL no borra columnas, así que no depende
-- de este valor.

-- Envío 0c (aparte; si phpMyAdmin responde que no hay permiso, se omite):
SELECT NAME, TABLE_ID FROM information_schema.INNODB_SYS_TABLES
WHERE NAME IN (CONCAT(DATABASE(), '/registros'), CONCAT(DATABASE(), '/dias_esperados'),
               CONCAT(DATABASE(), '/horarios'), CONCAT(DATABASE(), '/franjas_horario'));
-- Anotar los TABLE_ID: en el paso 5 tienen que ser los mismos. Si cambian, la tabla
-- se reconstruyó.

-- ============================ PASO 1: horario ================================
-- TODO en un solo envío.
--
-- lock_wait_timeout: si en 10 segundos no consigue la tabla, falla en vez de
-- quedarse esperando con las marcaciones haciendo fila detrás.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `horarios`
  ADD COLUMN IF NOT EXISTS `fotoEnDescanso` tinyint(1) NOT NULL DEFAULT '1',
  ALGORITHM=INSTANT;
ALTER TABLE `franjas_horario`
  ADD COLUMN IF NOT EXISTS `descansos` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 2: días esperados =========================
-- Un solo envío.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `dias_esperados`
  ADD COLUMN IF NOT EXISTS `descansos` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 3: registros, la marca ====================
-- Un solo envío. Es la tabla que el kiosco escribe en cada marcación.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `registros`
  ADD COLUMN IF NOT EXISTS `salidaDescanso` tinyint(1) NOT NULL DEFAULT '0',
  ALGORITHM=INSTANT;

-- ============================ PASO 4: registros, cuál descanso ===============
-- Otro envío, para saber exactamente cuál falló si algo falla.

SET SESSION lock_wait_timeout = 10;
ALTER TABLE `registros`
  ADD COLUMN IF NOT EXISTS `descansoVentana` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ============================ PASO 5: comprobar ==============================

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'horarios' AND COLUMN_NAME = 'fotoEnDescanso')
    OR (TABLE_NAME IN ('franjas_horario', 'dias_esperados') AND COLUMN_NAME = 'descansos')
    OR (TABLE_NAME = 'registros' AND COLUMN_NAME IN ('salidaDescanso', 'descansoVentana')))
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Cinco filas.

SELECT fotoEnDescanso, COUNT(*) AS horarios FROM `horarios` GROUP BY fotoEnDescanso;
-- Todos en 1.
SELECT COUNT(*) AS con_descansos FROM `franjas_horario` WHERE descansos IS NOT NULL;
-- 0.
-- Y, si el envío 0c funcionó, repetirlo: los TABLE_ID tienen que ser los mismos.

-- ============================ Para deshacer ==================================
-- Las columnas NO se borran para deshacer. El código viejo no las lee, así que
-- dejarlas es inofensivo, y borrarlas en línea exige
-- innodb_instant_alter_column_allowed = add_drop_reorder, que no está comprobado en
-- producción. Deshacer es volver el código, en orden inverso al despliegue, a los
-- commits de artefactos anotados en la puerta D0:
--
--   1. frontend-build a dd9a3cd.
--   2. backend-build a 83f8085.
--   3. prisma-build a e3aeb52 y, ANTES del restart, en el servidor:
--        grep -c "descansoVentana" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts
--      Tiene que dar 0. Si da otra cosa, el cliente sigue siendo el nuevo: parar.
--
-- OJO: esto deshace también lo de sedes, que va en el mismo despliegue. Se pierde
-- lo que dependa de las columnas nuevas mientras estuvo arriba (qué descanso se
-- marcó), aunque los datos quedan en la base. Borrar las columnas, si algún día se
-- quiere, es un cambio aparte que se habla antes.

-- ============================================================================
-- Lo que se midió (12 de septiembre de 2026)
-- ============================================================================
-- En una MariaDB 12.3.2 desechable de esta máquina, NO en la 11.4 de producción. Con
-- el DDL real de empresas, sedes, colaboradores, colaboradores_sedes, horarios,
-- franjas_horario, dias_esperados, registros, permisos, registro_cambios y
-- notificaciones, SIN las columnas de este archivo, y volumen fabricado: 200.000
-- registros con foto de unos 2 KB, 50.000 días esperados y 100.000 notificaciones
-- (501 MB).
--
--   Envíos 0a a 5, cada uno en su propia conexión del cliente, como en phpMyAdmin:
--     - 0a: presentes las cuatro columnas de método de marcación y las dos de sedes;
--       ninguna de este archivo.
--     - 0b: innodb_instant_alter_column_allowed = add_drop_reorder.
--     - Pasos 1 a 4: cada ALTER tardó entre 0,03 y 0,04 s, sin error, y los TABLE_ID
--       de registros, dias_esperados, horarios y franjas_horario fueron los MISMOS
--       antes y después de cada envío: ninguna tabla se reconstruyó.
--     - Paso 5: las cinco columnas con su tipo y su default; 40 horarios con la foto
--       en 1 y ninguna franja con descansos.
--     - Segunda pasada de los pasos 1 a 4: sin error, una advertencia por columna
--       (ya existía) y los mismos TABLE_ID.
--   La brecha entre 12.3 y 11.4 SIGUE ABIERTA: por eso van los envíos 0b y 0c.
--
--   EXPLAIN de las consultas nuevas o cambiadas (CLAUDE.md §8.4), en esa misma base:
--     - Aviso diario de pausas sin regreso. ANTES (a9f982a): recorrido completo de
--       registros, 200.000 filas leídas, 424 ms. AHORA, por lotes de 500
--       colaboradores: rango sobre registros_colaboradorId_fecha_idx, 3.500 filas, 10 ms.
--     - Aviso diario, ¿volvió ese día?: rango sobre el mismo índice, 1 fila.
--     - Aviso diario, ¿ya se avisó? ANTES, recorrido completo de notificaciones
--       (100.000 filas). AHORA, dentro de la empresa: ref sobre
--       notificaciones_empresaId_leida_idx, 2.500 filas.
--     - Kiosco, los descansos del día del turno: rango sobre
--       registros_colaboradorId_fecha_idx, 1 fila.
--     - Kiosco, los almuerzos de las últimas 18 horas (la forma de producción): ref
--       sobre el mismo índice, 100 filas.
--     - Editor de jornada, el día de destino: rango sobre
--       dias_esperados_colaboradorId_fecha_key, 1 fila.
--     - Aviso diario, el día de cada salida al descanso, para saber hasta cuándo se le
--       esperaba (agregada después, el mismo 12 de septiembre de 2026): rango sobre
--       dias_esperados_colaboradorId_fecha_key, 1 fila. Medido en el MySQL 9.7 local
--       (prisma/verificar-aviso-pausas.ts), NO en la MariaDB desechable.

-- ============================================================================
-- Base local de desarrollo (MySQL 9.7)
-- ============================================================================
-- Las cinco columnas se agregaron con las sentencias de los pasos 1 a 4. Las cuatro
-- columnas del descanso de UNA ventana que ee7a0c7 había puesto solo en local
-- (descansoInicio y descansoFin, en franjas_horario y en dias_esperados) se quitaron
-- el 12 de septiembre de 2026, cuando el código ya no las usaba y con el cliente de
-- Prisma ya regenerado, con ALTER TABLE ... DROP COLUMN explícito; ninguna fila tenía
-- datos en ellas. Nunca con `prisma db push --accept-data-loss`. En producción esas
-- cuatro columnas nunca existieron, y este archivo no las toca.
