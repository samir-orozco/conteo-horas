import { describe, it, expect } from 'vitest';
import {
  hoyEnBogota, sumarDias, lunesDeLaSemana, diasDeLaSemana, rotuloDeSemana, horasDeMinutos,
  rotuloDeSemanaEnLaVista,
  horarioCorto, abreviaturaDeDia,
  sePuedePintar, inicialDeDia, diasEntre, nombreDelMes, rotuloCorto,
  esDeOtroMes,
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

// EL RÓTULO DEL BOTÓN DE RANGO (28 de septiembre de 2026).
//
// Cambió de «28 de septiembre al 4 de octubre» a «28 sep – 4 oct 2026» porque cambió de sitio: era
// un título de 30 px a la izquierda y pasa a ser el botón que va ENTRE las flechas, con 200 px de
// ancho mínimo. En esa caja el formato largo envuelve a dos renglones y empuja las flechas.
//
// EL MES NO SE COLAPSA aunque los dos extremos caigan en el mismo, al revés que el formato viejo.
// En un botón que se pulsa repetido para avanzar, que el texto cambie de «21 al 27 de septiembre»
// a «28 sep – 4 oct 2026» según la semana mueve el ancho y con él las flechas de sitio.
//
// Y EL AÑO VA SIEMPRE, que es lo que distingue navegar tres semanas de navegar catorce meses.
describe('rotuloDeSemana', () => {
  it('dentro de un mes NO colapsa el mes: los dos extremos lo dicen', () => {
    expect(rotuloDeSemana('2026-09-21')).toBe('21 sep – 27 sep 2026');
  });

  it('cuando cruza de mes, cada extremo con el suyo', () => {
    expect(rotuloDeSemana('2026-09-28')).toBe('28 sep – 4 oct 2026');
  });

  it('y cuando cruza de AÑO manda el del final, que es donde se está entrando', () => {
    expect(rotuloDeSemana('2026-12-28')).toBe('28 dic – 3 ene 2027');
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

// EL HORARIO COMO SE ESCRIBE EN UNA CELDA (28 de septiembre de 2026).
//
// La celda de la rejilla tiene 75 px útiles. «10:00–16:00» son once caracteres con dos puntos que no
// dicen nada: todos los turnos redondos de este producto empiezan y terminan en punto, así que esos
// cuatro ceros ocupan un tercio del renglón para repetir lo mismo en cada celda de la pantalla.
//
// La maqueta lo resolvió escribiendo a mano un campo `cortas` por turno («6–14»). Aquí no sirve: los
// turnos los crea cada cliente desde el catálogo y nadie va a escribir dos formatos de cada uno. Se
// deriva, y por eso es una función con pruebas y no un `replace` metido en el JSX.
//
// LO QUE NO ES REDONDO NO SE TOCA. Un turno de 8:30 a 17:15 se escribe entero: recortar ahí sería
// mentir sobre la hora a la que alguien entra, que es justo el dato que la celda existe para decir.
describe('horarioCorto', () => {
  it('quita los :00, que es lo que sobra en un turno redondo', () => {
    expect(horarioCorto('10:00', '16:00')).toBe('10–16');
  });

  it('y quita el cero de la izquierda', () => {
    expect(horarioCorto('06:00', '14:00')).toBe('6–14');
  });

  it('un turno que cruza la medianoche se dice igual: la celda no explica, nombra', () => {
    expect(horarioCorto('22:00', '06:00')).toBe('22–6');
  });

  it('LOS MINUTOS QUE NO SON CERO SE QUEDAN, los dos lados por separado', () => {
    expect(horarioCorto('08:30', '17:15')).toBe('8:30–17:15');
    // Y uno redondo junto a uno que no lo es: cada extremo se decide solo.
    expect(horarioCorto('06:00', '14:30')).toBe('6–14:30');
    expect(horarioCorto('07:45', '16:00')).toBe('7:45–16');
  });

  it('la medianoche es «0» y no una cadena vacía', () => {
    // '00:00' quitando ceros a la izquierda se queda en nada si se hace con un replace ingenuo.
    expect(horarioCorto('00:00', '08:00')).toBe('0–8');
  });
});

// LA ABREVIATURA DEL DÍA PARA EL ENCABEZADO DE LA SEMANA (28 de septiembre de 2026).
//
// La maqueta escribe «Mar 29» en la vista de semana y solo «M 29» en la de mes, y la razón es de
// ancho: en la semana hay siete columnas y sobra sitio; en un mes hay hasta cuarenta y dos.
//
// LO QUE ESTO RESUELVE NO ES ESTÉTICO: con la inicial sola, lunes y martes son «L» y «M», y martes y
// miércoles son «M» y «M». O sea que en la mitad de las columnas el encabezado no distingue un día
// de otro, y hay que contar desde la izquierda para saber en cuál se está pintando.
describe('abreviaturaDeDia', () => {
  it('los siete, empezando en lunes como toda la rejilla', () => {
    const lunes = '2026-09-28';
    expect([0, 1, 2, 3, 4, 5, 6].map(i => abreviaturaDeDia(sumarDias(lunes, i))))
      .toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  });

  it('DOMINGO VA AL FINAL, que es donde lo pone el resto del archivo', () => {
    // El error que caza: `getUTCDay()` devuelve 0 para el domingo, así que una tabla indexada sin
    // corregir lo pondría primero y correría los otros seis un sitio. Todos los días de la rejilla
    // saldrían con el nombre del anterior, que es plausible y no salta a la vista.
    expect(abreviaturaDeDia('2026-10-04')).toBe('Dom');
    expect(abreviaturaDeDia('2026-09-28')).toBe('Lun');
  });

  it('empieza con la misma letra que la inicial, porque son la misma cuenta', () => {
    // Si las dos tablas se separan, el mes y la semana nombrarían distinto el mismo día.
    for (let i = 0; i < 7; i++) {
      const f = sumarDias('2026-09-28', i);
      expect(abreviaturaDeDia(f).charAt(0), f).toBe(inicialDeDia(f));
    }
  });
});

// ────────── EL RÓTULO DE CADA SEMANA EN LA VISTA DE MES (29 de septiembre de 2026) ──────────
//
// Pedido del dueño con una maqueta: «que la parte superior de mes se vea mucho más amplia». En un mes
// hay cuarenta y dos columnas de una letra y un número, y para saber en qué semana se está pintando
// hay que contar desde la izquierda. La maqueta pone encima de cada grupo de siete un rótulo que dice
// cuál es y qué días abarca.
//
// EL NÚMERO ES EL DE LA VISTA Y NO EL DEL AÑO, y esa es toda la decisión. La semana ISO del 28 de
// septiembre de 2026 es la 40, y «Semana 40» no le dice nada a quien está mirando un mes con cinco
// filas: lo que necesita es «esta es la primera de las que veo». La numeración del año existe y sirve
// para otras cosas, pero aquí sería un número grande y ajeno.
//
// SIN AÑO, al revés que `rotuloDeSemana`: el año ya está en el título del período, justo encima, y
// repetirlo cinco veces en una fila de encabezado gasta el ancho que este cambio viene a dar.
//
// SIN PUNTO EN LA ABREVIATURA DEL MES. La maqueta escribe «28 abr. – 4 may.»; el resto del producto
// escribe «28 sep – 4 oct» en el botón de navegación, que está a dos centímetros de aquí. Dos formas
// de abreviar el mismo mes en la misma pantalla se leen como un descuido, y la que ya existe manda.

describe('el rótulo de una semana dentro de la vista', () => {
  it('dice qué número de la vista es y qué días abarca', () => {
    expect(rotuloDeSemanaEnLaVista('2026-09-28', 0)).toBe('Semana 1 · 28 sep – 4 oct');
  });

  it('el número cuenta desde uno, no desde cero', () => {
    // El índice llega en base cero porque viene de un `map`. Publicar «Semana 0» sería filtrar una
    // cuenta de programador a una pantalla que lee alguien que programa turnos.
    expect(rotuloDeSemanaEnLaVista('2026-10-05', 1)).toBe('Semana 2 · 5 oct – 11 oct');
  });

  it('una semana que cruza el año NO lo dice: el título del período ya está encima', () => {
    expect(rotuloDeSemanaEnLaVista('2026-12-28', 4)).toBe('Semana 5 · 28 dic – 3 ene');
  });

  it('abrevia el mes igual que el botón de navegación, sin punto', () => {
    // «28 abr. – 4 may.» de la maqueta contra «28 sep – 4 oct» del botón que está dos centímetros
    // más arriba. Dos formas de abreviar el mismo mes en la misma pantalla se leen como un descuido.
    expect(rotuloDeSemanaEnLaVista('2026-04-27', 0)).toBe('Semana 1 · 27 abr – 3 may');
  });
});
