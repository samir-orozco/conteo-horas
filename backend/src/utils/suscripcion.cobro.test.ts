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
const falso = (pagos: PagoFalso[], pagadoHasta: Date | null = null) =>
  ({
    empresa: { findUnique: async () => ({ exentaPago: false }) },
    colaborador: { count: async () => 3 },
    suscripcion: { findUnique: async () => ({ plan: 'ESENCIAL', pagadoHasta, pagos }) },
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
