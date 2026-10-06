// De qué se le habla a la persona cuando algo falla.
//
// El backend contesta { error: 'texto' } y axios lo envuelve en
// e.response.data.error. Un fallo del propio navegador (leer el archivo,
// procesar la imagen) llega como un Error normal. Los dos terminan en el mismo
// cartelito, y sin esto cada sitio lo destripa a mano con un `any`.
import { esBloqueoDelHosting, MENSAJE_BLOQUEO } from './bloqueoDelHosting';

export const SIN_CONEXION = 'No hay conexión con el servidor. Revisa que esté encendido y vuelve a intentar.';

export function mensajeDeError(e: unknown, respaldo: string): string {
  if (typeof e === 'object' && e !== null) {
    // Una petición que salió y NO obtuvo respuesta no es un rechazo del servidor: es que no hay
    // servidor. Distinguirlo importa porque el respaldo de quien llama suele hablar de lo que se
    // envió ("email o contraseña incorrectos"), y con el backend caído eso manda a buscar el
    // problema donde no está (CLAUDE.md §12.2). Se reconoce porque axios lo marca como suyo y no
    // trae `response`.
    const esDeAxios = Boolean((e as { isAxiosError?: boolean }).isAxiosError) || 'config' in (e as object);
    if (esDeAxios && !(e as { response?: unknown }).response) return SIN_CONEXION;

    const respuesta = (e as { response?: { data?: { error?: unknown } } }).response;
    const delServidor = respuesta?.data?.error;
    if (typeof delServidor === 'string' && delServidor.trim()) return delServidor;

    // Un 403 sin el JSON de la app lo puso otra capa (ver `bloqueoDelHosting.ts`). Va ANTES del texto
    // de axios, que dice «Request failed with status code 403» y no le sirve a nadie, y DESPUÉS del
    // mensaje del servidor, que si existe es el que sabe por qué.
    if (esBloqueoDelHosting(e)) return MENSAJE_BLOQUEO;

    const mensaje = (e as { message?: unknown }).message;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return respaldo;
}
