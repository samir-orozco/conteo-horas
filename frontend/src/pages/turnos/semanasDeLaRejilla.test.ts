import { describe, it, expect } from 'vitest';
import {
  semanasDeLasColumnas, minutosDeLaSemana, semanasEnterasDelMes, semanasSobreElTope,
  mesQueSePrograma, semanasEnterasSinDescanso,
} from './semanasDeLaRejilla';
import { sumarDias } from './semana';

// LAS SEMANAS QUE HAY DENTRO DE LA REJILLA (28 de septiembre de 2026).
//
// En la vista de mes la columna de «Total» desaparecía: solo existía en la de semana. Y con ella
// desaparecía el guardia de las 42 horas, que es SEMANAL. Un mes son cinco o seis semanas y ninguna
// tenía dónde decir «esta persona quedó en 48».
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UN BUCLE DENTRO DEL JSX: de este número sale una alarma legal.
// Si agrupa mal —por ejemplo, partiendo por bloques de siete desde la primera columna en vez de por
// lunes— el total sale plausible y equivocado, que es exactamente la forma en que este producto se
// rompe según su propio CLAUDE.md: nadie lo nota hasta que un trabajador reclama.
//
// AGRUPA POR LUNES Y NO DE SIETE EN SIETE. Hoy las dos cosas coinciden porque la vista de mes ya
// llega con semanas completas, pero atarse a eso sería depender de una decisión de otro módulo: el
// día que alguien pida ver una quincena que arranca un miércoles, «de siete en siete» pondría en la
// misma semana días de dos semanas distintas, y el tope de 42 horas se mediría sobre una ventana que
// no es la legal.

describe('agrupar las columnas en semanas', () => {
  it('una semana suelta es un solo grupo', () => {
    const dias = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
    const semanas = semanasDeLasColumnas(dias);
    expect(semanas).toHaveLength(1);
    expect(semanas[0].lunes).toBe('2026-09-28');
    expect(semanas[0].fechas).toEqual(dias);
  });

  it('un mes con semanas completas da cinco grupos de siete', () => {
    // Septiembre de 2026 con relleno: del lunes 31 de agosto al domingo 4 de octubre.
    const dias: string[] = [];
    for (let d = new Date(Date.UTC(2026, 7, 31, 12)); d <= new Date(Date.UTC(2026, 9, 4, 12)); d.setUTCDate(d.getUTCDate() + 1)) {
      dias.push(d.toISOString().slice(0, 10));
    }
    expect(dias).toHaveLength(35);
    const semanas = semanasDeLasColumnas(dias);
    expect(semanas).toHaveLength(5);
    expect(semanas.every(s => s.fechas.length === 7)).toBe(true);
    expect(semanas[0].lunes).toBe('2026-08-31');
    expect(semanas[4].lunes).toBe('2026-09-28');
  });

  it('agrupa por LUNES, no de siete en siete desde la primera columna', () => {
    // El caso que distingue las dos reglas: un rango que arranca en MIÉRCOLES. De siete en siete, el
    // primer grupo mezclaría días de dos semanas distintas y el tope de 42 horas se mediría sobre una
    // ventana que no es la legal.
    const dias = [
      '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', // miércoles a domingo
      '2026-10-05', '2026-10-06', // lunes y martes de la semana siguiente
    ];
    const semanas = semanasDeLasColumnas(dias);
    expect(semanas).toHaveLength(2);
    expect(semanas[0].lunes).toBe('2026-09-28');
    expect(semanas[0].fechas).toHaveLength(5);
    expect(semanas[1].lunes).toBe('2026-10-05');
    expect(semanas[1].fechas).toHaveLength(2);
  });

  it('un solo día es una semana con un solo día', () => {
    // La vista de día pasa por aquí igual, y no puede reventar ni inventarse seis días más.
    const semanas = semanasDeLasColumnas(['2026-09-30']);
    expect(semanas).toHaveLength(1);
    expect(semanas[0].fechas).toEqual(['2026-09-30']);
    expect(semanas[0].lunes).toBe('2026-09-28');
  });

  it('sin columnas no hay semanas', () => {
    expect(semanasDeLasColumnas([])).toEqual([]);
  });

  it('columnas desordenadas PARTEN el grupo, no lo juntan', () => {
    // ESTE CASO NACIÓ DE UNA MUTACIÓN QUE SOBREVIVIÓ. Buscar la semana entre TODAS las ya creadas, en
    // vez de mirar solo la última, no ponía roja ninguna prueba: con las columnas en orden las dos
    // formas dan lo mismo, y todas las entradas de aquí iban ordenadas.
    //
    // La diferencia importa por dónde se PINTA el resultado: el total de una semana va en una celda
    // al final de sus columnas. Si dos trozos separados en pantalla se juntaran en un solo grupo, ese
    // total quedaría debajo de columnas que no son las suyas y la rejilla se desalinearía. Partir es
    // lo correcto: cada grupo corresponde a columnas seguidas.
    const desordenadas = ['2026-09-28', '2026-10-05', '2026-09-29'];
    const semanas = semanasDeLasColumnas(desordenadas);
    expect(semanas).toHaveLength(3);
    expect(semanas.map(s => s.fechas)).toEqual([['2026-09-28'], ['2026-10-05'], ['2026-09-29']]);
    // Y aun partido, no se pierde ni se repite ninguna columna.
    expect(semanas.flatMap(s => s.fechas)).toEqual(desordenadas);
  });

  it('conserva el orden y no pierde ni repite ninguna fecha', () => {
    // La invariante que importa al pintar: las celdas de la fila tienen que seguir cuadrando con sus
    // columnas. Si el agrupado perdiera o duplicara una, la rejilla se desalinearía.
    const dias: string[] = [];
    for (let d = new Date(Date.UTC(2026, 1, 23, 12)); d <= new Date(Date.UTC(2026, 3, 5, 12)); d.setUTCDate(d.getUTCDate() + 1)) {
      dias.push(d.toISOString().slice(0, 10));
    }
    expect(dias).toHaveLength(42); // marzo de 2026, el peor mes
    const planas = semanasDeLasColumnas(dias).flatMap(s => s.fechas);
    expect(planas).toEqual(dias);
  });
});

