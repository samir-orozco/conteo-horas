import { describe, it, expect } from 'vitest';
import { semanasDeLasColumnas, minutosDeLaSemana } from './semanasDeLaRejilla';

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
