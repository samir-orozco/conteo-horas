import { describe, it, expect } from 'vitest';
import {
  sedePrincipal, sedePorDefecto, lugaresDeEntrada,
  type SedeParaElegir, type FilaConLugar, type LugarDeEntrada,
} from './sedePrincipal';

// DECISIÓN DEL DUEÑO (12 de septiembre de 2026), «mostrarla al leer» y «mostrar la
// principal»: la sede que no probó la ubicación NO se guarda, y a un presencial sin
// sede NO se le asigna la principal. Los reportes y la tabla de Registros le
// muestran y le cuentan su sede, marcada «por defecto». «Sin sede» solo es legítimo
// para un híbrido o un remoto.
//
// Reemplaza a la del 11 de septiembre, que guardaba la sede deducida en la misma
// columna que la probada: tres rondas de revisión encontraron defectos siempre por
// la misma causa, cada parte del sistema adivinando cuál de las dos era.

const dia = (d: number) => new Date(Date.UTC(2026, 7, d, 17));
const sede = (id: string, d: number, activa = true): SedeParaElegir => ({ id, activa, creadoEn: dia(d) });

const PRINCIPAL = sede('principal', 1);
const NORTE = sede('norte', 10);
const SUR = sede('sur', 20);
const EMPRESA = [PRINCIPAL, NORTE, SUR];

describe('cuál es la Sede principal de una empresa', () => {
  it('es la sede activa más antigua', () => {
    expect(sedePrincipal([NORTE, PRINCIPAL, SUR])).toBe('principal');
  });

  it('una sede desactivada no es la principal aunque sea la más antigua', () => {
    expect(sedePrincipal([sede('vieja', 1, false), NORTE, SUR])).toBe('norte');
  });

  it('con dos creadas en el mismo instante, decide el id, para que no dependa del orden', () => {
    expect(sedePrincipal([sede('b', 5), sede('a', 5)])).toBe('a');
    expect(sedePrincipal([sede('a', 5), sede('b', 5)])).toBe('a');
  });

  it('sin sedes activas no hay principal', () => {
    expect(sedePrincipal([])).toBeNull();
    expect(sedePrincipal([sede('cerrada', 1, false)])).toBeNull();
  });
});

describe('la sede por defecto de una persona', () => {
  it('con una sola sede, esa', () => {
    expect(sedePorDefecto([SUR], EMPRESA)).toBe('sur');
  });

  it('con varias, la más antigua de las suyas, aunque no sea la principal de la empresa', () => {
    // Sin ubicación no se sabe en cuál de las suyas estaba, pero en la principal no trabaja.
    expect(sedePorDefecto([SUR, NORTE], EMPRESA)).toBe('norte');
  });

  it('con varias y una es la principal, la principal, que es la más antigua de todas', () => {
    expect(sedePorDefecto([SUR, PRINCIPAL], EMPRESA)).toBe('principal');
  });

  it('sus sedes desactivadas no cuentan', () => {
    expect(sedePorDefecto([sede('cerrada', 2, false), SUR], EMPRESA)).toBe('sur');
  });

  it('sin ninguna sede, la Sede principal de la empresa', () => {
    expect(sedePorDefecto([], EMPRESA)).toBe('principal');
    expect(sedePorDefecto([sede('cerrada', 2, false)], EMPRESA)).toBe('principal');
  });

  it('si la empresa no tiene ninguna sede activa, no hay sede por defecto', () => {
    expect(sedePorDefecto([], [])).toBeNull();
    expect(sedePorDefecto([], [sede('cerrada', 1, false)])).toBeNull();
  });
});

// Las filas de `registros` de UNA persona. `fecha` va a medianoche de Bogotá, como
// la guardan el kiosco y la carga manual, y las horas se dan en hora de Bogotá.
const medianoche = (d: number) => new Date(Date.UTC(2026, 8, d, 5));
const bog = (d: number, h: number, min = 0) => new Date(Date.UTC(2026, 8, d, h + 5, min));
const marca = (d: number, h: number | null, sedeId: string | null = null, sedeSalidaId: string | null = null): FilaConLugar =>
  ({ fecha: medianoche(d), entrada: h === null ? null : bog(d, h), sedeId, sedeSalidaId });

const presencial = (sedeDeLaPersona: string | null = 'principal') => ({ modalidad: 'PRESENCIAL', sedePorDefecto: sedeDeLaPersona });

// «norte» es una sede probada; «norte (por defecto)», una atribuida.
const leer = (l: LugarDeEntrada[]) => l.map(x => `${x.id ?? 'sin sede'}${x.porDefecto ? ' (por defecto)' : ''}`);
const lugares = (filas: FilaConLugar[], persona: { modalidad: string; sedePorDefecto: string | null } = presencial()) =>
  leer(lugaresDeEntrada(filas, persona));

