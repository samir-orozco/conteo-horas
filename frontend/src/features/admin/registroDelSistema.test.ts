import { describe, it, expect } from 'vitest';
import { etiquetaDeTipo, estiloDeTipo, cuandoPaso, resumenDeVeces, tituloDeEvento } from './registroDelSistema';

// Las pruebas del frontend corren fijadas en América/Los Ángeles (CLAUDE.md §7), así que una fecha
// formateada sin `timeZone` sale aquí con el día o la hora de otro sitio y la prueba lo caza.

describe('cuandoPaso', () => {
  it('escribe la hora de Bogotá, no la del navegador de quien mira', () => {
    // 2026-09-23T19:05:00Z son las 2:05 p.m. en Bogotá y las 12:05 p.m. en Los Ángeles.
    expect(cuandoPaso('2026-09-23T19:05:00.000Z')).toContain('2:05');
    expect(cuandoPaso('2026-09-23T19:05:00.000Z')).not.toContain('12:05');
  });

  it('un evento de las 8 de la noche de Bogotá no se pinta con la fecha del día siguiente', () => {
    // 2026-09-24T01:00:00Z = 8 p.m. del 23 en Bogotá.
    expect(cuandoPaso('2026-09-24T01:00:00.000Z')).toContain('23');
    expect(cuandoPaso('2026-09-24T01:00:00.000Z')).not.toContain('24');
  });

  it('sin fecha no pinta "Invalid Date"', () => {
    expect(cuandoPaso(null)).toBe('—');
    expect(cuandoPaso('')).toBe('—');
  });
});

describe('etiquetaDeTipo y estiloDeTipo', () => {
  it('cada pestaña se lee en castellano', () => {
    expect(etiquetaDeTipo('ERROR')).toBe('Error');
    expect(etiquetaDeTipo('ACCESO')).toBe('Acceso');
    expect(etiquetaDeTipo('AUDITORIA')).toBe('Acción');
  });

  it('un tipo que nadie tradujo sale nombrado y con estilo, no en blanco', () => {
    expect(etiquetaDeTipo('LO_QUE_SEA')).toBe('LO_QUE_SEA');
    expect(estiloDeTipo('LO_QUE_SEA')).toBeTruthy();
  });

  it('los errores y los accesos no se ven iguales: es lo que hace legible la tabla de un vistazo', () => {
    expect(estiloDeTipo('ERROR')).not.toBe(estiloDeTipo('ACCESO'));
    expect(estiloDeTipo('AUDITORIA')).not.toBe(estiloDeTipo('ERROR'));
  });
});

describe('resumenDeVeces', () => {
  it('una sola vez no dice "1 veces"', () => {
    expect(resumenDeVeces(1)).toBe('1 vez');
    expect(resumenDeVeces(2)).toBe('2 veces');
  });

  it('los números grandes se agrupan para poder leerlos', () => {
    expect(resumenDeVeces(10000)).toBe('10.000 veces');
  });
});

describe('tituloDeEvento', () => {
  it('un error se anuncia con su ruta, que es donde hay que ir a mirar', () => {
    expect(tituloDeEvento({ tipo: 'ERROR', metodo: 'POST', ruta: '/api/registros', mensaje: 'Falló' }))
      .toBe('POST /api/registros');
  });

  it('un error del navegador se anuncia con la pantalla, que no tiene método', () => {
    expect(tituloDeEvento({ tipo: 'ERROR', metodo: null, ruta: '/marcador/abc', mensaje: 'Falló' }))
      .toBe('/marcador/abc');
  });

  it('un acceso y una acción se anuncian por lo que pasó, no por la ruta', () => {
    expect(tituloDeEvento({ tipo: 'ACCESO', metodo: 'POST', ruta: '/api/auth/login', mensaje: 'Contraseña incorrecta: ana@empresa.co' }))
      .toBe('Contraseña incorrecta: ana@empresa.co');
    expect(tituloDeEvento({ tipo: 'AUDITORIA', metodo: 'DELETE', ruta: '/api/admin/empresas/x', mensaje: 'Borró una empresa' }))
      .toBe('Borró una empresa');
  });

  it('un evento sin ruta ni mensaje no deja la celda vacía', () => {
    expect(tituloDeEvento({ tipo: 'ERROR', metodo: null, ruta: null, mensaje: '' })).toBe('Sin detalle');
  });
});
