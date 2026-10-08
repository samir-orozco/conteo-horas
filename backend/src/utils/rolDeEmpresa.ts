// Los roles que una empresa le puede dar a su propia gente (7 de octubre de 2026). Es una lista
// permitida y no una prohibida: PUT /usuarios/:id escribía el rol que llegara en el cuerpo, y un ADMIN
// podía editarse a sí mismo con 'SUPER_ADMIN' y quedarse, al volver a entrar, con todo /api/admin.
// POST /usuarios solo rechazaba 'SUPER_ADMIN' y dejaba pasar 'AFILIADO' o cualquier otra cosa.
export type RolDeEmpresa = 'ADMIN' | 'SUPERVISOR';

export function rolPermitidoParaEmpresa(rol: unknown): rol is RolDeEmpresa {
  return rol === 'ADMIN' || rol === 'SUPERVISOR';
}
