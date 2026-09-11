import { describe, it, expect } from 'vitest';
import { calcularTardanzas, franjaDelDia, minutosDe, construirExtraConfig, salidaAntesDeHora, ventanaDeSalidaTemprana, ventanaDeLlegadaTarde, llegadaTarde } from './tardanzas';
import { calcularDiasEsperados } from './diasEsperados';
import { rangoReporte } from './fechas';

const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};

const HORARIO: any = {
  activo: true,
  toleranciaMin: 3,
  almuerzoMin: 0,
  franjas: [
    { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '16:00', tieneAlmuerzo: true },
    { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false },
  ],
};

const reg = (fecha: string, hora: number, min = 0): any => ({
  id: `r-${fecha}-${hora}-${min}`,
  fecha: bog(fecha, 0),
  entrada: bog(fecha, hora, min),
  salida: bog(fecha, 16),
});

// `calcularTardanzas` ya no recorre el horario: lee los días materializados. Se
// generan al vuelo con el horario de arriba, que es lo que hace el generador en
// producción, así las pruebas de siempre siguen midiendo lo mismo.
const JULIO = rangoReporte('2026-07-01', '2026-07-31');
const diasDe = (horario: any = HORARIO) => calcularDiasEsperados(JULIO.desdeF, JULIO.finExclusivo, horario);

const tardanzas = (registros: any[], opts: { festivos?: any[]; permisos?: any[]; horario?: any; dias?: any[] } = {}) =>
  calcularTardanzas(
    registros,
    opts.dias ?? diasDe(opts.horario ?? HORARIO),
    opts.festivos ?? [], opts.permisos ?? [],
  );

describe('minutosDe', () => {
  it('convierte HH:MM a minutos del día', () => {
    expect(minutosDe('08:00')).toBe(480);
    expect(minutosDe('00:30')).toBe(30);
  });
});

describe('franjaDelDia', () => {
  it('encuentra la franja del día de la semana', () => {
    expect(franjaDelDia(HORARIO, 'SABADO')!.horaSalida).toBe('12:00');
    expect(franjaDelDia(HORARIO, 'MIERCOLES')!.horaSalida).toBe('16:00');
  });
  it('devuelve null en un día que no se trabaja', () => {
    expect(franjaDelDia(HORARIO, 'DOMINGO')).toBeNull();
  });
});

describe('calcularTardanzas', () => {
  it('llegar dentro de la tolerancia no cuenta como tarde', () => {
    // 6 de julio de 2026 es lunes. Entrada 08:00, tolerancia 3 min.
    const r = tardanzas([reg('2026-07-06', 8, 3)]);
    expect(r.diasTarde).toBe(0);
  });

  it('descuenta la tolerancia de los minutos reportados', () => {
    // Llega 08:25 → 25 min reales, menos 3 de tolerancia = 22 reportados.
    const r = tardanzas([reg('2026-07-06', 8, 25)]);
    expect(r.diasTarde).toBe(1);
    expect(r.detalle[0].minutosTarde).toBe(22);
    expect(r.detalle[0].horaLlegada).toBe('08:25');
    expect(r.detalle[0].horaEsperada).toBe('08:00');
  });

  it('suma los minutos de varios días', () => {
    const r = tardanzas([reg('2026-07-06', 8, 25), reg('2026-07-13', 8, 40)]);
    expect(r.diasTarde).toBe(2);
    expect(r.totalMinutos).toBe(22 + 37);
  });

  it('usa la primera entrada del día, no la última', () => {
    const r = tardanzas([reg('2026-07-06', 14), reg('2026-07-06', 8, 25)]);
    expect(r.detalle[0].horaLlegada).toBe('08:25');
  });

  it('no cuenta un día que no está en el horario', () => {
    // 5 de julio de 2026 es domingo y el horario no lo cubre.
    expect(tardanzas([reg('2026-07-05', 10)]).diasTarde).toBe(0);
  });

  it('no cuenta los festivos', () => {
    const festivo = { fecha: bog('2026-07-06', 0) } as any;
    expect(tardanzas([reg('2026-07-06', 10)], { festivos: [festivo] }).diasTarde).toBe(0);
  });

  it('un día cubierto por una novedad no cuenta como tardanza', () => {
    const permiso = { fechaInicio: bog('2026-07-06', 0), fechaFin: bog('2026-07-06', 0) };
    expect(tardanzas([reg('2026-07-06', 10)], { permisos: [permiso] }).diasTarde).toBe(0);
  });

  it('respeta la franja propia del sábado', () => {
    // 11 de julio de 2026 es sábado: entrada 08:00 igual que entre semana.
    const r = tardanzas([reg('2026-07-11', 8, 30)]);
    expect(r.detalle[0].minutosTarde).toBe(27);
  });

  it('informa la tolerancia aplicada', () => {
    expect(tardanzas([]).toleranciaMin).toBe(3);
  });
});

