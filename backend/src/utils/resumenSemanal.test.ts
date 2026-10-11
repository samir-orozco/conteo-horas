import { describe, it, expect } from 'vitest';
import {
  semanaDelResumen, armarResumen, correoDelResumen, avisoDelResumen, nombreDeSemana,
  type FilaHoras, type FilaTarde, type Periodo, type EntradaDelResumen,
} from './resumenSemanal';

// QUÉ SEMANA LE TOCA AL CORREO DEL LUNES (11 de octubre de 2026).
//
// El resumen sale el lunes a las 7 a. m. de Bogotá con la semana anterior completa, de lunes a
// domingo. El trabajo corre también al arrancar la app (programarDiario.ts), así que esta función
// es la que decide si a esa hora toca o no: un despliegue el martes no puede mandar el resumen.
//
// Instantes en UTC explícito (CLAUDE.md §8.1): la suite corre en Los Ángeles a propósito.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

describe('semanaDelResumen', () => {
  it('el lunes a las 7 de Bogotá devuelve la semana anterior y la de antes, para comparar', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 7))).toEqual({
      desde: '2026-10-05', hasta: '2026-10-11',
      anterior: { desde: '2026-09-28', hasta: '2026-10-04' },
    });
  });

  it('el lunes más tarde también toca: si el hosting tenía la app dormida a las 7, sale con la primera visita', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 16, 30))?.desde).toBe('2026-10-05');
    expect(semanaDelResumen(bog(2026, 10, 12, 23, 59))?.desde).toBe('2026-10-05');
  });

  it('el lunes antes de las 7 no toca', () => {
    expect(semanaDelResumen(bog(2026, 10, 12, 6, 59))).toBeNull();
  });

  it('el domingo en la noche de Bogotá no toca, aunque en UTC ya sea lunes', () => {
    // 21:00 del domingo 11 en Bogotá = 02:00 del lunes 12 en UTC.
    expect(semanaDelResumen(bog(2026, 10, 11, 21))).toBeNull();
  });

  it('el martes no toca: un resumen que llega tarde ya no sirve', () => {
    expect(semanaDelResumen(bog(2026, 10, 13, 7))).toBeNull();
  });

  it('cruza el cambio de año sin perderse', () => {
    expect(semanaDelResumen(bog(2027, 1, 4, 7))).toEqual({
      desde: '2026-12-28', hasta: '2027-01-03',
      anterior: { desde: '2026-12-21', hasta: '2026-12-27' },
    });
  });
});

// ── Lo que dice el resumen ────────────────────────────────────────────────────

const semana = { desde: '2026-09-28', hasta: '2026-10-04' };
const persona = (nombre: string, o: Partial<FilaHoras> = {}): FilaHoras =>
  ({ nombre, apellido: 'Pérez', minutosOrdinarios: 0, minutosExtra: 0, totalAdicional: 0, ...o });
const tarde = (nombre: string, diasTarde: number, totalMinutos: number): FilaTarde =>
  ({ nombre, apellido: 'Pérez', diasTarde, totalMinutos });
const vacio: Periodo = { horas: [], tardanzas: [] };
const entrada = (o: Partial<EntradaDelResumen> = {}): EntradaDelResumen => ({
  semana, actual: vacio, anterior: vacio,
  turnosCerradosSolos: [], novedadesPorAprobar: 0, contratos: [],
  ...o,
});

