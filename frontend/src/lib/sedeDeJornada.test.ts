import { describe, it, expect } from 'vitest';
import { cruzoDeSede, cumpleSede, cumpleCruce, opcionesDeSede, muestraColumnaSede, sedeDeLaJornada, textoSinSede, CRUCE_DISTINTAS } from './sedeDeJornada';

const POBLADO = { id: 's1', nombre: 'El Poblado' };
const LAURELES = { id: 's2', nombre: 'Laureles' };
// `sedeAtribuida`: la sede que el servidor le atribuye al leer a la jornada de un
// presencial que no abrió en una sede probada (decisión del dueño del 12 de
// septiembre de 2026). No es una sede que la ubicación haya probado.
const PRINCIPAL = { id: 's0', nombre: 'Sede principal' };

describe('cruzoDeSede', () => {
  it('abrió y cerró en la misma: no cruzó', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: POBLADO })).toBe(false);
  });
  it('abrió en una y cerró en otra: cruzó', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: LAURELES })).toBe(true);
  });
  it('se compara por id: dos sedes con el mismo nombre son dos sitios', () => {
    expect(cruzoDeSede({ sede: { id: 's1', nombre: 'Principal' }, sedeSalida: { id: 's9', nombre: 'Principal' } })).toBe(true);
  });
  it('sin la sede de cierre no se sabe, y NO cuenta como cruce', () => {
    expect(cruzoDeSede({ sede: POBLADO, sedeSalida: null })).toBe(false);
    expect(cruzoDeSede({ sede: POBLADO })).toBe(false);
  });
  it('la sede atribuida no es una apertura probada: con ella no hay cruce', () => {
    expect(cruzoDeSede({ sede: null, sedeAtribuida: POBLADO, sedeSalida: LAURELES })).toBe(false);
  });
});

describe('cumpleSede', () => {
  it('sin elegir nada, pasa todo', () => {
    expect(cumpleSede({}, [])).toBe(true);
  });
  it('pasa si ABRIÓ en la elegida', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: LAURELES }, ['s1'])).toBe(true);
  });
  it('pasa si CERRÓ en la elegida: un supervisor que terminó ahí también estuvo ahí', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: LAURELES }, ['s2'])).toBe(true);
  });
  it('no pasa si no tocó ninguna de las elegidas', () => {
    expect(cumpleSede({ sede: POBLADO, sedeSalida: POBLADO }, ['s2'])).toBe(false);
    expect(cumpleSede({}, ['s1'])).toBe(false);
  });
  it('pasa si la elegida es la sede que se le atribuye por defecto', () => {
    expect(cumpleSede({ sede: null, sedeSalida: null, sedeAtribuida: PRINCIPAL }, ['s0'])).toBe(true);
    expect(cumpleSede({ sede: null, sedeSalida: null, sedeAtribuida: PRINCIPAL }, ['s1'])).toBe(false);
  });
});

describe('cumpleCruce', () => {
  it('sin elegirlo, pasa todo', () => {
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: POBLADO }, [])).toBe(true);
  });
  it('elegido, deja solo las que cruzaron', () => {
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: LAURELES }, [CRUCE_DISTINTAS])).toBe(true);
    expect(cumpleCruce({ sede: POBLADO, sedeSalida: POBLADO }, [CRUCE_DISTINTAS])).toBe(false);
    expect(cumpleCruce({ sede: POBLADO }, [CRUCE_DISTINTAS])).toBe(false);
  });
});

describe('opcionesDeSede', () => {
  const BELEN = { id: 's3', nombre: 'Belén' };

  it('sin filas, son las sedes activas', () => {
    expect(opcionesDeSede([POBLADO, LAURELES], [])).toEqual([
      { ...POBLADO, activa: true }, { ...LAURELES, activa: true },
    ]);
  });
  it('una sede desactivada que aparece en las filas se sigue ofreciendo, marcada como tal', () => {
    // El servidor solo lista las activas, pero los registros viejos conservan su
    // sede: sin esto no habría forma de aislar las jornadas de una sede cerrada.
    expect(opcionesDeSede([POBLADO], [{ sede: POBLADO, sedeSalida: LAURELES }])).toEqual([
      { ...POBLADO, activa: true }, { ...LAURELES, activa: false },
    ]);
  });
  it('también si solo aparece como sede de apertura', () => {
    expect(opcionesDeSede([POBLADO], [{ sede: BELEN }]).map(s => s.id)).toEqual(['s3', 's1']);
  });
  it('también la que solo aparece como sede atribuida, marcada si está desactivada', () => {
    // Una sede de entrada atribuida puede salir de una sede probada del mismo día que
    // ya se desactivó. Si el filtro la incluye, tiene que ofrecerla.
    expect(opcionesDeSede([POBLADO], [{ sedeAtribuida: LAURELES }])).toEqual([
      { ...POBLADO, activa: true }, { ...LAURELES, activa: false },
    ]);
  });
  it('no repite la que está activa y además en las filas', () => {
    expect(opcionesDeSede([POBLADO], [{ sede: POBLADO, sedeSalida: POBLADO }])).toHaveLength(1);
  });
  it('van en orden alfabético, con las tildes en su sitio', () => {
    // «Ágora» primero: comparando códigos, la Á va después de la Z.
    const AGORA = { id: 's4', nombre: 'Ágora' };
    expect(opcionesDeSede([LAURELES, POBLADO], [{ sede: BELEN }, { sedeSalida: AGORA }]).map(s => s.nombre))
      .toEqual(['Ágora', 'Belén', 'El Poblado', 'Laureles']);
  });
});

