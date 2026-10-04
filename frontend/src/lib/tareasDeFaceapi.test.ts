import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// LAS TAREAS DE face-api.js SE ESPERAN CON `.run()` (4 de octubre de 2026).
//
// `detectSingleFace(...)`, `detectAllFaces(...)` y lo que se les encadena devuelven tareas cuyo
// `then` recibe SOLO el camino del éxito (`ComposableTask` en face-api.js 0.22). Si la tarea falla,
// un `await tarea` no recibe el error: se queda esperando para siempre y el error sale suelto como
// promesa rechazada. En el kiosco eso congelaba la cámara y tapaba la pantalla con el error negro;
// el `try` que la rodeaba no servía de nada. Pasó 7 veces entre el 1 y el 3 de octubre de 2026.
//
// `.run()` sí devuelve una promesa de verdad. Esta prueba recorre el código y lo exige en cada
// llamada al detector: la regla queda en el guion y no en la memoria de quien toque el archivo.

// Vitest corre desde `frontend/`. Si esta ruta estuviera mal no se encontraría ninguna llamada, y la
// primera prueba se pondría roja.
const SRC = join(process.cwd(), 'src');

function archivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap(nombre => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

// Desde la llamada al detector, la cadena de métodos que la sigue: «withFaceLandmarks»,
// «withFaceDescriptor», «run»… Se lee paréntesis por paréntesis para no confundir dos llamadas de
// la misma sentencia, como las dos ramas de un `? :`.
function cadenaDesde(texto: string, inicio: number): string[] {
  const cerrar = (abre: number) => {
    let profundidad = 0;
    for (let i = abre; i < texto.length; i++) {
      if (texto[i] === '(') profundidad++;
      else if (texto[i] === ')' && --profundidad === 0) return i;
    }
    return texto.length;
  };
  const metodos: string[] = [];
  let i = cerrar(texto.indexOf('(', inicio)) + 1;
  for (;;) {
    const resto = texto.slice(i);
    const m = /^\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/.exec(resto);
    if (!m) return metodos;
    metodos.push(m[1]);
    i = cerrar(i + m[0].length - 1) + 1;
  }
}

function llamadasAlDetector() {
  return archivosDeCodigo(SRC).flatMap(archivo => {
    const texto = readFileSync(archivo, 'utf8');
    const llamadas: { donde: string; cadena: string[] }[] = [];
    const re = /faceapi\.detect(?:SingleFace|AllFaces)\s*\(/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const linea = texto.slice(0, m.index).split('\n').length;
      llamadas.push({ donde: `${relative(SRC, archivo)}:${linea}`, cadena: cadenaDesde(texto, m.index) });
    }
    return llamadas;
  });
}

describe('las tareas de face-api.js', () => {
  it('hay llamadas al detector que revisar (si no encontrara ninguna, la regla pasaría sola)', () => {
    expect(llamadasAlDetector().length).toBeGreaterThanOrEqual(3);
  });

  it('cada llamada al detector se espera con .run()', () => {
    const sinRun = llamadasAlDetector().filter(l => !l.cadena.includes('run')).map(l => l.donde);
    expect(sinRun).toEqual([]);
  });

  it('lee bien la cadena: las dos ramas de un ? : son dos llamadas distintas', () => {
    const texto = 'x = a ? await faceapi.detectSingleFace(v, o()).withFaceLandmarks().run() : await faceapi.detectSingleFace(v, o()).withFaceLandmarks();';
    const primera = texto.indexOf('faceapi.detectSingleFace');
    const segunda = texto.indexOf('faceapi.detectSingleFace', primera + 1);
    expect(cadenaDesde(texto, primera)).toEqual(['withFaceLandmarks', 'run']);
    expect(cadenaDesde(texto, segunda)).toEqual(['withFaceLandmarks']);
  });
});
