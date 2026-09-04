// De qué se le habla a la persona cuando algo falla.
//
// El backend contesta { error: 'texto' } y axios lo envuelve en
// e.response.data.error. Un fallo del propio navegador (leer el archivo,
// procesar la imagen) llega como un Error normal. Los dos terminan en el mismo
// cartelito, y sin esto cada sitio lo destripa a mano con un `any`.
export function mensajeDeError(e: unknown, respaldo: string): string {
  if (typeof e === 'object' && e !== null) {
    const respuesta = (e as { response?: { data?: { error?: unknown } } }).response;
    const delServidor = respuesta?.data?.error;
    if (typeof delServidor === 'string' && delServidor.trim()) return delServidor;

    const mensaje = (e as { message?: unknown }).message;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return respaldo;
}