// El mismo problema que en el saldo: mientras las tardanzas se calcularan contra
// el horario VIGENTE, adelantar la entrada llenaba de tardanzas los meses ya
// cerrados. Con el día materializado, lo que pasó se queda como pasó.
describe('calcularTardanzas — el pasado ya no se reescribe', () => {
  it('adelantar la entrada del horario no inventa tardanzas viejas', () => {
    const congelado = diasDe(HORARIO); // entrada 08:00
    const editado = { ...HORARIO, franjas: HORARIO.franjas.map((f: any) => ({ ...f, horaEntrada: '07:00' })) };

    // Llegó 08:00 en punto: puntual con el horario que regía ese día.
    const registros = [reg('2026-07-06', 8, 0)];

    expect(tardanzas(registros, { dias: congelado }).diasTarde).toBe(0);
    // Así se comportaba antes: el horario nuevo lo vuelve una hora tarde.
    expect(tardanzas(registros, { horario: editado }).detalle[0].minutosTarde).toBe(57);
  });

  it('la tolerancia sale del día, no del horario de hoy', () => {
    const dias = diasDe({ ...HORARIO, toleranciaMin: 30 });
    const r = tardanzas([reg('2026-07-06', 8, 40)], { dias });
    expect(r.detalle[0].minutosTarde).toBe(10); // 40 de retraso − 30 de tolerancia
    expect(r.detalle[0].toleranciaMin).toBe(30);
    expect(r.toleranciaMin).toBe(30);
  });

  it('cada fila informa la tolerancia que se le aplicó', () => {
    const r = tardanzas([reg('2026-07-06', 8, 25)]);
    expect(r.detalle[0].toleranciaMin).toBe(3);
  });

  it('un día ajustado a mano (turno rotativo) manda sobre el horario', () => {
    const dias = diasDe();
    const lunes = dias.find(d => d.fecha.toISOString().slice(0, 10) === '2026-07-06')!;
    Object.assign(lunes, { horaEntrada: '14:00', horaSalida: '22:00' });

    // Llegó a las 14:10 en un turno de tarde: 10 min tarde, no 6 horas.
    const r = tardanzas([reg('2026-07-06', 14, 10)], { dias });
    expect(r.detalle[0].horaEsperada).toBe('14:00');
    expect(r.detalle[0].minutosTarde).toBe(7); // 10 − 3 de tolerancia
  });

  it('un día sin materializar no genera tardanza', () => {
    expect(tardanzas([reg('2026-07-06', 10)], { dias: [] }).diasTarde).toBe(0);
  });

  it('sin días materializados la tolerancia informada es 0', () => {
    expect(tardanzas([], { dias: [] }).toleranciaMin).toBe(0);
  });

  it('un rango entero en fin de semana igual informa la tolerancia vigente', () => {
    // 5 de julio de 2026 es domingo: no se trabaja, pero la tolerancia existe.
    const domingo = calcularDiasEsperados(
      rangoReporte('2026-07-05', '2026-07-05').desdeF,
      rangoReporte('2026-07-05', '2026-07-05').finExclusivo,
      HORARIO,
    );
    expect(tardanzas([], { dias: domingo }).toleranciaMin).toBe(3);
  });
});

describe('construirExtraConfig', () => {
  // Días congelados: la franja que ese día EXIGÍA. Es lo que separa un reporte
  // de julio de lo que el horario diga hoy.
  const dia = (fecha: string, entrada: string | null, salida: string | null, tol = 3) => ({
    fecha: new Date(`${fecha}T05:00:00.000Z`), // medianoche de Bogotá
    programado: !!entrada, horaEntrada: entrada, horaSalida: salida, toleranciaMin: tol,
  });

  it('en modo SEMANAL ignora el horario', () => {
    expect(construirExtraConfig('SEMANAL', HORARIO, [dia('2026-07-01', '08:00', '16:00')])).toEqual({ modo: 'SEMANAL' });
  });

  it('arma la ventana de cada FECHA, no de cada día de la semana', () => {
    // Los dos son miércoles y tienen franjas distintas: es exactamente lo que un
    // mapa por día de semana no puede representar, y por eso un cambio de
    // horario reescribía la clasificación de extras de un mes ya liquidado.
    const cfg = construirExtraConfig('HORARIO', HORARIO, [
      dia('2026-07-01', '08:00', '16:00'),
      dia('2026-08-05', '06:00', '15:00'),
      dia('2026-07-05', null, null),
    ]);
    expect(cfg.modo).toBe('HORARIO');
    expect(cfg.franjaPorFecha!['2026-07-01']).toEqual({ ini: 480, fin: 960, toleranciaMin: 3 });
    expect(cfg.franjaPorFecha!['2026-08-05']).toEqual({ ini: 360, fin: 900, toleranciaMin: 3 });
    expect(cfg.franjaPorFecha!['2026-07-05']).toBeNull();
  });

  it('la tolerancia también sale del día, no del horario de hoy', () => {
    const cfg = construirExtraConfig('HORARIO', HORARIO, [dia('2026-07-01', '08:00', '16:00', 15)]);
    expect(cfg.franjaPorFecha!['2026-07-01']!.toleranciaMin).toBe(15);
  });

  it('sin horario activo cae a SEMANAL', () => {
    const d = [dia('2026-07-01', '08:00', '16:00')];
    expect(construirExtraConfig('HORARIO', { ...HORARIO, activo: false }, d)).toEqual({ modo: 'SEMANAL' });
    expect(construirExtraConfig('HORARIO', null, d)).toEqual({ modo: 'SEMANAL' });
  });
});

