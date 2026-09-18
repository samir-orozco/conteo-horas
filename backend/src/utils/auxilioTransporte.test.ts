import { describe, it, expect } from 'vitest';
import { auxilioVigente, auxilioDelPeriodo, type VigenciaAuxilio } from './auxilioTransporte';

// EL AUXILIO DE TRANSPORTE NO ES SALARIO, Y POR ESO VIVE APARTE (17 de septiembre de 2026).
//
// El valor de la hora se calcula sobre el salario BÁSICO. Si el auxilio se mete dentro del salario
// para que aparezca en algún lado, cada hora extra y cada recargo salen 14,2% más caros
// (249.095 sobre 1.750.905). Y si no se mete, el reporte nunca muestra lo que la persona recibe.
// La salida es tenerlo en su propio campo, que es lo que calcula este módulo.
//
// La regla de pago, dada por el dueño y contrastada con la Ley 15 de 1959:
//   - Se paga completo si la persona cumplió sus días del mes.
//   - Si no, se prorratea: (valor mensual / 30) × días. SIEMPRE entre 30, como el salario.
//   - No se paga cuando NO HUBO DESPLAZAMIENTO: vacaciones, incapacidad o licencia, aunque estén
//     justificadas. El criterio no es si la falta se justifica, es si la persona viajó al trabajo.
//   - Solo lo recibe quien devenga hasta dos salarios mínimos.
//
// El valor entra por parámetro y no como constante: cambia por decreto cada enero, y un reporte de
// diciembre tiene que seguir mostrando el valor de diciembre. Mismo mecanismo que la jornada legal
// y los recargos (utils/vigencias.ts), no uno nuevo.
//
// Las fechas van en UTC explícito (CLAUDE.md 8.1).

const enero = (anio: number) => new Date(Date.UTC(anio, 0, 1, 5));

// Cifras reales: Decretos 1469 y 1470 de 2025 para el año 2026.
const V2026: VigenciaAuxilio = { vigenteDesde: enero(2026), valor: 249_095, tope: 3_501_810 };
const V2025: VigenciaAuxilio = { vigenteDesde: enero(2025), valor: 200_000, tope: 2_847_000 };

const caso = (extra: Partial<Parameters<typeof auxilioDelPeriodo>[0]> = {}) => ({
  salarioBasico: 1_750_905, auxilioPersona: null, diasConDesplazamiento: 30, ...extra,
});

describe('auxilioVigente: cuál regía en esa fecha', () => {
  it('toma la vigencia del año del reporte, no la última que exista', () => {
    // Un reporte de diciembre de 2025 no puede mostrar el auxilio de 2026.
    const diciembre2025 = new Date(Date.UTC(2025, 11, 15, 5));
    expect(auxilioVigente(diciembre2025, [V2025, V2026])?.valor).toBe(200_000);
  });

  it('con varias vigencias toma la más reciente que ya empezó', () => {
    expect(auxilioVigente(enero(2026), [V2025, V2026])?.valor).toBe(249_095);
  });

  it('antes de la primera vigencia no inventa un valor', () => {
    expect(auxilioVigente(enero(2024), [V2025, V2026])).toBeNull();
  });

  it('sin ninguna vigencia sembrada, no inventa un valor', () => {
    expect(auxilioVigente(enero(2026), [])).toBeNull();
  });
});

describe('auxilioDelPeriodo: quién tiene derecho', () => {
  it('sin vigencia no paga nada: es plata, no se adivina', () => {
    expect(auxilioDelPeriodo(caso(), null)).toBe(0);
  });

  it('quien gana por encima de dos mínimos no lo recibe', () => {
    expect(auxilioDelPeriodo(caso({ salarioBasico: 3_501_811 }), V2026)).toBe(0);
  });

  it('justo en el tope sí lo recibe', () => {
    expect(auxilioDelPeriodo(caso({ salarioBasico: 3_501_810 }), V2026)).toBe(249_095);
  });

  it('la empresa que no lo paga lo deja en cero, y se respeta', () => {
    // Un cero explícito no es «sin dato»: es «aquí damos ruta propia».
    expect(auxilioDelPeriodo(caso({ auxilioPersona: 0 }), V2026)).toBe(0);
  });

  it('un valor pactado distinto al del decreto se usa tal cual', () => {
    expect(auxilioDelPeriodo(caso({ auxilioPersona: 300_000 }), V2026)).toBe(300_000);
  });

  it('un valor pactado se paga aunque el básico pase del tope: es un acuerdo, no la ley', () => {
    expect(auxilioDelPeriodo(caso({ salarioBasico: 5_000_000, auxilioPersona: 300_000 }), V2026)).toBe(300_000);
  });
});

describe('auxilioDelPeriodo: el prorrateo', () => {
  it('el mes completo se paga entero', () => {
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: 30 }), V2026)).toBe(249_095);
  });

  it('media quincena son quince treintavos, no la mitad del mes de calendario', () => {
    // 249.095 / 30 = 8.303,17 por día. Por 15 días: 124.547,5
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: 15 }), V2026)).toBeCloseTo(124_547.5, 2);
  });

  it('quien faltó tres días pierde tres días de auxilio', () => {
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: 27 }), V2026)).toBeCloseTo(224_185.5, 2);
  });

  it('quien no fue ningún día no recibe nada', () => {
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: 0 }), V2026)).toBe(0);
  });

  it('un mes de 31 días no paga más de un auxilio', () => {
    // El mes de nómina son 30 días. Sin tope, un rango del 1 al 31 pagaría 31 treintavos.
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: 31 }), V2026)).toBe(249_095);
  });

  it('días negativos no restan plata', () => {
    expect(auxilioDelPeriodo(caso({ diasConDesplazamiento: -3 }), V2026)).toBe(0);
  });
});
