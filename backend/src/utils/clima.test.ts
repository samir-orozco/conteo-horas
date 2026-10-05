import { describe, it, expect } from 'vitest';
import {
  MOTIVO_OTRO, MOTIVOS_PREDETERMINADOS, CATALOGO_DE_MOTIVOS, MAX_MOTIVOS, MAX_OBSERVACION,
  debePreguntarClima, leerMotivosDeEmpresa, validarMotivosDeEmpresa, leerCalificacion, leerObservacion,
  necesitanAtencion, semanaDe, visibleDesde, ordenRevuelto,
  resumenDelClima, variacionDelPromedio, promedioPorSede, yaSePreguntoHoy, filasParaLaRacha,
} from './clima';

// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

describe('debePreguntarClima', () => {
  const base = { accion: 'SALIDA' as const, pausa: false, tieneModulo: true, yaSePreguntoHoy: false };

  it('pregunta en la salida que cierra la jornada', () => {
    expect(debePreguntarClima(base)).toBe(true);
  });

  it('no pregunta en la entrada', () => {
    expect(debePreguntarClima({ ...base, accion: 'ENTRADA' })).toBe(false);
  });

  it('no pregunta al salir a una pausa (almuerzo o descanso)', () => {
    expect(debePreguntarClima({ ...base, pausa: true })).toBe(false);
  });

  it('no pregunta si el plan no incluye el módulo', () => {
    expect(debePreguntarClima({ ...base, tieneModulo: false })).toBe(false);
  });

  it('si ya se le preguntó hoy, no vuelve a preguntar', () => {
    expect(debePreguntarClima({ ...base, yaSePreguntoHoy: true })).toBe(false);
  });
});

describe('yaSePreguntoHoy — el turno partido', () => {
  it('se le preguntó si ya calificó hoy', () => {
    expect(yaSePreguntoHoy({ calificoHoy: true, otrasSalidasDelKioscoHoy: 0 })).toBe(true);
  });

  it('también si ya cerró OTRA jornada en el kiosco hoy, aunque la haya omitido', () => {
    // Revisión adversarial: con «Omitir» no queda fila, y la segunda salida volvía a preguntar.
    expect(yaSePreguntoHoy({ calificoHoy: false, otrasSalidasDelKioscoHoy: 1 })).toBe(true);
  });

  it('en la primera salida del día, no', () => {
    expect(yaSePreguntoHoy({ calificoHoy: false, otrasSalidasDelKioscoHoy: 0 })).toBe(false);
  });
});

describe('motivos de la empresa', () => {
  it('los predeterminados son cinco y ninguno es «Otro»', () => {
    expect(MOTIVOS_PREDETERMINADOS).toEqual([
      'Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal',
    ]);
    expect(MOTIVOS_PREDETERMINADOS).not.toContain(MOTIVO_OTRO);
  });

  it('los predeterminados salen del catálogo', () => {
    for (const m of MOTIVOS_PREDETERMINADOS) expect(CATALOGO_DE_MOTIVOS.flatMap(t => t.motivos)).toContain(m);
  });

  it('sin configuración guardada, la empresa usa los predeterminados', () => {
    expect(leerMotivosDeEmpresa(null)).toEqual(MOTIVOS_PREDETERMINADOS);
  });

  it('con configuración guardada, usa la suya', () => {
    expect(leerMotivosDeEmpresa(JSON.stringify(['Clientes difíciles', 'Turno largo']))).toEqual(['Clientes difíciles', 'Turno largo']);
  });

  it('una configuración ilegible no deja a la empresa sin motivos', () => {
    expect(leerMotivosDeEmpresa('{no es json')).toEqual(MOTIVOS_PREDETERMINADOS);
    expect(leerMotivosDeEmpresa(JSON.stringify({ a: 1 }))).toEqual(MOTIVOS_PREDETERMINADOS);
    expect(leerMotivosDeEmpresa(JSON.stringify([]))).toEqual(MOTIVOS_PREDETERMINADOS);
  });

  it('acepta de uno a cinco motivos, recortando espacios', () => {
    expect(validarMotivosDeEmpresa(['  Turno largo ', 'Clientes difíciles'])).toEqual({ ok: true, motivos: ['Turno largo', 'Clientes difíciles'] });
  });

  it('rechaza más de cinco', () => {
    const seis = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(MAX_MOTIVOS).toBe(5);
    expect(validarMotivosDeEmpresa(seis).ok).toBe(false);
  });

  it('rechaza la lista vacía, los repetidos sin importar mayúsculas, y los vacíos', () => {
    expect(validarMotivosDeEmpresa([]).ok).toBe(false);
    expect(validarMotivosDeEmpresa(['Turno largo', 'turno LARGO']).ok).toBe(false);
    expect(validarMotivosDeEmpresa(['Turno largo', '   ']).ok).toBe(false);
  });

  it('rechaza «Otro», que es fijo y va siempre al final', () => {
    expect(validarMotivosDeEmpresa(['Turno largo', 'otro']).ok).toBe(false);
  });

  it('rechaza un motivo de más de 40 letras y lo que no sea una lista de textos', () => {
    expect(validarMotivosDeEmpresa(['x'.repeat(41)]).ok).toBe(false);
    expect(validarMotivosDeEmpresa('Turno largo').ok).toBe(false);
    expect(validarMotivosDeEmpresa([3]).ok).toBe(false);
  });
});