describe('dónde se abrió cada fila · una sede probada nunca se reemplaza', () => {
  it('la entrada que marcó con ubicación queda donde marcó, aunque su sede por defecto sea otra', () => {
    expect(lugares([marca(7, 8, 'norte')])).toEqual(['norte']);
  });

  it('ni la sede de salida de la misma fila ni otra fila del día la cambian', () => {
    expect(lugares([marca(7, 7, 'sur'), marca(7, 13, 'norte', 'sur')])).toEqual(['sur', 'norte']);
  });
});

describe('dónde se abrió cada fila · c) sin ninguna pista, la sede por defecto de la persona', () => {
  it('un presencial con una sola sede cuenta en esa', () => {
    expect(lugares([marca(7, 8)], presencial(sedePorDefecto([SUR], EMPRESA)))).toEqual(['sur (por defecto)']);
  });

  it('con varias sedes, en la más antigua de las suyas', () => {
    expect(lugares([marca(7, 8)], presencial(sedePorDefecto([SUR, NORTE], EMPRESA)))).toEqual(['norte (por defecto)']);
  });

  it('sin ninguna sede asignada, en la principal de la empresa, sin que se le asigne', () => {
    expect(lugares([marca(7, 8)], presencial(sedePorDefecto([], EMPRESA)))).toEqual(['principal (por defecto)']);
  });

  it('si la empresa no tiene sedes activas, sigue sin sede', () => {
    expect(lugares([marca(7, 8)], presencial(sedePorDefecto([], [sede('cerrada', 1, false)])))).toEqual(['sin sede']);
  });
});

describe('dónde se abrió cada fila · a) la sede de salida de la misma fila', () => {
  it('una entrada sin sede con la salida probada en Sur cuenta en Sur', () => {
    expect(lugares([marca(7, 8, null, 'sur')])).toEqual(['sur (por defecto)']);
  });

  it('aunque la empresa ya no tenga sedes activas: la salida sí se probó', () => {
    expect(lugares([marca(7, 8, null, 'sur')], presencial(null))).toEqual(['sur (por defecto)']);
  });
});

describe('dónde se abrió cada fila · b) otra fila del mismo día con sede probada', () => {
  it('la mañana marcada en Sur y la tarde cargada a mano: la tarde cuenta en Sur', () => {
    expect(lugares([marca(7, 8, 'sur', 'sur'), marca(7, 13)])).toEqual(['sur', 'sur (por defecto)']);
  });

  it('también vale la sede de salida de la otra fila', () => {
    expect(lugares([marca(7, 8, null, 'norte'), marca(7, 13)])).toEqual(['norte (por defecto)', 'norte (por defecto)']);
  });

  it('de esa otra fila manda la sede de entrada sobre la de salida', () => {
    expect(lugares([marca(7, 8, 'sur', 'norte'), marca(7, 13)])).toEqual(['sur', 'sur (por defecto)']);
  });

  it('con varias, la de la fila que entró más temprano, lleguen en el orden que lleguen', () => {
    // La más temprana llega de segunda y, después, de primera: ni «la primera de la
    // lista» ni «la última» pasan las dos.
    expect(lugares([marca(7, 13, 'norte'), marca(7, 8, 'sur'), marca(7, 17)])).toEqual(['norte', 'sur', 'sur (por defecto)']);
    expect(lugares([marca(7, 8, 'sur'), marca(7, 17), marca(7, 13, 'norte')])).toEqual(['sur', 'sur (por defecto)', 'norte']);
  });

  it('dos filas con la misma hora de entrada: decide el id de la sede, para que no dependa del orden', () => {
    expect(lugares([marca(7, 8, 'sur'), marca(7, 8, 'norte'), marca(7, 13)])[2]).toBe('norte (por defecto)');
    expect(lugares([marca(7, 8, 'norte'), marca(7, 8, 'sur'), marca(7, 13)])[2]).toBe('norte (por defecto)');
  });

  it('una fila sin hora de entrada no da la pista, aunque conserve una sede', () => {
    expect(lugares([marca(7, null, 'norte'), marca(7, 13)])).toEqual(['norte', 'principal (por defecto)']);
  });
});