describe('los minutos de una semana', () => {
  it('suma los minutos de sus días', () => {
    const minutos = { '2026-09-28': 300, '2026-09-29': 300, '2026-09-30': 480 };
    expect(minutosDeLaSemana(['2026-09-28', '2026-09-29', '2026-09-30'], minutos)).toBe(1080);
  });

  it('un día que no está en el mapa cuenta como cero, no como ausente', () => {
    // Pasa de verdad: las columnas de relleno son de otro mes y esa persona puede no tener fila ahí.
    // Tratarlas como cero es lo correcto; dejarlas fuera con un `undefined` daría `NaN` y el total
    // saldría vacío sin que nadie sepa por qué.
    const minutos = { '2026-09-28': 300 };
    expect(minutosDeLaSemana(['2026-09-28', '2026-09-29'], minutos)).toBe(300);
  });

  it('una semana sin ningún dato son cero minutos', () => {
    expect(minutosDeLaSemana(['2026-09-28', '2026-09-29'], {})).toBe(0);
  });

  it('sin días son cero minutos', () => {
    expect(minutosDeLaSemana([], { '2026-09-28': 300 })).toBe(0);
  });
});

// LAS SEMANAS ENTERAS DE UN MES (28 de septiembre de 2026).
//
// Este recorrido ya existía, escrito DENTRO de `semanasSinDescanso`: el bucle de lunes en lunes que
// descarta las semanas partidas por el borde del mes. El aviso de las 42 horas necesita exactamente
// el mismo, y escribirlo por segunda vez es como se separan dos copias de una misma regla
// (CLAUDE.md §9.3). Se extrae aquí y el que ya existía se migra en el mismo commit.
//
// SOLO LAS ENTERAS, y esa es toda la decisión: una semana partida por el borde se juzgaría a medias,
// con días que viven en otro mes y que el mapa no tiene. Vale igual para «no descansó ningún día» que
// para «pasó de 42 horas»: las dos son reglas SEMANALES y una semana incompleta no es una semana.

