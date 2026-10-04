// ¿ESTE ERROR ES DE OTROS? (4 de octubre de 2026, pedido del dueño).
//
// CapturadorErrores tapa la página con el error para que quien lo sufre lo pueda leer y avisar. Eso
// sirve para lo nuestro. Lo que lanzan scripts ajenos no lo arregla nadie aquí, y taparle la página
// a un visitante por eso solo lo espanta: el registro mostró «Error invoking postMessage: Java object
// is gone» en la página de inicio, que lo lanza el navegador interno de apps de Android (Facebook,
// Instagram…) al cerrarse. Lo ajeno se sigue REPORTANDO al registro, solo que sin pantalla.

// Mensajes que se sabe que son de otros, vengan del archivo que vengan: el puente de Android puede
// quedar a nombre de nuestro paquete si es nuestro código el que llama a `postMessage`.
const MENSAJES_AJENOS = [/Java object is gone/i, /Error invoking postMessage/i];

// Un archivo es nuestro si es un script servido por esta misma página: el paquete en producción
// (/assets/*.js) o los módulos en desarrollo (/src/*.tsx). A nombre de la página misma queda lo que
// inyecta una app, y eso no es nuestro.
const esScript = (ruta: string) => /\.(m?js|jsx?|tsx?)$/.test(ruta);

function esArchivoNuestro(archivo: string, origen: string): boolean {
  try {
    const url = new URL(archivo);
    return url.origin === origen && esScript(url.pathname);
  } catch {
    return false;
  }
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function esErrorAjeno(
  { mensaje, archivo, rastro }: { mensaje: string; archivo?: string; rastro?: string },
  origen: string,
): boolean {
  if (MENSAJES_AJENOS.some(m => m.test(mensaje))) return true;
  // Un error de la página (window.onerror) siempre dice de qué archivo viene. Si no lo dice, o es de
  // otro sitio, o es la página misma, no es nuestro.
  if (archivo !== undefined) return !esArchivoNuestro(archivo, origen);
  // Una promesa rechazada no trae archivo: se mira si su rastro pasa por algún script nuestro. Sin
  // rastro no se sabe de dónde vino, y se sigue mostrando como hasta hoy.
  if (!rastro) return false;
  const nuestro = new RegExp(`${escapar(origen)}/[^\\s)]*\\.(m?js|jsx?|tsx?)`);
  return !nuestro.test(rastro);
}
