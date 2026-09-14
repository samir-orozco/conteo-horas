import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { COLABORADOR_SIN_FOTOS, COLABORADOR_SIN_DESCRIPTOR } from './columnasDeColaborador';

// Las columnas de un colaborador que devuelve GET /reportes/liquidacion (13 de septiembre de
// 2026). La ruta cargaba y MANDABA al navegador el colaborador entero, también `foto` y
// `fotoMini` (base64 de cientos de KB) y `rostroDescriptor`, que es un dato biométrico. Ninguna
// pantalla las usa desde ese reporte. Se compara contra las columnas que declara el cliente de
// Prisma: una columna nueva que no se agregue aquí desaparecería en silencio de esa respuesta.
const FUERA = ['foto', 'fotoMini', 'rostroDescriptor'];

describe('COLABORADOR_SIN_FOTOS', () => {
  it('trae todas las columnas del colaborador menos las fotos y el descriptor facial', () => {
    const esperadas = Object.values(Prisma.ColaboradorScalarFieldEnum).filter(c => !FUERA.includes(c));
    expect(Object.keys(COLABORADOR_SIN_FOTOS).sort()).toEqual([...esperadas].sort());
  });

  it('no trae las fotos ni el descriptor facial', () => {
    for (const columna of FUERA) expect(Object.keys(COLABORADOR_SIN_FOTOS)).not.toContain(columna);
  });
});

// Lo que devuelven la ficha y las rutas que crean, editan, retiran o reingresan a una persona: todo
// menos el descriptor facial, que viajaba al navegador sin que ninguna pantalla lo use.
describe('COLABORADOR_SIN_DESCRIPTOR', () => {
  it('trae todas las columnas del colaborador, fotos incluidas, menos el descriptor facial', () => {
    const esperadas = Object.values(Prisma.ColaboradorScalarFieldEnum).filter(c => c !== 'rostroDescriptor');
    expect(Object.keys(COLABORADOR_SIN_DESCRIPTOR).sort()).toEqual([...esperadas].sort());
  });
});
