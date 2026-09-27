// La cuenta del super administrador: lo que se puede decidir sin hablar con el servidor.
// 23 de septiembre de 2026.

export function iniciales(nombre: string | undefined | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return partes.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

// Qué tan buena es una contraseña, y SOBRE TODO qué le falta.
//
// Una barra de colores sola no ayuda a nadie: dice "débil" y deja a la persona probando cosas. Por
// eso esto devuelve la lista de lo que falta, en castellano, y la pantalla la escribe.
const EXIGENCIAS: { prueba: (c: string) => boolean; falta: string }[] = [
  { prueba: c => c.length >= 8, falta: 'al menos 8 caracteres' },
  { prueba: c => /[a-z]/.test(c) && /[A-Z]/.test(c), falta: 'una mayúscula' },
  { prueba: c => /\d/.test(c), falta: 'un número' },
  { prueba: c => /[^A-Za-z0-9]/.test(c), falta: 'un símbolo' },
];

const ETIQUETAS = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte'];

export function fuerzaDeClave(clave: string): { nivel: number; etiqueta: string; falta: string[] } {
  if (!clave) return { nivel: 0, etiqueta: '', falta: EXIGENCIAS.map(e => e.falta) };
  const cumplidas = EXIGENCIAS.filter(e => e.prueba(clave));
  // Una clave que no cumple NADA sigue siendo "muy débil" y no "sin nivel": el 0 está reservado
  // para el campo vacío, que es cuando la pantalla no debe decir nada todavía.
  const nivel = Math.max(1, cumplidas.length);
  return {
    nivel,
    etiqueta: ETIQUETAS[nivel],
    falta: EXIGENCIAS.filter(e => !e.prueba(clave)).map(e => e.falta),
  };
}

// El mínimo de 6 es EL DEL SERVIDOR (`PUT /api/auth/me`), no uno inventado aquí. Más laxo haría
// que la persona escriba todo para que se lo rechacen al final; más estricto prometería una regla
// que el servidor no aplica. Las exigencias de `fuerzaDeClave` son consejo, no puerta.
export const MINIMO_CARACTERES = 6;

export function validarCambioDeClave(campos: { actual: string; nueva: string; confirmar: string }): string | null {
  if (!campos.actual) return 'Escribe tu contraseña actual para confirmar que eres tú.';
  if (campos.nueva.length < MINIMO_CARACTERES) return `La nueva contraseña debe tener al menos ${MINIMO_CARACTERES} caracteres.`;
  if (campos.nueva !== campos.confirmar) return 'Las dos contraseñas nuevas no coinciden.';
  if (campos.nueva === campos.actual) return 'La nueva contraseña tiene que ser distinta de la actual.';
  return null;
}
