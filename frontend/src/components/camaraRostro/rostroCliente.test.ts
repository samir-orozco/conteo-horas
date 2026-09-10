// POR QUÉ EXISTE ESTE ARCHIVO
//
// El 10 de septiembre de 2026 quedó en video que el reto de giro se pasa con una
// foto en la pantalla de un celular. El comentario del propio código lo suponía
// ("inclinando el celular se falsea parte del giro") pero nadie había puesto el
// número. Estas pruebas lo ponen, y el número es peor de lo que decía el comentario:
// NO se falsea "parte" del giro, se falsea entero, y sin ninguna inclinación
// fuera del plano.
//
// La causa es que `desviacionYaw` mira SOLO la coordenada X. Girar la cara en el
// plano de la imagen (inclinarla hacia el hombro, o torcer el celular) encoge el
// denominador y corre el numerador, y el cociente se mueve como si la cabeza
// hubiera girado. Con las proporciones de una cara promedio la relación es
// exacta y sale a mano:
//
//     desviacionYaw(inclinación θ) = -(30/63) · tan θ ≈ -0.476 · tan θ
//
// El umbral del reto es 0.13, así que el cruce está en 15.27 grados exactos.
// Basta con torcer el celular algo más de quince grados.
import { describe, it, expect } from 'vitest';
import { desviacionYaw, poseCumple } from './rostroCliente';

// Las tres proporciones que usa `desviacionYaw`, en milímetros de una cara
// promedio: esquinas externas de los ojos separadas 63 mm, y la punta de la
// nariz 30 mm por debajo de la línea de los ojos.
const OJO_IZQ = [-31.5, -20];
const OJO_DER = [31.5, -20];
const NARIZ = [0, 10];

const rotar = ([x, y]: number[], grados: number) => {
  const r = (grados * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
};

// `desviacionYaw` solo llama a getNose()[3], getLeftEye()[0] y getRightEye()[3].
// Se le arma una cara PLANA rotada dentro del plano de la imagen: cero giro real.
const caraPlanaInclinada = (grados: number) =>
  ({
    getNose: () => [null, null, null, rotar(NARIZ, grados)],
    getLeftEye: () => [rotar(OJO_IZQ, grados)],
    getRightEye: () => [null, null, null, rotar(OJO_DER, grados)],
  }) as never;

describe('desviacionYaw confunde inclinación con giro', () => {
  it('una cara de frente y sin inclinar da ~0', () => {
    expect(desviacionYaw(caraPlanaInclinada(0))).toBeCloseTo(0, 10);
  });

  it('sigue la fórmula -0.476·tan(inclinación), sin un solo grado de giro real', () => {
    for (const g of [5, 10, 15, 20, 25, 30]) {
      const esperado = -(30 / 63) * Math.tan((g * Math.PI) / 180);
      expect(desviacionYaw(caraPlanaInclinada(g))).toBeCloseTo(esperado, 10);
    }
  });

  it('ESTE ES EL AGUJERO: 15.3 grados de inclinación ya cuentan como giro cumplido', () => {
    // 15° da 0.1276 y NO alcanza; el cruce exacto es 15.27°. La precisión importa:
    // es la diferencia entre "basta inclinar" y "basta inclinar un poco más".
    expect(Math.abs(desviacionYaw(caraPlanaInclinada(15)))).toBeLessThan(0.13);
    const dev = desviacionYaw(caraPlanaInclinada(16));
    expect(Math.abs(dev)).toBeGreaterThan(0.13);   // el umbral de poseCumple
    expect(poseCumple('izquierda', dev) || poseCumple('derecha', dev)).toBe(true);
  });

  it('y volver a enderezarla cuenta como "mirar al frente": el reto entero se pasa así', () => {
    // El reto pide girar hacia un lado y después volver al frente. Una foto
    // plana hace las dos fases con solo torcerse y destorcerse en el plano.
    const girada = desviacionYaw(caraPlanaInclinada(-18));
    const derecha = desviacionYaw(caraPlanaInclinada(0));
    expect(poseCumple('derecha', girada) || poseCumple('izquierda', girada)).toBe(true);
    expect(poseCumple('frontal', derecha)).toBe(true);
  });

  it('el lado sorteado tampoco protege: el signo se elige con el sentido de la inclinación', () => {
    const haciaUnLado = desviacionYaw(caraPlanaInclinada(18));
    const haciaElOtro = desviacionYaw(caraPlanaInclinada(-18));
    expect(Math.sign(haciaUnLado)).toBe(-Math.sign(haciaElOtro));
    expect(poseCumple('derecha', haciaUnLado)).not.toBe(poseCumple('derecha', haciaElOtro));
  });

  // Lo que se midió sobre el video del fraude, para dejarlo anclado: la
  // inclinación del celular fue de 10.4° a 26.9°, un recorrido de 16.5°. Con la
  // fórmula de arriba eso mueve la desviación 0.088 -> 0.243, o sea que cruza el
  // umbral de 0.13 con holgura. La medición y la aritmética coinciden.
  it('el recorrido de inclinación medido en el video basta para cruzar el umbral', () => {
    expect(Math.abs(desviacionYaw(caraPlanaInclinada(10.4)))).toBeLessThan(0.13);
    expect(Math.abs(desviacionYaw(caraPlanaInclinada(26.9)))).toBeGreaterThan(0.13);
  });
});
