import { describe, it, expect } from 'vitest';
import { limpiarPlantilla, COLORES_DE_PLANTILLA, COLOR_POR_DEFECTO } from './cuerpoDePlantilla';
import { franjasConVentanaImposible, mensajeVentanasImposibles } from './ventanasDeHorario';

// El cuerpo de una plantilla de turno que manda la pantalla del catálogo, antes de pasárselo a Prisma
// (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Una plantilla es una FRANJA SIN DÍAS: los días se los pone el planificador al pintar el calendario,
// no la plantilla. Por eso todo lo que ya sabe revisar `ventanasDeHorario` (el almuerzo, los tres
// descansos, los cruces, la forma canónica que se guarda) se reusa tal cual, y aquí solo vive lo que
// es nuevo de verdad: el nombre, el color y la regla de que un descanso no lleva horas.
//
// Se manda ENTERA en cada guardado, sin distinguir crear de editar. `esDescanso` y las horas están
// acopladas —un descanso con horas es una contradicción, no un cambio parcial— y las franjas del
// horario ya se reemplazan completas por esta misma razón (routes/horarios.ts).

// Lo que manda la pantalla del catálogo al guardar un turno de mañana.
const MANANA = {
  nombre: 'Mañana',
  color: 'ambar',
  esDescanso: false,
  sedeId: null,
  horaEntrada: '06:00',
  horaSalida: '14:00',
  tieneAlmuerzo: true,
  almuerzoInicio: '10:00',
  almuerzoFin: '10:30',
  descansos: [{ inicio: '08:00', fin: '08:15' }],
};

// Lo que se guarda de ese turno: los descansos ya en su forma canónica, que es texto y no arreglo.
const MANANA_GUARDADA = {
  nombre: 'Mañana',
  color: 'ambar',
  esDescanso: false,
  sedeId: null,
  horaEntrada: '06:00',
  horaSalida: '14:00',
  tieneAlmuerzo: true,
  almuerzoInicio: '10:00',
  almuerzoFin: '10:30',
  descansos: '[{"inicio":"08:00","fin":"08:15"}]',
  // Las tres sobrescrituras de tolerancia, VACÍAS porque `MANANA` no las manda: este turno hereda
  // la política de quien lo tenga puesto (23 de septiembre de 2026).
  toleranciaMin: null,
  toleranciaSalidaMin: null,
  ajustaEntrada: null,
};

// LAS TOLERANCIAS DEL TURNO (23 de septiembre de 2026). Cambian la regla anterior: hasta hoy la
// tolerancia era solo del horario y el turno no podía tocarla.
//
// VACÍO significa «la del horario», y por eso no mandar el campo tiene que dar `null` y no un cero:
// un cero es «sin tolerancia», que es lo contrario de heredar.
//
// Y un valor MANDADO pero basura se RECHAZA, no se cae a vacío. Caer a vacío escondería un error
// del cliente detrás de un comportamiento plausible, y esto decide si a alguien le cuentan una
// tardanza. El color sí cae a un valor por defecto, pero el color no mueve dinero.
describe('limpiarPlantilla: las tolerancias que sobrescriben al horario', () => {
  const con = (extra: Record<string, unknown>) => limpiarPlantilla({ ...MANANA, ...extra });

  it('si no se mandan, se guardan vacías: el turno hereda', () => {
    const r = con({});
    expect(r.ok && r.datos.toleranciaMin).toBeNull();
    expect(r.ok && r.datos.toleranciaSalidaMin).toBeNull();
    expect(r.ok && r.datos.ajustaEntrada).toBeNull();
  });

  it('se guardan los valores que se manden', () => {
    const r = con({ toleranciaMin: 3, toleranciaSalidaMin: 20, ajustaEntrada: true });
    expect(r.ok && r.datos.toleranciaMin).toBe(3);
    expect(r.ok && r.datos.toleranciaSalidaMin).toBe(20);
    expect(r.ok && r.datos.ajustaEntrada).toBe(true);
  });

  it('CERO se guarda como cero, no como vacío', () => {
    // «Sin tolerancia» y «la que diga el horario» son cosas distintas y no pueden guardarse igual.
    const r = con({ toleranciaMin: 0 });
    expect(r.ok && r.datos.toleranciaMin).toBe(0);
    expect(r.ok && r.datos.toleranciaMin).not.toBeNull();
  });

  it('`ajustaEntrada` en false se guarda como false, no como vacío', () => {
    const r = con({ ajustaEntrada: false });
    expect(r.ok && r.datos.ajustaEntrada).toBe(false);
  });

  it('una tolerancia negativa se rechaza', () => {
    expect(con({ toleranciaMin: -5 }))
      .toEqual({ ok: false, motivo: 'La tolerancia de entrada tiene que ser un número de minutos entre 0 y 240.' });
  });

  it('una tolerancia que no es un número entero se rechaza', () => {
    // Mandada y basura: se rechaza en vez de caer a vacío, que dejaría al turno heredando sin que
    // nadie se enterara de que el cliente mandó cualquier cosa.
    expect(con({ toleranciaSalidaMin: 'diez' }).ok).toBe(false);
    expect(con({ toleranciaMin: 7.5 }).ok).toBe(false);
  });

  it('una tolerancia absurda se rechaza', () => {
    // Cuatro horas de gracia ya no es una tolerancia, es otro horario.
    expect(con({ toleranciaSalidaMin: 241 }).ok).toBe(false);
    expect(con({ toleranciaSalidaMin: 240 }).ok).toBe(true);
  });

  it('un día de DESCANSO también guarda sus tolerancias', () => {
    // La rama del descanso sale antes y hay que acordarse de llevarlas: `diaDesdePlantilla` copia
    // la política también en un día libre.
    const r = limpiarPlantilla({ nombre: 'Libre', esDescanso: true, toleranciaMin: 3 });
    expect(r.ok && r.datos.esDescanso).toBe(true);
    expect(r.ok && r.datos.toleranciaMin).toBe(3);
  });
});