describe('leerCalificacion', () => {
  const motivos = ['Mucho trabajo', 'Compañeros'];

  it('acepta una carita del 1 al 5', () => {
    for (const carita of [1, 2, 3, 4, 5]) expect(leerCalificacion({ carita }, motivos)).toEqual({ ok: true, carita, motivos: [] });
  });

  it('rechaza lo que no sea un entero del 1 al 5', () => {
    for (const carita of [0, 6, 2.5, '3', null, undefined]) expect(leerCalificacion({ carita }, motivos).ok).toBe(false);
  });

  it('con carita 1, 2 o 3 acepta varios motivos de la empresa', () => {
    expect(leerCalificacion({ carita: 2, motivos: ['Compañeros', 'Mucho trabajo'] }, motivos))
      .toEqual({ ok: true, carita: 2, motivos: ['Compañeros', 'Mucho trabajo'] });
  });

  it('«Otro» se acepta pero NO se guarda: solo es el botón que abre la observación', () => {
    // Revisión adversarial del 4 de octubre de 2026. Guardado con nombre, «Otro» sin observación directa
    // era casi siempre la huella de una observación CONFIDENCIAL: con eso el panel señalaba a su autor.
    expect(leerCalificacion({ carita: 2, motivos: ['Compañeros', MOTIVO_OTRO] }, motivos))
      .toEqual({ ok: true, carita: 2, motivos: ['Compañeros'] });
    expect(leerCalificacion({ carita: 1, motivos: [MOTIVO_OTRO] }, motivos)).toEqual({ ok: true, carita: 1, motivos: [] });
  });

  it('quita los repetidos', () => {
    expect(leerCalificacion({ carita: 1, motivos: ['Compañeros', 'Compañeros'] }, motivos))
      .toEqual({ ok: true, carita: 1, motivos: ['Compañeros'] });
  });

  it('rechaza un motivo que la empresa no tiene', () => {
    expect(leerCalificacion({ carita: 1, motivos: ['Mi jefe'] }, motivos).ok).toBe(false);
  });

  it('con carita 4 o 5 no hay motivos: los que lleguen se descartan', () => {
    // La ventana los esconde al pasar de una carita triste a una feliz; si el
    // navegador alcanzó a mandar los de antes, no pueden quedar pegados a un buen día.
    expect(leerCalificacion({ carita: 4, motivos: ['Compañeros'] }, motivos)).toEqual({ ok: true, carita: 4, motivos: [] });
  });

  it('rechaza motivos que no sean una lista', () => {
    expect(leerCalificacion({ carita: 1, motivos: 'Compañeros' }, motivos).ok).toBe(false);
  });

  it('rechaza un cuerpo que no es un objeto', () => {
    expect(leerCalificacion(null, motivos).ok).toBe(false);
    expect(leerCalificacion('x', motivos).ok).toBe(false);
  });
});

