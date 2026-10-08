import { describe, it, expect } from 'vitest';
import { rolPermitidoParaEmpresa } from './rolDeEmpresa';

// Qué rol puede darle una empresa a su propia gente (7 de octubre de 2026). Antes, PUT /usuarios/:id
// escribía el rol que llegara en el cuerpo, y un ADMIN podía editarse a sí mismo con 'SUPER_ADMIN':
// al volver a entrar, el login firmaba ese rol y tenía todo /api/admin, con las demás empresas, sus
// pagos y el borrado. POST /usuarios solo rechazaba 'SUPER_ADMIN' y dejaba pasar todo lo demás.

describe('rolPermitidoParaEmpresa', () => {
  it('los dos roles de una empresa pasan', () => {
    expect(rolPermitidoParaEmpresa('ADMIN')).toBe(true);
    expect(rolPermitidoParaEmpresa('SUPERVISOR')).toBe(true);
  });

  it('SUPER_ADMIN no pasa: es el rol de HoraPro, no de una empresa', () => {
    expect(rolPermitidoParaEmpresa('SUPER_ADMIN')).toBe(false);
  });

  it('AFILIADO no pasa: es otra clase de cuenta, que además necesita su afiliadoId', () => {
    expect(rolPermitidoParaEmpresa('AFILIADO')).toBe(false);
  });

  it('WORKER no pasa: es el rol del token del kiosco y no existe en la tabla de usuarios', () => {
    expect(rolPermitidoParaEmpresa('WORKER')).toBe(false);
  });

  it('una variante de escritura no pasa: la lista es exacta', () => {
    for (const rol of ['admin', 'Supervisor', ' ADMIN', 'ADMIN ', 'super_admin']) {
      expect(rolPermitidoParaEmpresa(rol), rol).toBe(false);
    }
  });

  it('lo que no es un texto no pasa', () => {
    for (const rol of [undefined, null, '', 0, 1, true, {}, ['ADMIN'], { toString: () => 'ADMIN' }]) {
      expect(rolPermitidoParaEmpresa(rol), String(rol)).toBe(false);
    }
  });
});