describe('limpiarPlantilla: el turno de trabajo', () => {
  it('lo que manda la pantalla se guarda, con los descansos en su forma canónica', () => {
    expect(limpiarPlantilla(MANANA)).toEqual({ ok: true, datos: MANANA_GUARDADA });
  });

  it('sin nombre, o con el nombre en blanco, dice que falta', () => {
    const { nombre: _n, ...sinNombre } = MANANA;
    expect(limpiarPlantilla(sinNombre)).toEqual({ ok: false, motivo: 'Falta el nombre de la plantilla.' });
    expect(limpiarPlantilla({ ...MANANA, nombre: '   ' })).toEqual({ ok: false, motivo: 'Falta el nombre de la plantilla.' });
  });

  it('el nombre se guarda recortado', () => {
    expect(limpiarPlantilla({ ...MANANA, nombre: '  Mañana  ' })).toEqual({ ok: true, datos: MANANA_GUARDADA });
  });

  // ENCONTRADO PROBÁNDOLO CONTRA LA BASE el 19 de septiembre de 2026, el mismo día que se escribió:
  // un nombre de 192 caracteres pasaba esta función y reventaba en MySQL con P2000, «the provided
  // value is too long for the column's type». La ruta no envuelve el `create`, así que eso sale como
  // un 500 con el mensaje interno de Prisma, que trae la ruta del archivo en el servidor.
  //
  // Es EXACTAMENTE el defecto que ya estaba corregido y documentado en `cuerpoDePermiso.ts`, y se
  // repitió aquí. El tope es el de la columna, `varchar(191)`, y recortar en silencio no es opción:
  // el administrador creería que guardó el nombre que escribió.
  it('un nombre que no cabe en la columna se rechaza, no revienta en la base', () => {
    expect(limpiarPlantilla({ ...MANANA, nombre: 'A'.repeat(192) }))
      .toEqual({ ok: false, motivo: 'El nombre del turno es demasiado largo: máximo 191 caracteres.' });
  });

  it('justo en el límite de la columna sí pasa', () => {
    const limite = 'A'.repeat(191);
    const limpia = limpiarPlantilla({ ...MANANA, nombre: limite });
    expect(limpia.ok && limpia.datos.nombre).toBe(limite);
  });

  // El tope se mide sobre el nombre YA RECORTADO: con los espacios adentro, un nombre de 191 con
  // espacios alrededor se rechazaría por algo que no se iba a guardar.
  it('los espacios de los extremos no cuentan para el tope', () => {
    const limpia = limpiarPlantilla({ ...MANANA, nombre: '  ' + 'A'.repeat(191) + '  ' });
    expect(limpia.ok).toBe(true);
  });

  it('un turno de trabajo sin horas no se puede planificar', () => {
    const { horaEntrada: _e, horaSalida: _s, ...sinHoras } = MANANA;
    expect(limpiarPlantilla(sinHoras)).toEqual({ ok: false, motivo: 'Un turno de trabajo necesita hora de entrada y de salida.' });
  });

  // La regla de la hora es UNA sola y vive en `horaValida` (CLAUDE.md §9.3). Una regex propia aquí
  // dejaría pasar «99:99», que es exactamente lo que pasó en la ruta de horarios el 12 de septiembre.
  it('«99:99» y «24:00» tienen la forma de una hora pero no son horas', () => {
    expect(limpiarPlantilla({ ...MANANA, horaEntrada: '99:99' })).toEqual({ ok: false, motivo: 'La hora de entrada no es válida.' });
    expect(limpiarPlantilla({ ...MANANA, horaSalida: '24:00' })).toEqual({ ok: false, motivo: 'La hora de salida no es válida.' });
  });

  // Mismo criterio que `leerVentana` en descansos.ts: inicio igual a fin no es un tramo de cero,
  // es uno de veinticuatro horas.
  it('la entrada y la salida no pueden ser la misma hora', () => {
    expect(limpiarPlantilla({ ...MANANA, horaEntrada: '06:00', horaSalida: '06:00' }))
      .toEqual({ ok: false, motivo: 'La entrada y la salida no pueden ser la misma hora.' });
  });

  it('un turno nocturno que cruza la medianoche es legítimo', () => {
    const noche = { ...MANANA, nombre: 'Noche', horaEntrada: '22:00', horaSalida: '06:00', almuerzoInicio: '02:00', almuerzoFin: '02:30', descansos: [] };
    expect(limpiarPlantilla(noche).ok).toBe(true);
  });

  it('sin ventanas las guarda vacías, con NULL y nunca []', () => {
    const pelado = { nombre: 'Turno', esDescanso: false, horaEntrada: '08:00', horaSalida: '17:00' };
    expect(limpiarPlantilla(pelado)).toEqual({
      ok: true,
      datos: {
        nombre: 'Turno', color: COLOR_POR_DEFECTO, esDescanso: false, sedeId: null,
        horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true,
        almuerzoInicio: null, almuerzoFin: null, descansos: null,
        // Vacías: este cuerpo pelado no manda tolerancias, así que el turno hereda las del horario.
        toleranciaMin: null, toleranciaSalidaMin: null, ajustaEntrada: null,
      },
    });
  });

  // El orden es el de la jornada contada desde la entrada, no el del reloj: en un turno de 22:00 el
  // descanso de las 23:30 va antes que el de las 02:00. Es la misma regla de `franjaParaGuardar`.
  it('en un nocturno, los descansos se ordenan desde la entrada y no por el reloj', () => {
    const noche = {
      nombre: 'Noche', esDescanso: false, horaEntrada: '22:00', horaSalida: '06:00',
      descansos: [{ inicio: '02:00', fin: '02:15' }, { inicio: '23:30', fin: '23:40' }],
    };
    const limpia = limpiarPlantilla(noche);
    expect(limpia.ok && limpia.datos.descansos).toBe('[{"inicio":"23:30","fin":"23:40"},{"inicio":"02:00","fin":"02:15"}]');
  });

  // El motivo no se redacta aquí: es el mismo que ya produce la ruta de horarios para la misma falla,
  // o el administrador leería dos explicaciones distintas del mismo error.
  it('una ventana que no cabe en el turno se rechaza con el motivo de ventanasDeHorario', () => {
    const invertido = { ...MANANA, almuerzoInicio: '13:00', almuerzoFin: '12:00' };
    const esperado = mensajeVentanasImposibles(franjasConVentanaImposible([{
      horaEntrada: '06:00', horaSalida: '14:00', almuerzoInicio: '13:00', almuerzoFin: '12:00',
      descansos: MANANA.descansos,
    }]));
    expect(limpiarPlantilla(invertido)).toEqual({ ok: false, motivo: esperado });
  });

  it('cuatro descansos son uno más del máximo, y no pasa', () => {
    const cuatro = {
      ...MANANA, almuerzoInicio: null, almuerzoFin: null,
      descansos: [
        { inicio: '07:00', fin: '07:10' }, { inicio: '08:00', fin: '08:10' },
        { inicio: '09:00', fin: '09:10' }, { inicio: '10:00', fin: '10:10' },
      ],
    };
    expect(limpiarPlantilla(cuatro).ok).toBe(false);
  });
});