// Salir antes de que termine la franja. Se pregunta ANTES de marcar, así que
// tiene que decidirse sin haber escrito nada todavía.
describe('salidaAntesDeHora', () => {
  // `ahoraBog` es lo que devuelve `toZonedTime`: una fecha cuyos getters LOCALES
  // dan la hora de pared de Bogotá. Se construye igual.
  const bog = (h: number, m = 0) => new Date(2026, 7, 5, h, m, 0);
  const dia = { horaEntrada: '08:00', horaSalida: '17:00' };
  const noche = { horaEntrada: '21:00', horaSalida: '05:00' };

  it('salir a las 16:00 de una franja que acaba a las 17:00 es temprano', () => {
    expect(salidaAntesDeHora(bog(16), dia, 0)).toBe(true);
  });

  it('salir a su hora no es temprano', () => {
    expect(salidaAntesDeHora(bog(17), dia, 0)).toBe(false);
  });

  it('quedarse de más tampoco', () => {
    expect(salidaAntesDeHora(bog(18, 30), dia, 0)).toBe(false);
  });

  it('la tolerancia perdona los últimos minutos', () => {
    expect(salidaAntesDeHora(bog(16, 55), dia, 10)).toBe(false);
    expect(salidaAntesDeHora(bog(16, 45), dia, 10)).toBe(true);
  });

  it('turno nocturno: salir a las 04:00 de un 21:00-05:00 es temprano', () => {
    // Sin normalizar la medianoche, las 04:00 parecían diecisiete horas antes de
    // las 21:00 y todo el turno de noche salía "temprano".
    expect(salidaAntesDeHora(bog(4), noche, 0)).toBe(true);
  });

  it('turno nocturno: salir a las 05:00 es su hora', () => {
    expect(salidaAntesDeHora(bog(5), noche, 0)).toBe(false);
  });

  it('turno nocturno: irse a las 22:00, recién entrado, sí es temprano', () => {
    expect(salidaAntesDeHora(bog(22), noche, 0)).toBe(true);
  });
});

// Las novedades que deja el kiosco cubren solo un tramo del día: la de una salida
// temprana, el final; la de una llegada tarde, el comienzo. Solo la segunda
// justifica la tardanza, porque es la única que cubre la hora de entrada.
describe('calcularTardanzas — novedades de parte del día', () => {
  const lunes = bog('2026-07-06', 0);

  it('irse temprano con motivo no borra la tardanza de la mañana', () => {
    const salidaTemprana = { fechaInicio: lunes, fechaFin: lunes, horaInicio: '15:00', horaFin: '16:00' };
    const r = tardanzas([reg('2026-07-06', 8, 25)], { permisos: [salidaTemprana] });
    expect(r.diasTarde).toBe(1);
    expect(r.detalle[0].minutosTarde).toBe(22);
  });

  it('con las horas vacías, como llegan de la base, sigue cubriendo el día entero', () => {
    const diaCompleto = { fechaInicio: lunes, fechaFin: lunes, horaInicio: null, horaFin: null };
    expect(tardanzas([reg('2026-07-06', 10)], { permisos: [diaCompleto] }).diasTarde).toBe(0);
  });

  it('en una novedad de varios días las horas no significan nada', () => {
    const variosDias = { fechaInicio: lunes, fechaFin: bog('2026-07-07', 0), horaInicio: '15:00', horaFin: '16:00' };
    expect(tardanzas([reg('2026-07-06', 10)], { permisos: [variosDias] }).diasTarde).toBe(0);
  });

  it('la novedad de una llegada tarde, aprobada, justifica la tardanza', () => {
    // La que deja el kiosco: desde la entrada de su franja hasta que llegó.
    const llegadaTarde = { fechaInicio: lunes, fechaFin: lunes, horaInicio: '08:00', horaFin: '08:25' };
    expect(tardanzas([reg('2026-07-06', 8, 25)], { permisos: [llegadaTarde] }).diasTarde).toBe(0);
  });

  it('una novedad de parte del día que acaba justo a la hora de entrada no la justifica', () => {
    const antes = { fechaInicio: lunes, fechaFin: lunes, horaInicio: '07:00', horaFin: '08:00' };
    expect(tardanzas([reg('2026-07-06', 8, 25)], { permisos: [antes] }).diasTarde).toBe(1);
  });

  it('una novedad de otro día no justifica la tardanza de este', () => {
    const martes = bog('2026-07-07', 0);
    const deOtroDia = { fechaInicio: martes, fechaFin: martes, horaInicio: null, horaFin: null };
    expect(tardanzas([reg('2026-07-06', 8, 25)], { permisos: [deOtroDia] }).diasTarde).toBe(1);
  });
});

