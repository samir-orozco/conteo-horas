import { describe, it, expect } from 'vitest';
import { estadoDelKiosco } from './estadoDelKiosco';

// QUÉ LE PASA AL KIOSCO DE ESTA EMPRESA (16 de septiembre de 2026).
//
// La pantalla del Marcador mostraba tres tarjetas de texto fijo y un interruptor, y no decía
// nada de lo que estaba ocurriendo de verdad. Dos situaciones quedaban invisibles:
//
// 1. Con «Solo dispositivos autorizados» APAGADO, cualquiera con el link marca desde su casa.
//    La pantalla se veía idéntica a una empresa protegida.
// 2. Con el interruptor ENCENDIDO y ningún dispositivo vinculado, NADIE puede marcar. Es peor
//    que estar expuesto, porque el kiosco queda muerto y el dueño se entera por los reclamos.
//
// El «ahora» entra como parámetro: una regla que lea el reloj cambia de resultado cada día, y
// hoy mismo eso rompió dos pruebas del reporte de nómina sin que nadie tocara el código.

const bog = (a: number, mes: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min));
const AHORA = bog(2026, 9, 16, 10, 0);

const datos = (extra: Partial<Parameters<typeof estadoDelKiosco>[0]> = {}) => ({
  soloDispositivos: false, dispositivos: 0, activos: 10, conRostro: 0, ultimaMarcacion: null, ...extra,
});

describe('estadoDelKiosco: la protección', () => {
  it('sin la protección activa, el kiosco está expuesto', () => {
    expect(estadoDelKiosco(datos(), AHORA).proteccion).toBe('EXPUESTO');
  });

  it('con la protección activa y dispositivos vinculados, está protegido', () => {
    expect(estadoDelKiosco(datos({ soloDispositivos: true, dispositivos: 2 }), AHORA).proteccion).toBe('PROTEGIDO');
  });

  it('con la protección activa y NINGÚN dispositivo, el kiosco está bloqueado: nadie puede marcar', () => {
    expect(estadoDelKiosco(datos({ soloDispositivos: true, dispositivos: 0 }), AHORA).proteccion).toBe('BLOQUEADO');
  });
});

describe('estadoDelKiosco: el reconocimiento facial', () => {
  it('sin nadie registrado, lo dice', () => {
    expect(estadoDelKiosco(datos({ activos: 10, conRostro: 0 }), AHORA).facial).toBe('NADIE');
  });

  it('con una parte de la gente registrada, es parcial', () => {
    expect(estadoDelKiosco(datos({ activos: 10, conRostro: 4 }), AHORA).facial).toBe('PARCIAL');
  });

  it('con toda la gente registrada, es completo', () => {
    expect(estadoDelKiosco(datos({ activos: 10, conRostro: 10 }), AHORA).facial).toBe('TODOS');
  });

  it('una empresa sin gente activa no es «nadie registrado»: no hay a quién registrar', () => {
    expect(estadoDelKiosco(datos({ activos: 0, conRostro: 0 }), AHORA).facial).toBe('SIN_GENTE');
  });
});

describe('estadoDelKiosco: cuánto lleva callado', () => {
  it('sin ninguna marcación en la historia, no inventa un tiempo', () => {
    expect(estadoDelKiosco(datos({ ultimaMarcacion: null }), AHORA).minutosSinMarcar).toBeNull();
  });

  it('cuenta los minutos desde la última marcación', () => {
    const hace90 = bog(2026, 9, 16, 8, 30).toISOString();
    expect(estadoDelKiosco(datos({ ultimaMarcacion: hace90 }), AHORA).minutosSinMarcar).toBe(90);
  });

  it('una marcación con fecha futura no da minutos negativos', () => {
    const futuro = bog(2026, 9, 16, 12, 0).toISOString();
    expect(estadoDelKiosco(datos({ ultimaMarcacion: futuro }), AHORA).minutosSinMarcar).toBe(0);
  });
});
