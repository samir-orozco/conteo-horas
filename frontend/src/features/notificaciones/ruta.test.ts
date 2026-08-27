import { describe, it, expect } from 'vitest';
import { rutaDeNotificacion } from './ruta';
import type { Notificacion } from './types';

const n = (over: Partial<Notificacion>): Notificacion => ({
  id: 'n1', tipo: 'LLEGADA_TARDE', titulo: 't', cuerpo: null,
  entidad: 'colaborador', entidadId: 'c1', leida: false, creadoEn: '', ...over,
});

describe('a dónde lleva cada notificación', () => {
  it('un aviso de contrato abre la ficha DIRECTO en contratos', () => {
    // Es de lo que trata el aviso. Aterrizar en Resumen obliga a buscar el tab
    // correcto sabiendo ya a qué se venía.
    for (const tipo of ['CONTRATO_PREAVISO', 'CONTRATO_PREAVISO_VENCIDO',
                        'CONTRATO_A_INDEFINIDO', 'CONTRATO_ETAPA_APRENDIZ']) {
      expect(rutaDeNotificacion(n({ tipo }))).toBe('/app/colaboradores/c1?tab=contratos');
    }
  });

  it('los demás avisos de una persona abren su ficha, sin forzar tab', () => {
    expect(rutaDeNotificacion(n({ tipo: 'LLEGADA_TARDE' }))).toBe('/app/colaboradores/c1');
    expect(rutaDeNotificacion(n({ tipo: 'NO_MARCO_SALIDA' }))).toBe('/app/colaboradores/c1');
  });

  it('un aviso de marcación lleva a registros', () => {
    expect(rutaDeNotificacion(n({ tipo: 'NO_MARCO_SALIDA', entidad: 'registro', entidadId: 'r1' })))
      .toBe('/app/registros');
  });

  it('sin id de colaborador no se inventa una ruta rota', () => {
    expect(rutaDeNotificacion(n({ entidadId: null }))).toBeNull();
    expect(rutaDeNotificacion(n({ tipo: 'CONTRATO_PREAVISO', entidadId: null }))).toBeNull();
  });

  it('lo que no sabemos a dónde lleva, no lleva a ninguna parte', () => {
    expect(rutaDeNotificacion(n({ entidad: 'permiso', entidadId: 'p1' }))).toBeNull();
    expect(rutaDeNotificacion(n({ entidad: null, entidadId: null }))).toBeNull();
  });

  it('un tipo de contrato que aún no existe también abre en contratos', () => {
    // El backend puede agregar CONTRATO_LO_QUE_SEA sin que haya que tocar esto.
    expect(rutaDeNotificacion(n({ tipo: 'CONTRATO_RENOVACION_SUGERIDA' })))
      .toBe('/app/colaboradores/c1?tab=contratos');
  });
});
