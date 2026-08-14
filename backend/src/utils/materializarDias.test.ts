import { describe, it, expect } from 'vitest';
import { diaYaEmpezado } from './materializarDias';

// Cambiar un horario tiene que verse HOY, o el administrador cree que no guardó.
// Pero el día de hoy no es futuro: puede estar a medio consumir. La línea no es
// una fecha, es un hecho —¿esta persona ya marcó?—, porque nadie puede llegar
// tarde según una regla que no existía cuando marcó.

const bog = (h: number, m = 0, d = 14) => new Date(Date.UTC(2026, 7, d, h + 5, m, 0));
const inicioDia = bog(0, 0, 14);
const finDia = bog(0, 0, 15);

const marca = (fecha: Date, entrada: Date | null, salida: Date | null) => ({ fecha, entrada, salida });

describe('diaYaEmpezado', () => {
  it('sin marcaciones, el día está intacto', () => {
    expect(diaYaEmpezado([], inicioDia, finDia, bog(11))).toBe(false);
  });

  it('si ya marcó hoy, el día está empezado', () => {
    const m = [marca(inicioDia, bog(8), bog(12))];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(15))).toBe(true);
  });

  it('una entrada de hoy sin salida también cuenta', () => {
    const m = [marca(inicioDia, bog(8), null)];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(11))).toBe(true);
  });

  it('turno nocturno de anoche TODAVÍA abierto: el día está empezado', () => {
    // Entró ayer a las 20:00 y son las 3 de la mañana. Su turno se ancló al día
    // de ayer, pero la persona sigue dentro: regenerarle hoy le movería la
    // ventana de almuerzo a mitad de jornada.
    const m = [marca(bog(0, 0, 13), bog(20, 0, 13), null)];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(3, 0, 14))).toBe(true);
  });

  it('turno de anoche YA cerrado no bloquea el día de hoy', () => {
    // Salió a las 4 de la mañana. Ese turno cuelga del día de ayer y ya terminó;
    // el día de hoy sigue sin estrenar.
    const m = [marca(bog(0, 0, 13), bog(20, 0, 13), bog(4, 0, 14))];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(10))).toBe(false);
  });

  it('un turno abierto de hace más de 18 horas está olvidado, no en curso', () => {
    // Nadie trabaja 31 horas seguidas: eso es una salida que no se marcó, y de
    // eso se encarga el auto-cierre. No puede congelar el día de hoy para siempre.
    const m = [marca(bog(0, 0, 12), bog(20, 0, 12), null)];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(3, 0, 14))).toBe(false);
  });

  it('marcaciones de otros días cerradas no cuentan', () => {
    const m = [marca(bog(0, 0, 10), bog(8, 0, 10), bog(17, 0, 10))];
    expect(diaYaEmpezado(m, inicioDia, finDia, bog(11))).toBe(false);
  });
});