// Lo que queda escrito en la novedad cuando alguien se va antes de hora: el
// tramo de la jornada que esa novedad excusa, y nada más.
describe('ventanaDeSalidaTemprana', () => {
  // Igual que arriba: `ahoraBog` es una fecha cuyos getters LOCALES dan la hora
  // de pared de Bogotá.
  const bog = (h: number, m = 0) => new Date(2026, 7, 5, h, m, 0);
  const dia = { horaEntrada: '08:00', horaSalida: '17:00' };

  it('va desde la hora en que se fue hasta el fin de su franja', () => {
    expect(ventanaDeSalidaTemprana(bog(15), dia)).toEqual({ horaInicio: '15:00', horaFin: '17:00' });
  });

  it('escribe la hora con dos dígitos, igual que las franjas', () => {
    expect(ventanaDeSalidaTemprana(bog(9, 5), dia).horaInicio).toBe('09:05');
  });
});

// Y cuando llega tarde: desde la hora a la que tenía que entrar hasta la hora en
// que llegó. Es el tramo que la novedad justifica si la aprueban.
describe('ventanaDeLlegadaTarde', () => {
  const bog = (h: number, m = 0) => new Date(2026, 7, 5, h, m, 0);

  it('va desde la entrada de su franja hasta la hora en que llegó, con dos dígitos', () => {
    expect(ventanaDeLlegadaTarde(bog(8, 5), { horaEntrada: '08:00' })).toEqual({ horaInicio: '08:00', horaFin: '08:05' });
  });
});

// Cuándo el kiosco pregunta el motivo de una llegada tarde. Se decide ANTES de
// escribir la entrada, así que solo puede mirar lo que ya existe.
describe('llegadaTarde', () => {
  // `ahoraBog`: hora de pared de Bogotá en los getters locales. El 6 de julio de
  // 2026 es lunes y el 5 es domingo.
  const lunes = (h: number, m = 0) => new Date(2026, 6, 6, h, m, 0);
  const domingo = (h: number, m = 0) => new Date(2026, 6, 5, h, m, 0);
  const ctx = { esPrimeraEntrada: true, vuelveDeAlmorzar: false, esFestivo: false, horario: HORARIO };

  it('la primera entrada pasada la tolerancia llega tarde, con los minutos ya sin la tolerancia', () => {
    const r = llegadaTarde(lunes(8, 25), ctx);
    expect(r?.minutos).toBe(22);
    expect(r?.franja.horaEntrada).toBe('08:00');
  });

  it('dentro de la tolerancia no es llegar tarde', () => {
    expect(llegadaTarde(lunes(8, 3), ctx)).toBeNull();
  });

  it('una entrada que no es la primera del día no es llegar tarde', () => {
    expect(llegadaTarde(lunes(14), { ...ctx, esPrimeraEntrada: false })).toBeNull();
  });

  it('volver del almuerzo no es llegar tarde, aunque sea la primera marca del día calendario', () => {
    // El turno nocturno que almuerza pasada la medianoche: el regreso es la
    // primera marca del día nuevo, y sin esta regla el kiosco le pediría motivo.
    expect(llegadaTarde(lunes(8, 25), { ...ctx, vuelveDeAlmorzar: true })).toBeNull();
  });

  it('un festivo no tiene llegada tarde', () => {
    expect(llegadaTarde(lunes(8, 25), { ...ctx, esFestivo: true })).toBeNull();
  });

  it('sin horario activo, o en un día sin franja, no hay llegada tarde', () => {
    expect(llegadaTarde(lunes(8, 25), { ...ctx, horario: { ...HORARIO, activo: false } })).toBeNull();
    expect(llegadaTarde(domingo(8, 25), ctx)).toBeNull();
  });
});
