-- LA TOLERANCIA QUE UN TURNO SOBRESCRIBE (23 de septiembre de 2026).
--
-- Pedido del dueño. Hasta hoy la tolerancia era SIEMPRE de la persona: la fijaba su horario y
-- pintarle un turno no se la tocaba. El caso que lo movió es real: un turno nocturno puede merecer
-- otra tolerancia que uno diurno, y eso es forma del turno, no política de la empresa.
--
-- NO se mudó la política al turno. Sigue viviendo en `horarios`; estas tres columnas solo dejan
-- que un turno la pise cuando haga falta.
--
-- POR QUÉ SON ANULABLES Y SIN `DEFAULT`, que es lo único delicado de este archivo:
--
--   NULL  = «la del horario». Es lo que tendrán las plantillas que ya existen, así que nada cambia
--           para nadie al aplicar esto.
--   0     = «sin tolerancia», la tardanza cuenta desde el primer minuto.
--
-- Son cosas distintas. Un `DEFAULT 0` borraría esa diferencia y convertiría, en silencio y de
-- golpe, TODAS las plantillas existentes en turnos sin tolerancia. El código que las lee usa `??`
-- y no `||` por esta misma razón, y hay pruebas que lo sujetan.
--
-- SALIÓ DE `prisma migrate diff`, no se escribió a mano. Y se le quitó una línea que el diff
-- proponía y que NO es de este cambio:
--
--   ALTER TABLE `colaboradores` ADD COLUMN `numeroContrato` VARCHAR(191) NULL;
--
-- Esa es del trabajo de la plantilla de Siigo (commit 2db2230), que tocó el mismo `schema.prisma`
-- en paralelo. Va en su propio archivo y la aplica quien la hizo: un SQL de despliegue no puede
-- arrastrar a producción un cambio de esquema que nadie decidió meter en este lote.
--
-- Es aditivo y sobre una tabla chica (el catálogo de turnos de una empresa), así que no necesita
-- ALGORITHM/LOCK explícitos como los ALTER de `registros`.

ALTER TABLE `plantillas_turno`
  ADD COLUMN `toleranciaMin` INTEGER NULL,
  ADD COLUMN `toleranciaSalidaMin` INTEGER NULL,
  ADD COLUMN `ajustaEntrada` BOOLEAN NULL;