// Revisión del 12 de septiembre de 2026: la columna ya no depende de cuántas sedes
// distintas traigan las filas. Filtrando a una persona en una empresa de varias sedes,
// lo normal es que todas sus jornadas digan la misma sede por defecto, y la columna
// desaparecía justo ahí. Ahora manda la empresa, como en los reportes
// (`sedes.length > 1`), y una sede probada, para seguir mostrando las desactivadas.
describe('muestraColumnaSede', () => {
  it('con más de una sede activa en la empresa, se muestra aunque todas las filas tengan la misma sede por defecto', () => {
    expect(muestraColumnaSede([{ sedeAtribuida: LAURELES }, { sedeAtribuida: LAURELES }], [POBLADO, LAURELES])).toBe(true);
  });
  it('con más de una sede activa, también sin ninguna sede en las filas', () => {
    expect(muestraColumnaSede([{}, { sede: null, sedeSalida: null, sedeAtribuida: null }], [POBLADO, LAURELES])).toBe(true);
  });
  it('con una sola sede activa, se muestra si alguna fila tiene una sede probada, de entrada o de salida: puede ser una ya desactivada', () => {
    expect(muestraColumnaSede([{ sede: POBLADO }, { sedeAtribuida: PRINCIPAL }], [PRINCIPAL])).toBe(true);
    expect(muestraColumnaSede([{ sedeSalida: POBLADO }], [PRINCIPAL])).toBe(true);
    expect(muestraColumnaSede([{ sede: POBLADO }], [])).toBe(true);
  });
  // Pedido del dueño del 13 de septiembre de 2026: en la tabla faltaba la sede. Antes, con una
  // sola sede activa y solo sedes por defecto en las filas, la columna no salía, para no repetir
  // la misma etiqueta en cada fila.
  it('con una sola sede activa, se muestra aunque todas las filas digan la sede por defecto', () => {
    expect(muestraColumnaSede([{ sedeAtribuida: PRINCIPAL }, { sedeAtribuida: LAURELES }], [PRINCIPAL])).toBe(true);
  });
  it('con una sola sede activa, se muestra también si las filas no traen ninguna sede', () => {
    expect(muestraColumnaSede([{}, { sede: null, sedeSalida: null, sedeAtribuida: null }], [PRINCIPAL])).toBe(true);
  });
  it('sin sedes activas, se muestra si alguna fila trae la sede por defecto', () => {
    expect(muestraColumnaSede([{ sedeAtribuida: PRINCIPAL }], [])).toBe(true);
  });
  it('sin sedes activas y sin ninguna sede en las filas, no se muestra: sería una columna de guiones', () => {
    expect(muestraColumnaSede([{}, { sede: null, sedeSalida: null, sedeAtribuida: null }], [])).toBe(false);
  });
});

