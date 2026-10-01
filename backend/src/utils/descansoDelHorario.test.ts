import { describe, it, expect } from 'vitest';
import {
  diaDeDescansoDelHorario, esDescansoObligatorioDe, fuenteDelDescansoDe,
} from './descansoDelHorario';

// DE DÓNDE SALE EL DÍA DE DESCANSO (30 de septiembre de 2026, regla del dueño).
//
// Con sus palabras: «nosotros solo sabemos el día de descanso de un trabajador a través del horario
// fijo. Cuando no tiene horario definido, el día de descanso se da en la programación y puede cambiar
// cualquier día. Si no tiene horario, no tiene día fijo asignado de descanso».
//
// ESTO SUSTITUYE A LA DECLARACIÓN POR PERSONA. Hasta hoy el motor leía tres columnas del colaborador
// —`descansoTipo`, `descansoDia`, `descansoAcuerdoEn`— que un modal llenaba una sola vez. Esas
// columnas NUNCA LLEGARON A PRODUCCIÓN: medido el 30 de septiembre contra la base real, de las nueve
// columnas del módulo de turnos solo existen dos. Así que no hay nada que migrar: dejan de crearse.
//
// LA REGLA, entera:
//
//   con horario · las franjas dejan UN día libre    ese es el descanso
//   con horario · dejan varios, o ninguno           el DOMINGO, que es lo que la ley presume
//   sin horario · la semana está programada         el día que diga la programación
//   sin horario · nadie ha programado nada          el DOMINGO, la misma presunción
//
// LOS DOS ÚLTIMOS RENGLONES ERAN UNO SOLO Y DECÍA «NO HAY DESCANSO». Así se desplegó el 1 de octubre
// de 2026 y así estuvo unas horas en producción, hasta que se midió: 37 personas perdieron el recargo
// de su domingo en septiembre, un mes ya cerrado, por unos 3,34 millones.
//
// La frase del dueño responde CUÁL día es el descanso, no SI hay uno. Mientras nadie programe la
// semana no hay nada que deducir y manda el art. 172 del CST, que la reforma de 2025 no tocó. En
// cuanto se pinta la semana, la programación decide y puede llevarse el descanso al miércoles.

const SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const menos = (...libres: string[]) => SEMANA.filter(d => !libres.includes(d));

describe('el día de descanso que dice un horario', () => {
  it('si sobra UNO, ese es', () => {
    expect(diaDeDescansoDelHorario(menos('DOMINGO'))).toBe('DOMINGO');
    expect(diaDeDescansoDelHorario(menos('MIERCOLES'))).toBe('MIERCOLES');
  });

  it('si sobran VARIOS, el domingo', () => {
    // Lunes a viernes es el caso más común: sobran sábado y domingo, y solo uno es el descanso
    // obligatorio. El otro es un día no laborable, que no es lo mismo y no paga recargo.
    expect(diaDeDescansoDelHorario(menos('SABADO', 'DOMINGO'))).toBe('DOMINGO');
  });

  it('si no sobra NINGUNO, el domingo también', () => {
    // Siete días cubiertos: no hay hueco del que deducir, así que manda la presunción legal. Es el
    // caso más común en vigilancia.
    expect(diaDeDescansoDelHorario(SEMANA)).toBe('DOMINGO');
  });

  it('y si sobran varios SIN el domingo entre ellos, el domingo igual', () => {
    // Trabaja domingo y libra viernes y sábado. El domingo sigue siendo el descanso presumido: que lo
    // trabaje no lo deja de ser, lo que hace es pagar recargo. Elegir el viernes aquí sería mover el
    // descanso fuera del domingo por deducción propia, que es justo lo que la ley no deja sin acuerdo.
    expect(diaDeDescansoDelHorario(menos('VIERNES', 'SABADO'))).toBe('DOMINGO');
  });

  it('un horario sin ningún día es como no tener ninguno cubierto', () => {
    expect(diaDeDescansoDelHorario([])).toBe('DOMINGO');
  });

  it('un nombre de día que no existe no cuenta como cubierto', () => {
    // La columna es texto libre. Un valor raro no puede hacer que a un horario de seis días le sobren
    // dos y se mueva el descanso al domingo cuando de verdad sobra el miércoles.
    expect(diaDeDescansoDelHorario([...menos('MIERCOLES'), 'DIA_RARO'])).toBe('MIERCOLES');
  });
});

