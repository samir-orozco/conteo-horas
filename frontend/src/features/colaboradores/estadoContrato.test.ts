import { describe, it, expect } from 'vitest';
import { estadoContrato, OPCIONES_CONTRATO, cumpleFiltros, sedesQueCuentan, sedesParaFiltrar } from './estadoContrato';

describe('cómo se pinta el estado del contrato en la lista', () => {
  it('traduce cada estado que manda el servidor', () => {
    expect(estadoContrato('PREAVISO_VENCIDO').etiqueta).toBe('Se prorrogó solo');
    expect(estadoContrato('POR_VENCER').etiqueta).toBe('Por vencer');
    expect(estadoContrato('SIN_CONTRATO').etiqueta).toBe('Sin contrato');
  });

  it('lo urgente se ve urgente, y lo normal no grita', () => {
    expect(estadoContrato('PREAVISO_VENCIDO').tono).toBe('rojo');
    expect(estadoContrato('VENCIDO').tono).toBe('rojo');
    expect(estadoContrato('POR_VENCER').tono).toBe('ambar');
    expect(estadoContrato('VIGENTE').tono).toBe('verde');
    expect(estadoContrato('SIN_CONTRATO').tono).toBe('gris');
  });

  it('un estado que el frontend no conoce no rompe la tabla', () => {
    // El servidor puede agregar uno antes de que esta pantalla se actualice.
    // Mejor mostrarlo en gris que dejar la celda vacía o reventar la fila.
    const e = estadoContrato('ALGO_NUEVO');
    expect(e.etiqueta).toBe('ALGO_NUEVO');
    expect(e.tono).toBe('gris');
  });

  it('sin dato del servidor tampoco rompe', () => {
    expect(estadoContrato(undefined).etiqueta).toBe('—');
    expect(estadoContrato(null).etiqueta).toBe('—');
  });
});

describe('el filtro combinado de la lista', () => {
  const persona = (over = {}) => ({ estadoContrato: 'VIGENTE', sedeIds: ['s1'], ...over });

  it('sin nada marcado pasa todo el mundo', () => {
    expect(cumpleFiltros(persona(), {})).toBe(true);
    expect(cumpleFiltros(persona({ estadoContrato: null, sedeIds: [] }), {})).toBe(true);
    expect(cumpleFiltros(persona(), { contrato: [], sede: [] })).toBe(true);
  });

  it('marcar un estado de contrato deja pasar solo ese', () => {
    expect(cumpleFiltros(persona({ estadoContrato: 'POR_VENCER' }), { contrato: ['POR_VENCER'] })).toBe(true);
    expect(cumpleFiltros(persona({ estadoContrato: 'VIGENTE' }), { contrato: ['POR_VENCER'] })).toBe(false);
  });

  it('marcar varios es "o", no "y": nadie tiene dos estados a la vez', () => {
    const sel = { contrato: ['POR_VENCER', 'VENCIDO'] };
    expect(cumpleFiltros(persona({ estadoContrato: 'VENCIDO' }), sel)).toBe(true);
    expect(cumpleFiltros(persona({ estadoContrato: 'VIGENTE' }), sel)).toBe(false);
  });

  it('"requieren atención" junta lo que hay que resolver ya', () => {
    // Es el filtro que de verdad se usa: no interesa la taxonomía, interesa
    // sobre quién hay que actuar esta semana.
    const sel = { contrato: ['ATENCION'] };
    for (const e of ['PREAVISO_VENCIDO', 'VENCIDO', 'POR_VENCER', 'SIN_CONTRATO']) {
      expect(cumpleFiltros(persona({ estadoContrato: e }), sel)).toBe(true);
    }
    expect(cumpleFiltros(persona({ estadoContrato: 'VIGENTE' }), sel)).toBe(false);
    expect(cumpleFiltros(persona({ estadoContrato: 'INDEFINIDO' }), sel)).toBe(false);
  });

  it('la sede filtra por lo que tiene asignado', () => {
    expect(cumpleFiltros(persona({ sedeIds: ['s1', 's2'] }), { sede: ['s2'] })).toBe(true);
    expect(cumpleFiltros(persona({ sedeIds: ['s1'] }), { sede: ['s2'] })).toBe(false);
  });

  it('quien no tiene sede se puede buscar aparte', () => {
    // Sin la lista de sedes de la empresa no se sabe cuál es la principal, así que no
    // se le supone ninguna. Con ella, un presencial cuenta en la principal (abajo).
    expect(cumpleFiltros(persona({ sedeIds: [] }), { sede: ['SIN_SEDE'] })).toBe(true);
    expect(cumpleFiltros(persona({ sedeIds: ['s1'] }), { sede: ['SIN_SEDE'] })).toBe(false);
  });

  it('los dos grupos se cruzan: es "y" entre grupos', () => {
    // "Por vencer" Y "de la sede norte", no lo uno o lo otro.
    const sel = { contrato: ['POR_VENCER'], sede: ['s1'] };
    expect(cumpleFiltros(persona({ estadoContrato: 'POR_VENCER', sedeIds: ['s1'] }), sel)).toBe(true);
    expect(cumpleFiltros(persona({ estadoContrato: 'POR_VENCER', sedeIds: ['s2'] }), sel)).toBe(false);
    expect(cumpleFiltros(persona({ estadoContrato: 'VIGENTE', sedeIds: ['s1'] }), sel)).toBe(false);
  });

  it('sin sedeIds del servidor no revienta', () => {
    expect(cumpleFiltros({ estadoContrato: 'VIGENTE' }, { sede: ['s1'] })).toBe(false);
    expect(cumpleFiltros({ estadoContrato: 'VIGENTE' }, {})).toBe(true);
  });

  it('las opciones de contrato que se ofrecen tienen todas texto', () => {
    expect(OPCIONES_CONTRATO.length).toBeGreaterThan(3);
    for (const o of OPCIONES_CONTRATO) {
      expect(o.texto.length).toBeGreaterThan(0);
      expect(o.valor.length).toBeGreaterThan(0);
    }
  });
});

