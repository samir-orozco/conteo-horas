import { describe, it, expect } from 'vitest';
import { estadoDelContrato, DIAS_PREAVISO, VIGENCIA_REFORMA } from './contratos';

// Medianoche de Bogotá, que es la convención con la que este proyecto guarda
// todas las fechas de calendario.
const f = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d, 5, 0, 0));

const fijo = (extra: Record<string, unknown> = {}) => ({
  tipo: 'FIJO' as const,
  fechaInicio: f(2026, 1, 1),
  fechaFin: f(2026, 3, 31),
  ...extra,
});

describe('estadoDelContrato — vencimiento y preaviso', () => {
  it('sin prórrogas, el fin vigente es el del contrato', () => {
    const e = estadoDelContrato(fijo(), [], f(2026, 2, 1));
    expect(e.finVigente).toEqual(f(2026, 3, 31));
    expect(e.numeroProrrogas).toBe(0);
  });

  it('con prórrogas, manda la última', () => {
    const e = estadoDelContrato(fijo(), [
      { desde: f(2026, 4, 1), hasta: f(2026, 6, 30) },
      { desde: f(2026, 7, 1), hasta: f(2026, 9, 30) },
    ], f(2026, 8, 1));
    expect(e.finVigente).toEqual(f(2026, 9, 30));
    expect(e.numeroProrrogas).toBe(2);
  });

  it('el preaviso vence 30 días antes del vencimiento', () => {
    // Vence el 31 de marzo: la fecha límite para avisar es el 1 de marzo.
    const e = estadoDelContrato(fijo(), [], f(2026, 2, 1));
    expect(e.fechaLimitePreaviso).toEqual(f(2026, 3, 1));
    expect(DIAS_PREAVISO).toBe(30);
  });

  it('avisa cuando faltan pocos días para el límite del preaviso', () => {
    const e = estadoDelContrato(fijo(), [], f(2026, 2, 25));
    expect(e.diasParaPreaviso).toBe(4);
    expect(e.preavisoVencido).toBe(false);
    expect(e.alertas.map(a => a.tipo)).toContain('PREAVISO_PROXIMO');
  });

  it('pasada la fecha límite, el contrato se va a renovar solo y hay que decirlo', () => {
    // Esta es la alerta que de verdad importa: nadie avisó, y la ley renueva.
    const e = estadoDelContrato(fijo(), [], f(2026, 3, 10));
    expect(e.preavisoVencido).toBe(true);
    expect(e.alertas.map(a => a.tipo)).toContain('PREAVISO_VENCIDO');
  });

  it('un contrato ya terminado no genera alertas de preaviso', () => {
    const e = estadoDelContrato(fijo(), [], f(2026, 5, 1));
    expect(e.diasParaVencer).toBeLessThan(0);
    expect(e.alertas.map(a => a.tipo)).not.toContain('PREAVISO_PROXIMO');
  });
});

describe('estadoDelContrato — la regla de la cuarta prórroga', () => {
  const trimestral = (n: number) => Array.from({ length: n }, (_, i) => ({
    desde: f(2026, 4 + i * 3, 1),
    hasta: f(2026, 6 + i * 3, 30),
  }));

  it('con menos de cuatro prórrogas todavía se puede renovar por tres meses', () => {
    const e = estadoDelContrato(fijo(), trimestral(3), f(2027, 1, 1));
    expect(e.proximaProrrogaMinimaUnAno).toBe(false);
  });

  it('DESPUÉS de la cuarta, la siguiente no puede ser inferior a un año', () => {
    const e = estadoDelContrato(fijo(), trimestral(4), f(2027, 4, 1));
    expect(e.proximaProrrogaMinimaUnAno).toBe(true);
    expect(e.alertas.map(a => a.tipo)).toContain('PRORROGA_MINIMO_UN_ANO');
  });

  it('la regla solo aplica a contratos pactados por menos de un año', () => {
    // Un contrato de dos años prorrogado cuatro veces no cae en esta regla:
    // la norma habla de los pactados por término inferior a un año.
    const largo = fijo({ fechaFin: f(2027, 12, 31) });
    const e = estadoDelContrato(largo, [
      { desde: f(2028, 1, 1), hasta: f(2028, 12, 31) },
      { desde: f(2029, 1, 1), hasta: f(2029, 12, 31) },
      { desde: f(2030, 1, 1), hasta: f(2030, 12, 31) },
      { desde: f(2031, 1, 1), hasta: f(2031, 12, 31) },
    ], f(2031, 6, 1));
    expect(e.proximaProrrogaMinimaUnAno).toBe(false);
  });
});

