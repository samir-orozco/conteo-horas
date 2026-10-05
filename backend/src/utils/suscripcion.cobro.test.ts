import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { calcularCobro, PRECIOS_DEFECTO } from './suscripcion';
import { PLANES } from './planes';

// El prorrateo (pagar solo los días que quedan del mes) es para el PRIMER cobro,
// cuando la empresa sale de la prueba a mitad de mes. Desde el segundo en adelante
// se debe el mes completo: quien se atrasa no paga menos por atrasarse.

const bog = (a: number, mes: number, d: number, h = 12) => new Date(Date.UTC(a, mes - 1, d, h + 5));
const PRECIO = PLANES.ESENCIAL.precioMensual;

type PagoFalso = { estado: string; periodoFin: Date; colaboradoresFacturados: number };
// Por defecto la prueba termina el 22 de octubre, el día en que pagan los casos de abajo.
const falso = (pagos: PagoFalso[], pagadoHasta: Date | null = null, finPrueba = bog(2026, 10, 22, 9)) =>
  ({
    empresa: { findUnique: async () => ({ exentaPago: false }) },
    colaborador: { count: async () => 3 },
    suscripcion: { findUnique: async () => ({ plan: 'ESENCIAL', pagadoHasta, finPrueba, pagos }) },
    configuracionPlataforma: { findUnique: async () => null },
  }) as unknown as PrismaClient;

const pagoViejo = (estado = 'APROBADO'): PagoFalso =>
  ({ estado, periodoFin: bog(2026, 10, 1, 0), colaboradoresFacturados: 3 });

describe('cobro cuando la empresa no está al día', () => {
  it('sin ningún pago previo (sale de la prueba) se prorratea por los días que quedan', async () => {
    const c = await calcularCobro(falso([]), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 22));
    expect(c.tipo).toBe('MES');
    expect(c.monto).toBe(Math.round(PRECIO * (10 / 31)));
  });

  it('con un pago aprobado previo se debe el mes completo aunque pague el día 20', async () => {
    const c = await calcularCobro(falso([pagoViejo()], bog(2026, 10, 1, 0)), 'e1', PRECIOS_DEFECTO, bog(2026, 11, 20));
    expect(c.tipo).toBe('MES');
    expect(c.monto).toBe(PRECIO);
  });

  it('un pago previo rechazado no cuenta: sigue siendo el primer cobro', async () => {
    const c = await calcularCobro(falso([pagoViejo('RECHAZADO')]), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 22));
    expect(c.monto).toBe(Math.round(PRECIO * (10 / 31)));
  });
});

describe('la marca mesCompleto que lee la pantalla', () => {
  it('se enciende solo cuando se cobra el mes completo por atraso', async () => {
    const primero = await calcularCobro(falso([]), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 22));
    const atrasado = await calcularCobro(falso([pagoViejo()]), 'e1', PRECIOS_DEFECTO, bog(2026, 11, 20));
    expect(primero.mesCompleto).toBe(false);
    expect(atrasado.mesCompleto).toBe(true);
  });
});

// El primer pago se contaba desde el día en que se pagaba, y cada día de espera salía
// más barato (4 de octubre de 2026). Ahora cuenta desde el fin de la prueba.
describe('el primer pago no se abarata esperando', () => {
  const FIN_PRUEBA = bog(2026, 10, 8, 23); // 11 p. m. del 8 de octubre

  it('cuesta lo mismo pagando en la prueba que el último día de gracia', async () => {
    const enPrueba = await calcularCobro(falso([], null, FIN_PRUEBA), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 4));
    const enGracia = await calcularCobro(falso([], null, FIN_PRUEBA), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 13, 22));
    expect(enPrueba.monto).toBe(Math.round(PRECIO * (24 / 31)));
    expect(enGracia.monto).toBe(enPrueba.monto);
    expect(enGracia.desde).toEqual(FIN_PRUEBA);
  });

  it('quien ya pagó debe el mes completo aunque su prueba termine este mes', async () => {
    // Una prueba que el super admin extendió hasta el 8 después de un pago.
    const c = await calcularCobro(falso([pagoViejo()], bog(2026, 10, 1, 0), bog(2026, 10, 8)), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 20));
    expect(c.monto).toBe(PRECIO);
  });

  it('si la prueba terminó en un mes anterior, es el mes completo', async () => {
    const c = await calcularCobro(falso([], null, bog(2026, 9, 28)), 'e1', PRECIOS_DEFECTO, bog(2026, 10, 20));
    expect(c.monto).toBe(PRECIO);
  });
});