describe('leerObservacion', () => {
  it('acepta un texto directo, recortado', () => {
    expect(leerObservacion({ texto: '  Hoy faltó gente  ' })).toEqual({ ok: true, texto: 'Hoy faltó gente', confidencial: false });
  });

  it('acepta un texto confidencial', () => {
    expect(leerObservacion({ texto: 'El microondas', confidencial: true })).toEqual({ ok: true, texto: 'El microondas', confidencial: true });
  });

  it('rechaza un texto vacío o solo con espacios', () => {
    expect(leerObservacion({ texto: '   ' }).ok).toBe(false);
    expect(leerObservacion({}).ok).toBe(false);
  });

  it('rechaza un texto más largo que el tope', () => {
    expect(MAX_OBSERVACION).toBe(1000);
    expect(leerObservacion({ texto: 'x'.repeat(1001) }).ok).toBe(false);
    expect(leerObservacion({ texto: 'x'.repeat(1000) }).ok).toBe(true);
  });

  it('solo un `true` de verdad la vuelve confidencial', () => {
    expect(leerObservacion({ texto: 'a', confidencial: 'true' })).toEqual({ ok: true, texto: 'a', confidencial: false });
  });
});

describe('necesitanAtencion', () => {
  const c = (colaboradorId: string, dia: number, carita: number, motivos: string[] = []) =>
    ({ colaboradorId, fecha: bog(2026, 10, dia, 0), carita, motivos });

  it('incluye a quien tiene sus tres últimas respuestas en carita 1 o 2', () => {
    const r = necesitanAtencion([c('a', 1, 1), c('a', 2, 2), c('a', 3, 1)]);
    expect(r.map(p => p.colaboradorId)).toEqual(['a']);
  });

  it('no incluye a quien tiene una carita 3 o más entre las tres últimas', () => {
    expect(necesitanAtencion([c('a', 1, 1), c('a', 2, 3), c('a', 3, 1)])).toEqual([]);
  });

  it('no incluye a quien tiene menos de tres respuestas', () => {
    expect(necesitanAtencion([c('a', 1, 1), c('a', 2, 1)])).toEqual([]);
  });

  it('cuenta respuestas y no días: los días sin responder no cortan la racha', () => {
    // Responde el 1, descansa el 2 y el 3, vuelve el 4: tres respuestas seguidas.
    expect(necesitanAtencion([c('a', 1, 2), c('a', 4, 2), c('a', 5, 1)]).map(p => p.colaboradorId)).toEqual(['a']);
  });

  it('no depende del orden en que lleguen', () => {
    // El buen día es el ÚLTIMO en el tiempo aunque llegue primero: corta la racha.
    expect(necesitanAtencion([c('a', 5, 5), c('a', 1, 1), c('a', 2, 1), c('a', 3, 1)])).toEqual([]);
    expect(necesitanAtencion([c('a', 3, 1), c('a', 1, 5), c('a', 2, 1), c('a', 4, 1)]).map(p => p.colaboradorId)).toEqual(['a']);
  });

  it('un buen día al final corta la racha aunque antes hubiera muchos malos', () => {
    expect(necesitanAtencion([c('a', 1, 1), c('a', 2, 1), c('a', 3, 1), c('a', 4, 5)])).toEqual([]);
  });

  it('dice cuántos días lleva, desde cuándo y el motivo que más se repite', () => {
    const [p] = necesitanAtencion([
      c('a', 1, 4),
      c('a', 2, 1, ['Compañeros']), c('a', 3, 2, ['Mucho trabajo', 'Compañeros']),
      c('a', 4, 1, ['Mucho trabajo']), c('a', 5, 2, ['Mucho trabajo']),
    ]);
    expect(p).toEqual({ colaboradorId: 'a', dias: 4, desde: bog(2026, 10, 2, 0), motivo: 'Mucho trabajo' });
  });

  it('sin motivos en la racha, el motivo es null', () => {
    expect(necesitanAtencion([c('a', 1, 1), c('a', 2, 1), c('a', 3, 1)])[0].motivo).toBeNull();
  });

  it('separa a cada persona y pone primero a quien lleva más días', () => {
    const r = necesitanAtencion([
      c('a', 1, 1), c('a', 2, 1), c('a', 3, 1),
      c('b', 1, 1), c('b', 2, 1), c('b', 3, 1), c('b', 4, 1),
      c('x', 1, 5), c('x', 2, 5), c('x', 3, 5),
    ]);
    expect(r.map(p => [p.colaboradorId, p.dias])).toEqual([['b', 4], ['a', 3]]);
  });
});