describe('limpiarPlantilla: el descanso', () => {
  const DESCANSO = { nombre: 'Descanso', color: 'grafito', esDescanso: true };

  it('un descanso no necesita horas', () => {
    expect(limpiarPlantilla(DESCANSO)).toEqual({
      ok: true,
      datos: {
        nombre: 'Descanso', color: 'grafito', esDescanso: true, sedeId: null,
        horaEntrada: null, horaSalida: null, tieneAlmuerzo: false,
        almuerzoInicio: null, almuerzoFin: null, descansos: null,
        // Un descanso también las lleva, aunque vacías: la rama del descanso sale antes y tiene que
        // acordarse de copiarlas, porque `diaDesdePlantilla` copia la política también en un día libre.
        toleranciaMin: null, toleranciaSalidaMin: null, ajustaEntrada: null,
      },
    });
  });

  // Un día de descanso con horario es una contradicción, y guardar las horas dejaría una plantilla que
  // el planificador pintaría como libre mientras el kiosco le exigiría entrada. Se vacían, no se
  // rechazan: la pantalla oculta las horas al marcar «descanso», así que llegar con ellas es residuo
  // de lo que el administrador había escrito antes de cambiar de idea.
  it('si llegan horas en un descanso, se vacían', () => {
    const conHoras = { ...DESCANSO, horaEntrada: '08:00', horaSalida: '17:00', almuerzoInicio: '12:00', almuerzoFin: '13:00', descansos: [{ inicio: '09:00', fin: '09:15' }] };
    const limpia = limpiarPlantilla(conHoras);
    expect(limpia.ok && [limpia.datos.horaEntrada, limpia.datos.horaSalida, limpia.datos.almuerzoInicio, limpia.datos.descansos])
      .toEqual([null, null, null, null]);
  });

  it('un descanso con horas imposibles tampoco falla: no se miran', () => {
    expect(limpiarPlantilla({ ...DESCANSO, horaEntrada: '99:99', almuerzoInicio: '13:00', almuerzoFin: '12:00' }).ok).toBe(true);
  });

  it('el descanso también necesita nombre', () => {
    expect(limpiarPlantilla({ esDescanso: true })).toEqual({ ok: false, motivo: 'Falta el nombre de la plantilla.' });
  });
});

