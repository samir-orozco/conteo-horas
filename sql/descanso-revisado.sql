-- Cuándo cada empresa respondió qué día descansa su gente (21 de septiembre de 2026).
--
-- Gemela de `auxilioRevisadoEn`, y por la misma razón: la respuesta vive en el SERVIDOR y por
-- EMPRESA, no en localStorage por usuario. Limpiar el navegador o entrar desde otro equipo no puede
-- hacer que el aviso reaparezca, ni que una persona lo descarte y el resto de la empresa nunca se
-- entere de que sus domingos se están liquidando con la presunción legal en vez de con lo pactado.
--
-- ANULABLE y SIN relleno hacia atrás, a propósito: `NULL` significa «todavía no respondió». Ponerle
-- una fecha a las empresas que ya existen las daría por respondidas y no verían nunca la pregunta.
--
-- Que quede en NULL no significa que a todas se les vaya a bloquear el panel. Quién ve el aviso lo
-- decide `revisionDescansoPendiente(descansoRevisadoEn, horariosPorResolver)`, y el segundo número
-- sale de mirar los días de cada horario: a una empresa cuyo mundo entero es de lunes a viernes, la
-- ley ya le responde con el domingo y no se le pregunta nada. Medido en la base local: de 10
-- horarios activos, 9 no se preguntan.
--
-- `datetime(3)` y no `datetime`: es lo que genera Prisma para `DateTime?`, y una precisión distinta
-- deja el esquema real desalineado del cliente.

ALTER TABLE `empresas`
  ADD COLUMN `descansoRevisadoEn` datetime(3) DEFAULT NULL;

-- Comprobación del EFECTO, no de que el ALTER no se quejara (CLAUDE.md §12.1). Tiene que decir
-- IS_NULLABLE = YES y COLUMN_DEFAULT = NULL.
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empresas' AND COLUMN_NAME = 'descansoRevisadoEn';