describe('armarResumen', () => {
  it('suma las horas, las extras, la plata y las llegadas tarde de la empresa, en las dos semanas', () => {
    const r = armarResumen(entrada({
      actual: {
        horas: [
          persona('Ana', { minutosOrdinarios: 48 * 60, minutosExtra: 90, totalAdicional: 25_000 }),
          persona('Luis', { minutosOrdinarios: 40 * 60, minutosExtra: 30, totalAdicional: 10_500.4 }),
        ],
        tardanzas: [tarde('Ana', 2, 25), tarde('Luis', 1, 5)],
      },
      anterior: {
        horas: [persona('Ana', { minutosOrdinarios: 44 * 60, totalAdicional: 3_000 })],
        tardanzas: [tarde('Ana', 0, 0)],
      },
    }));
    expect(r.horasTrabajadas).toEqual({ actual: 90, anterior: 44 });
    expect(r.horasExtra).toEqual({ actual: 2, anterior: 0 });
    expect(r.recargosYExtras).toEqual({ actual: 35_500.4, anterior: 3_000 });
    expect(r.llegadasTarde).toEqual({ actual: 3, anterior: 0 });
  });

  it('las que más llegaron tarde: hasta tres, por veces y después por minutos, sin los puntuales', () => {
    const r = armarResumen(entrada({
      actual: {
        horas: [],
        tardanzas: [tarde('Ana', 2, 10), tarde('Bea', 4, 52), tarde('Carlos', 2, 30), tarde('Dora', 1, 90), tarde('Eva', 0, 0)],
      },
    }));
    expect(r.masTarde).toEqual([
      { nombre: 'Bea Pérez', veces: 4, minutos: 52 },
      { nombre: 'Carlos Pérez', veces: 2, minutos: 30 },
      { nombre: 'Ana Pérez', veces: 2, minutos: 10 },
    ]);
  });

  it('lo que necesita atención, en orden: turnos cerrados solos, novedades y contratos', () => {
    const r = armarResumen(entrada({
      turnosCerradosSolos: [{ nombre: 'Jorge Toro', fecha: '2026-09-29' }, { nombre: 'Ana Pérez', fecha: '2026-10-02' }],
      novedadesPorAprobar: 3,
      contratos: [
        { nombre: 'Carlos Mejía', tipo: 'PREAVISO_PROXIMO', dias: 12 },
        { nombre: 'Dora Ruiz', tipo: 'PREAVISO_VENCIDO', dias: null },
      ],
    }));
    expect(r.atencion).toEqual([
      '2 turnos se cerraron solos porque nadie marcó la salida: Jorge Toro (mar 29), Ana Pérez (vie 2)',
      '3 novedades esperan tu aprobación',
      'Contrato de Carlos Mejía: quedan 12 días para avisar por escrito si no se va a renovar',
      'Contrato de Dora Ruiz: se venció el plazo para avisar y se prorroga solo',
    ]);
  });

  it('en singular cuando es uno, y con «y N más» cuando la lista es larga', () => {
    const r = armarResumen(entrada({
      turnosCerradosSolos: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(n => ({ nombre: n, fecha: '2026-09-28' })),
      novedadesPorAprobar: 1,
    }));
    expect(r.atencion).toEqual([
      '7 turnos se cerraron solos porque nadie marcó la salida: A (lun 28), B (lun 28), C (lun 28), D (lun 28), E (lun 28) y 2 más',
      '1 novedad espera tu aprobación',
    ]);
    expect(armarResumen(entrada({ turnosCerradosSolos: [{ nombre: 'A', fecha: '2026-10-04' }] })).atencion)
      .toEqual(['1 turno se cerró solo porque nadie marcó la salida: A (dom 4)']);
  });

  it('quien tuvo varios turnos cerrados solos sale una vez, con sus días', () => {
    const r = armarResumen(entrada({
      turnosCerradosSolos: [
        { nombre: 'Sofía Ramos', fecha: '2026-09-29' },
        { nombre: 'Jorge Toro', fecha: '2026-09-29' },
        { nombre: 'Sofía Ramos', fecha: '2026-09-29' },
        { nombre: 'Sofía Ramos', fecha: '2026-10-01' },
      ],
    }));
    expect(r.atencion).toEqual([
      '4 turnos se cerraron solos porque nadie marcó la salida: Sofía Ramos (mar 29, jue 1), Jorge Toro (mar 29)',
    ]);
  });

  it('cada aviso de contrato con su frase', () => {
    const r = armarResumen(entrada({
      contratos: [
        { nombre: 'A', tipo: 'SE_VUELVE_INDEFINIDO', dias: 20 },
        { nombre: 'B', tipo: 'SUPERA_TOPE', dias: null },
        { nombre: 'C', tipo: 'CAMBIO_ETAPA_APRENDIZ', dias: 5 },
        { nombre: 'D', tipo: 'PRORROGA_MINIMO_UN_ANO', dias: null },
      ],
    }));
    expect(r.atencion).toEqual([
      'Contrato de A: en 20 días pasa a indefinido por ley',
      'Contrato de B: supera el tope legal de cuatro años',
      'Contrato de C: en 5 días pasa a etapa práctica',
      'Contrato de D: tiene un aviso pendiente',
    ]);
  });

  it('una semana sin marcaciones ni pendientes no tiene nada que contar', () => {
    expect(armarResumen(entrada()).hayAlgo).toBe(false);
    expect(armarResumen(entrada({ novedadesPorAprobar: 1 })).hayAlgo).toBe(true);
    expect(armarResumen(entrada({ actual: { horas: [persona('Ana', { minutosOrdinarios: 60 })], tardanzas: [] } })).hayAlgo).toBe(true);
  });
});

