import { describe, it, expect } from 'vitest';
import { pasosParaMostrar } from './primerosPasos';

// «PRIMEROS PASOS» EN EL INICIO DE UNA EMPRESA NUEVA (14 de octubre de 2026). Qué paso está hecho lo
// decide el servidor (`backend/src/utils/primerosPasos.ts`); aquí solo se decide cómo se dice y a dónde
// lleva cada uno.

const todos = (hecho: boolean) => ['SEDE', 'HORARIO', 'TRABAJADOR', 'ROSTRO', 'MARCACION'].map(clave => ({ clave, hecho }));

describe('pasosParaMostrar', () => {
  it('cada paso lleva a la pantalla donde se hace', () => {
    expect(pasosParaMostrar(todos(false)).map(p => [p.clave, p.ruta])).toEqual([
      ['SEDE', '/app/configuracion?tab=sedes'],
      ['HORARIO', '/app/configuracion?tab=horario'],
      ['TRABAJADOR', '/app/colaboradores'],
      ['ROSTRO', '/app/colaboradores'],
      ['MARCACION', '/app/kiosco'],
    ]);
  });

  it('cada paso dice qué hacer', () => {
    expect(pasosParaMostrar(todos(false)).map(p => p.texto)).toEqual([
      'Tu sede principal ya está creada',
      'Crea tu horario',
      'Agrega un trabajador',
      'Haz el registro biométrico de un trabajador',
      'Haz la primera marcación en el kiosco',
    ]);
  });

  it('respeta lo que dijo el servidor sobre cada uno', () => {
    const pasos = pasosParaMostrar([{ clave: 'SEDE', hecho: true }, { clave: 'HORARIO', hecho: false }]);
    expect(pasos.map(p => p.hecho)).toEqual([true, false]);
  });

  // Un servidor más nuevo podría mandar un paso que este código no conoce todavía. Sin texto ni destino
  // no hay nada que mostrar: se omite en vez de pintar una fila vacía que no lleva a ninguna parte.
  it('omite un paso que esta pantalla no conoce', () => {
    const pasos = pasosParaMostrar([{ clave: 'SEDE', hecho: true }, { clave: 'PASO_NUEVO', hecho: false }]);
    expect(pasos.map(p => p.clave)).toEqual(['SEDE']);
  });
});
