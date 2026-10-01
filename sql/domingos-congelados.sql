-- Descongelar los domingos que el defecto del 1 de octubre de 2026 marcó como día ordinario
--
-- QUÉ PASÓ. Ese día se desplegó una lectura equivocada de la regla del descanso: a quien no tenía
-- horario ni semana programada, el motor dejó de verle descanso NINGÚN día. Su domingo trabajado
-- pasó de `HDD` a `HOD` y el recargo del 90% no se mudó de día, desapareció. Medido en producción:
-- 37 personas en septiembre, unos 3,34 millones, sobre un mes ya cerrado.
--
-- El código ya está arreglado (una línea en `esDescansoObligatorioDe`, que ahora devuelve el DOMINGO
-- cuando nadie ha programado la semana). ESTE ARCHIVO NO ES PARA SEPTIEMBRE: todas las filas de
-- septiembre tienen `esDescanso` en NULL —la columna se creó el 1 de octubre y el backend que corrió
-- el mes era del 19 de septiembre—, así que las decide el respaldo y el arreglo las repara solas.
--
-- ESTE ARCHIVO ES PARA LOS DÍAS FUTUROS. Entre el despliegue roto y su arreglo, `mantenerVentana`
-- materializó días futuros con el código malo y les CONGELÓ `esDescanso = 0` al domingo. Una fila
-- congelada manda sobre el respaldo, así que esos domingos no los repara el arreglo de código.
--
-- Y NO SE REPARAN SOLOS. `mantenerVentana` llama a `materializarColaborador` SIN `pisarExistentes`,
-- o sea que solo rellena huecos y nunca reescribe una fila que ya está. Lo dice el propio código en
-- `routes/horarios.ts`. Sin este UPDATE esas filas se quedan así para siempre.
--
-- POR QUÉ A `NULL` Y NO A 1. NULL es «esta fila no lo calculó», y deja que decida la regla en el
-- momento de liquidar. Esas filas las escribió código que ahora sabemos que estaba mal: devolverlas
-- a «sin respuesta» es más honesto que congelar un segundo valor de una corrida en la que no
-- confiamos, y el resultado es el mismo porque el respaldo arreglado devuelve el domingo.
--
-- A QUIÉN NO TOCA. El `NOT EXISTS` excluye los domingos de una semana donde algún día SÍ está
-- marcado como descanso: ahí el 0 del domingo es correcto, lo puso la programación al llevarse el
-- descanso a otro día. Comprobado en local sobre una persona con el miércoles pintado: sus domingos
-- siguieron en 0 y su miércoles en 1.
--
-- EL DOBLE ENVOLTORIO CON `GROUP BY` NO ES ADORNO. Sin él MySQL responde con el error 1093, «You
-- can't specify target table 'd' for update in FROM clause», porque fusiona la subconsulta en vez de
-- materializarla. La primera versión de este archivo falló así.
--
-- EXPORTAR LA BASE ANTES. Es un UPDATE sobre la tabla que alimenta la liquidación.

UPDATE dias_esperados d
JOIN (
  SELECT id FROM (
    SELECT x.id
    FROM dias_esperados x
    WHERE DAYOFWEEK(x.fecha) = 1
      AND x.esDescanso = 0
      AND x.horarioId IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM dias_esperados s
             WHERE s.colaboradorId = x.colaboradorId
               AND s.fecha >= DATE_SUB(x.fecha, INTERVAL 6 DAY)
               AND s.fecha <= x.fecha
               AND s.esDescanso = 1)
  ) AS calculado GROUP BY id
) AS objetivo ON objetivo.id = d.id
SET d.esDescanso = NULL;


-- ─────────────────────────── COMPROBACIÓN ───────────────────────────
--
-- Se comprueba el EFECTO, no lo que diga el UPDATE (§12.1). Esta es la misma consulta que localiza
-- las filas, y DESPUÉS tiene que devolver CERO. Correrla también ANTES, para saber cuántas eran.
--
-- SELECT e.nombre AS empresa,
--        CONCAT(c.nombre, ' ', c.apellido) AS persona,
--        DATE_FORMAT(d.fecha, '%Y-%m-%d') AS domingo,
--        DAYNAME(d.fecha) AS comprobacion
-- FROM dias_esperados d
-- JOIN colaboradores c ON c.id = d.colaboradorId
-- JOIN empresas e      ON e.id = c.empresaId
-- WHERE DAYOFWEEK(d.fecha) = 1
--   AND d.esDescanso = 0
--   AND d.horarioId IS NULL
--   AND NOT EXISTS (
--         SELECT 1 FROM dias_esperados s
--          WHERE s.colaboradorId = d.colaboradorId
--            AND s.fecha >= DATE_SUB(d.fecha, INTERVAL 6 DAY)
--            AND s.fecha <= d.fecha
--            AND s.esDescanso = 1)
-- ORDER BY d.fecha DESC;
--
-- `DATE_FORMAT` y no `DATE()`: un DATE pelado se convierte a UTC al salir y algunos clientes lo
-- pintan un día antes, así que un domingo se lee como sábado. La columna `comprobacion` está para
-- eso: tiene que decir `Sunday` en todas las filas.
--
-- NO HAY VUELTA ATRÁS FINA. El valor anterior era 0 en todas las filas tocadas, así que deshacerlo
-- es volver a ponerlas en 0, pero eso reintroduce el defecto. Si hay que revertir, se restaura el
-- backup.