// QUÉ DICE LA CELDA DE SEDE DE UNA JORNADA (4 de octubre de 2026).
//
// Era una cadena de cuatro `if` dentro de la pantalla, y el cuarto mostraba la
// sede ATRIBUIDA con el mismo aspecto que una probada: en la tabla no había
// forma de distinguir «marcó en Laureles» de «no marcó en ninguna y se le
// atribuye Laureles». El dueño pidió que en la jornada aparezca solo dónde
// marcó (petición 21), así que la atribuida sigue estando pero dicha como lo
// que es.
//
// Va como una función con un caso por valor y un `default` explícito, que es lo
// que pide la §9.4 del CLAUDE.md para una pregunta de «de qué tipo es esto».
describe('sedeDeLaJornada', () => {
  it('abrió en una y cerró en otra: es un cruce, con las dos', () => {
    expect(sedeDeLaJornada({ sede: POBLADO, sedeSalida: LAURELES }))
      .toEqual({ clase: 'cruce', abrio: 'El Poblado', cerro: 'Laureles' });
  });

  it('abrió y cerró en la misma: una sola, probada', () => {
    expect(sedeDeLaJornada({ sede: POBLADO, sedeSalida: POBLADO }))
      .toEqual({ clase: 'probada', nombre: 'El Poblado' });
  });

  // Todo lo anterior a que se guardara la sede de salida.
  it('abrió en una y no se sabe dónde cerró: la de apertura, probada', () => {
    expect(sedeDeLaJornada({ sede: POBLADO }))
      .toEqual({ clase: 'probada', nombre: 'El Poblado' });
  });

  it('no se sabe dónde abrió pero cerró en una: se dice que es el cierre', () => {
    expect(sedeDeLaJornada({ sedeSalida: LAURELES }))
      .toEqual({ clase: 'soloCierre', nombre: 'Laureles' });
  });

  // La que importa: sin ninguna sede probada, la atribuida se devuelve APARTE,
  // para que la pantalla no la pinte como si la hubiera marcado.
  it('sin sede probada, la atribuida se devuelve como atribuida', () => {
    expect(sedeDeLaJornada({ sedeAtribuida: PRINCIPAL }))
      .toEqual({ clase: 'atribuida', nombre: 'Sede principal' });
  });

  it('una sede probada manda sobre la atribuida', () => {
    expect(sedeDeLaJornada({ sede: POBLADO, sedeAtribuida: PRINCIPAL }))
      .toEqual({ clase: 'probada', nombre: 'El Poblado' });
    expect(sedeDeLaJornada({ sedeSalida: LAURELES, sedeAtribuida: PRINCIPAL }))
      .toEqual({ clase: 'soloCierre', nombre: 'Laureles' });
  });

  it('sin ninguna sede, ninguna', () => {
    expect(sedeDeLaJornada({})).toEqual({ clase: 'ninguna' });
    expect(sedeDeLaJornada({ sede: null, sedeSalida: null, sedeAtribuida: null })).toEqual({ clase: 'ninguna' });
  });
});

// SIN SEDE DE MARCACIÓN, EL MOTIVO (11 de octubre de 2026, PENDIENTES nº 11 y nº 38, opción 3 del dueño).
// El servidor manda `sinSede` con el porqué; la celda lo dice en vez de «— · cuenta en [sede]», que se
// leía como la sede de la persona. Dónde cuenta para los reportes queda aparte, en `cuentaEn`.
describe('sedeDeLaJornada con el motivo de no tener sede', () => {
  it('con motivo, dice el motivo y aparte dónde cuenta', () => {
    expect(sedeDeLaJornada({ sinSede: 'SIN_UBICACION_DE_SEDE', sedeAtribuida: PRINCIPAL }))
      .toEqual({ clase: 'sinSede', motivo: 'SIN_UBICACION_DE_SEDE', cuentaEn: 'Sede principal' });
  });

  it('sin sede atribuida, no cuenta en ninguna', () => {
    expect(sedeDeLaJornada({ sinSede: 'REMOTO' })).toEqual({ clase: 'sinSede', motivo: 'REMOTO', cuentaEn: null });
  });

  it('una sede probada manda sobre el motivo', () => {
    expect(sedeDeLaJornada({ sede: POBLADO, sinSede: 'FUERA_DE_SEDE' })).toEqual({ clase: 'probada', nombre: 'El Poblado' });
    expect(sedeDeLaJornada({ sedeSalida: LAURELES, sinSede: 'FUERA_DE_SEDE' })).toEqual({ clase: 'soloCierre', nombre: 'Laureles' });
  });

  // Un servidor anterior no manda `sinSede`: se pinta como antes.
  it('sin el campo, la atribuida se dice como antes', () => {
    expect(sedeDeLaJornada({ sedeAtribuida: PRINCIPAL })).toEqual({ clase: 'atribuida', nombre: 'Sede principal' });
  });
});

describe('textoSinSede', () => {
  it('un texto por motivo', () => {
    expect(textoSinSede('REMOTO')).toBe('Remoto');
    expect(textoSinSede('FUERA_DE_SEDE')).toBe('Fuera de sede');
    expect(textoSinSede('SIN_UBICACION_DE_SEDE')).toBe('Sin ubicación de sede');
    expect(textoSinSede('NO_REGISTRADA')).toBe('No quedó registrada');
  });

  // Un servidor más nuevo puede mandar un motivo que este bundle no conoce: no se rompe ni se inventa.
  it('un motivo desconocido dice que no quedó registrada', () => {
    expect(textoSinSede('OTRO' as never)).toBe('No quedó registrada');
  });
});