describe('las semanas enteras de un mes', () => {
  it('devuelve los lunes de las semanas que caben enteras dentro del mes', () => {
    // Octubre de 2026 empieza JUEVES 1 y termina SÁBADO 31, así que los dos extremos cruzan: la
    // semana del 28 de septiembre entra en octubre, y la del lunes 26 sale hasta el domingo 1 de
    // noviembre. Quedan tres enteras.
    //
    // La primera versión de este caso esperaba también la del 26, y el comentario de encima decía «y
    // termina sábado» a la vez que la listaba: la contradicción estaba dentro de la propia prueba. Un
    // mes que no termina en domingo NUNCA tiene entera su última semana.
    expect(semanasEnterasDelMes('2026-10')).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('descarta la primera cuando el mes no empieza lunes', () => {
    // Septiembre de 2026 empieza martes: la semana del 31 de agosto cruza y no se juzga.
    expect(semanasEnterasDelMes('2026-09')).not.toContain('2026-08-31');
    expect(semanasEnterasDelMes('2026-09')[0]).toBe('2026-09-07');
  });

  it('descarta la última cuando el mes no termina domingo', () => {
    // Septiembre termina miércoles 30: la semana del 28 cruza a octubre.
    expect(semanasEnterasDelMes('2026-09')).not.toContain('2026-09-28');
  });

  it('un mes que empieza lunes y termina domingo las trae todas', () => {
    // Febrero de 2027: empieza lunes 1 y termina domingo 28. Cuatro semanas exactas.
    expect(semanasEnterasDelMes('2027-02')).toEqual(['2027-02-01', '2027-02-08', '2027-02-15', '2027-02-22']);
  });

  it('el cruce de año no lo descarrila', () => {
    // Diciembre de 2026 termina jueves 31: su última semana entera es la del 21.
    const diciembre = semanasEnterasDelMes('2026-12');
    expect(diciembre[diciembre.length - 1]).toBe('2026-12-21');
    // Y enero de 2027 empieza viernes: la primera entera es la del 4.
    expect(semanasEnterasDelMes('2027-01')[0]).toBe('2027-01-04');
  });
});

// LAS SEMANAS QUE SE PASAN DEL TOPE.
//
// Hermana de `semanasSinDescanso` y por la misma razón: el tope de la jornada legal es SEMANAL, así
// que el total de un rango de treinta días no se puede comparar con él. Un mes son cinco semanas y
// cada una se juzga sola.
//
// EL TOPE ENTRA POR PARÁMETRO Y NO SE ESCRIBE AQUÍ: sale de la respuesta del servidor, que lo lee de
// la tabla de vigencias y sube o baja con la ley. Un 42 escrito en este archivo lo congelaría.

describe('las semanas que se pasan del tope', () => {
  const semanaDe = (lunes: string, minutosPorDia: number) => Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(...(lunes.split('-').map(Number) as [number, number, number])));
      d.setUTCMonth(d.getUTCMonth() - 1);
      d.setUTCDate(d.getUTCDate() + i);
      return [d.toISOString().slice(0, 10), minutosPorDia];
    }),
  );

  it('una semana por encima del tope sale, con sus minutos', () => {
    // Siete días de 8 h son 56 h, muy por encima de 42.
    const r = semanasSobreElTope(semanaDe('2026-10-05', 480), '2026-10', 42 * 60);
    expect(r).toEqual([{ lunes: '2026-10-05', minutos: 3360 }]);
  });

  it('una semana JUSTO en el tope no sale', () => {
    // 42 h exactas son legales. `>` y no `>=`: quien programa exactamente el tope no está infringiendo.
    const r = semanasSobreElTope(semanaDe('2026-10-05', 360), '2026-10', 42 * 60);
    expect(r).toEqual([]);
  });

  it('una semana partida por el borde del mes NO se juzga', () => {
    // La del 28 de septiembre cruza a octubre: le faltan días que el mapa ni siquiera tiene.
    const r = semanasSobreElTope(semanaDe('2026-09-28', 600), '2026-09', 42 * 60);
    expect(r).toEqual([]);
  });

  it('un día ausente del mapa cuenta como cero, no rompe la suma', () => {
    // Pasa de verdad: un mes recién abierto no tiene todos los días programados.
    const r = semanasSobreElTope({ '2026-10-05': 480 }, '2026-10', 42 * 60);
    expect(r).toEqual([]);
  });

  it('salen varias en el orden del calendario', () => {
    const dos = { ...semanaDe('2026-10-05', 480), ...semanaDe('2026-10-19', 480) };
    expect(semanasSobreElTope(dos, '2026-10', 42 * 60).map(s => s.lunes))
      .toEqual(['2026-10-05', '2026-10-19']);
  });

  it('el tope entra por parámetro: con otro número cambia el resultado', () => {
    // Si la ley baja la jornada, esto la sigue sin tocar la pantalla.
    const semana = semanaDe('2026-10-05', 360); // 42 h justas
    expect(semanasSobreElTope(semana, '2026-10', 42 * 60)).toEqual([]);
    expect(semanasSobreElTope(semana, '2026-10', 40 * 60).map(s => s.lunes)).toEqual(['2026-10-05']);
  });

  it('un mapa vacío no produce ninguna', () => {
    expect(semanasSobreElTope({}, '2026-10', 42 * 60)).toEqual([]);
  });
});

