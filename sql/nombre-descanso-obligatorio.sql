-- El concepto ya no se llama «dominical»: se llama día de descanso obligatorio
-- (30 de septiembre de 2026)
--
-- SOLO CAMBIA UN NOMBRE. Ni un código, ni un recargo, ni una vigencia, ni una fila
-- nueva. Ninguna liquidación se mueve ni un peso, ni la ya hecha ni la que venga.
--
-- POR QUÉ. Lo pidió el dueño mirando el reporte: «los reportes solo toman como
-- dominical los días domingos, cuando sabemos que son los días de descanso». La
-- Ley 2466 de 2025, artículo 14, reescribió el artículo 179 del CST: donde decía
-- «domingo y festivos» ahora dice «día de descanso obligatorio, o días de fiesta»,
-- y su parágrafo 2° lo cierra para todo el Código —«cuando este Código haga
-- referencia a "dominical", se entenderá que trata de "día de descanso
-- obligatorio"»—.
--
-- O sea que quien pacta trabajar los domingos y descansar el martes tiene SU
-- MARTES en este concepto. La etiqueta «Dominical» le decía al contador que esa
-- persona trabajó un domingo que no trabajó.
--
-- NO SE PARTE EN UN CONCEPTO NUEVO, y esa fue la decisión: es el mismo artículo,
-- la misma tarifa y el mismo código 25 del catálogo de Siigo. Un noveno tipo de
-- hora no tendría dónde importarse en la nómina electrónica.
--
-- `tipos_hora` es GLOBAL, sin `empresaId`, así que esto vale para todas las
-- empresas de una vez. Y hay VARIAS FILAS POR CÓDIGO, una por vigencia (el recargo
-- sube al 90% en julio de 2026 y al 100% en 2027): el WHERE va por código y toca
-- todas, que es lo correcto, porque el nombre viejo estaba mal en todas.
--
-- SE PUEDE CORRER CON EL CÓDIGO VIEJO ARRIBA: el backend lee este nombre y lo
-- devuelve tal cual, así que lo único que pasa es que la pantalla lo muestra al día
-- antes de que el Excel lo haga. Como siempre, el SQL va ANTES que el código.

UPDATE `tipos_hora` SET `nombre` = 'Hora Diurna Descanso obligatorio/Festivo'
  WHERE `codigo` = 'HDD';
UPDATE `tipos_hora` SET `nombre` = 'Hora Nocturna Descanso obligatorio/Festivo'
  WHERE `codigo` = 'HND';
UPDATE `tipos_hora` SET `nombre` = 'Hora Extra Diurna Descanso obligatorio/Festivo'
  WHERE `codigo` = 'HEDD';
UPDATE `tipos_hora` SET `nombre` = 'Hora Extra Nocturna Descanso obligatorio/Festivo'
  WHERE `codigo` = 'HEND';

-- COMPROBACIÓN DEL EFECTO, no de que el UPDATE no se quejara (CLAUDE.md §12.1).
-- Tiene que devolver CERO filas: si devuelve alguna, quedó un nombre viejo.
--
--   SELECT codigo, nombre, recargo, vigenteDesde FROM tipos_hora
--    WHERE nombre LIKE '%Dominical%';
--
-- Y en positivo, que es lo que de verdad dice que se escribió (§12.2). Tiene que
-- listar los cuatro códigos, con una fila por vigencia y el recargo intacto:
--
--   SELECT codigo, nombre, recargo, vigenteDesde FROM tipos_hora
--    WHERE nombre LIKE '%Descanso obligatorio%' ORDER BY codigo, vigenteDesde;

-- VUELTA ATRÁS, si hiciera falta:
-- UPDATE `tipos_hora` SET `nombre` = 'Hora Diurna Dominical/Festivo'        WHERE `codigo` = 'HDD';
-- UPDATE `tipos_hora` SET `nombre` = 'Hora Nocturna Dominical/Festivo'      WHERE `codigo` = 'HND';
-- UPDATE `tipos_hora` SET `nombre` = 'Hora Extra Diurna Dominical/Festivo'  WHERE `codigo` = 'HEDD';
-- UPDATE `tipos_hora` SET `nombre` = 'Hora Extra Nocturna Dominical/Festivo' WHERE `codigo` = 'HEND';
