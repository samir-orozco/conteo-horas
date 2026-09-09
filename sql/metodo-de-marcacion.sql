-- Con qué se autenticó cada marcación: rostro, cédula o carga manual del admin.
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

ALTER TABLE `registros`
  ADD COLUMN `metodoEntrada`    ENUM('ROSTRO','CEDULA','MANUAL') NULL,
  ADD COLUMN `metodoSalida`     ENUM('ROSTRO','CEDULA','MANUAL') NULL,
  ADD COLUMN `distanciaEntrada` DOUBLE NULL,
  ADD COLUMN `distanciaSalida`  DOUBLE NULL;

-- Comprobación: las cuatro tienen que aparecer, y las cuatro con Null = YES.
SHOW COLUMNS FROM `registros` WHERE Field IN
  ('metodoEntrada','metodoSalida','distanciaEntrada','distanciaSalida');