// QUÉ MES SE ESTÁ PROGRAMANDO (28 de septiembre de 2026).
//
// SALIÓ DE UN DEFECTO VISTO EN EL NAVEGADOR, no de un repaso teórico. El veredicto de la rotación
// decía «cada semana de AGOSTO le queda con su día de descanso» sobre una selección de 35 días que
// iban del 31 de agosto al 4 de octubre. Treinta y cuatro de esos días no son de agosto.
//
// La causa: el mes se tomaba de la PRIMERA fecha marcada. La rejilla de un mes arranca en el lunes
// de su primera semana, así que salvo que el mes empiece lunes —tres o cuatro veces al año— la
// primera casilla es del mes anterior. Marcar la fila entera de una persona bastaba para disparar el
// error, que es el gesto para el que existe la rotación.
//
// Y NO ERA UNA ETIQUETA. De este valor cuelga la petición del calendario que se juzga y el recorte de
// `semanasEnterasDelMes`: con «agosto» la app pedía agosto, medía las semanas de agosto y daba por
// bueno un mes en el que no iba a escribir nada. Un «todo bien» de un mes que no se miró es
// exactamente el fallo del que habla el encabezado del CLAUDE.md: plausible y equivocado.

describe('qué mes se está programando', () => {
  const rango = (desde: string, cuantos: number) =>
    Array.from({ length: cuantos }, (_, i) => sumarDias(desde, i));

  it('EL CASO REAL: la rejilla de septiembre arranca el 31 de agosto y aun así el mes es septiembre', () => {
    // 35 días: el 31 de agosto, los 30 de septiembre y los 4 primeros de octubre.
    expect(mesQueSePrograma(rango('2026-08-31', 35))).toBe('2026-09');
  });

  it('un mes que SÍ empieza lunes no cambia de respuesta', () => {
    // Junio de 2026 empieza lunes, así que su rejilla no trae días prestados. Es el caso en el que la
    // regla vieja acertaba, y tiene que seguir acertando con la nueva.
    expect(mesQueSePrograma(rango('2026-06-01', 30))).toBe('2026-06');
  });

  it('en una semana que cruza de mes gana el mes que pone más días', () => {
    // Lunes 31 de agosto a domingo 6 de septiembre: uno contra seis.
    expect(mesQueSePrograma(rango('2026-08-31', 7))).toBe('2026-09');
    // Lunes 28 de septiembre a domingo 4 de octubre: tres contra cuatro.
    expect(mesQueSePrograma(rango('2026-09-28', 7))).toBe('2026-10');
  });

  it('un solo día es su propio mes', () => {
    expect(mesQueSePrograma(['2026-08-31'])).toBe('2026-08');
  });

  it('LA MISMA FECHA REPETIDA NO PESA MÁS, aunque haya tres personas marcadas', () => {
    // La selección lleva una entrada por persona y por día. Si contara entradas en vez de días, tres
    // personas marcadas en agosto y una en septiembre moverían el veredicto sin que cambie ni una
    // fecha. Se cuentan días distintos.
    const tresPersonasElUltimoDeAgosto = ['2026-08-31', '2026-08-31', '2026-08-31'];
    expect(mesQueSePrograma([...tresPersonasElUltimoDeAgosto, ...rango('2026-09-01', 2)])).toBe('2026-09');
  });

  it('en un empate manda el mes en el que empieza', () => {
    // Una quincena partida siete y siete. No hay respuesta mejor que otra, pero sí tiene que haber
    // UNA: si dependiera del orden en que llegan las fechas, el mismo gesto daría veredictos distintos.
    expect(mesQueSePrograma(rango('2026-09-24', 14))).toBe('2026-09');
  });

  it('sin fechas no hay mes, y lo dice en vez de inventarlo', () => {
    expect(mesQueSePrograma([])).toBeNull();
  });
});

