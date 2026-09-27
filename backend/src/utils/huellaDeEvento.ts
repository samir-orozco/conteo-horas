import { createHash } from 'crypto';

// Qué convierte muchas ocurrencias de un mismo problema en UNA fila con un contador
// (23 de septiembre de 2026).
//
// El registro del sistema no se borra solo: lo decidió el dueño, y tiene su botón de borrado. Lo
// que lo hace sostenible es esto. Un bot que golpea el login diez mil veces, o un error que se
// dispara en cada carga de una pantalla, tienen que dejar una fila que diga "10.000 veces" y no
// diez mil filas. Sin agrupación, la tabla se vuelve ilegible en una semana y crece sin techo
// sobre la base compartida del hosting.
//
// La huella es el identificador de "el mismo problema". Todo lo que cambia entre dos ocurrencias
// del MISMO problema —el id del colaborador en la ruta, el número de línea del archivo compilado,
// la fecha del rango— tiene que salir de la huella; todo lo que distingue un problema de otro
// —la ruta, el método, el mensaje— tiene que quedarse.

// Un segmento de ruta es un identificador si no lo escribió un programador: todo dígitos
// (`/festivos/2026`), una fecha (`/dia/2026-09-23`), o algo largo que mezcla letras y números
// (los cuid de Prisma y los tokens hexadecimales del kiosco).
//
// El requisito de que haya AL MENOS UN DÍGITO es lo que salva los nombres de ruta reales:
// `registro-facial`, `llegadas-tarde` y `plantillas-turno` son largos y con guiones, pero no
// llevan números.
const SOLO_DIGITOS = /^\d+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const IDENTIFICADOR = /^(?=[a-z0-9-]*\d)(?=[a-z0-9-]*[a-z])[a-z0-9-]{12,}$/i;

function esIdentificador(segmento: string): boolean {
  return SOLO_DIGITOS.test(segmento) || FECHA.test(segmento) || IDENTIFICADOR.test(segmento);
}

export function rutaNormalizada(url: string | undefined | null): string {
  if (!url) return '';
  const sinConsulta = url.split('?')[0];
  return sinConsulta
    .split('/')
    .map(seg => (esIdentificador(seg) ? ':id' : seg))
    .join('/');
}

// Lo que se compara para decidir si dos errores son el mismo. No es lo que se MUESTRA: el mensaje
// que ve el super admin se guarda aparte, completo.
export function mensajeNormalizado(mensaje: string | undefined | null): string {
  if (!mensaje) return '';
  return mensaje
    // El rastro de llamadas varía entre ocurrencias (la pila de async cambia); la primera línea es
    // la que dice qué pasó.
    .split('\n')[0]
    // `permisos.js:91:24`. La línea se mueve con cada despliegue aunque el defecto sea el mismo.
    .replace(/:\d+(:\d+)?\b/g, '')
    // Identificadores incrustados en el texto: `No existe el colaborador ckv123...`.
    .replace(/\b(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{12,}\b/gi, '')
    // Cualquier otro número: un timeout de 5000ms y uno de 8000ms son el mismo problema.
    .replace(/\d{2,}/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

// 32 caracteres hexadecimales: cabe en la columna y no colisiona en la práctica. Es un
// identificador de agrupación, no una garantía criptográfica.
export function huellaDeEvento(metodo: string | undefined, ruta: string | undefined, mensaje: string | undefined): string {
  const semilla = `${(metodo ?? '').toUpperCase()} ${rutaNormalizada(ruta)} ${mensajeNormalizado(mensaje)}`;
  return createHash('sha1').update(semilla).digest('hex').slice(0, 32);
}

// Recorta para que quepa en la columna, dejando a la vista que quedó cortado. Un `undefined` sale
// como cadena vacía y no como el texto "undefined", que es lo que termina pintado en la tabla.
export function recortar(texto: string | undefined | null, maximo: number): string {
  if (!texto) return '';
  return texto.length <= maximo ? texto : texto.slice(0, maximo - 1) + '…';
}
