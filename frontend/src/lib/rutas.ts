// Ruta de inicio según el rol del usuario (super admin, afiliado o empresa).
export const rutaInicio = (rol?: string | null): string =>
  rol === 'SUPER_ADMIN' ? '/admin' : rol === 'AFILIADO' ? '/afiliado' : '/app';
