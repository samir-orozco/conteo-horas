// POR QUÉ EXISTE ESTE ARCHIVO
//
// El 10 de septiembre de 2026 quedó en video que el reto de giro del kiosco se
// pasa con una foto en la pantalla de un celular. El comentario del propio código
// lo suponía ("inclinando el celular se falsea parte del giro") pero nadie había
// puesto el número. Aquí está, y es peor que el comentario: no se falseaba parte
// del giro, se falseaba entero, sin un grado de movimiento en profundidad.
//
// LA CAUSA: `desviacionYaw` miraba SOLO la coordenada X.
//
//     versión vieja = (nariz.x - ojoIzq.x) / (ojoDer.x - ojoIzq.x) - 0.5
//
// Torcer una cara PLANA dentro del plano de la imagen encoge el denominador y
// corre el numerador, así que el cociente se mueve como si la cabeza hubiera
// girado. Con proporciones de cara promedio la contaminación es exacta:
//
//     versión vieja(inclinación θ, cero giro) = -(30/63) · tan θ ≈ -0.476 · tan θ
//
// El umbral de `poseCumple` es 0.13, o sea que el cruce estaba en 15.27 grados.
//
// Y el daño no era solo el fraude. El mismo `desviacionYaw` gobierna los tres
// pasos del ENROLAMIENTO, así que además:
//   - quien inclinaba la cabeza en vez de girarla pasaba el paso "derecha" con
//     una toma casi frontal, y el descriptor quedaba sin cobertura angular;
//   - quien miraba de frente con la cabeza inclinada 12 grados daba 0.101 y NO
//     pasaba el paso "mira de frente", que exige menos de 0.1.
//
// El arreglo proyecta sobre la línea de los ojos, que es invariante a esa
// inclinación. Para una cara derecha las dos fórmulas dan lo mismo.
import { describe, it, expect } from 'vitest';
import { desviacionYaw, poseCumple } from './rostroCliente';

// Las tres proporciones que usa `desviacionYaw`, en milímetros de una cara
// promedio: esquinas externas de los ojos separadas 63 mm, y la punta de la
// nariz 30 mm por debajo de la línea de los ojos.
const OJO_IZQ = [-31.5, -20];
const OJO_DER = [31.5, -20];
const NARIZ = [0, 10];

