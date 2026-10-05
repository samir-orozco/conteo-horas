import { describe, it, expect } from 'vitest';
import { seAudita, accionDePeticion, cuerpoParaGuardar } from './auditoriaDePeticion';

// Qué queda registrado como "fulano hizo esto" y, sobre todo, qué NO.

describe('seAudita', () => {
  it('solo lo que cambia datos: mirar una pantalla no es una acción', () => {
    expect(seAudita('GET', '/api/colaboradores', 200)).toBe(false);
    expect(seAudita('HEAD', '/api/colaboradores', 200)).toBe(false);
    expect(seAudita('OPTIONS', '/api/colaboradores', 204)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 200)).toBe(true);
    expect(seAudita('PUT', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PATCH', '/api/registros/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('DELETE', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
  });

  it('solo lo que salió bien: lo que falló ya queda en Errores o en Accesos', () => {
    expect(seAudita('POST', '/api/colaboradores', 400)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 401)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 500)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 201)).toBe(true);
  });

  it('el kiosco queda fuera: son cientos de marcaciones al día y ya quedan en su propia tabla', () => {
    expect(seAudita('POST', '/api/worker/marcar', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/login', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/novedad', 200)).toBe(false);
    expect(seAudita('POST', '/api/registro-facial/abc123def456/registrar', 200)).toBe(false);
  });

  it('el login de la plataforma queda fuera: va a Accesos, no a Auditoría', () => {
    expect(seAudita('POST', '/api/auth/login', 200)).toBe(false);
  });

  it('el propio registro queda fuera, o borrar el registro escribiría en el registro', () => {
    expect(seAudita('POST', '/api/eventos/navegador', 204)).toBe(false);
    expect(seAudita('DELETE', '/api/admin/eventos', 200)).toBe(false);
  });

  it('el webhook de Telegram es ruido; el de Wompi mueve dinero y se audita', () => {
    expect(seAudita('POST', '/api/telegram/webhook', 200)).toBe(false);
    expect(seAudita('POST', '/api/wompi/webhook', 200)).toBe(true);
  });

  it('lo que de verdad se quiere vigilar sí entra', () => {
    expect(seAudita('DELETE', '/api/admin/empresas/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PUT', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PUT', '/api/admin/configuracion', 200)).toBe(true);
    expect(seAudita('PUT', '/api/registros/ckv123abc456def789ghi012j', 200)).toBe(true);
  });
});

describe('accionDePeticion', () => {
  it('dice en castellano qué se hizo', () => {
    expect(accionDePeticion('POST', '/api/colaboradores')).toBe('Creó un colaborador');
    expect(accionDePeticion('PUT', '/api/colaboradores/ckv123abc456def789ghi012j')).toBe('Editó un colaborador');
    expect(accionDePeticion('DELETE', '/api/admin/empresas/ckv123abc456def789ghi012j')).toBe('Borró una empresa');
  });

  it('los motivos del clima laboral (4 de octubre de 2026)', () => {
    expect(accionDePeticion('PUT', '/api/clima/motivos')).toBe('Editó los motivos del clima laboral');
  });

  it('las caritas del kiosco NO se auditan: el cuerpo llevaría el texto confidencial', () => {
    expect(seAudita('PUT', '/api/worker/clima', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/clima/observacion', 200)).toBe(false);
  });

  it('una ruta que nadie tradujo sale tal cual, no como un texto inventado', () => {
    expect(accionDePeticion('POST', '/api/algo-nuevo/ckv123abc456def789ghi012j')).toBe('POST /api/algo-nuevo/:id');
  });
});

describe('cuerpoParaGuardar', () => {
  it('la contraseña NUNCA se guarda, venga con el nombre que venga', () => {
    const guardado = cuerpoParaGuardar({
      email: 'ana@empresa.co',
      password: 'LaClaveDeAna123',
      passwordActual: 'anterior',
      nuevaPassword: 'siguiente',
    });
    expect(guardado).not.toContain('LaClaveDeAna123');
    expect(guardado).not.toContain('anterior');
    expect(guardado).not.toContain('siguiente');
    expect(guardado).toContain('ana@empresa.co');
  });

  it('tampoco los tokens, los códigos de verificación ni las firmas', () => {
    const guardado = cuerpoParaGuardar({
      marcadorToken: 'tok_secreto_del_kiosco',
      deviceToken: 'dispositivo_abc',
      resetToken: 'reset_xyz',
      verificacionCodigo: '482913',
      firma: 'sha256=abcdef',
    });
    expect(guardado).not.toContain('tok_secreto_del_kiosco');
    expect(guardado).not.toContain('dispositivo_abc');
    expect(guardado).not.toContain('reset_xyz');
    expect(guardado).not.toContain('482913');
    expect(guardado).not.toContain('sha256=abcdef');
  });

  it('una foto no se guarda entera: se deja constancia de su tamaño', () => {
    const foto = 'data:image/jpeg;base64,' + 'A'.repeat(90000);
    const guardado = cuerpoParaGuardar({ nombre: 'Ana', fotoEntrada: foto });
    expect(guardado).not.toContain('AAAAAAAAAA');
    expect(guardado).toContain('Ana');
    expect(guardado).toMatch(/KB/);
  });

  it('el base64 sin encabezado también se reconoce', () => {
    const guardado = cuerpoParaGuardar({ comprobante: 'iVBORw0KGgo' + 'B'.repeat(3000) });
    expect(guardado).not.toContain('BBBBBBBBBB');
    expect(guardado).toMatch(/KB/);
  });

  it('un cuerpo enorme se recorta, para que una petición no se coma la tabla', () => {
    const guardado = cuerpoParaGuardar({ notas: Array.from({ length: 400 }, (_, i) => `nota numero ${i}`) });
    expect(guardado.length).toBeLessThanOrEqual(4000);
  });

  it('lo que no es un objeto no revienta', () => {
    expect(cuerpoParaGuardar(undefined)).toBe('');
    expect(cuerpoParaGuardar(null)).toBe('');
    expect(cuerpoParaGuardar('texto suelto')).toBe('texto suelto');
  });

  it('los objetos anidados también se limpian', () => {
    const guardado = cuerpoParaGuardar({ usuario: { email: 'ana@empresa.co', password: 'LaClaveDeAna123' } });
    expect(guardado).not.toContain('LaClaveDeAna123');
    expect(guardado).toContain('ana@empresa.co');
  });
});
