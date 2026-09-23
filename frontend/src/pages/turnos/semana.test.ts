import { describe, it, expect } from 'vitest';
import {
  hoyEnBogota, sumarDias, lunesDeLaSemana, diasDeLaSemana, rotuloDeSemana, horasDeMinutos,
  sePuedePintar, inicialDeDia,
} from './semana';

// Estas pruebas corren en América/Los Ángeles (vite.config.ts lo fija a propósito). Todo lo que
// sigue fallaría con `getDay()` o con `new Date("2026-09-21")` leído en local, que es justo el
// defecto que estas funciones existen para impedir.

describe('hoyEnBogota', () => {
  it('a las 8 p.m. de Bogotá sigue siendo hoy, no mañana', () => {
    // 21/09/2026 20:00 en Bogotá = 22/09/2026 01:00 UTC. `toISOString()` diría 22.
    expect(hoyEnBogota(new Date('2026-09-22T01:00:00Z'))).toBe('2026-09-21');
  });

  it('a la medianoche de Bogotá ya es el día siguiente', () => {
    expect(hoyEnBogota(new Date('2026-09-22T05:00:00Z'))).toBe('2026-09-22');
  });
});

describe('lunesDeLaSemana', () => {
  it('un lunes es su propio lunes', () => {
    expect(lunesDeLaSemana('2026-09-21')).toBe('2026-09-21'); // lunes
  });

  it('el domingo pertenece a la semana que EMPEZÓ, no a la que viene', () => {
    // El caso que decide todo: con semana de domingo a sábado, el descanso dominical quedaría
    // separado de los seis días que lo generaron y el tope de 42 horas se mediría partido.
    expect(lunesDeLaSemana('2026-09-27')).toBe('2026-09-21'); // domingo -> lunes anterior
  });

  it('un miércoles cae al lunes de esa semana', () => {
    expect(lunesDeLaSemana('2026-09-23')).toBe('2026-09-21');
  });

  it('cruza el cambio de mes hacia atrás', () => {
    expect(lunesDeLaSemana('2026-10-01')).toBe('2026-09-28'); // jueves -> lunes de septiembre
  });
});

describe('sumarDias y diasDeLaSemana', () => {
  it('suma cruzando el fin de mes', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('resta cruzando el fin de año', () => {
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('da siete días consecutivos empezando en el lunes', () => {
    expect(diasDeLaSemana('2026-09-21')).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
      '2026-09-25', '2026-09-26', '2026-09-27',
    ]);
  });
});

describe('rotuloDeSemana', () => {
  it('dentro de un mes nombra el mes una sola vez', () => {
    expect(rotuloDeSemana('2026-09-21')).toBe('21 al 27 de septiembre');
  });

  it('cuando cruza de mes nombra los dos', () => {
    expect(rotuloDeSemana('2026-09-28')).toBe('28 de septiembre al 4 de octubre');
  });
});

// LA INICIAL DE LA COLUMNA, SACADA DE LA FECHA (22 de septiembre de 2026).
//
// Hasta hoy el encabezado hacía `INICIALES_DE_DIA[i]`, con `i` = número de columna. En una semana
// eso funciona de casualidad: la columna 0 SIEMPRE es lunes. En la vista de mes hay hasta 31
// columnas, y de la octava en adelante ese acceso devuelve `undefined`, o sea un encabezado en
// blanco sobre la mitad del calendario.
describe('inicialDeDia', () => {
  it('saca la inicial de la FECHA, no de la posición de la columna', () => {
    expect(inicialDeDia('2026-09-21')).toBe('L'); // lunes
    expect(inicialDeDia('2026-09-22')).toBe('M'); // martes
    expect(inicialDeDia('2026-09-24')).toBe('J'); // jueves
  });

  it('el domingo es el último día de la semana, no el primero', () => {
    // La misma convención que `lunesDeLaSemana`: si el domingo se leyera como día 0, la inicial
    // del lunes saldría 'D' y todo el encabezado quedaría corrido un puesto.
    expect(inicialDeDia('2026-09-26')).toBe('S'); // sábado
    expect(inicialDeDia('2026-09-27')).toBe('D'); // domingo
  });

  it('mapea los siete días de una semana entera', () => {
    // La invariante que resume las dos de arriba, y la que de verdad discrimina.
    //
    // AQUÍ HABÍA OTRA PRUEBA Y SE BORRÓ: decía «se lee en hora de Bogotá» y afirmaba que el lunes
    // no era 'D'. Eso es cierto con el código bueno, con el código roto Y con `getDay()`, porque
    // el anclaje a MEDIODÍA UTC de `aFecha` deja doce horas de margen en las dos direcciones. Una
    // prueba que no puede ponerse roja no protege nada y hace creer que ese riesgo está cubierto.
    // La zona horaria la sujeta `aFecha`, y eso se prueba donde vive.
    expect(diasDeLaSemana('2026-09-21').map(inicialDeDia)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  });
});

describe('horasDeMinutos', () => {
  it('sin decimal cuando es redondo', () => {
    expect(horasDeMinutos(42 * 60)).toBe('42 h');
  });

  it('con coma decimal, que es la convención de acá', () => {
    expect(horasDeMinutos(41 * 60 + 30)).toBe('41,5 h');
  });

  it('cero es cero y no queda vacío', () => {
    expect(horasDeMinutos(0)).toBe('0 h');
  });
});

describe('sePuedePintar: solo hacia adelante', () => {
  const HOY = '2026-09-21';

  it('un día ya pasado no se puede pintar', () => {
    // Reescribiría lo que ese día exigía, y de ahí salen la tardanza y las horas extra de un
    // período ya liquidado. El backend lo rechaza igual; la pantalla ni siquiera lo ofrece.
    expect(sePuedePintar('2026-09-20', HOY)).toBe(false);
    expect(sePuedePintar('2026-01-01', HOY)).toBe(false);
  });

  it('HOY sí se puede', () => {
    // Puede que la persona todavía no haya marcado. Si ya marcó, el backend responde 400 y el
    // motivo se muestra: la pantalla no puede saberlo sola, y esconder el día por si acaso le
    // quitaría al administrador un cambio legítimo.
    expect(sePuedePintar(HOY, HOY)).toBe(true);
  });

  it('cualquier día futuro se puede', () => {
    expect(sePuedePintar('2026-09-22', HOY)).toBe(true);
    expect(sePuedePintar('2027-03-15', HOY)).toBe(true);
  });

  it('el cambio de MES no se confunde', () => {
    expect(sePuedePintar('2026-10-01', '2026-09-30')).toBe(true);
    expect(sePuedePintar('2026-09-30', '2026-10-01')).toBe(false);
  });

  it('el cambio de AÑO tampoco', () => {
    expect(sePuedePintar('2027-01-01', '2026-12-31')).toBe(true);
    expect(sePuedePintar('2026-12-31', '2027-01-01')).toBe(false);
  });

  it('los días de un solo dígito comparan bien, que es de lo que depende todo esto', () => {
    // Compara TEXTO contra texto, y eso solo funciona porque el formato viene con cero delante.
    // Si alguna vez llegara "2026-9-5" sin rellenar, "2026-9-5" > "2026-09-10" sería cierto y el
    // 5 de septiembre pasaría por futuro. Este caso es el que lo sujeta.
    expect(sePuedePintar('2026-09-05', '2026-09-10')).toBe(false);
    expect(sePuedePintar('2026-09-10', '2026-09-05')).toBe(true);
  });
});
