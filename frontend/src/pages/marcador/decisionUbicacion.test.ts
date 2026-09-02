import { describe, it, expect } from 'vitest';
import { decidirUbicacion } from './decisionUbicacion';

// Qué hace el kiosco con la ubicación de quien está marcando.
//
// Antes esto vivía repartido en tres condicionales de tres archivos y no tenía
// ninguna prueba. Se saca aquí porque ahora depende de la modalidad, y porque
// equivocarse significa o pedirle el GPS a alguien a quien se le prometió que
// no, o dejar de pedírselo a quien sí hay que validar.

describe('decidirUbicacion', () => {
  describe('REMOTO', () => {
    it('no captura coordenadas, aunque la empresa use geolocalización', () => {
      const d = decidirUbicacion({ modalidad: 'REMOTO', empresaPideUbicacion: true, permiso: 'concedido' });
      expect(d.capturarCoords).toBe(false);
    });

    it('el botón no dice que está ubicando, porque no lo está', () => {
      const d = decidirUbicacion({ modalidad: 'REMOTO', empresaPideUbicacion: true, permiso: 'concedido' });
      expect(d.textoBoton).toBe('Registrando...');
    });

    it('no le muestra ningún indicador de ubicación', () => {
      const d = decidirUbicacion({ modalidad: 'REMOTO', empresaPideUbicacion: true, permiso: 'concedido' });
      expect(d.indicador).toBe('ninguno');
    });
  });

  describe('PRESENCIAL', () => {
    it('con permiso concedido: captura y confirma', () => {
      const d = decidirUbicacion({ modalidad: 'PRESENCIAL', empresaPideUbicacion: true, permiso: 'concedido' });
      expect(d.capturarCoords).toBe(true);
      expect(d.textoBoton).toBe('Ubicando...');
      expect(d.indicador).toBe('confirmada');
    });

    it('sin permiso: avisa ANTES de marcar que la marca va a ser rechazada', () => {
      // Es el caso nuevo. Antes no podía existir, porque el muro no lo dejaba
      // llegar hasta aquí. Enterarse por un flash rojo de 2,8 segundos después
      // de oprimir el botón deja a la persona en un bucle sin saber qué hacer.
      const d = decidirUbicacion({ modalidad: 'PRESENCIAL', empresaPideUbicacion: true, permiso: 'negado' });
      expect(d.indicador).toBe('sin-gps-bloquea');
      expect(d.textoBoton).toBe('Registrando...');
    });

    it('si la empresa no usa geolocalización, no hay nada que capturar ni que avisar', () => {
      const d = decidirUbicacion({ modalidad: 'PRESENCIAL', empresaPideUbicacion: false, permiso: 'sin-preguntar' });
      expect(d.capturarCoords).toBe(false);
      expect(d.indicador).toBe('ninguno');
    });
  });

  describe('HIBRIDO', () => {
    it('captura si puede, porque la ubicación sirve para registrar la sede', () => {
      const d = decidirUbicacion({ modalidad: 'HIBRIDO', empresaPideUbicacion: true, permiso: 'concedido' });
      expect(d.capturarCoords).toBe(true);
      expect(d.indicador).toBe('registra-sede');
    });

    it('sin permiso marca igual: no se le avisa de un bloqueo que no va a ocurrir', () => {
      const d = decidirUbicacion({ modalidad: 'HIBRIDO', empresaPideUbicacion: true, permiso: 'negado' });
      expect(d.capturarCoords).toBe(false);
      expect(d.indicador).toBe('ninguno');
      expect(d.textoBoton).toBe('Registrando...');
    });
  });

  it('nunca intenta capturar sin permiso: eso dispararía el diálogo del navegador a destiempo', () => {
    for (const modalidad of ['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const) {
      const d = decidirUbicacion({ modalidad, empresaPideUbicacion: true, permiso: 'negado' });
      expect(d.capturarCoords).toBe(false);
    }
  });
});
