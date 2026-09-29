import { describe, it, expect } from 'vitest';
import { codigosDelCatalogo } from './codigoDeTurno';

// EL CÓDIGO CORTO DE UN TURNO, PARA LA CELDA DEL MES (28 de septiembre de 2026).
//
// En la vista de mes hay hasta cuarenta y dos columnas y la celda mide unos cuarenta píxeles. Ahí no
// cabe «Jornada nocturna»: la celda la escribe en dos renglones, la columna se ensancha hasta la
// palabra más larga, y la tabla se va a más de tres mil píxeles. O sea que para llegar a la última
// semana del mes hay que raspar a lo ancho.
//
// LA MAQUETA LO RESUELVE CON UN CAMPO ESCRITO A MANO por turno («M», «T», «Md»). Aquí no se puede: el
// catálogo lo crea cada cliente y solo tiene `nombre`. Agregarle una columna es un cambio de esquema,
// que en este proyecto se habla antes y arrastra el artefacto de Prisma. Se DERIVA del nombre.
//
// Y DERIVARLO TIENE UNA TRAMPA, que es la razón de que esto sea una función con pruebas y no un
// `nombre.charAt(0)` metido en el JSX: «Mañana» y «Madrugada» empiezan igual. Dos turnos distintos
// pintados con la misma letra en la misma rejilla son dos turnos que nadie puede distinguir, y en
// esta pantalla eso significa programar el turno equivocado sin que nada se vea raro.

const cat = (...nombres: string[]) => nombres.map((nombre, i) => ({ id: `t${i}`, nombre }));

describe('los códigos del catálogo', () => {
  it('la inicial, cuando alcanza', () => {
    const c = codigosDelCatalogo(cat('Mañana', 'Tarde', 'Noche'));
    expect([c.t0, c.t1, c.t2]).toEqual(['M', 'T', 'N']);
  });

  it('EL CASO DE LA MAQUETA: Mañana y Madrugada no pueden ser las dos «M»', () => {
    const c = codigosDelCatalogo(cat('Mañana', 'Tarde', 'Noche', 'Apertura', 'Cierre', 'Partido', 'Madrugada', 'Refuerzo'));
    expect([c.t0, c.t1, c.t2, c.t3, c.t4, c.t5, c.t6, c.t7])
      .toEqual(['M', 'T', 'N', 'A', 'C', 'P', 'Ma', 'R']);
  });

  it('el que llega primero se queda con la letra, y el orden lo pone el catálogo', () => {
    // Al revés que arriba: si «Madrugada» va primero, la «M» es suya. Importa que sea estable, no
    // quién gane: el orden del catálogo viene del servidor y no cambia entre pintadas.
    const c = codigosDelCatalogo(cat('Madrugada', 'Mañana'));
    expect([c.t0, c.t1]).toEqual(['M', 'Ma']);
  });

  it('NUNCA SE REPITEN, ni con nombres idénticos', () => {
    // Dos turnos con el mismo nombre son un error del cliente, pero la rejilla no puede pintarlos
    // igual: quien mire la pantalla creería que es el mismo turno.
    const c = codigosDelCatalogo(cat('Turno', 'Turno', 'Turno', 'Turno'));
    const codigos = Object.values(c);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('NINGUNO PASA DE DOS CARACTERES, que es lo que cabe en la celda', () => {
    // Si el desempate creciera sin tope, el primer catálogo con muchos nombres parecidos volvería a
    // ensanchar la tabla, que es justo lo que esta función viene a evitar.
    const c = codigosDelCatalogo(cat(
      'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno', 'Turno',
    ));
    for (const codigo of Object.values(c) as string[]) expect(codigo.length, codigo).toBeLessThanOrEqual(2);
  });

  it('las tildes no entran en el código', () => {
    // «Ó» en una celda de once píxeles se lee mal y además no coincide con nada de lo que se escribe.
    const c = codigosDelCatalogo(cat('Óptimo', 'Único'));
    expect([c.t0, c.t1]).toEqual(['O', 'U']);
  });

  it('un nombre en minúscula da código en mayúscula', () => {
    expect(codigosDelCatalogo(cat('noche')).t0).toBe('N');
  });

  it('lo que no es letra ni número no cuenta como inicial', () => {
    // «· Noche» o «  Tarde» salen de copiar y pegar, y su código no puede ser un punto ni un espacio.
    const c = codigosDelCatalogo(cat('  Tarde', '· Noche'));
    expect([c.t0, c.t1]).toEqual(['T', 'N']);
  });

  it('un nombre sin ninguna letra no rompe la rejilla', () => {
    // No se inventa nada: se dibuja un signo que dice «esto no tiene nombre legible», y la celda
    // sigue pintándose. Reventar aquí dejaría el mes entero en blanco por un turno mal creado.
    expect(codigosDelCatalogo(cat('—')).t0).toBe('?');
  });

  it('un catálogo vacío da un mapa vacío', () => {
    expect(codigosDelCatalogo([])).toEqual({});
  });
});
