import { describe, it, expect } from 'vitest';
import { iniciales, fuerzaDeClave, validarCambioDeClave } from './cuentaDelSuperAdmin';

describe('iniciales', () => {
  it('toma la primera letra del nombre y del apellido', () => {
    expect(iniciales('Samir Orozco')).toBe('SO');
    expect(iniciales('Super Admin HoraPro')).toBe('SA');
  });

  it('con un solo nombre, una sola letra', () => {
    expect(iniciales('Ana')).toBe('A');
  });

  it('los espacios de más no inventan iniciales vacías', () => {
    expect(iniciales('  Ana   Ruiz  ')).toBe('AR');
  });

  it('sin nombre no pinta "undefined"', () => {
    expect(iniciales('')).toBe('?');
    expect(iniciales(undefined)).toBe('?');
  });
});

describe('fuerzaDeClave', () => {
  it('una clave corta y sin variedad es lo más débil', () => {
    const f = fuerzaDeClave('abc');
    expect(f.nivel).toBe(1);
    expect(f.etiqueta).toBe('Muy débil');
  });

  it('la del seed, que está publicada en el repositorio, no llega a buena', () => {
    expect(fuerzaDeClave('superadmin123').nivel).toBeLessThanOrEqual(3);
  });

  it('larga, con mayúsculas, números y símbolos es fuerte', () => {
    const f = fuerzaDeClave('Kr!mLab-2026$seguro');
    expect(f.nivel).toBe(4);
    expect(f.etiqueta).toBe('Fuerte');
    expect(f.falta).toEqual([]);
  });

  it('dice qué le falta, en vez de solo pintar una barra roja', () => {
    const f = fuerzaDeClave('contrasena');
    expect(f.falta).toContain('un número');
    expect(f.falta).toContain('una mayúscula');
  });

  it('una clave vacía no tiene nivel ni rompe nada', () => {
    expect(fuerzaDeClave('').nivel).toBe(0);
    expect(fuerzaDeClave('').etiqueta).toBe('');
  });
});

describe('validarCambioDeClave', () => {
  const ok = { actual: 'laDeAhora', nueva: 'nuevaClave1', confirmar: 'nuevaClave1' };

  it('una petición completa y coherente no tiene reparos', () => {
    expect(validarCambioDeClave(ok)).toBeNull();
  });

  it('exige la contraseña actual: si no, cualquiera con la sesión abierta la cambia', () => {
    expect(validarCambioDeClave({ ...ok, actual: '' })).toMatch(/actual/i);
  });

  it('no acepta menos de 6 caracteres, igual que el servidor', () => {
    // Si el navegador fuera más laxo que el servidor, la persona escribiría todo para que se lo
    // rechacen al final. Si fuera más estricto, prometería una regla que no existe.
    expect(validarCambioDeClave({ ...ok, nueva: '12345', confirmar: '12345' })).toMatch(/6/);
    expect(validarCambioDeClave({ ...ok, nueva: '123456', confirmar: '123456' })).toBeNull();
  });

  it('avisa antes de guardar si las dos no coinciden', () => {
    expect(validarCambioDeClave({ ...ok, confirmar: 'otraCosa1' })).toMatch(/coinciden/i);
  });

  it('no deja poner la misma que ya tenía', () => {
    expect(validarCambioDeClave({ actual: 'laMisma1', nueva: 'laMisma1', confirmar: 'laMisma1' })).toMatch(/misma|distinta/i);
  });
});
