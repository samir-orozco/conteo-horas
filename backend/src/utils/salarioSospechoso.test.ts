import { describe, it, expect } from 'vitest';
import { pareceIncluirAuxilio } from './salarioSospechoso';

// QUÉ SALARIOS PARECEN TRAER EL AUXILIO POR DENTRO (17 de septiembre de 2026).
//
// Hasta hoy el salario era UN solo campo, así que las empresas que ya existen pueden tener el
// auxilio sumado dentro del básico. Si es así, cada hora extra y cada recargo de esa persona se
// pagan un 14,2% de más.
//
// NO se puede detectar con certeza, y este módulo no finge que sí. La única señal defendible es la
// aritmética exacta: que el básico menos el auxilio dé justo el salario mínimo de ese año. Es el
// caso de quien escribió el total (1.750.905 + 249.095 = 2.000.000), que es lo más común.
//
// Todo lo demás se lista para que un humano lo revise, pero sin marcarlo: señalar por corazonada a
// gente cuyo sueldo está bien haría que nadie confíe en la marca.
//
// El salario mínimo no se guarda en ninguna parte: sale del tope, que son dos mínimos.

const VIGENCIA = { valor: 249_095, tope: 3_501_810 }; // 2026: mínimo 1.750.905

describe('pareceIncluirAuxilio', () => {
  it('el mínimo más el auxilio es la señal clara', () => {
    expect(pareceIncluirAuxilio(2_000_000, VIGENCIA)).toBe(true);
  });

  it('el mínimo a secas está bien y no se marca', () => {
    expect(pareceIncluirAuxilio(1_750_905, VIGENCIA)).toBe(false);
  });

  it('un sueldo cualquiera no se marca por corazonada', () => {
    expect(pareceIncluirAuxilio(2_300_000, VIGENCIA)).toBe(false);
    expect(pareceIncluirAuxilio(1_900_000, VIGENCIA)).toBe(false);
  });

  it('sin vigencia no se marca a nadie', () => {
    expect(pareceIncluirAuxilio(2_000_000, null)).toBe(false);
  });

  it('un salario en cero no se marca', () => {
    expect(pareceIncluirAuxilio(0, VIGENCIA)).toBe(false);
  });
});
