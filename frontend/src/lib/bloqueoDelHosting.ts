// UN 403 QUE NO ES NUESTRO (6 de octubre de 2026).
//
// Al iniciar sesión, a veces salía «Request failed with status code 403» y solo recargando la página se
// podía volver a entrar. Se comprobó que ese 403 no lo produce la app: el único 403 del login es
// «Empresa inactiva», que lleva su mensaje; el registro de accesos no tiene ninguno del login; y desde la
// misma IP, una petición sin la cookie del navegador recibe una página de espera («One moment,
// please…») de otra capa. Que esa capa sea Imunify360 es la atribución de DESPLIEGUE.md §4.2: la página
// no se nombra a sí misma.
//
// LA REGLA: UN 403 SIN UN `error` DE TEXTO EN EL CUERPO NO ES DE LA APP. Todos los 403 que escribe el
// backend llevan `error` (revisados uno por uno el 7 de octubre de 2026), y es el mismo criterio con el
// que `mensajeDeError` decide si hay un mensaje del servidor que mostrar. Quien está delante contesta
// HTML, nada, o un JSON propio que no lo trae: el 10 de septiembre el hosting respondió
// `{"message": "Access denied by Imunify360 bot-protection…"}`, y `axios` lo convierte en el mismo
// «Request failed with status code 403». La primera versión (6 de octubre) trataba todo JSON como de la
// app y ese caso se le escapaba; se corrigió el 7 de octubre.
//
// SOLO EL 403. Un 500 o un 429 con `{"message": …}` no es un bloqueo, y recargar sobre ellos no arregla
// nada. Y con `error` de texto es SIEMPRE de la app, aunque traiga más campos: es la contraparte que
// protege a quien ve «Tu plan permite hasta 10 colaboradores» de que se la tape un aviso de seguridad.

export const MENSAJE_BLOQUEO = 'El servicio de seguridad detuvo la solicitud. Recarga la página e inténtalo de nuevo.';

// Cuánto dura la guarda contra recargar en bucle. Si recargar no arregló nada, volver a recargar tampoco:
// se avisa y se para. Un minuto basta: la recarga tarda segundos, y pasado el minuto es otra vez.
export const VENTANA_RECARGA_MS = 60_000;

// ¿La app dijo algo con sus propias palabras? Un texto no vacío en `error`: lo mismo que `mensajeDeError`
// considera un mensaje del servidor. Un `error` vacío, en blanco o que no es texto no explica nada.
function traeMensajeDeLaApp(cuerpo: unknown): boolean {
  if (typeof cuerpo !== 'object' || cuerpo === null) return false;
  const error = (cuerpo as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() !== '';
}

export function esBloqueoDelHosting(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const respuesta = (e as { response?: { status?: unknown; data?: unknown } }).response;
  if (!respuesta || respuesta.status !== 403) return false;
  return !traeMensajeDeLaApp(respuesta.data);
}

export type DecisionDeRecarga = 'RECARGAR' | 'SOLO_AVISAR';

export function decidirRecarga(ahora: number, ultima: number | null): DecisionDeRecarga {
  if (ultima === null) return 'RECARGAR';
  const pasado = ahora - ultima;
  // Una marca del futuro (reloj movido) no es de fiar y no puede dejar la puerta cerrada para siempre.
  if (pasado < 0) return 'RECARGAR';
  return pasado < VENTANA_RECARGA_MS ? 'SOLO_AVISAR' : 'RECARGAR';
}

// ────────── LO QUE SOBREVIVE A LA RECARGA ──────────
//
// Dos cosas y solo dos: cuándo se recargó, para la guarda de arriba, y el correo, para no obligar a
// escribirlo otra vez. LA CONTRASEÑA NO SE GUARDA NUNCA, ni en `sessionStorage`, que dura lo que dura la
// pestaña: por eso después de recargar hay que volver a escribirla.
//
// Con try/catch en todo, porque `sessionStorage` puede lanzar (modo privado, datos de sitio bloqueados) y
// una pantalla de login que se cae por querer ser amable es peor que la que no lo intentaba.
type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const CLAVE_MARCA = 'hp:recarga-del-login';
const CLAVE_CORREO = 'hp:recarga-del-login-correo';

export function guardarRecarga(almacen: Almacen, ahora: number, email: string): void {
  try {
    almacen.setItem(CLAVE_MARCA, String(ahora));
    almacen.setItem(CLAVE_CORREO, email);
  } catch { /* sin almacén no hay precarga, y la recarga sigue funcionando */ }
}

export function ultimaRecarga(almacen: Almacen): number | null {
  try {
    const crudo = almacen.getItem(CLAVE_MARCA);
    if (crudo === null || crudo.trim() === '') return null;
    const n = Number(crudo);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

// El correo a precargar, solo si la recarga es de hace poco: un correo de hace una hora no es de esta
// vez. `ahora` por parámetro para poder probarlo; el valor por omisión es el reloj de verdad.
export function recargaReciente(almacen: Almacen, ahora: number = Date.now()): { email: string } | null {
  const ultima = ultimaRecarga(almacen);
  if (ultima === null) return null;
  const pasado = ahora - ultima;
  if (pasado < 0 || pasado >= VENTANA_RECARGA_MS) return null;
  try {
    const email = almacen.getItem(CLAVE_CORREO);
    return email ? { email } : null;
  } catch { return null; }
}

// Tras entrar bien ya no hay nada que recordar: ni la marca ni el correo.
export function olvidarRecarga(almacen: Almacen): void {
  try {
    almacen.removeItem(CLAVE_MARCA);
    almacen.removeItem(CLAVE_CORREO);
  } catch { /* igual que arriba */ }
}
