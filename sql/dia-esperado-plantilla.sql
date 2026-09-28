-- De qué turno del catálogo salió un día materializado (21 de septiembre de 2026).
--
-- ACTUALIZADO el 22 de septiembre de 2026, porque este encabezado quedó falso. Decía que la columna
-- no la escribía nadie y que el calendario deducía la etiqueta del turno («Mañana», «Tarde»,
-- «Noche») de las horas del día. Las dos cosas dejaron de ser ciertas:
--
--   · el planificador YA existe y la escribe (`pintarDiaDeColaborador`), junto con `origen = MANUAL`;
--   · la deducción por horas se quitó, porque se leía como un turno asignado que nadie había
--     asignado. Un día sin pintar muestra ahora el nombre de su HORARIO, y solo el que no tiene ni
--     turno ni horario dice «Sin asignar».
--
-- Sigue siendo cierto que las filas viejas tienen NULL y que eso es correcto: significa «este día no
-- lo pintó ningún turno».
--
-- ANULABLE y sin relleno hacia atrás, por lo mismo que `esDescanso`: NULL significa «este día no lo
-- pintó ningún turno», que es la verdad de todo lo que existe hoy. Inventar una plantilla para las
-- filas viejas sería afirmar algo que nadie decidió.
--
-- La clave foránea es RESTRICT por omisión, que es lo que se quiere: una plantilla que ya pintó
-- días no se puede borrar y dejar días apuntando al vacío. El catálogo ya desactiva en vez de
-- borrar (`PlantillaTurno.activa`) justo por esto.
--
-- ============================================================================
-- REESCRITO EL 27 DE SEPTIEMBRE DE 2026, ANTES DE CORRERLO EN PRODUCCIÓN
-- ============================================================================
-- Este archivo era el único del lote que tocaba `dias_esperados` SIN las guardas que sus hermanos
-- sí llevan, y encima es el único que agrega una CLAVE FORÁNEA, que es el caso caro. Medido sobre
-- los diez archivos pendientes: `dia-esperado-descanso.sql` y `dia-de-descanso.sql` traen
-- `lock_wait_timeout` y `ALGORITHM`; este traía cero de las dos, y tampoco escribía la base.
--
-- POR QUÉ IMPORTA, y no es teórico: el kiosco ESCRIBE en `dias_esperados` dentro del camino crítico
-- de marcar. Comprobado línea por línea en el código, no deducido:
--
--   backend/src/routes/worker.ts:546   app.post('/marcar', ...)
--   backend/src/routes/worker.ts:869   await asegurarDiaSinFallar(payload.id, nuevo.fecha, app.log)
--   backend/src/utils/materializarDias.ts:106   await prisma.diaEsperado.upsert({ ... })
--
-- y además la LEE en el mismo camino (worker.ts:117 y worker.ts:163). Con un ALTER que copie la
-- tabla, esas marcaciones no fallan: ESPERAN el candado. Y `lock_wait_timeout` por omisión en
-- MariaDB son 86400 segundos, así que el `try/catch` de `asegurarDiaSinFallar` no salva nada: un
-- candado no es una excepción, es una espera. Cada petición colgada retiene además su proceso de
-- Passenger y su conexión MySQL, en un hosting compartido.
--
-- Por eso ahora son TRES envíos separados y no uno solo. Partirlo no es estético: en un solo ALTER,
-- la clave foránea arrastra a la columna y al índice al algoritmo más caro de los tres.
--
-- ============================================================================
-- ANTES DE CORRER NADA
-- ============================================================================
-- 1. Copia de seguridad de la base desde cPanel (Backup → Download a MySQL Database Backup).
-- 2. Entra a la base `ewyfwxbg_horapro` en phpMyAdmin ANTES de enviar. Aun así todos los nombres
--    van con la base escrita, que es la guarda de verdad (#1109 del 13 de septiembre de 2026).
-- 3. ESTE ARCHIVO VA DESPUÉS DE `sql/plantillas-turno.sql`. No es un «si acaso»: la clave foránea
--    del paso 3 apunta a `plantillas_turno`, y esa tabla la crea SOLO ese archivo.
--
--    QUÉ PASA EXACTAMENTE SI SE CORRE ANTES DE TIEMPO. Medido el 27 de septiembre de 2026 contra
--    MariaDB 12.3.2, con este mismo archivo y una base desechable, no deducido:
--
--      los pasos 1 y 2 SÍ se aplican  ->  columna: 1, índice: 1
--      el paso 3 falla                ->  clave foránea: 0
--
--    Es decir que SÍ deja trabajo a medias, y eso es distinto de la versión anterior de este
--    archivo, que al ser un solo ALTER no dejaba nada. Partirlo en tres quita el bloqueo del
--    kiosco pero cambia esto, y conviene saberlo: no es un desastre, es una recuperación de dos
--    pasos. Si te pasa, corre `sql/plantillas-turno.sql` y después vuelve a enviar SOLO el paso 3
--    de aquí.
--
--    NO reenvíes el archivo entero para «recuperar»: medido en la misma prueba, la segunda pasada
--    se detiene en el PASO 1 con `ERROR 1060 (42S21) Duplicate column name 'plantillaId'` y no
--    llega a los pasos 2 y 3. Eso sí, no rompe nada: tras repetirlo, el efecto era idéntico
--    (columna 1, índice 1, clave foránea 1, filas intactas). Falla ruidoso y no deja daño.
--
--    El orden se comprueba, no se recuerda (CLAUDE.md §12.3). Corre esto PRIMERO:
--
--      SELECT COUNT(*) AS existe_plantillas_turno
--        FROM information_schema.TABLES
--       WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'plantillas_turno';
--
--    0 = PARA y corre antes `sql/plantillas-turno.sql`.   1 = sigue.
-- 4. Este SQL va ANTES del backend nuevo, y el esquema cambió, así que el despliegue lleva CUATRO
--    ramas y no tres, con `prisma-build` por delante del backend (CLAUDE.md §11).
-- 5. El paso 3 conviene correrlo FUERA de la ventana de entrada de la mañana, que es cuando se
--    concentran las marcaciones.
--
-- El tiempo de espera del candado va con SET STATEMENT ... FOR y no con SET SESSION: en phpMyAdmin
-- un SET SESSION no llegó a la sentencia siguiente ni dentro del mismo envío (13/09/2026).

-- ---------------------------------------------------------------------------
-- PASO 1 de 3: la columna. Va al final, es anulable y no lleva llave ni índice,
-- que es el caso que MariaDB resuelve sin copiar la tabla.
-- Si ALGORITHM=INSTANT diera error, NO se le quita para que pase: se para y se avisa.
-- ---------------------------------------------------------------------------
SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados`
  ADD COLUMN `plantillaId` varchar(191) DEFAULT NULL,
  ALGORITHM=INSTANT;

-- ---------------------------------------------------------------------------
-- PASO 2 de 3: el índice, aparte y en línea. LOCK=NONE dice explícitamente que
-- las escrituras del kiosco siguen entrando mientras se construye.
-- ---------------------------------------------------------------------------
SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados`
  ADD INDEX `dias_esperados_plantillaId_idx` (`plantillaId`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- ---------------------------------------------------------------------------
-- PASO 3 de 3: la clave foránea, sola. Es la cara, y por eso va al final y sin
-- compañía: así solo ella paga el algoritmo, no la columna ni el índice.
-- La columna está toda en NULL, así que no hay ninguna fila que validar.
-- ---------------------------------------------------------------------------
SET STATEMENT lock_wait_timeout=10 FOR
ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados`
  ADD CONSTRAINT `dias_esperados_plantillaId_fkey`
    FOREIGN KEY (`plantillaId`) REFERENCES `ewyfwxbg_horapro`.`plantillas_turno` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- COMPROBACIÓN (no es opcional: un comando puede informar éxito y no haber hecho nada)
-- ============================================================================
-- La columna: UNA fila, varchar(191), IS_NULLABLE = YES, default NULL.
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
--   FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'dias_esperados'
--    AND COLUMN_NAME = 'plantillaId';
--
-- El índice: UNA fila.
-- SELECT INDEX_NAME FROM information_schema.STATISTICS
--  WHERE TABLE_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'dias_esperados'
--    AND INDEX_NAME = 'dias_esperados_plantillaId_idx';
--
-- La clave foránea: UNA fila, con DELETE_RULE = RESTRICT.
-- SELECT CONSTRAINT_NAME, DELETE_RULE, UPDATE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--  WHERE CONSTRAINT_SCHEMA = 'ewyfwxbg_horapro' AND TABLE_NAME = 'dias_esperados';
--
-- Y todo en NULL, que es lo que garantiza que no cambió ningún cálculo:
-- SELECT COUNT(*) AS con_plantilla FROM `ewyfwxbg_horapro`.`dias_esperados`
--  WHERE `plantillaId` IS NOT NULL;   -- tiene que dar 0

-- ============================================================================
-- PARA REVERTIR (en orden inverso, la clave foránea primero)
-- ============================================================================
-- Sin riesgo mientras el backend nuevo no esté arriba: nada lee esta columna.
-- ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados` DROP FOREIGN KEY `dias_esperados_plantillaId_fkey`;
-- ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados` DROP INDEX `dias_esperados_plantillaId_idx`;
-- ALTER TABLE `ewyfwxbg_horapro`.`dias_esperados` DROP COLUMN `plantillaId`;
