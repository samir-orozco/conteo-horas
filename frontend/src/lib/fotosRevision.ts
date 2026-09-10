// UNA SOLA PETICIÓN POR REGISTRO, la pida quien la pida.
//
// Con miniaturas en la lista, la misma foto la quieren tres sitios a la vez: la
// miniatura de su fila, el visor grande cuando se selecciona, y el barrido que
// busca aparatos. Sin un caché común, cada foto se descargaría hasta tres veces,
// y la entrada y la salida de un mismo registro (que el endpoint devuelve
// JUNTAS) dos veces más.
//
// POR QUÉ SE GUARDA LA PROMESA Y NO EL RESULTADO. Si dos filas del mismo
// registro aparecen en pantalla en el mismo instante, las dos preguntan antes de
// que llegue la primera respuesta. Guardando el resultado, las dos lanzarían su
// petición; guardando la promesa, la segunda se cuelga de la primera.
import api from './api';

export type FotosDeRegistro = { fotoEntrada: string | null; fotoSalida: string | null };

// Tope de registros en memoria. Una semana de revisión puede traer hasta 600
// filas, y cada foto son unos 15 KB en base64: sin tope, una sesión larga guarda
// megas de caras. Al pasarse se sueltan las más viejas.
export const MAX_REGISTROS = 300;

const cache = new Map<string, Promise<FotosDeRegistro>>();

export function pedirFotos(registroId: string): Promise<FotosDeRegistro> {
  const hay = cache.get(registroId);
  if (hay) {
    // Se reinserta para que cuente como recién usada y no la suelte el tope.
    cache.delete(registroId);
    cache.set(registroId, hay);
    return hay;
  }
  const p = api.get(`/registros/${registroId}/fotos`).then(r => r.data as FotosDeRegistro);
  cache.set(registroId, p);
  // UN FALLO NO SE GUARDA. Si se quedara la promesa rechazada, un corte de red de
  // un segundo dejaría ese registro sin foto el resto de la sesión, y la única
  // forma de verla sería recargar la pantalla.
  p.catch(() => { if (cache.get(registroId) === p) cache.delete(registroId); });
  while (cache.size > MAX_REGISTROS) {
    const masVieja = cache.keys().next().value;
    if (masVieja === undefined) break;
    cache.delete(masVieja);
  }
  return p;
}

export const fotoDelMomento = (f: FotosDeRegistro, momento: 'entrada' | 'salida') =>
  momento === 'entrada' ? f.fotoEntrada : f.fotoSalida;

/**
 * Suelta todas las fotos. Se llama al salir de la pantalla de Revisión: en un
 * computador compartido, las caras de los trabajadores no deben quedarse en la
 * memoria de la pestaña después de que el administrador se fue a otra parte.
 */
export function olvidarFotos(): void {
  cache.clear();
}

/** Solo para pruebas. */
export const registrosEnMemoria = () => cache.size;
