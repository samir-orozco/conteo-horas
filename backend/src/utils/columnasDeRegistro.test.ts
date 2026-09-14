import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { REGISTRO_SIN_FOTOS } from './columnasDeRegistro';

// Las columnas de una marcación que leen las consultas que no muestran las fotos
// (13 de septiembre de 2026). La lista de Registros traía `fotoEntrada` y `fotoSalida`,
// base64 de cientos de KB, solo para saber si existían. Se compara contra las columnas
// que declara el cliente de Prisma: una columna nueva en `registros` que no se agregue
// aquí desaparecería en silencio de esas consultas, y esta prueba lo dice.
const FOTOS = ['fotoEntrada', 'fotoSalida'];

describe('REGISTRO_SIN_FOTOS', () => {
  it('trae todas las columnas de la marcación menos las dos fotos', () => {
    const esperadas = Object.values(Prisma.RegistroScalarFieldEnum).filter(c => !FOTOS.includes(c));
    expect(Object.keys(REGISTRO_SIN_FOTOS).sort()).toEqual([...esperadas].sort());
  });

  it('no trae ninguna de las dos fotos', () => {
    for (const foto of FOTOS) expect(Object.keys(REGISTRO_SIN_FOTOS)).not.toContain(foto);
  });
});
