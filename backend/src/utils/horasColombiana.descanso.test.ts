import { describe, it, expect } from 'vitest';
import { calcularHorasTrabajadas, type TipoHoraCalculo } from './horasColombiana';

// EL MOTOR DEJA DE DAR POR HECHO QUE EL DESCANSO ES EL DOMINGO (20 de septiembre de 2026).
//
// Hasta hoy la línea 136 decía `const esDomingo = diaSemana === 'DOMINGO'`. Eso acertaba por una
// razón frágil: nadie podía registrar otro día, así que la presunción legal se cumplía sola. Medido
// en producción: 22 horarios activos incluyen el domingo, y en 10 de ellos se trabajan los SIETE
// días (26 personas).
//
// El día llega como MAPA POR FECHA, no como una regla de hoy. Es el mismo patrón que ya usa
// `ExtraConfig.franjaPorFecha`, y por la misma razón: lo que decide plata sale del día CONGELADO.
// Si saliera de la configuración actual, cambiar el descanso de alguien reescribiría meses ya
// liquidados.
//
// LA PROPIEDAD QUE HACE SEGURO ESTE CAMBIO, y es la primera prueba de abajo: sin configuración, el
// resultado es IDÉNTICO al de hoy. Los cientos de llamadas que no pasan el parámetro nuevo no
// cambian ni un minuto.

const TIPOS = [
  { codigo: 'HOD', nombre: 'Hora Ordinaria Diurna', horaInicio: 6, horaFin: 21, recargo: 1.0 },
  { codigo: 'HON', nombre: 'Hora Ordinaria Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.35 },
  { codigo: 'HED', nombre: 'Hora Extra Diurna', horaInicio: 6, horaFin: 21, recargo: 1.25 },
  { codigo: 'HEN', nombre: 'Hora Extra Nocturna', horaInicio: 6, horaFin: 21, recargo: 1.75 },
  { codigo: 'HDD', nombre: 'Hora Dominical/Festiva Diurna', horaInicio: 6, horaFin: 21, recargo: 1.9 },
  { codigo: 'HND', nombre: 'Hora Dominical/Festiva Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.25 },
  { codigo: 'HEDD', nombre: 'Extra Dominical Diurna', horaInicio: 6, horaFin: 21, recargo: 2.15 },
  { codigo: 'HEND', nombre: 'Extra Dominical Nocturna', horaInicio: 6, horaFin: 21, recargo: 2.65 },
];

const bog = (fecha: string, hora: number, min = 0) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora + 5, min, 0));
};
const minutosDe = (r: TipoHoraCalculo[], codigo: string) => r.find(t => t.codigo === codigo)?.minutos ?? 0;

// 5 de julio de 2026 es domingo; el 6 lunes, el 7 martes y el 8 miércoles.
const DOMINGO = '2026-07-05';
const MARTES = '2026-07-07';
const MIERCOLES = '2026-07-08';

describe('sin configuración: nada cambia', () => {
  it('un domingo sigue siendo dominical y sigue sin contar para las 42', () => {
    const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog(DOMINGO, 8), bog(DOMINGO, 16), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
    expect(minutosDe(resultado, 'HOD')).toBe(0);
    expect(minutosOrdinariosTrabajados).toBe(0);
  });

  it('un miércoles sigue siendo ordinario', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog(MIERCOLES, 8), bog(MIERCOLES, 16), [], TIPOS, 42,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(480);
    expect(minutosDe(resultado, 'HDD')).toBe(0);
  });
});

// QUIEN LIBRA EL MIÉRCOLES SEGÚN SU HORARIO (30 de septiembre de 2026). Antes este bloque decía
// «pactado en miércoles» y el dato venía de una declaración por persona con acuerdo escrito. Esas
// columnas se borraron: el día lo dicen las FRANJAS del horario, que es la regla del dueño. Lo que el
// motor hace con el dato no cambió ni un minuto; solo cambió de dónde sale.
describe('con un horario que libra el miércoles', () => {
  const DESCANSA_MIERCOLES = {
    fuente: {
      de: 'HORARIO' as const,
      diasQueTrabaja: ['LUNES', 'MARTES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
    },
  };

  // ESTE es el caso que hoy se cobra mal. Para esta persona el domingo es un día ordinario.
  it('el domingo pasa a ser ordinario, sin recargo', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog(DOMINGO, 8), bog(DOMINGO, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' }, DESCANSA_MIERCOLES,
    );
    expect(minutosDe(resultado, 'HOD')).toBe(480);
    expect(minutosDe(resultado, 'HDD')).toBe(0);
  });

  // EL EFECTO DE SEGUNDO ORDEN, y el que más fácil se olvida: si el domingo es ordinario, sus horas
  // cuentan para el tope semanal. Arreglar el recargo sin esto movería cuándo empiezan las extras.
  it('y esas horas SÍ cuentan para el tope de las 42', () => {
    const { minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog(DOMINGO, 8), bog(DOMINGO, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' }, DESCANSA_MIERCOLES,
    );
    expect(minutosOrdinariosTrabajados).toBe(480);
  });

  it('el miércoles pasa a ser su descanso: lleva recargo y no cuenta para las 42', () => {
    const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog(MIERCOLES, 8), bog(MIERCOLES, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' }, DESCANSA_MIERCOLES,
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
    expect(minutosDe(resultado, 'HOD')).toBe(0);
    expect(minutosOrdinariosTrabajados).toBe(0);
  });

  // El festivo es otro concepto y no depende de quién descansa cuándo. Un martes festivo se paga
  // igual aunque el martes no sea el descanso de nadie.
  it('un festivo sigue siendo festivo, aunque no sea su descanso', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog(MARTES, 8), bog(MARTES, 16), [bog(MARTES, 0)], TIPOS, 42, 0, { modo: 'SEMANAL' }, DESCANSA_MIERCOLES,
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
  });
});

describe('lo congelado manda sobre lo declarado hoy', () => {
  // La razón de ser del mapa por fecha: si alguien cambia su día de descanso mañana, los meses ya
  // liquidados no se pueden mover. Lo que valga para una fecha lo dice la fila congelada de ESE día.
  it('una fecha congelada como descanso gana aunque hoy esté declarado otro día', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog(MARTES, 8), bog(MARTES, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' },
      { porFecha: { [MARTES]: true }, estado: { tipo: 'FIJO', dia: 'MIERCOLES' } },
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
  });

  it('y una fecha congelada como día de trabajo gana aunque sea domingo', () => {
    const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
      bog(DOMINGO, 8), bog(DOMINGO, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' },
      { porFecha: { [DOMINGO]: false }, estado: { tipo: 'PRESUMIDO' } },
    );
    expect(minutosDe(resultado, 'HOD')).toBe(480);
    expect(minutosOrdinariosTrabajados).toBe(480);
  });
});

describe('rotativo sin semana planificada', () => {
  // LA GUARDA, ahora de punta a punta por el motor: que nadie haya pintado el calendario no puede
  // dejar a una persona sin descanso obligatorio. Vuelve el domingo.
  it('el domingo sigue llevando recargo', () => {
    const { resultado } = calcularHorasTrabajadas(
      bog(DOMINGO, 8), bog(DOMINGO, 16), [], TIPOS, 42, 0, { modo: 'SEMANAL' },
      { estado: { tipo: 'ROTATIVO' } },
    );
    expect(minutosDe(resultado, 'HDD')).toBe(480);
  });
});