describe('limpiarPlantilla: el color y la sede', () => {
  // La paleta es cerrada a propósito: el color se pinta en una celda de la rejilla del planificador con
  // texto encima, así que tiene que garantizar contraste. Y se guarda la CLAVE y no el hex, para poder
  // retocar la paleta sin migrar datos.
  it('los ocho colores de la paleta pasan', () => {
    for (const color of COLORES_DE_PLANTILLA) {
      const limpia = limpiarPlantilla({ ...MANANA, color });
      expect(limpia.ok && limpia.datos.color).toBe(color);
    }
  });

  // Cae al color por defecto en vez de rechazar: el color no configura nada, y el administrador ve el
  // resultado en la celda al instante. No es un descarte silencioso.
  it('un color que no existe cae al de por defecto', () => {
    expect(limpiarPlantilla({ ...MANANA, color: '#ff0000' })).toEqual({ ok: true, datos: { ...MANANA_GUARDADA, color: COLOR_POR_DEFECTO } });
    expect(limpiarPlantilla({ ...MANANA, color: 7 })).toEqual({ ok: true, datos: { ...MANANA_GUARDADA, color: COLOR_POR_DEFECTO } });
  });

  it('la sede vacía se guarda como null, y la que llega se conserva', () => {
    expect(limpiarPlantilla({ ...MANANA, sedeId: '' })).toEqual({ ok: true, datos: MANANA_GUARDADA });
    const conSede = limpiarPlantilla({ ...MANANA, sedeId: 's1' });
    expect(conSede.ok && conSede.datos.sedeId).toBe('s1');
  });
});

describe('limpiarPlantilla: lo que no es un cuerpo', () => {
  it('un cuerpo vacío dice que falta el nombre, y no revienta', () => {
    expect(limpiarPlantilla({})).toEqual({ ok: false, motivo: 'Falta el nombre de la plantilla.' });
  });

  it('un nombre que no es texto no es un nombre', () => {
    expect(limpiarPlantilla({ nombre: 42 })).toEqual({ ok: false, motivo: 'Falta el nombre de la plantilla.' });
  });

  // `esDescanso` sin declarar es un turno de trabajo: es lo que crea el administrador el 99% de las
  // veces, y exigirle la casilla apagada sería pedirle que declare lo normal.
  it('sin declarar esDescanso, es un turno de trabajo', () => {
    const { esDescanso: _d, ...sinDeclarar } = MANANA;
    const limpia = limpiarPlantilla(sinDeclarar);
    expect(limpia.ok && limpia.datos.esDescanso).toBe(false);
  });

  it('descansos que no son una lista se rechazan, no se ignoran', () => {
    expect(limpiarPlantilla({ ...MANANA, descansos: 'un rato' }).ok).toBe(false);
  });
});
