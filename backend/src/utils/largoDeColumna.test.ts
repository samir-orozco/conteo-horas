import { describe, it, expect } from 'vitest';
import { textoMuyLargo, caracteres, MAX_CARACTERES } from './largoDeColumna';

// Los textos del colaborador son varchar(191) en MySQL (13 de septiembre de 2026). El alta y la edición
// no revisaban el largo: un cargo de 200 caracteres llegaba a Prisma, MySQL lo rechazaba y la pantalla
// decía «Ocurrió un error inesperado». Medido contra MySQL: 191 caracteres caben y 192 no, y cuenta
// caracteres, no la longitud de JavaScript (191 emojis caben, y para JavaScript miden 382).

// Lo que manda el formulario de Colaboradores al crear a alguien.
const FORMULARIO = {
  nombre: 'Ana María', apellido: 'Gómez Ruiz', cedula: '1020304050', cargo: 'Vigilante',
  email: 'ana@empresa.co', telefono: '3001234567', fechaNacimiento: '1990-05-20', salarioMensual: 1750905,
  horarioId: null, modalidad: 'PRESENCIAL', puedeCerrarEnOtraSede: false, foto: null, fotoMini: null,
};

describe('textoMuyLargo', () => {
  it('lo que manda el formulario de siempre pasa', () => {
    expect(textoMuyLargo(FORMULARIO)).toBeNull();
  });

  it.each([
    ['nombre', 'Nombre', 'x'.repeat(192)],
    ['apellido', 'Apellido', 'x'.repeat(192)],
    ['cedula', 'Cédula', '1'.repeat(192)],
    ['cargo', 'Cargo', 'x'.repeat(192)],
    ['email', 'Correo', `${'a'.repeat(187)}@b.co`],
    ['telefono', 'Teléfono', '3'.repeat(192)],
  ])('%s con 192 caracteres dice cuál campo y cuánto cabe', (clave, nombre, valor) => {
    expect(valor).toHaveLength(192);
    expect(textoMuyLargo({ ...FORMULARIO, [clave]: valor })).toBe(`El campo ${nombre} tiene 192 caracteres y caben 191.`);
  });

  it('191 caracteres sí caben', () => {
    expect(textoMuyLargo({ ...FORMULARIO, cargo: 'x'.repeat(191) })).toBeNull();
  });

  it('cuenta caracteres como MySQL, no la longitud de JavaScript', () => {
    expect(textoMuyLargo({ ...FORMULARIO, cargo: '😀'.repeat(191) })).toBeNull();
    expect(textoMuyLargo({ ...FORMULARIO, cargo: '😀'.repeat(192) })).toBe('El campo Cargo tiene 192 caracteres y caben 191.');
  });

  // El alta guarda lo que llega sin recortar, así que los espacios ocupan lugar en la columna.
  it('cuenta los espacios de los extremos, porque se guardan', () => {
    expect(textoMuyLargo({ ...FORMULARIO, cargo: ` ${'x'.repeat(191)}` })).toBe('El campo Cargo tiene 192 caracteres y caben 191.');
  });

  // La foto es LongText y viaja como data URL de cientos de KB: no es una de estas columnas.
  it('no mira la foto ni lo que no es texto', () => {
    expect(textoMuyLargo({ ...FORMULARIO, foto: `data:image/jpeg;base64,${'A'.repeat(5000)}`, fotoMini: 'A'.repeat(1000), cargo: null, telefono: 3001234567 })).toBeNull();
  });

  it('una edición que solo manda un campo también se revisa', () => {
    expect(textoMuyLargo({ cargo: 'x'.repeat(200) })).toBe('El campo Cargo tiene 200 caracteres y caben 191.');
    expect(textoMuyLargo({ cargo: 'Supervisora' })).toBeNull();
  });
});

describe('caracteres', () => {
  it('cuenta como MySQL: un emoji es uno solo', () => {
    expect(caracteres('😀😀')).toBe(2);
    expect(caracteres('María')).toBe(5);
  });

  it('el tope es el de la columna medida', () => {
    expect(MAX_CARACTERES).toBe(191);
  });
});