describe('filasParaLaRacha — la racha no se corta por el calendario', () => {
  const c = (colaboradorId: string, dia: number, carita: number) => ({ colaboradorId, fecha: bog(2026, 10, dia, 0), carita, motivos: [] });

  it('se queda con lo malo posterior al último buen día de CADA persona', () => {
    const malas = [c('a', 1, 1), c('a', 5, 2), c('a', 9, 1), c('b', 2, 1), c('b', 3, 2)];
    const ultimoBueno = new Map([['a', bog(2026, 10, 4, 0)], ['b', bog(2026, 10, 1, 0)]]);
    expect(filasParaLaRacha(malas, ultimoBueno).map(x => `${x.colaboradorId}${x.fecha.getUTCDate()}`))
      .toEqual(['a5', 'a9', 'b2', 'b3']);
  });

  it('quien nunca tuvo un buen día conserva todas sus respuestas malas, por viejas que sean', () => {
    // Revisión adversarial: con una ventana de 42 días, quien responde poco nunca llegaba a tres.
    const viejas = [{ colaboradorId: 'a', fecha: bog(2026, 6, 1, 0), carita: 1, motivos: [] }, c('a', 1, 2), c('a', 3, 1)];
    expect(filasParaLaRacha(viejas, new Map())).toHaveLength(3);
    expect(necesitanAtencion(filasParaLaRacha(viejas, new Map()))[0].dias).toBe(3);
  });
});

describe('buzón confidencial', () => {
  it('la semana es el lunes de Bogotá, a medianoche de Bogotá', () => {
    // Domingo 4 de octubre a las 11 p. m. de Bogotá: en UTC ya es lunes 5.
    expect(semanaDe(bog(2026, 10, 4, 23))).toEqual(bog(2026, 9, 28, 0));
    expect(semanaDe(bog(2026, 10, 5, 0, 30))).toEqual(bog(2026, 10, 5, 0));
    expect(semanaDe(bog(2026, 10, 7, 17, 42))).toEqual(bog(2026, 10, 5, 0));
  });

  it('una nota se ve desde la medianoche siguiente de Bogotá', () => {
    expect(visibleDesde(bog(2026, 10, 7, 17, 42))).toEqual(bog(2026, 10, 8, 0));
    // A las 8 p. m. de Bogotá la fecha UTC ya es la de mañana: no puede saltarse un día.
    expect(visibleDesde(bog(2026, 10, 7, 20))).toEqual(bog(2026, 10, 8, 0));
  });

  it('el orden no depende del orden de llegada', () => {
    const notas = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(id => ({ id }));
    const revuelto = ordenRevuelto(notas).map(n => n.id);
    expect(revuelto).not.toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
    expect([...revuelto].sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  });

  it('el orden es estable: recargar la página no lo cambia', () => {
    const notas = ['n1', 'n2', 'n3', 'n4'].map(id => ({ id }));
    expect(ordenRevuelto(notas)).toEqual(ordenRevuelto([...notas].reverse()));
  });
});

describe('resumenDelClima', () => {
  const c = (colaboradorId: string, dia: number, carita: number, motivos: string[] = []) =>
    ({ colaboradorId, fecha: bog(2026, 10, dia, 0), carita, motivos });

  it('sin calificaciones no inventa un promedio', () => {
    const r = resumenDelClima([]);
    expect(r.promedio).toBeNull();
    expect(r.total).toBe(0);
    expect(r.distribucion).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(r.motivos).toEqual([]);
    expect(r.semanas).toEqual([]);
    expect(r.negativas).toBe(0);
  });

  it('promedio con un decimal, distribución por carita y respuestas negativas (Muy mal y Mal)', () => {
    const r = resumenDelClima([c('a', 5, 1), c('b', 5, 2), c('c', 5, 4), c('d', 5, 5), c('e', 6, 5), c('f', 6, 3)]);
    expect(r.total).toBe(6);
    expect(r.promedio).toBe(3.3); // 20 / 6 = 3,33
    expect(r.distribucion).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 });
    expect(r.negativas).toBe(2);
    expect(r.personas).toBe(6);
  });

  it('cuenta personas distintas, no calificaciones', () => {
    expect(resumenDelClima([c('a', 5, 4), c('a', 6, 4), c('b', 6, 4)]).personas).toBe(2);
  });

  it('los motivos se cuentan sobre los días que no fueron buenos (caritas 1 a 3), de más a menos', () => {
    const r = resumenDelClima([
      // «Compañeros» aparece primero, pero se repite menos: el orden es por veces, no por llegada.
      c('a', 5, 1, ['Compañeros', 'Mucho trabajo']),
      c('b', 5, 2, ['Mucho trabajo']),
      c('c', 5, 3, []),
      c('d', 5, 3, ['Compañeros', 'Mucho trabajo']),
      c('e', 5, 5),
    ]);
    // Cuatro días no buenos: Mucho trabajo en 3 (75 %), Compañeros en 2 (50 %).
    expect(r.motivos).toEqual([
      { motivo: 'Mucho trabajo', veces: 3, porcentaje: 75 },
      { motivo: 'Compañeros', veces: 2, porcentaje: 50 },
    ]);
  });

  it('agrupa por semana, de la más vieja a la más nueva', () => {
    // Domingo 4 (semana del 28 sep) y lunes 5 (semana del 5 oct).
    const r = resumenDelClima([c('a', 5, 4), c('b', 4, 2), c('c', 6, 5)]);
    expect(r.semanas).toEqual([
      { semana: bog(2026, 9, 28, 0), promedio: 2, total: 1 },
      { semana: bog(2026, 10, 5, 0), promedio: 4.5, total: 2 },
    ]);
  });
});

