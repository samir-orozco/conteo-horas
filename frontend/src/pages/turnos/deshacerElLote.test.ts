import { describe, it, expect } from 'vitest';
import { accionParaDeshacer } from './deshacerElLote';
import type { CeldaParaPrevia } from './previaDeBloque';

// DESHACER UNA PROGRAMACIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Pedido del dueño, y con una condición suya que cambia la forma de la solución: «teníamos una barra
// de progreso para no hacer en lote todo con el riesgo de colapsar el servidor, entonces en un
// proceso parcial, no de inmediato». O sea que deshacer NO es una transacción atómica en el servidor:
// es un SEGUNDO ENVÍO por el mismo camino, en bloques de seis y con su misma ventana de progreso.
// Trescientas filas de vuelta en una sola petición serían el mismo atragantamiento al revés.
//
// ESTO ES LO ÚNICO QUE HAY QUE DECIDIR: qué se le escribe a cada celda para devolverla a como estaba.
// El navegador ya lo sabe, porque la previa ya lo leía para contar lo que iba a cambiar.
//
// TRES CASOS Y NO DOS, y el tercero es el que se olvida: un día que NADIE había pintado a mano lo
// resolvía el horario. Devolverlo con un turno o con un descanso lo dejaría clavado a mano para
// siempre, y ese día dejaría de seguir al horario de la persona sin que nadie lo note. Deshacer ahí
// es DESPINTAR.
//
// LO QUE ESTA DECISIÓN NO PUEDE DEVOLVER, y hay que decirlo donde se lee: al escribir un día, el
// servidor mueve el descanso obligatorio de esa semana. Revertir las celdas del envío no siempre
// devuelve ese movimiento, porque toca días que nadie seleccionó.

const celda = (extra: Partial<CeldaParaPrevia> = {}): CeldaParaPrevia => ({
  colaboradorId: 'c1',
  fecha: '2026-09-30',
  esDescansoObligatorio: false,
  plantillaIdActual: null,
  esDescansoHoy: false,
  pintadoAMano: false,
  ...extra,
});

describe('a qué se devuelve una celda', () => {
  it('la que tenía un turno del catálogo vuelve a ESE turno', () => {
    expect(accionParaDeshacer(celda({ plantillaIdActual: 'p7', pintadoAMano: true })))
      .toEqual({ tipo: 'TURNO', plantillaId: 'p7' });
  });

  it('y el id se conserva exacto, no «un turno cualquiera»', () => {
    // Dos turnos pueden llamarse igual, así que esto se compara por identidad. Devolver el turno
    // equivocado sería peor que no deshacer: nadie lo notaría, porque la celda igual se ve ocupada.
    expect(accionParaDeshacer(celda({ plantillaIdActual: 'p1', pintadoAMano: true })))
      .toEqual({ tipo: 'TURNO', plantillaId: 'p1' });
    expect(accionParaDeshacer(celda({ plantillaIdActual: 'p2', pintadoAMano: true })))
      .toEqual({ tipo: 'TURNO', plantillaId: 'p2' });
  });

  it('la que estaba marcada A MANO como descanso vuelve a descanso', () => {
    expect(accionParaDeshacer(celda({ esDescansoHoy: true, pintadoAMano: true })))
      .toEqual({ tipo: 'DESCANSO' });
  });

  it('la que NO tenía nada pintado a mano se DESPINTA, no se repinta', () => {
    // EL CASO QUE SE OLVIDA. Ese día lo resolvía el horario de la persona. Devolverlo con un turno o
    // con un descanso lo dejaría clavado a mano para siempre, y dejaría de seguir al horario sin que
    // nadie lo note: el defecto no se ve el día que se deshace, se ve semanas después cuando alguien
    // cambia el horario y ese día no cambia con él.
    expect(accionParaDeshacer(celda())).toEqual({ tipo: 'QUITAR' });
  });

  it('un día que ERA su descanso obligatorio pero que nadie pintó, también se despinta', () => {
    // `esDescansoObligatorio` es del horario y de la ley, no de lo que alguien pintó. Marcarlo a mano
    // como descanso al deshacer lo convertiría en un descanso PINTADO, que es otra cosa: manda sobre
    // la semana y puede mover el descanso de otro día.
    expect(accionParaDeshacer(celda({ esDescansoObligatorio: true, esDescansoHoy: true })))
      .toEqual({ tipo: 'QUITAR' });
  });

  it('pintada a mano pero sin turno y sin descanso, también se despinta', () => {
    // Caso raro y por eso escrito: queda así tras un despintado anterior. Sin este caso, un `else`
    // tendría que decidirlo a ciegas.
    expect(accionParaDeshacer(celda({ pintadoAMano: true }))).toEqual({ tipo: 'QUITAR' });
  });

  it('el turno manda sobre el descanso cuando las dos cosas aparecen', () => {
    // Un descanso TRABAJADO tiene turno encima y además cuenta como descanso. Lo que hay que devolver
    // es el turno: es lo que estaba escrito en el día.
    expect(accionParaDeshacer(celda({ plantillaIdActual: 'p3', esDescansoHoy: true, pintadoAMano: true })))
      .toEqual({ tipo: 'TURNO', plantillaId: 'p3' });
  });
});