describe('dónde se abrió cada fila · dos días distintos', () => {
  it('la sede probada de un día no se le supone al siguiente', () => {
    expect(lugares([marca(7, 8, 'sur'), marca(8, 8)])).toEqual(['sur', 'principal (por defecto)']);
  });

  it('el día es el de Bogotá: una marca guardada con la hora real a las 8 p.m. le da la pista a otra del mismo día, aunque en UTC ya sea el siguiente', () => {
    const conHoraReal = { fecha: bog(7, 20), entrada: bog(7, 20), sedeId: 'sur', sedeSalidaId: null };
    expect(lugares([conHoraReal, marca(7, 21)])).toEqual(['sur', 'sur (por defecto)']);
  });

  it('y una de las 11:30 p.m. no se la da a una del día siguiente, aunque en UTC sean el mismo día', () => {
    const conHoraReal = { fecha: bog(7, 23, 30), entrada: bog(7, 23, 30), sedeId: 'sur', sedeSalidaId: null };
    expect(lugares([conHoraReal, marca(8, 8)])).toEqual(['sur', 'principal (por defecto)']);
  });

  // Revisión del 12 de septiembre de 2026: «el mismo día» de la regla b) es el de la
  // FECHA de la fila, que es el de la jornada, y no el de su hora de entrada. En un
  // turno de noche el regreso del almuerzo cae después de medianoche y conserva la
  // fecha del día en que se entró.
  it('el regreso del almuerzo de un turno de noche, pasada la medianoche y con la fecha del día en que entró, toma la sede de esa noche', () => {
    const entraDeNoche = { fecha: medianoche(7), entrada: bog(7, 22), sedeId: 'norte', sedeSalidaId: null };
    const regresaDelAlmuerzo = { fecha: medianoche(7), entrada: bog(8, 0, 30), sedeId: null, sedeSalidaId: null };
    expect(lugares([entraDeNoche, regresaDelAlmuerzo])).toEqual(['norte', 'norte (por defecto)']);
    expect(lugares([regresaDelAlmuerzo, entraDeNoche])).toEqual(['norte (por defecto)', 'norte']);
  });

  it('y al revés: si la ubicación la probó el regreso del almuerzo pasada la medianoche, la entrada sin sede de esa noche toma esa sede', () => {
    const entraDeNoche = { fecha: medianoche(7), entrada: bog(7, 22), sedeId: null, sedeSalidaId: null };
    const regresaDelAlmuerzo = { fecha: medianoche(7), entrada: bog(8, 0, 30), sedeId: 'norte', sedeSalidaId: null };
    expect(lugares([entraDeNoche, regresaDelAlmuerzo])).toEqual(['norte (por defecto)', 'norte']);
  });
});

describe('dónde se abrió cada fila · las reglas compitiendo', () => {
  it('a) le gana a b): la salida de la misma fila pesa más que la mañana en otra sede', () => {
    expect(lugares([marca(7, 8, 'norte'), marca(7, 13, null, 'sur')])).toEqual(['norte', 'sur (por defecto)']);
  });

  it('b) le gana a c): la mañana en Norte pesa más que su sede por defecto', () => {
    expect(lugares([marca(7, 8, 'norte'), marca(7, 13)], presencial('sur'))).toEqual(['norte', 'norte (por defecto)']);
  });

  it('a) le gana a c)', () => {
    expect(lugares([marca(7, 8, null, 'norte')], presencial('sur'))).toEqual(['norte (por defecto)']);
  });
});

describe('dónde se abrió cada fila · híbrido y remoto', () => {
  it.each(['HIBRIDO', 'REMOTO'])('a un %s no se le atribuye nada: su entrada sin sede sigue sin sede', modalidad => {
    const persona = { modalidad, sedePorDefecto: 'principal' };
    expect(lugares([marca(7, 7, 'norte'), marca(7, 13), marca(7, 17, null, 'sur')], persona)).toEqual(['norte', 'sin sede', 'sin sede']);
  });
});

describe('dónde se abrió cada fila · lo que no es una marcación', () => {
  it('una fila sin hora de entrada no recibe sede, ni siquiera la de su salida', () => {
    expect(lugares([marca(7, null), marca(8, null, null, 'sur')])).toEqual(['sin sede', 'sin sede']);
  });
});

describe('dónde se abrió cada fila · las marcas de antes de las sedes', () => {
  it('una marca vieja, con entrada, sin sede y sin método, cuenta en la sede por defecto de HOY', () => {
    // No se completan en la base. Se muestran con la sede de hoy, y si la persona
    // cambia de sede pasan a contar en la nueva: la contra que aceptó el dueño.
    const vieja = { fecha: new Date(Date.UTC(2026, 5, 15, 5)), entrada: new Date(Date.UTC(2026, 5, 15, 13)), sedeId: null, sedeSalidaId: null, metodoEntrada: null };
    expect(lugares([vieja], presencial('norte'))).toEqual(['norte (por defecto)']);
    expect(lugares([vieja], presencial('sur'))).toEqual(['sur (por defecto)']);
  });
});