type Punto = { x: number; y: number };
const rotar = ([x, y]: number[], grados: number): Punto => {
  const r = (grados * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
};

// `desviacionYaw` solo llama a getNose()[3], getLeftEye()[0] y getRightEye()[3].
const armar = (nariz: Punto, ojoIzq: Punto, ojoDer: Punto) =>
  ({
    getNose: () => [null, null, null, nariz],
    getLeftEye: () => [ojoIzq],
    getRightEye: () => [null, null, null, ojoDer],
  }) as never;

// Una cara PLANA, sin un grado de giro, torcida dentro del plano de la imagen.
const caraPlanaInclinada = (grados: number) =>
  armar(rotar(NARIZ, grados), rotar(OJO_IZQ, grados), rotar(OJO_DER, grados));

// Una cara con giro REAL: la nariz se corre a lo largo de la línea de los ojos.
// `t` es la fracción del recorrido; 0.5 es la nariz centrada, o sea de frente.
const narizGirada = (t: number) => [OJO_IZQ[0] + t * (OJO_DER[0] - OJO_IZQ[0]), NARIZ[1]];
const caraGirada = (t: number, inclinacion = 0) =>
  armar(rotar(narizGirada(t), inclinacion), rotar(OJO_IZQ, inclinacion), rotar(OJO_DER, inclinacion));

// La fórmula VIEJA, escrita aquí a propósito. No se importa de ningún lado: es
// la evidencia del defecto, y se conserva para que el arreglo se pueda comparar
// contra algo y no contra un recuerdo.
const formulaVieja = (grados: number) => {
  const n = rotar(NARIZ, grados), i = rotar(OJO_IZQ, grados), d = rotar(OJO_DER, grados);
  return (n.x - i.x) / (d.x - i.x) - 0.5;
};

describe('el defecto que tenía desviacionYaw, para que no vuelva', () => {
  it('la fórmula vieja seguía -0.476·tan(inclinación) sin un solo grado de giro', () => {
    for (const g of [5, 10, 15, 20, 25, 30]) {
      expect(formulaVieja(g)).toBeCloseTo(-(30 / 63) * Math.tan((g * Math.PI) / 180), 10);
    }
  });

  it('con la fórmula vieja, 15.3 grados de inclinación ya cruzaban el umbral del reto', () => {
    // 15° daba 0.1276 y no alcanzaba; el cruce exacto estaba en 15.27°.
    expect(Math.abs(formulaVieja(15))).toBeLessThan(0.13);
    expect(Math.abs(formulaVieja(16))).toBeGreaterThan(0.13);
  });

  it('el recorrido de inclinación medido en el video del fraude bastaba para cruzarlo', () => {
    // Medido sobre los fotogramas: el celular fue de 10.4° a 26.9° de inclinación.
    expect(Math.abs(formulaVieja(10.4))).toBeLessThan(0.13);
    expect(Math.abs(formulaVieja(26.9))).toBeGreaterThan(0.13);
  });
});

describe('desviacionYaw mide giro, no inclinación', () => {
  it('una cara de frente y sin inclinar da ~0', () => {
    expect(desviacionYaw(caraPlanaInclinada(0))).toBeCloseTo(0, 10);
  });

  it('una cara plana inclinada hasta 30 grados sigue dando ~0', () => {
    for (const g of [5, 10, 15, 20, 25, 30, -20]) {
      expect(Math.abs(desviacionYaw(caraPlanaInclinada(g)))).toBeLessThan(0.02);
    }
  });

  it('coincide con la fórmula vieja cuando la cara está derecha: no mueve a nadie', () => {
    expect(desviacionYaw(caraPlanaInclinada(0))).toBeCloseTo(formulaVieja(0), 10);
    const n = narizGirada(0.3);
    expect(desviacionYaw(caraGirada(0.3))).toBeCloseTo((n[0] - OJO_IZQ[0]) / (OJO_DER[0] - OJO_IZQ[0]) - 0.5, 10);
  });

  it('un giro real sí se mide, y no lo altera la inclinación', () => {
    const sinInclinar = desviacionYaw(caraGirada(0.2));
    for (const g of [0, 10, 20, -15]) {
      expect(desviacionYaw(caraGirada(0.2, g))).toBeCloseTo(sinInclinar, 6);
    }
    expect(Math.abs(sinInclinar)).toBeGreaterThan(0.13); // cuenta como giro
  });
});

describe('lo que el arreglo cambia para las personas', () => {
  it('quien mira de frente con la cabeza inclinada 12 grados ya no es rechazado', () => {
    // Con la fórmula vieja daba 0.101 y fallaba `poseCumple('frontal')`, que
    // exige menos de 0.1. Era un falso rechazo en el paso "mira de frente".
    expect(Math.abs(formulaVieja(12))).toBeGreaterThan(0.1);
    expect(poseCumple('frontal', desviacionYaw(caraPlanaInclinada(12)))).toBe(true);
    expect(poseCumple('frontal', desviacionYaw(caraPlanaInclinada(-12)))).toBe(true);
  });

  it('el paso "derecha" del enrolamiento ya no se pasa inclinando la cabeza', () => {
    // Este es el daño de verdad: una muestra "de perfil" que en realidad era
    // frontal deja el enrolamiento sin cobertura angular, y sin cobertura
    // angular el cotejo 1:N confunde a personas parecidas.
    const inclinada = desviacionYaw(caraPlanaInclinada(20));
    expect(Math.abs(formulaVieja(20))).toBeGreaterThan(0.13); // antes sí pasaba
    expect(poseCumple('derecha', inclinada)).toBe(false);
    expect(poseCumple('izquierda', inclinada)).toBe(false);
  });

  it('pero un giro de verdad sigue pasando el paso, hacia los dos lados', () => {
    const aUnLado = desviacionYaw(caraGirada(0.75));
    const alOtro = desviacionYaw(caraGirada(0.25));
    expect(poseCumple('derecha', aUnLado) || poseCumple('izquierda', aUnLado)).toBe(true);
    expect(poseCumple('derecha', alOtro) || poseCumple('izquierda', alOtro)).toBe(true);
    // y los dos lados dan signos opuestos, que es de lo que vive SIGNO_DERECHA
    expect(Math.sign(aUnLado)).toBe(-Math.sign(alOtro));
  });

  it('el reto de giro ya no se pasa torciendo el aparato', () => {
    for (const g of [16, 20, 25, 30, -25]) {
      const dev = desviacionYaw(caraPlanaInclinada(g));
      expect(poseCumple('derecha', dev)).toBe(false);
      expect(poseCumple('izquierda', dev)).toBe(false);
    }
  });
});