// «MOSTRAR LA PRINCIPAL», decisión del dueño del 12 de septiembre de 2026: a un
// presencial sin sedes asignadas no se le asigna la Sede principal; se le muestra y
// se le cuenta. GET /sedes dice cuál es con la bandera `principal`. «Sin sede» queda
// para un híbrido o un remoto sin sedes.
describe('la sede con la que se ve y se filtra a cada persona', () => {
  const SEDES = [
    { id: 'norte', nombre: 'Norte' },
    { id: 'principal', nombre: 'Sede principal', principal: true },
  ];
  const presencialSinSedes = { estadoContrato: 'VIGENTE', sedeIds: [], modalidad: 'PRESENCIAL' };

  it('un presencial sin sedes cuenta en la principal, por defecto', () => {
    expect(sedesQueCuentan(presencialSinSedes, SEDES)).toEqual({ ids: ['principal'], porDefecto: true });
  });

  it('un presencial con sedes cuenta en las suyas', () => {
    expect(sedesQueCuentan({ sedeIds: ['norte'], modalidad: 'PRESENCIAL' }, SEDES)).toEqual({ ids: ['norte'], porDefecto: false });
  });

  it.each(['HIBRIDO', 'REMOTO'])('un %s sin sedes sigue sin sede', modalidad => {
    expect(sedesQueCuentan({ sedeIds: [], modalidad }, SEDES)).toEqual({ ids: [], porDefecto: false });
  });

  it('el filtro de la principal trae al presencial sin sedes, y «Sin sede» no', () => {
    expect(cumpleFiltros(presencialSinSedes, { sede: ['principal'] }, SEDES)).toBe(true);
    expect(cumpleFiltros(presencialSinSedes, { sede: ['SIN_SEDE'] }, SEDES)).toBe(false);
  });

  it.each(['HIBRIDO', 'REMOTO'])('«Sin sede» trae a un %s sin sedes, y la principal no', modalidad => {
    const persona = { estadoContrato: 'VIGENTE', sedeIds: [], modalidad };
    expect(cumpleFiltros(persona, { sede: ['SIN_SEDE'] }, SEDES)).toBe(true);
    expect(cumpleFiltros(persona, { sede: ['principal'] }, SEDES)).toBe(false);
  });

  it('la principal se ofrece en el filtro si algún presencial cuenta en ella, aunque nadie la tenga asignada', () => {
    expect(sedesParaFiltrar([
      presencialSinSedes,
      { sedeIds: ['norte'], sedeNombres: ['Norte'], modalidad: 'PRESENCIAL' },
    ], SEDES)).toEqual([{ valor: 'norte', texto: 'Norte' }, { valor: 'principal', texto: 'Sede principal' }]);
  });

  it('solo se ofrecen las sedes donde cuenta alguien: un remoto sin sedes no trae la principal', () => {
    expect(sedesParaFiltrar([
      { sedeIds: [], modalidad: 'REMOTO' },
      { sedeIds: ['norte'], sedeNombres: ['Norte'], modalidad: 'HIBRIDO' },
    ], SEDES)).toEqual([{ valor: 'norte', texto: 'Norte' }]);
  });
});