describe('si una fecha es el descanso obligatorio', () => {
  const conHorario = (...libres: string[]) => ({ de: 'HORARIO' as const, diasQueTrabaja: menos(...libres) });
  const sinHorario = { de: 'PROGRAMACION' as const };

  it('con horario, manda el horario y la programación NO lo mueve', () => {
    // «Solo sabemos el día de descanso a través del horario fijo». Si hay horario, ya está dicho:
    // marcar otro día en la rejilla no puede contradecirlo.
    expect(esDescansoObligatorioDe('DOMINGO', conHorario('DOMINGO'), 'MARTES')).toBe(true);
    expect(esDescansoObligatorioDe('MARTES', conHorario('DOMINGO'), 'MARTES')).toBe(false);
  });

  it('SIN horario y SIN programar: el descanso es el DOMINGO, por presunción legal', () => {
    // CORREGIDO EL 1 DE OCTUBRE DE 2026, con el daño ya en producción. Antes esto devolvía `false`
    // para los siete días, o sea NINGÚN descanso: alguien sin horario podía trabajar la semana
    // entera sin disparar un solo recargo. Medido en producción el día del despliegue: 37 personas
    // en septiembre perdieron el recargo de su domingo, unos 3,34 millones, sobre un mes YA CERRADO.
    //
    // La regla del dueño («solo cuando se programa se pone el día de descanso») responde CUÁL día
    // es, no SI hay uno. Mientras nadie programe la semana manda el art. 172 del CST, que la reforma
    // de 2025 no tocó: descanso dominical remunerado. En cuanto se pinta la semana, la programación
    // decide y puede llevárselo al miércoles.
    expect(esDescansoObligatorioDe('DOMINGO', sinHorario, null)).toBe(true);
    for (const dia of SEMANA.filter(d => d !== 'DOMINGO')) {
      expect(esDescansoObligatorioDe(dia, sinHorario, null), dia).toBe(false);
    }
  });

  it('sin horario, manda lo que diga la programación de esa semana', () => {
    expect(esDescansoObligatorioDe('MARTES', sinHorario, 'MARTES')).toBe(true);
    expect(esDescansoObligatorioDe('DOMINGO', sinHorario, 'MARTES')).toBe(false);
  });

  it('un día inválido no es el descanso de nadie', () => {
    expect(esDescansoObligatorioDe('DIA_RARO', conHorario('DOMINGO'), null)).toBe(false);
    expect(esDescansoObligatorioDe('DIA_RARO', sinHorario, 'DIA_RARO')).toBe(false);
  });

  it('y una programación con un día inválido cae a la presunción, no al vacío', () => {
    // Un valor que no es un día no puede DEJAR SIN descanso a nadie: es dato corrupto, no una
    // decisión de que esa semana no hay descanso.
    expect(esDescansoObligatorioDe('LUNES', sinHorario, 'DIA_RARO')).toBe(false);
    expect(esDescansoObligatorioDe('DOMINGO', sinHorario, 'DIA_RARO')).toBe(true);
  });
});

// ────────── DE UN COLABORADOR A SU FUENTE DE DESCANSO ──────────
//
// La costura entre la base y la regla. Sale a su propia función porque la llaman SIETE sitios —el
// motor de horas, la materialización, tres rutas de reportes, el dashboard y el calendario— y
// escribir en cada uno «si tiene horario, junta los días de sus franjas» es como se separan.

describe('la fuente del descanso de un colaborador', () => {
  it('sin horario, la programación', () => {
    expect(fuenteDelDescansoDe(null)).toEqual({ de: 'PROGRAMACION' });
  });

  it('con horario, los días que juntan TODAS sus franjas', () => {
    // El caso de verdad: una franja de lunes a viernes y otra de sábado corto. Mirando solo la
    // primera sobrarían dos días y sobra uno.
    const r = fuenteDelDescansoDe({ franjas: [
      { dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] },
      { dias: ['SABADO'] },
    ] });
    expect(r.de).toBe('HORARIO');
    expect(diaDeDescansoDelHorario((r as { diasQueTrabaja: string[] }).diasQueTrabaja)).toBe('DOMINGO');
  });

  it('un horario SIN franjas sigue siendo un horario, no «sin horario»', () => {
    // No es lo mismo: sin horario no hay día fijo y lo pone la programación; con un horario vacío no
    // hay nada cubierto, sobran los siete y manda la presunción legal. Confundirlos dejaría a esa
    // gente sin descanso obligatorio por un horario a medio configurar.
    expect(fuenteDelDescansoDe({ franjas: [] })).toEqual({ de: 'HORARIO', diasQueTrabaja: [] });
  });

  it('una franja con `dias` que no es una lista no revienta', () => {
    // La columna es JSON en la base y se lee como `unknown`. Un valor raro no puede tumbar la
    // liquidación de nadie.
    const r = fuenteDelDescansoDe({ franjas: [{ dias: null }, { dias: ['LUNES'] }] });
    expect(r).toEqual({ de: 'HORARIO', diasQueTrabaja: ['LUNES'] });
  });

  it('no repite un día que esté en dos franjas', () => {
    const r = fuenteDelDescansoDe({ franjas: [{ dias: ['LUNES', 'SABADO'] }, { dias: ['SABADO'] }] });
    expect((r as { diasQueTrabaja: string[] }).diasQueTrabaja).toEqual(['LUNES', 'SABADO']);
  });
});
