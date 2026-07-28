// Código de referido del programa de afiliados.
// El link del afiliado es https://horapro.co/?ref=CODIGO. Al abrirlo se
// guarda el código en localStorage SIN vencimiento: cuando el visitante se
// registre —hoy o dentro de meses— la empresa queda atribuida a ese afiliado.
const KEY = 'horapro_ref';

// Lee ?ref= de la URL actual y lo persiste (llamar en la landing y en /registro).
export function capturarRef(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.trim()) localStorage.setItem(KEY, ref.trim().toUpperCase());
  } catch {
    /* localStorage bloqueado (modo incógnito estricto): se ignora */
  }
}

export function obtenerRef(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

// Tras registrarse se limpia, para no re-atribuir un registro posterior no relacionado.
export function limpiarRef(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
