import { describe, it, expect } from 'vitest';
import { detalleDeJornada } from './detalleDeJornada';
import type { JornadaDelDia } from './detalleDeJornada';

// CÓMO SE LE CUENTAN A UNA PERSONA LAS REGLAS DE SU DÍA (22 de septiembre de 2026).
//
// Pedido del dueño: «nos hace falta más info, similar a como tenemos en la creación de horario:
// las tolerancias, cómo se maneja el almuerzo, descansos no remunerados».
//
// POR QUÉ ES UNA DECISIÓN Y NO PLANTILLA: los números crudos mienten por omisión. Una tolerancia
// de cero NO se escribe «0 minutos», que se lee como un dato de relleno; se escribe «sin
// tolerancia», que es lo que de verdad le pasa a quien llega un minuto tarde. Un almuerzo sin
// ventana no puede inventarse una. Y «1 descansos» delata que nadie pensó en el caso de uno.
//
// Cada línea es {etiqueta, valor, nota?}. La nota es OPCIONAL a propósito: aparece solo cuando
// dice algo que el valor no dice, nunca para rellenar.

const base: JornadaDelDia = {
  horaEntrada: '08:00',
  horaSalida: '16:00',
  minutosEsperados: 420, // ocho horas menos la hora de almuerzo
  toleranciaMin: 10,
  toleranciaSalidaMin: 0,
  ajustaEntrada: false,
  almuerzoMin: 60,
  almuerzoInicio: '12:00',
  almuerzoFin: '13:00',
  descansos: [],
};

const con = (cambios: Partial<JornadaDelDia>): JornadaDelDia => ({ ...base, ...cambios });
const linea = (j: JornadaDelDia, etiqueta: string) =>
  detalleDeJornada(j).find(l => l.etiqueta === etiqueta);

describe('detalleDeJornada', () => {
  it('un día sin horas no tiene reglas que mostrar', () => {
    // El día que el horario no programa. Las demás columnas traen valores igual, así que devolver
    // la lista vacía tiene que salir de las horas y no de que no haya datos.
    expect(detalleDeJornada(con({ horaEntrada: null, horaSalida: null }))).toEqual([]);
  });

  it('abre con la jornada, y las horas esperadas ya vienen sin el almuerzo', () => {
    const l = detalleDeJornada(base)[0];
    expect(l.etiqueta).toBe('Jornada');
    expect(l.valor).toBe('08:00 a 16:00');
    expect(l.nota).toContain('7 h');
  });

  it('la tolerancia de entrada se dice en minutos', () => {
    expect(linea(base, 'Tolerancia de entrada')?.valor).toBe('10 minutos');
  });

  it('una tolerancia de cero dice «sin tolerancia», no «0 minutos»', () => {
    // El caso que hace falta escribir aparte: cero no es un número más, es que no hay margen.
    expect(linea(con({ toleranciaMin: 0 }), 'Tolerancia de entrada')?.valor).toBe('Sin tolerancia');
  });

  it('avisa cuando la tolerancia vale también para llegar antes', () => {
    const l = linea(con({ ajustaEntrada: true }), 'Tolerancia de entrada');
    expect(l?.nota).toContain('antes');
  });

  it('y NO lo avisa cuando no vale', () => {
    // Sin esto, una nota escrita fija pasaría la prueba de arriba diciendo algo falso.
    expect(linea(base, 'Tolerancia de entrada')?.nota).toBeUndefined();
  });

  it('la tolerancia de salida es su propia línea y explica qué hace', () => {
    const l = linea(con({ toleranciaSalidaMin: 15 }), 'Tolerancia de salida');
    expect(l?.valor).toBe('15 minutos');
    expect(l?.nota).toContain('extra');
  });

  it('el almuerzo nombra su ventana cuando la tiene', () => {
    const l = linea(base, 'Almuerzo');
    expect(l?.valor).toBe('60 minutos');
    expect(l?.nota).toBe('Entre 12:00 y 13:00.');
  });

  it('un almuerzo sin ventana no se inventa una', () => {
    const l = linea(con({ almuerzoInicio: null, almuerzoFin: null }), 'Almuerzo');
    expect(l?.valor).toBe('60 minutos');
    expect(l?.nota).toBeUndefined();
  });

  it('un almuerzo de cero dice que no se descuenta', () => {
    // Es la diferencia entre trabajar ocho horas y trabajar siete. No se puede leer como un cero
    // cualquiera.
    expect(linea(con({ almuerzoMin: 0 }), 'Almuerzo')?.valor).toBe('No se descuenta');
  });

  it('sin descansos no remunerados lo dice, en vez de callarse', () => {
    const l = linea(base, 'Descansos no remunerados');
    expect(l?.valor).toBe('Ninguno');
    expect(l?.nota).toBeUndefined();
  });

  it('un descanso va en singular', () => {
    const l = linea(con({ descansos: [{ inicio: '10:00', fin: '10:15' }] }), 'Descansos no remunerados');
    expect(l?.valor).toBe('1 descanso');
    expect(l?.nota).toBe('10:00 a 10:15');
  });

  it('dos van en plural y con sus horas', () => {
    const l = linea(con({
      descansos: [{ inicio: '10:00', fin: '10:15' }, { inicio: '15:00', fin: '15:15' }],
    }), 'Descansos no remunerados');
    expect(l?.valor).toBe('2 descansos');
    expect(l?.nota).toBe('10:00 a 10:15, 15:00 a 15:15');
  });
});
