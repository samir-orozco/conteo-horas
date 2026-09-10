-- Con qué se autenticó cada marcación, y el índice que la pantalla de revisión
-- necesita. Las dos cosas en un solo ALTER.
--
-- POR QUÉ VA COMO SQL Y NO COMO MIGRACIÓN DE PRISMA. Las migraciones de este
-- proyecto están desfasadas del esquema real, porque se evolucionó con
-- `db push`. `prisma migrate deploy` NO reproduce el estado de producción. Está
-- en la sección 4 del CLAUDE.md.
--
-- SE CORRE EN phpMyAdmin, TODO ESTE BLOQUE DE UNA SOLA VEZ. Cada envío de
-- phpMyAdmin es una conexión nueva, así que partirlo en trozos rompe cualquier
-- transacción o variable.
--
-- Es aditivo y no toca ni una fila existente: cuatro columnas que nacen NULL.
-- Ese NULL significa «no se sabe», y hay que dejarlo así. Rellenarlo con CEDULA
-- por descarte falsearía justo el número que se viene a medir.
--
-- ORDEN CON EL DESPLIEGUE: PRIMERO este SQL, DESPUÉS el backend. Al revés, el
-- código nuevo escribiría en columnas que no existen y toda marcación fallaría.
-- En este orden no hay ventana mala: el backend viejo simplemente no las llena.

-- EL INDICE VA EN LA MISMA SENTENCIA, A PROPOSITO. MySQL reconstruye la tabla una
-- sola vez en vez de dos, y la seccion 8.4 dice que los indices se agregan cuando
-- la tabla esta pequena: el ALTER es instantaneo con miles de filas y caro con
-- millones. Ya que se abre la tabla, se abre una vez.
--
-- PARA QUE SIRVE. La pantalla de revision de marcaciones pide "las marcaciones de
-- esta empresa en esta ventana". `registros` no tiene `empresaId` (el tenant
-- cuelga de `colaboradores`), asi que el filtro llega siempre como
-- `colaboradorId IN (...)`, y hoy no hay ningun indice que sirva: el unico
-- pensado del producto empieza por `salidaEstimada`, que es otro caso.
--
-- MEDIDO sobre un millon de filas, 2.000 colaboradores y una empresa de 500,
-- ventana de 7 dias con LIMIT 500:
--     sin indice  ->  Table scan,        1.000.000 filas leidas,  1.320 ms
--     con indice  ->  Index range scan,      2.401 filas leidas,     11 ms
--
-- El orden de las columnas no es decorativo: la igualdad (`colaboradorId`)
-- primero y el rango (`fecha`) ultimo. Invertirlo no sirve para nada.

-- ===================================================================
-- PASO 0. MIRAR ANTES DE TOCAR. Se corre SOLO, se lee, y despues se decide.
-- ===================================================================
-- HAY CLIENTES MARCANDO AHORA MISMO. Un ALTER sobre `registros` la bloquea
-- mientras dura, y `registros` es la tabla que mas crece del producto. Con
-- miles de filas es instantaneo; con millones no, y durante ese rato el kiosco
-- devolveria error a quien intente marcar.
--
-- Referencia medida en local: 1.000.000 de filas tardan del orden de segundos
-- en crear este indice. Por debajo de ~100.000 no hay de que preocuparse.

SELECT COUNT(*) AS filas_en_registros FROM `registros`;
SELECT VERSION() AS motor;

-- Y que no exista ya, por si este SQL se corre dos veces:
SHOW INDEX FROM `registros` WHERE Key_name = 'registros_colaboradorId_fecha_idx';
SHOW COLUMNS FROM `registros` WHERE Field = 'metodoEntrada';

-- ===================================================================
-- PASO 1. EL CAMBIO. Se corre despues de leer el paso 0.
-- ===================================================================
-- `ALGORITHM=INPLACE, LOCK=NONE` NO ES DECORACION: es lo que permite que la
-- gente SIGA MARCANDO mientras el indice se construye. Y si este servidor no
-- puede hacerlo asi, el comando FALLA con un error en vez de bloquear la tabla
-- en silencio, que es exactamente lo que se quiere: enterarse antes, no despues.
--
-- Si falla por eso, la salida es correrlo en una ventana de madrugada quitando
-- las dos clausulas, no ignorarlo.
--
-- SOBRE LOS DATOS QUE YA EXISTEN: las cuatro columnas nacen NULL y ninguna fila
-- se reescribe. Ese NULL significa «no se sabe» en todo el codigo que las lee, y
-- asi tiene que quedarse: rellenarlo por descarte falsearia el numero que estas
-- columnas existen para medir. No hace falta ningun backfill.
--
-- Y EL BACKEND VIEJO SIGUE FUNCIONANDO con estas columnas puestas: no las
-- conoce y no las escribe. Por eso este SQL va PRIMERO y sin prisa por el resto.

ALTER TABLE `registros`
  ADD COLUMN `metodoEntrada`    ENUM('ROSTRO','CEDULA','MANUAL') NULL,
  ADD COLUMN `metodoSalida`     ENUM('ROSTRO','CEDULA','MANUAL') NULL,
  ADD COLUMN `distanciaEntrada` DOUBLE NULL,
  ADD COLUMN `distanciaSalida`  DOUBLE NULL,
  ADD INDEX `registros_colaboradorId_fecha_idx` (`colaboradorId`, `fecha`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Comprobacion 1: las cuatro columnas, todas con Null = YES.
SHOW COLUMNS FROM `registros` WHERE Field IN
  ('metodoEntrada','metodoSalida','distanciaEntrada','distanciaSalida');

-- Comprobacion 2: el indice, con sus dos columnas y en este orden
-- (Seq_in_index 1 = colaboradorId, 2 = fecha).
SHOW INDEX FROM `registros` WHERE Key_name = 'registros_colaboradorId_fecha_idx';

-- Comprobacion 3: cuantas filas quedaron con las columnas nuevas. Tiene que dar
-- CERO: son aditivas y nadie las ha escrito todavia. El primer valor aparece
-- cuando alguien marque despues de desplegar el backend.
SELECT COUNT(*) AS con_metodo FROM `registros` WHERE `metodoEntrada` IS NOT NULL;
