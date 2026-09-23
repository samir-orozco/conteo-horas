-- Número de contrato del colaborador, para importar las novedades a Siigo
-- (23 de septiembre de 2026)
--
-- Por qué: Siigo identifica a cada persona por su NÚMERO DE CONTRATO, no por la cédula. Casi
-- siempre son el mismo número, pero cuando alguien tiene un segundo contrato, Siigo le pone la
-- cédula con un «-1» al final. Medido el 23 de septiembre de 2026 contra el Siigo de un cliente:
-- con la cédula sola, sus novedades entran con un «Listado de inconsistencias» que dice «El
-- contrato no pertenece a la nómina seleccionada o no existe» para esas personas, y con la
-- columna vacía rechaza TODAS las filas porque el campo es obligatorio.
--
-- Un solo cambio, seguro con el código viejo corriendo, porque el código viejo no lo lee:
--
--   colaboradores.numeroContrato   varchar(191), NULL
--       Vacío significa «el contrato es la cédula», que es el caso normal. Todos quedan en NULL:
--       el administrador solo lo escribe para quien Siigo reporte.
--
-- Nada que rellenar hacia atrás: con NULL, HoraPro escribe la cédula, que es lo que hacía antes.
--
-- ALGORITHM=INSTANT: agrega la columna sin copiar la tabla ni bloquear el kiosco. Si el servidor
-- respondiera que no puede hacerlo así, hay que parar y avisar, no cambiarlo por COPY: `colaboradores`
-- se lee en cada marcación.

ALTER TABLE `ewyfwxbg_horapro`.`colaboradores`
  ADD COLUMN IF NOT EXISTS `numeroContrato` varchar(191) DEFAULT NULL,
  ALGORITHM=INSTANT;

-- Comprobación: la columna existe y está vacía en todos.
SELECT COUNT(*) AS personas, COUNT(`numeroContrato`) AS con_contrato_escrito
FROM `ewyfwxbg_horapro`.`colaboradores`;
