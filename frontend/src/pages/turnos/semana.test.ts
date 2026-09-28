import { describe, it, expect } from 'vitest';
import {
  hoyEnBogota, sumarDias, lunesDeLaSemana, diasDeLaSemana, rotuloDeSemana, horasDeMinutos,
  sePuedePintar, inicialDeDia, diasEntre, nombreDelMes, rotuloCorto,
  esFinDeSemana, esDeOtroMes,
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

describe('el nombre del mes, a secas', () => {
  // Salió de un defecto visto en el navegador el 28 de septiembre de 2026: el veredicto de la
  // rotación decía «en 2 semanas de septiembre de 2026» porque reutilizaba el rótulo del encabezado,
  // que lleva el año porque titula la vista de mes. Dentro de una frase, el año sobra.
  it('devuelve solo el mes, sin año', () => {
    expect(nombreDelMes('2026-09-28')).toBe('septiembre');
  });

  it('en minúscula, porque va dentro de una oración', () => {
    expect(nombreDelMes('2026-01-15')).toBe('enero');
  });

  it('el primero de un mes no se corre al mes anterior', () => {
    // OJO CON LO QUE ESTE CASO SÍ PRUEBA, porque su primera redacción mentía y lo dijo una mutación:
    // decía «lo decide el anclaje a UTC», y al quitarle `timeZone: 'UTC'` a la función NO se puso
    // roja. Lo que de verdad sostiene el resultado es que `aFecha` ancla a MEDIODÍA UTC: en América
    // /Los Ángeles —donde estas pruebas corren a propósito— eso son las 4 o 5 de la mañana del MISMO
    // día, así que leer las partes locales da lo mismo. Las opciones UTC de la función son cinturón
    // por si alguien mueve ese anclaje, no lo que hoy protege esto.
    //
    // El caso se queda porque el comportamiento sí importa (un primero de mes corriéndose sería un
    // rótulo falso); lo que se corrige es la razón que decía tener.
    expect(nombreDelMes('2026-10-01')).toBe('octubre');
    expect(nombreDelMes('2026-03-01')).toBe('marzo');
  });
});

describe('una fecha dicha como la diría una persona', () => {
  it('junta el día y el mes', () => {
    expect(rotuloCorto('2026-09-28')).toBe('28 de septiembre');
  });

  it('sin cero a la izquierda', () => {
    expect(rotuloCorto('2026-09-05')).toBe('5 de septiembre');
  });

  it('el último día del mes no se corre al siguiente', () => {
    // El caso que caza un anclaje mal hecho: en zona negativa, "2026-01-31" leído mal diría 30 de
    // enero, o peor, febrero.
    expect(rotuloCorto('2026-01-31')).toBe('31 de enero');
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

// CUÁNTOS DÍAS HAY DE UNA FECHA A OTRA (28 de septiembre de 2026).
//
// Nace con el motor de rotaciones, que necesita saber en qué punto del ciclo cae cada día. Vive
// aquí y no en `rotacion.ts` porque necesita el mismo anclaje a mediodía UTC que todo este archivo.
describe('diasEntre', () => {
  it('de una fecha a sí misma no hay días', () => {
    expect(diasEntre('2026-09-28', '2026-09-28')).toBe(0);
  });

  it('cuenta hacia adelante', () => {
    expect(diasEntre('2026-09-28', '2026-09-29')).toBe(1);
    expect(diasEntre('2026-09-28', '2026-10-05')).toBe(7);
  });

  it('hacia atrás cuenta en negativo', () => {
    // Importa que NO devuelva el valor absoluto: el motor de rotaciones usa el signo, y con un
    // negativo mal tratado el ciclo se leería al revés.
    expect(diasEntre('2026-09-29', '2026-09-28')).toBe(-1);
  });

  it('cruza el cambio de mes y el de año', () => {
    expect(diasEntre('2026-09-28', '2026-10-01')).toBe(3);
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('un año entero, para que un error de una hora no se acumule sin verse', () => {
    // 2026 no es bisiesto: del 1 de enero al 31 de diciembre hay 364 días.
    expect(diasEntre('2026-01-01', '2026-12-31')).toBe(364);
  });

  it('un tramo que CRUZA EL CAMBIO DE HORA de la zona en que corren estas pruebas', () => {
    // Estas pruebas corren en América/Los Ángeles, que el domingo 1 de noviembre de 2026 atrasa el
    // reloj una hora.
    //
    // ESTE CASO NO DISTINGUE `round` DE `floor`, y conviene decirlo porque la primera versión de
    // este comentario afirmaba que sí. Se comprobó con una mutación: cambiar `Math.round` por
    // `Math.floor` en `diasEntre` deja las 29 pruebas en verde. La razón es que `aFecha` ancla las
    // dos fechas a las 12:00 **UTC**, y `Date.UTC` no tiene horario de verano: la resta siempre da
    // un múltiplo exacto de un día, sin parte fraccionaria que redondear.
    //
    // Lo que este caso SÍ sujeta es el anclaje: el día que alguien cambie `aFecha` por un
    // `new Date(iso)` leído en local, este tramo empieza a medir 4 días y 1 hora y la cuenta se
    // parte. Por eso se queda.
    expect(diasEntre('2026-10-30', '2026-11-03')).toBe(4);
  });
});

describe('si un día es fin de semana', () => {
  // POR QUÉ NO SE DEDUCE EN EL JSX: un fin de semana mal marcado no rompe nada a la vista. Corre el
  // sábado y el domingo un día y sigue pareciendo una rejilla normal, en la pantalla con la que se
  // programan los turnos de todo el mes.
  //
  // LO QUE ESTAS PRUEBAS **NO** SUJETAN, y hay que decirlo porque la primera versión de este
  // comentario afirmaba lo contrario: no distinguen `getUTCDay()` de `getDay()`. Medido con una
  // mutación, cambiar uno por otro deja las 42 pruebas de este archivo en verde. La razón es que
  // `aFecha` ancla la fecha a MEDIODÍA UTC, y las siete horas de América/Los Ángeles no alcanzan a
  // cruzar el día: las dos lecturas caen en la misma fecha.
  //
  // Lo que sí rompería es leer la fecha a medianoche local (`new Date('2026-10-05')`), que en esa
  // zona da el domingo 4. O sea que el guardia real es el anclaje de `aFecha`, y `getUTCDay()` es
  // coherencia con el resto del archivo, no lo que sostiene el resultado. La única forma de cazar esa
  // mutación sería correr estas pruebas en una zona a más de doce horas de UTC, y la zona está fija a
  // propósito (CLAUDE.md §7).

  it('el sábado y el domingo lo son', () => {
    expect(esFinDeSemana('2026-10-03')).toBe(true); // sábado
    expect(esFinDeSemana('2026-10-04')).toBe(true); // domingo
  });

  it('y el resto de la semana no', () => {
    expect(esFinDeSemana('2026-09-28')).toBe(false); // lunes
    expect(esFinDeSemana('2026-09-29')).toBe(false); // martes
    expect(esFinDeSemana('2026-09-30')).toBe(false); // miércoles
    expect(esFinDeSemana('2026-10-01')).toBe(false); // jueves
    expect(esFinDeSemana('2026-10-02')).toBe(false); // viernes
  });

  it('el lunes siguiente tampoco, y el sábado siguiente sí', () => {
    // Estos dos casos NO cazan un `getDay()`: ver el comentario de arriba, está medido. Lo que
    // sujetan es el anclaje de `aFecha`: el día que alguien lo cambie por un `new Date(iso)` leído en
    // local, el lunes 5 se leerá como el domingo 4 en la zona de estas pruebas y este caso se pondrá
    // rojo. Por eso se quedan, aunque no sean el discriminador que este comentario decía antes.
    expect(esFinDeSemana('2026-10-05')).toBe(false);
    expect(esFinDeSemana('2026-10-10')).toBe(true);
  });
});

describe('si un día es de otro mes', () => {
  // ESTO EXISTE PORQUE EL MES SE DIBUJA CON SEMANAS COMPLETAS. Las columnas de los extremos son del
  // mes anterior y del siguiente, y sin marcarlas la rejilla miente por omisión: se ve un «1» al
  // principio y otro «1» al final y los dos parecen del mes que dice el título.
  //
  // SE COMPARA EL PREFIJO `YYYY-MM`, NO EL NÚMERO DE MES. La maqueta compara `getMonth()` a secas, y
  // con eso el relleno de enero del año siguiente pasa por del mes. Aquí no hay fechas ni zona
  // horaria de por medio: es texto ISO, y el año va delante.

  it('el relleno del mes anterior y del siguiente son de otro mes', () => {
    expect(esDeOtroMes('2026-08-31', '2026-09-01')).toBe(true);
    expect(esDeOtroMes('2026-10-04', '2026-09-01')).toBe(true);
  });

  it('cualquier día del mes del ancla no lo es', () => {
    expect(esDeOtroMes('2026-09-01', '2026-09-01')).toBe(false);
    expect(esDeOtroMes('2026-09-15', '2026-09-01')).toBe(false);
    expect(esDeOtroMes('2026-09-30', '2026-09-01')).toBe(false);
  });

  it('y el ancla no tiene que ser el día 1', () => {
    // El ancla del calendario es un día cualquiera del período, no siempre el primero.
    expect(esDeOtroMes('2026-09-30', '2026-09-17')).toBe(false);
    expect(esDeOtroMes('2026-10-01', '2026-09-17')).toBe(true);
  });

  it('EL MISMO MES DE OTRO AÑO sí es de otro mes', () => {
    // El caso que distingue comparar el prefijo de comparar el número de mes, y que en la maqueta
    // está mal. Enero se dibuja con relleno de diciembre del año anterior, y diciembre con relleno de
    // enero del siguiente: los dos extremos del año cruzan.
    expect(esDeOtroMes('2027-01-04', '2026-01-01')).toBe(true);
    expect(esDeOtroMes('2025-12-29', '2026-01-01')).toBe(true);
    expect(esDeOtroMes('2027-01-03', '2026-12-01')).toBe(true);
  });
});