describe('estadoDelContrato — el tope de cuatro años', () => {
  it('un contrato nuevo cuenta el tope desde su inicio', () => {
    const e = estadoDelContrato(fijo(), [], f(2026, 2, 1));
    expect(e.topeMaximo).toEqual(f(2030, 1, 1));
    expect(e.seVuelveIndefinidoEl).toEqual(f(2030, 1, 1));
  });

  it('LA TRAMPA: un contrato anterior a la reforma cuenta desde el 25 de junio de 2025', () => {
    // Es lo que la ley dispuso para los contratos vigentes, y es la fecha que a
    // Recursos Humanos le va a caer encima sin avisar.
    const viejo = fijo({ fechaInicio: f(2019, 3, 1) });
    const e = estadoDelContrato(viejo, [], f(2026, 2, 1));
    expect(e.topeMaximo).toEqual(f(2029, 6, 25));
    expect(VIGENCIA_REFORMA).toEqual(f(2025, 6, 25));
  });

  it('avisa cuando el contrato está por convertirse en indefinido', () => {
    // Tiene que seguir vigente para que la conversión signifique algo: uno que
    // ya terminó no se convierte en nada. Por eso lleva una prórroga que lo
    // arrastra hasta el borde del tope.
    const e = estadoDelContrato(
      fijo(), [{ desde: f(2026, 4, 1), hasta: f(2029, 12, 31) }], f(2029, 12, 15));
    expect(e.alertas.map(a => a.tipo)).toContain('SE_VUELVE_INDEFINIDO');
    expect(e.seVuelveIndefinidoEl).toEqual(f(2030, 1, 1));
  });

  it('un contrato ya terminado no anuncia conversiones que no van a ocurrir', () => {
    const e = estadoDelContrato(fijo(), [], f(2029, 12, 15));
    expect(e.alertas).toEqual([]);
  });

  it('marca cuando ya pasó el tope y por ley es indefinido', () => {
    const e = estadoDelContrato(fijo(), [{ desde: f(2026, 4, 1), hasta: f(2030, 6, 30) }], f(2030, 3, 1));
    expect(e.yaSuperaElTope).toBe(true);
    expect(e.alertas.map(a => a.tipo)).toContain('SUPERA_TOPE');
  });
});

describe('estadoDelContrato — aprendizaje', () => {
  const aprendiz = (extra: Record<string, unknown> = {}) => ({
    tipo: 'APRENDIZAJE' as const,
    fechaInicio: f(2026, 2, 1),
    fechaFin: f(2027, 1, 31),
    fechaInicioPractica: f(2026, 8, 1),
    ...extra,
  });

  it('su tope son tres años, no cuatro', () => {
    const e = estadoDelContrato(aprendiz(), [], f(2026, 3, 1));
    expect(e.topeMaximo).toEqual(f(2029, 2, 1));
  });

  it('no se vuelve indefinido: es un contrato de otra naturaleza', () => {
    const e = estadoDelContrato(aprendiz(), [], f(2026, 3, 1));
    expect(e.seVuelveIndefinidoEl).toBeNull();
  });

  it('dice en qué etapa va, que es lo que decide cuánto se le paga', () => {
    expect(estadoDelContrato(aprendiz(), [], f(2026, 3, 1)).etapa).toBe('LECTIVA');
    expect(estadoDelContrato(aprendiz(), [], f(2026, 9, 1)).etapa).toBe('PRACTICA');
  });

  it('avisa antes del cambio de etapa, porque la remuneración sube', () => {
    const e = estadoDelContrato(aprendiz(), [], f(2026, 7, 20));
    expect(e.alertas.map(a => a.tipo)).toContain('CAMBIO_ETAPA_APRENDIZ');
  });
});

describe('estadoDelContrato — tipos sin vencimiento', () => {
  it('el indefinido no vence, no tiene preaviso ni tope', () => {
    const e = estadoDelContrato(
      { tipo: 'INDEFINIDO', fechaInicio: f(2020, 1, 1), fechaFin: null }, [], f(2026, 2, 1));
    expect(e.finVigente).toBeNull();
    expect(e.fechaLimitePreaviso).toBeNull();
    expect(e.topeMaximo).toBeNull();
    expect(e.alertas).toEqual([]);
  });

  it('el de obra o labor termina con la obra, no en una fecha', () => {
    const e = estadoDelContrato(
      { tipo: 'OBRA_LABOR', fechaInicio: f(2026, 1, 1), fechaFin: null }, [], f(2026, 2, 1));
    expect(e.finVigente).toBeNull();
    expect(e.alertas).toEqual([]);
  });
});