describe('el correo y el aviso de la campana', () => {
  const resumen = armarResumen(entrada({
    actual: {
      horas: [persona('Ana', { minutosOrdinarios: 1_800 * 60, minutosExtra: 64 * 60 + 20, totalAdicional: 1_230_000.6 })],
      tardanzas: [tarde('Jorge', 4, 52)],
    },
    anterior: {
      horas: [persona('Ana', { minutosOrdinarios: 1_820 * 60, minutosExtra: 46 * 60, totalAdicional: 920_000 })],
      tardanzas: [tarde('Jorge', 6, 70)],
    },
    turnosCerradosSolos: [{ nombre: 'Jorge Toro', fecha: '2026-09-29' }],
  }));

  it('el asunto lleva la empresa y la semana, y la semana se lee aunque cruce de mes', () => {
    expect(correoDelResumen(resumen, 'Grupo MSM', 'https://horapro.co/app/reportes').asunto)
      .toBe('Resumen semanal · Grupo MSM · 28 sep – 4 oct');
  });

  it('una semana que cruza de año lleva los dos años', () => {
    expect(nombreDeSemana({ desde: '2026-12-28', hasta: '2027-01-03' })).toBe('28 dic 2026 – 3 ene 2027');
    expect(nombreDeSemana({ desde: '2026-10-05', hasta: '2026-10-11' })).toBe('5 – 11 oct');
  });

  it('el correo trae las cifras con miles en pesos colombianos y la comparación con la semana anterior', () => {
    const { html } = correoDelResumen(resumen, 'Grupo MSM', 'https://horapro.co/app/reportes');
    const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(texto).toContain('Horas trabajadas 1.864 h ▼ 2 h');
    expect(texto).toContain('Horas extra 64 h ▲ 18 h');
    expect(texto).toContain('Recargos y extras $ 1.230.001 ▲ $ 310.001');
    expect(texto).toContain('Llegadas tarde 4 ▼ 2');
    expect(texto).toContain('Jorge Pérez — 4 veces, 52 min en total');
    expect(html).toContain('href="https://horapro.co/app/reportes"');
  });

  it('una empresa nueva, sin semana anterior, no muestra comparación', () => {
    const nueva = armarResumen(entrada({ actual: { horas: [persona('Ana', { minutosOrdinarios: 600 })], tardanzas: [] } }));
    const texto = correoDelResumen(nueva, 'X', 'https://x').html.replace(/<[^>]+>/g, ' ');
    expect(texto).not.toContain('▲');
    expect(texto).not.toContain('▼');
  });

  it('un nombre con HTML no se vuelve HTML en el correo', () => {
    const r = armarResumen(entrada({ turnosCerradosSolos: [{ nombre: '<img src=x>', fecha: '2026-09-29' }] }));
    const { html } = correoDelResumen(r, '<b>Empresa</b>', 'https://x');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>Empresa</b>');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  it('una semana sin marcaciones pero con pendientes no muestra una tabla de ceros', () => {
    const r = armarResumen(entrada({ novedadesPorAprobar: 2 }));
    const texto = correoDelResumen(r, 'X', 'https://x').html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(texto).toContain('No hubo marcaciones esta semana.');
    expect(texto).not.toContain('Horas trabajadas');
    expect(texto).toContain('2 novedades esperan tu aprobación');
    expect(avisoDelResumen(r)).toEqual({
      titulo: 'Resumen de la semana 28 sep – 4 oct',
      cuerpo: 'No hubo marcaciones esta semana · 1 cosa necesita tu atención. También te llegó por correo.',
    });
  });

  it('el aviso de la campana trae las cifras clave, no solo «se envió»', () => {
    expect(avisoDelResumen(resumen)).toEqual({
      titulo: 'Resumen de la semana 28 sep – 4 oct',
      cuerpo: '1.864 h trabajadas · 64 h extra · 1 turno cerrado solo. También te llegó por correo.',
    });
  });
});
