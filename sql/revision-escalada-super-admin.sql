-- REVISIÓN DE LA ESCALADA A SUPER_ADMIN (7 de octubre de 2026). SOLO LECTURA, no cambia nada.
--
-- Hasta el arreglo de utils/rolDeEmpresa.ts, PUT /api/auth/usuarios/:id escribía el rol que llegara en
-- el cuerpo, y un ADMIN podía editarse a sí mismo con 'SUPER_ADMIN'. El PUT no toca empresaId, así que
-- quien lo hizo y sigue así es un SUPER_ADMIN CON empresa, que una cuenta legítima nunca tiene.
-- POST /api/auth/usuarios, además, dejaba crear dentro de una empresa cuentas AFILIADO o de otro rol.
--
-- Ninguna pantalla llama a /api/auth/usuarios: cualquier fila de auditoría sobre esa ruta es alguien
-- usando la API a mano, y vale la pena mirarla aunque no traiga SUPER_ADMIN.
--
-- Lo que NO ve: alguien que se subió, entró, guardó su token de 7 días y se bajó de nuevo. Ese caso
-- solo deja rastro en la auditoría, y la auditoría existe desde la fecha de auditoria_desde.
--
-- Cómo correrla. En phpMyAdmin, entrar primero a la base, pestaña SQL, pegar y Continuar. Son tres
-- consultas; phpMyAdmin muestra un resultado por cada una. Las fechas están en UTC (Bogotá es UTC-5).
--
-- Validada en una MariaDB desechable con el esquema de schema.prisma: con una escalada sembrada
-- enciende cada contador, y sin ella da 0 con los controles en positivo.

-- 1. RESUMEN, una fila. Lo esperado:
--    control_super_admins       1 o más (la cuenta del dueño). Si da 0, la consulta está mal, no la base.
--    super_admin_con_empresa    0. Distinto de 0 es la escalada.
--    otro_rol_con_empresa       0. Cuentas de empresa con un rol que no es ADMIN ni SUPERVISOR.
--    control_auditoria          más de 0. Si da 0, el contador de abajo no significa nada.
--    cambios_por_api_a_usuarios 0, o los que el dueño reconozca como suyos.
SELECT
  (SELECT COUNT(*) FROM usuarios WHERE rol = 'SUPER_ADMIN') AS control_super_admins,
  (SELECT COUNT(*) FROM usuarios WHERE rol = 'SUPER_ADMIN' AND empresaId IS NOT NULL) AS super_admin_con_empresa,
  (SELECT COUNT(*) FROM usuarios WHERE empresaId IS NOT NULL AND rol NOT IN ('ADMIN', 'SUPERVISOR')) AS otro_rol_con_empresa,
  (SELECT COUNT(*) FROM eventos_sistema WHERE tipo = 'AUDITORIA') AS control_auditoria,
  (SELECT MIN(primeraVez) FROM eventos_sistema WHERE tipo = 'AUDITORIA') AS auditoria_desde,
  (SELECT COUNT(*) FROM eventos_sistema WHERE tipo = 'AUDITORIA' AND ruta LIKE '/api/auth/usuarios%') AS cambios_por_api_a_usuarios;

-- 2. LAS CUENTAS. Todos los SUPER_ADMIN (tienen que ser solo las del dueño, sin empresa) y cualquier
--    cuenta de empresa con un rol raro.
SELECT id, email, rol, activo, empresaId, afiliadoId, creadoEn
FROM usuarios
WHERE rol = 'SUPER_ADMIN' OR (empresaId IS NOT NULL AND rol NOT IN ('ADMIN', 'SUPERVISOR'))
ORDER BY rol, creadoEn;

-- 3. EL RASTRO. Cada creación o edición por /api/auth/usuarios que salió bien, con quién la hizo y el
--    cuerpo que mandó (las contraseñas salen como «(oculto)»).
SELECT primeraVez, usuarioEmail, empresaId, metodo, ruta, estado, detalle
FROM eventos_sistema
WHERE tipo = 'AUDITORIA' AND ruta LIKE '/api/auth/usuarios%'
ORDER BY primeraVez;
