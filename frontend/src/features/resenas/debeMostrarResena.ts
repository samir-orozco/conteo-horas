// Cuándo se abre la ventana que le pide la reseña a una empresa (docs/RESENAS.md, R2 a R4).
//
// Vive aparte del componente, con el mismo patrón que `debeMostrarNovedades`: la decisión son nueve
// condiciones y equivocarse significa o gastar la única oportunidad saliendo encima de otro aviso, o
// no preguntarle nunca a nadie.
//
// Lo que NO decide aquí: si la empresa es elegible (R1). Eso lo dice el servidor en `pendiente`
// leyendo la base: al día, segundo mes pagado, sin cortesía, no es la Demo y no ha respondido. Y con
// eso queda cubierto también el bloqueo de pago, porque una empresa en mora o suspendida no está al día.
import {
  debeMostrarNovedades, loteEsIneludible, guiaKey, vistaKey, apagadoKey,
} from '../../components/novedadesVisibles';

export type ContextoResena = {
  rol: string | null;
  // Lo que respondió GET /resenas/pendiente.
  pendiente: boolean;
  // R3: la ventana sale al entrar a Inicio y en ninguna otra pantalla.
  enInicio: boolean;
  // R3: ya salió en esta pestaña (ver `marcarResenaMostrada`).
  mostradaEnEstaPestana: boolean;
  // R3: «ni en mitad de un trabajo». La persona ya hizo algo en Inicio (un clic, una tecla) cuando
  // llegó la respuesta del servidor: abrió un modal, escribe en un campo. La ventana le caería encima
  // y le quitaría el foco, así que espera a la siguiente carga.
  trabajandoEnInicio: boolean;
  // R4, cada uno de los otros avisos que pueden salir en esta misma carga.
  // `undefined` cuenta como verificado, igual que en `VerificarCorreo`, que solo sale con un `false`.
  emailVerificado: boolean | undefined;
  vioLaGuia: boolean;
  novedadesPorMostrar: boolean;
  auxilioPorRevisar: boolean;
};

export function debeMostrarResena(c: ContextoResena): boolean {
  // R2: solo el administrador. El servidor lo vuelve a comprobar con el rol de la base; esto es para
  // no abrirle a nadie una ventana que no va a poder enviar.
  if (c.rol !== 'ADMIN') return false;
  if (!c.pendiente) return false;
  if (!c.enInicio) return false;
  if (c.mostradaEnEstaPestana) return false;
  if (c.trabajandoEnInicio) return false;

  // R4: hoy los avisos no se coordinan entre ellos, y uno más encima de otro tapa al que estaba. Si
  // en esta carga va a salir cualquiera de los otros, la reseña espera a la siguiente carga.
  if (c.emailVerificado === false) return false;
  if (!c.vioLaGuia) return false;
  if (c.novedadesPorMostrar) return false;
  if (c.auxilioPorRevisar) return false;
  return true;
}

// Inicio es la ruta índice del panel. Con o sin la barra final, que el enrutador acepta igual.
export const esRutaDeInicio = (pathname: string) => pathname.replace(/\/+$/, '') === '/app';

// ────────── UNA VEZ POR PESTAÑA (R3 y R8) ──────────
//
// En sessionStorage y no en localStorage, a propósito: muere con la pestaña. Cerrarla con la ventana
// abierta no gasta nada (R8), y la próxima vez que entre se vuelve a evaluar.
//
// SE MARCA SOLO CUANDO SALE, que es lo único que R3 prohíbe repetir. Un «no» no se marca: sessionStorage
// sobrevive a la recarga y a cerrar sesión, y una pestaña marcada con el «todavía no es elegible» de
// ayer no volvía a preguntar nunca, aunque hoy ya lo fuera. Lo que evita que salga detrás de las
// novedades en la MISMA carga (R4) es la decisión del componente, que se toma una vez y no se repite.
//
// Con try/catch en todo, porque el almacén puede lanzar (modo privado, datos de sitio bloqueados), y
// también acceder a `sessionStorage`: por eso se resuelve DENTRO del try y no como valor por omisión
// del parámetro, que se evalúa antes de entrar a la función.
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export const mostradaKey = (usuarioId: string) => `horapro_resena_mostrada_${usuarioId}`;

export function resenaMostradaEnEstaPestana(usuarioId: string, almacen?: Almacen): boolean {
  try {
    return (almacen ?? sessionStorage).getItem(mostradaKey(usuarioId)) === '1';
  } catch {
    // Si no se puede saber, no se pregunta: no salir no gasta la oportunidad, y salir en cada carga sí
    // molesta.
    return true;
  }
}

export function marcarResenaMostrada(usuarioId: string, almacen?: Almacen): void {
  try {
    (almacen ?? sessionStorage).setItem(mostradaKey(usuarioId), '1');
  } catch { /* sin almacén no hay memoria por pestaña; el componente sigue recordándolo mientras viva */ }
}

// ────────── LOS OTROS AVISOS DE ESTA CARGA (R4) ──────────
//
// La guía y las novedades, leídas con SUS llaves y con SU regla, no con una copia: una copia aquí
// sería una segunda verdad que se desalinea el día que cambie el lote (CLAUDE.md §9.3).
//
// HAY QUE LEERLO AL MONTAR, una sola vez. Cerrar las novedades escribe su llave, y si se leyera
// después, la reseña saldría justo detrás de ellas en la misma carga.
export function avisosDeLaCarga(
  usuario: { id: string; rol: string },
  almacen?: Pick<Storage, 'getItem'>,
): { vioLaGuia: boolean; novedadesPorMostrar: boolean } {
  try {
    const a = almacen ?? localStorage;
    const vioLaGuia = !!a.getItem(guiaKey(usuario.id));
    const novedadesPorMostrar = debeMostrarNovedades({
      rol: usuario.rol,
      vioLaGuia,
      vioEstaVersion: !!a.getItem(vistaKey(usuario.id)),
      apagadas: !!a.getItem(apagadoKey(usuario.id)),
      forzado: false,
      ineludible: loteEsIneludible(),
    });
    return { vioLaGuia, novedadesPorMostrar };
  } catch {
    // Sin poder leer, se supone que hay otro aviso: la reseña espera en vez de salir encima.
    return { vioLaGuia: false, novedadesPorMostrar: true };
  }
}