describe('variacionDelPromedio', () => {
  it('es la diferencia con el período anterior, con un decimal', () => {
    expect(variacionDelPromedio(3.8, 3.6)).toBe(0.2);
    expect(variacionDelPromedio(3.1, 3.6)).toBe(-0.5);
  });

  it('sin uno de los dos promedios no hay variación', () => {
    expect(variacionDelPromedio(null, 3.6)).toBeNull();
    expect(variacionDelPromedio(3.6, null)).toBeNull();
  });
});

describe('promedioPorSede', () => {
  const c = (colaboradorId: string, carita: number) => ({ colaboradorId, fecha: bog(2026, 10, 5, 0), carita, motivos: [] });
  const j = (colaboradorId: string) => ({ colaboradorId });
  const sedes = [{ id: 's1', nombre: 'Principal' }, { id: 's2', nombre: 'Norte' }];

  it('promedia cada sede con las personas que pertenecen a ella, con su participación', () => {
    const sedesDe = new Map<string, (string | null)[]>([['a', ['s1']], ['b', ['s1']], ['c', ['s2']]]);
    // Principal: 2 respuestas de 4 jornadas (50 %). Norte: 1 de 1 (100 %).
    const jornadas = [j('a'), j('a'), j('b'), j('b'), j('c')];
    expect(promedioPorSede([c('a', 5), c('b', 3), c('c', 2)], jornadas, sedesDe, sedes)).toEqual([
      { sedeId: 's1', nombre: 'Principal', promedio: 4, total: 2, jornadas: 4, participacion: 50 },
      { sedeId: 's2', nombre: 'Norte', promedio: 2, total: 1, jornadas: 1, participacion: 100 },
    ]);
  });

  it('quien tiene dos sedes cuenta en las dos', () => {
    const sedesDe = new Map<string, (string | null)[]>([['a', ['s1', 's2']]]);
    expect(promedioPorSede([c('a', 4)], [j('a')], sedesDe, sedes).map(s => [s.total, s.jornadas])).toEqual([[1, 1], [1, 1]]);
  });

  it('quien no tiene sede va en «Sin sede», al final', () => {
    const sedesDe = new Map<string, (string | null)[]>([['a', [null]], ['b', ['s2']]]);
    expect(promedioPorSede([c('a', 1), c('b', 5)], [j('a'), j('b')], sedesDe, sedes)).toEqual([
      { sedeId: 's2', nombre: 'Norte', promedio: 5, total: 1, jornadas: 1, participacion: 100 },
      { sedeId: null, nombre: 'Sin sede', promedio: 1, total: 1, jornadas: 1, participacion: 100 },
    ]);
  });

  it('una sede sin calificaciones no aparece', () => {
    const sedesDe = new Map<string, (string | null)[]>([['a', ['s1']], ['b', ['s2']]]);
    expect(promedioPorSede([c('a', 4)], [j('a'), j('b')], sedesDe, sedes).map(s => s.sedeId)).toEqual(['s1']);
  });

  it('la participación nunca pasa de 100, y sin jornadas no se inventa', () => {
    // Un turno nocturno puede calificarse en un día cuya jornada cae fuera del filtro.
    const sedesDe = new Map<string, (string | null)[]>([['a', ['s1']]]);
    expect(promedioPorSede([c('a', 4), c('a', 4)], [j('a')], sedesDe, sedes)[0].participacion).toBe(100);
    expect(promedioPorSede([c('a', 4)], [], sedesDe, sedes)[0].participacion).toBeNull();
  });
});