// LAS SEMANAS QUE QUEDARÍAN SIN NINGÚN DESCANSO, persona por persona (29 de septiembre de 2026).
//
// La maqueta lleva este aviso pegado al nombre —«1 semana sin descanso»— y la vista no lo tenía por
// fila: solo salía dentro de la previa, o sea DESPUÉS de haber armado el envío. Ahí ya es tarde para
// lo único que sirve: mirar la rejilla y ver a quién hay que darle un día.
//
// EL ARTÍCULO 173 no admite matices: todo trabajador tiene derecho a un día de descanso remunerado
// por semana. Siete de siete trabajados es ilegal, no «apretado».
//
// SOLO LAS SEMANAS ENTERAS, y esa es toda la decisión. En la vista de semana las siete columnas son
// una semana completa; en la de mes, la primera y la última pueden venir cortadas por el borde del
// mes. Juzgar una semana de la que solo se ven tres días diría «sin descanso» de alguien que descansa
// el jueves, que no está en pantalla.
describe('las semanas sin ningún descanso', () => {
  const semana = (desde: string) => Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
  const todos = (fechas: string[], valor: boolean) =>
    Object.fromEntries(fechas.map(f => [f, valor]));

  it('siete de siete trabajados es una semana sin descanso', () => {
    const dias = semana('2026-09-28');
    expect(semanasEnterasSinDescanso(dias, todos(dias, true))).toEqual(['2026-09-28']);
  });

  it('con UN solo día libre ya no lo es', () => {
    const dias = semana('2026-09-28');
    const trabajado = { ...todos(dias, true), '2026-10-04': false };
    expect(semanasEnterasSinDescanso(dias, trabajado)).toEqual([]);
  });

  it('un día del que no se sabe nada cuenta como no trabajado', () => {
    // Una fecha que no está en el mapa es un día sin nada programado. No es un descanso decidido,
    // pero tampoco es trabajo: afirmar que esa semana es ilegal sería inventarse la jornada.
    const dias = semana('2026-09-28');
    const trabajado = todos(dias, true);
    delete trabajado['2026-10-01'];
    expect(semanasEnterasSinDescanso(dias, trabajado)).toEqual([]);
  });

  it('en un mes salen todas las semanas malas, en orden', () => {
    const dias = [...semana('2026-09-28'), ...semana('2026-10-05'), ...semana('2026-10-12')];
    const trabajado = { ...todos(dias, true), '2026-10-11': false };
    expect(semanasEnterasSinDescanso(dias, trabajado)).toEqual(['2026-09-28', '2026-10-12']);
  });

  it('UNA SEMANA CORTADA POR EL BORDE NO SE JUZGA, aunque todo lo visible esté trabajado', () => {
    // El caso del mes: la última fila de la rejilla puede traer tres días. Con esos tres trabajados,
    // una regla ingenua diría «semana sin descanso» de alguien que descansa el sábado siguiente.
    const dias = ['2026-10-05', '2026-10-06', '2026-10-07'];
    expect(semanasEnterasSinDescanso(dias, todos(dias, true))).toEqual([]);
  });

  it('sin columnas no hay semanas', () => {
    expect(semanasEnterasSinDescanso([], {})).toEqual([]);
  });
});
