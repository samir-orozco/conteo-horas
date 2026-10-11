import { describe, it, expect } from 'vitest';
import { motivoSinSede } from './motivoSinSede';

// Por qué una jornada no tiene sede de marcación (11 de octubre de 2026, PENDIENTES nº 11 y nº 38,
// opción 3 del dueño). La celda de Registros dejaba un gris «— · cuenta en [sede asignada]» que se leía
// como «la sede de la persona». Ahora dice el motivo, con los mismos datos con que decide el kiosco
// (utils/modalidad.ts): la modalidad y si sus sedes tienen coordenadas.
describe('motivoSinSede', () => {
  it('un remoto no marca en ninguna sede: «Remoto»', () => {
    expect(motivoSinSede({ modalidad: 'REMOTO', sedesConUbicacion: 2 })).toBe('REMOTO');
  });

  it('sin ninguna sede con coordenadas no había geocerca contra la cual medir', () => {
    expect(motivoSinSede({ modalidad: 'PRESENCIAL', sedesConUbicacion: 0 })).toBe('SIN_UBICACION_DE_SEDE');
    expect(motivoSinSede({ modalidad: 'HIBRIDO', sedesConUbicacion: 0 })).toBe('SIN_UBICACION_DE_SEDE');
  });

  it('un remoto sigue siendo remoto aunque sus sedes no tengan coordenadas', () => {
    expect(motivoSinSede({ modalidad: 'REMOTO', sedesConUbicacion: 0 })).toBe('REMOTO');
  });

  it('un híbrido con sedes ubicadas que no quedó en ninguna marcó fuera de ellas', () => {
    expect(motivoSinSede({ modalidad: 'HIBRIDO', sedesConUbicacion: 1 })).toBe('FUERA_DE_SEDE');
  });

  // Un presencial con sedes ubicadas siempre queda con sede al marcar, o no marca: si no la tiene,
  // es una jornada de antes de las sedes o cargada a mano. No se inventa por qué.
  it('un presencial con sedes ubicadas y sin sede en la jornada: no quedó registrada', () => {
    expect(motivoSinSede({ modalidad: 'PRESENCIAL', sedesConUbicacion: 1 })).toBe('NO_REGISTRADA');
  });

  it('una modalidad que no se reconoce se trata como presencial, la de siempre', () => {
    expect(motivoSinSede({ modalidad: 'OTRA', sedesConUbicacion: 1 })).toBe('NO_REGISTRADA');
    expect(motivoSinSede({ modalidad: null, sedesConUbicacion: 1 })).toBe('NO_REGISTRADA');
  });
});
