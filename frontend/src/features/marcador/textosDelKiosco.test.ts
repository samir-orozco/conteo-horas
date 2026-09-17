import { describe, it, expect } from 'vitest';
import { avisoDeProteccion, haceCuanto } from './textosDelKiosco';
import type { EstadoDelKiosco } from './estadoDelKiosco';

// Cómo se le dice a una persona lo que decidió `estadoDelKiosco` (16 de septiembre de 2026).

const estado = (proteccion: EstadoDelKiosco['proteccion']): EstadoDelKiosco =>
  ({ proteccion, facial: 'PARCIAL', minutosSinMarcar: null });

describe('avisoDeProteccion', () => {
  it('el kiosco expuesto se dice con todas las letras, no con un tecnicismo', () => {
    const a = avisoDeProteccion(estado('EXPUESTO'), 0);
    expect(a.tono).toBe('ALERTA');
    expect(a.texto).toMatch(/cualquiera con este link puede marcar/i);
  });

  it('el kiosco bloqueado avisa que NADIE puede marcar, y qué hacer', () => {
    const a = avisoDeProteccion(estado('BLOQUEADO'), 0);
    expect(a.tono).toBe('PELIGRO');
    expect(a.texto).toMatch(/nadie puede marcar/i);
    expect(a.texto).toMatch(/vincula/i);
  });

  it('protegido con un solo dispositivo no dice «los 1 dispositivos»', () => {
    const a = avisoDeProteccion(estado('PROTEGIDO'), 1);
    expect(a.tono).toBe('BIEN');
    expect(a.texto).toMatch(/el único dispositivo vinculado/i);
    expect(a.texto).not.toMatch(/los 1/);
  });

  it('protegido con varios dice cuántos son', () => {
    expect(avisoDeProteccion(estado('PROTEGIDO'), 3).texto).toMatch(/los 3 dispositivos vinculados/i);
  });
});

describe('haceCuanto', () => {
  it('menos de un minuto no se dice «hace 0 min»', () => {
    expect(haceCuanto(0)).toBe('hace menos de un minuto');
  });

  it('minutos sueltos', () => {
    expect(haceCuanto(12)).toBe('hace 12 min');
  });

  it('una hora justa no arrastra los minutos en cero', () => {
    expect(haceCuanto(60)).toBe('hace 1 h');
  });

  it('horas con minutos', () => {
    expect(haceCuanto(90)).toBe('hace 1 h 30 min');
  });

  it('un día se dice en singular', () => {
    expect(haceCuanto(60 * 24)).toBe('hace 1 día');
  });

  it('varios días, en vez de un número de minutos que nadie lee', () => {
    expect(haceCuanto(60 * 24 * 3)).toBe('hace 3 días');
  });
});
