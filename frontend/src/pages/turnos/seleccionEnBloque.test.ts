import { describe, it, expect } from 'vitest';
import {
  claveDeCelda, celdasDelRectangulo, escribibles, alternarConjunto, conjuntoCompleto,
} from './seleccionEnBloque';

// LA SELECCIÓN EN BLOQUE (28 de septiembre de 2026).
//
// Programar a veinte personas un mes entero pintando día por día son seiscientos clics. Lo que hace
// viable el planificador es marcar un RECTÁNGULO: clic en una esquina, clic en la otra, y queda
// seleccionado todo lo de en medio.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO UN PUÑADO DE `onClick`: el rectángulo depende del ORDEN de la
// rejilla, que es filas por columnas, y ese orden lo decide la respuesta del servidor, no el ratón.
// Con las dos esquinas y las dos listas, qué celdas caen dentro es aritmética, y se puede probar
// sin montar la pantalla.
//
// Las celdas se identifican por `colaboradorId` y `fecha`, que es la misma pareja con la que el
// backend escribe un día (`PUT /turnos/dia`). Así lo seleccionado se convierte en escrituras sin
// traducir nada por el camino.

const GENTE = ['c1', 'c2', 'c3', 'c4'];
const DIAS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

const claves = (celdas: { colaboradorId: string; fecha: string }[]) => celdas.map(claveDeCelda);

describe('la clave de una celda', () => {
  it('junta persona y fecha, y es la misma pareja que usa el backend', () => {
    expect(claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-28' })).toBe('c1|2026-09-28');
  });

  it('dos celdas distintas nunca comparten clave', () => {
    const a = claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-28' });
    const b = claveDeCelda({ colaboradorId: 'c1', fecha: '2026-09-29' });
    const c = claveDeCelda({ colaboradorId: 'c2', fecha: '2026-09-28' });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('el rectángulo entre dos esquinas', () => {
  it('una esquina consigo misma es una sola celda', () => {
    const a = { colaboradorId: 'c2', fecha: '2026-09-29' };
    expect(claves(celdasDelRectangulo(a, a, GENTE, DIAS))).toEqual(['c2|2026-09-29']);
  });

  it('en la misma fila toma los días de en medio', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c2', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-10-01' },
      GENTE, DIAS,
    );
    expect(claves(r)).toEqual(['c2|2026-09-29', 'c2|2026-09-30', 'c2|2026-10-01']);
  });

  it('en la misma columna toma las personas de en medio', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c2', fecha: '2026-09-29' },
      { colaboradorId: 'c4', fecha: '2026-09-29' },
      GENTE, DIAS,
    );
    expect(claves(r)).toEqual(['c2|2026-09-29', 'c3|2026-09-29', 'c4|2026-09-29']);
  });

  it('un rectángulo de verdad da el producto de las dos, por filas', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-09-30' },
      GENTE, DIAS,
    );
    // Por filas y no por columnas: es el orden en que se leen, y también el orden en que se van a
    // escribir, así que el progreso avanza persona por persona y no saltando entre ellas.
    expect(claves(r)).toEqual([
      'c1|2026-09-29', 'c1|2026-09-30',
      'c2|2026-09-29', 'c2|2026-09-30',
    ]);
  });

  it('da igual por qué esquina se empiece', () => {
    // Nadie arrastra siempre de arriba a la izquierda hacia abajo a la derecha. Las cuatro
    // direcciones tienen que dar el mismo rectángulo.
    const a = { colaboradorId: 'c1', fecha: '2026-09-29' };
    const b = { colaboradorId: 'c3', fecha: '2026-10-01' };
    const derecho = claves(celdasDelRectangulo(a, b, GENTE, DIAS));
    const alReves = claves(celdasDelRectangulo(b, a, GENTE, DIAS));
    const cruzado1 = claves(celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-10-01' },
      { colaboradorId: 'c3', fecha: '2026-09-29' },
      GENTE, DIAS,
    ));
    expect(alReves).toEqual(derecho);
    expect(cruzado1).toEqual(derecho);
    expect(derecho).toHaveLength(9); // 3 personas x 3 días
  });

  it('una esquina que no está en la rejilla no selecciona nada', () => {
    // Puede pasar tras recargar: la selección guardaba a alguien que el filtro ya no muestra.
    // Devolver un rectángulo a medias sería peor que no devolver nada.
    const r = celdasDelRectangulo(
      { colaboradorId: 'fantasma', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2026-09-30' },
      GENTE, DIAS,
    );
    expect(r).toEqual([]);
  });

  it('una fecha que no está en la rejilla tampoco', () => {
    const r = celdasDelRectangulo(
      { colaboradorId: 'c1', fecha: '2026-09-29' },
      { colaboradorId: 'c2', fecha: '2025-01-01' },
      GENTE, DIAS,
    );
    expect(r).toEqual([]);
  });
});

// ────────── LO QUE NO SE PUEDE ESCRIBIR NO SE PUEDE MARCAR (29 de septiembre de 2026) ──────────
//
// Pedido del dueño, con sus palabras: «si no lo puedo cambiar, sería bueno que no lo deje
// seleccionar tampoco». Hasta hoy una celda de un día pasado entraba a la selección igual que
// cualquier otra, se pintaba apagada, y solo al confirmar aparecía la línea «no se tocan porque el
// día ya pasó: 30». Eso es contarle a alguien que parte de lo que pidió no se hizo, cuando salía
// más barato no dejárselo pedir.
//
// SE FILTRA AQUÍ Y NO EN CADA GESTO, y es la razón de que esto exista: hay CINCO puertas por las que
// una celda entra a la selección —el clic suelto, el doble clic, el arrastre, el botón de la persona
// y el del día—, y una regla escrita cinco veces se separa a la primera (§9.3). Cuatro filtrando y
// una sin filtrar es peor que ninguna, porque nadie vuelve a mirar las otras cuatro.
//
// LA REGLA ES `sePuedePintar` Y NO UNA COPIA, que es la misma con la que la rejilla decide si dibuja
// la celda apagada y la misma que usa el plan de escritura. Con dos, la pantalla ofrecería marcar
// algo que el envío descartaría en silencio.

describe('las celdas de un gesto en las que se puede escribir', () => {
  const c = (fecha: string) => ({ colaboradorId: 'c1', fecha });

  it('hoy SÍ entra: puede que esa persona todavía no haya marcado', () => {
    // Esconder hoy «por si acaso» le quitaría al administrador un cambio legítimo: a las siete de la
    // mañana, antes de que nadie marque, el día de hoy se puede reprogramar entero.
    expect(escribibles([c('2026-09-29')], '2026-09-29')).toEqual([c('2026-09-29')]);
  });

  it('el pasado no', () => {
    expect(escribibles([c('2026-09-28')], '2026-09-29')).toEqual([]);
  });

  it('de un rectángulo que cruza la frontera queda la mitad de adelante, en orden', () => {
    // No se descarta el rectángulo entero: arrastrar de lunes a domingo a mitad de semana es lo
    // normal, y devolver nada obligaría a apuntar el arrastre al día exacto.
    const arrastre = ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'].map(c);
    expect(escribibles(arrastre, '2026-09-29')).toEqual([c('2026-09-29'), c('2026-09-30')]);
  });

  it('un gesto entero en el pasado no deja nada', () => {
    expect(escribibles(['2026-09-01', '2026-09-02'].map(c), '2026-09-29')).toEqual([]);
  });

  it('sin celdas, nada', () => {
    expect(escribibles([], '2026-09-29')).toEqual([]);
  });
});

// ────────── MARCAR O DESMARCAR UNA FILA ENTERA, O UNA COLUMNA ──────────
//
// El botón del nombre marca «a esta persona, todo el período», y el del día «a todo el mundo, este
// día». Los dos son interruptores: si ya está todo marcado, el segundo clic lo quita.
//
// LA DIRECCIÓN SE DECIDE SOBRE LO ESCRIBIBLE Y NO SOBRE LO PEDIDO, y ahí está el defecto que esto
// viene a evitar. Filtrando el pasado sin tocar la cuenta, una fila que empieza el lunes y hoy es
// jueves NUNCA estaría «completa» —los tres días de atrás no se marcan jamás— así que el botón
// pasaría a marcar siempre y no podría desmarcar nunca. El interruptor se habría roto en el gesto
// más usado de la pantalla, sin que nada fallara.

describe('alternar una fila o una columna entera', () => {
  const c = (fecha: string) => ({ colaboradorId: 'c1', fecha });
  const ninguna = () => false;
  const todas = () => true;

  it('nada marcado: marca lo escribible', () => {
    const r = alternarConjunto(['2026-09-29', '2026-09-30'].map(c), ninguna, '2026-09-29');
    expect(r).toEqual({ celdas: [c('2026-09-29'), c('2026-09-30')], apagar: false });
  });

  it('todo marcado: el segundo clic lo quita', () => {
    const r = alternarConjunto(['2026-09-29', '2026-09-30'].map(c), todas, '2026-09-29');
    expect(r.apagar).toBe(true);
  });

  it('CON DÍAS PASADOS, «completa» se mide sobre lo escribible', () => {
    // La fila va del lunes al domingo y hoy es martes. El lunes no se puede marcar y nunca se va a
    // marcar. Contándolo, esta fila no estaría completa jamás y el botón no podría apagarla.
    const semana = ['2026-09-28', '2026-09-29', '2026-09-30'].map(c);
    const marcadas = new Set(['2026-09-29', '2026-09-30']);
    const r = alternarConjunto(semana, x => marcadas.has(x.fecha), '2026-09-29');
    expect(r).toEqual({ celdas: [c('2026-09-29'), c('2026-09-30')], apagar: true });
  });

  it('una columna entera en el pasado no hace nada y no revienta', () => {
    const r = alternarConjunto([c('2026-09-01')], ninguna, '2026-09-29');
    expect(r.celdas).toEqual([]);
  });

  it('con una sola sin marcar, el clic MARCA en vez de apagar', () => {
    // El borde del interruptor. Con `some` en vez de `every`, una fila a la que le falta un día se
    // apagaría entera y quien la miraba perdería lo que llevaba marcado.
    const semana = ['2026-09-29', '2026-09-30', '2026-10-01'].map(c);
    const marcadas = new Set(['2026-09-29', '2026-09-30']);
    const r = alternarConjunto(semana, x => marcadas.has(x.fecha), '2026-09-29');
    expect(r.apagar).toBe(false);
  });
});

// ────────── CUÁNDO UNA FILA O UNA COLUMNA ESTÁ ENTERA (29 de septiembre de 2026) ──────────
//
// Pedido del dueño con una maqueta: «que cuando la selección es general, se marque toda la fila o
// columna amarillo claro». Hoy una fila entera marcada son siete celdas con su halo, y siete halos
// sueltos no se leen como «esta persona entera»: hay que recorrerlos y comprobar que no falta ninguno.
// Un fondo continuo lo dice sin contar nada.
//
// SE APOYA EN `alternarConjunto` Y NO REPITE LA CUENTA: es exactamente la misma pregunta que decide si
// el botón de la persona marca o desmarca, y tenerla en dos sitios es como se separan (§9.3). Si
// discreparan, el fondo diría «entera» de una fila que el botón todavía va a marcar.
//
// LA DIFERENCIA CON `apagar` ES EL CONJUNTO VACÍO, y por eso esto existe en vez de usar aquel
// directamente: `every` sobre una lista vacía es `true`, así que una fila entera en el pasado —donde
// no hay NADA que marcar— saldría como «completa» y se pintaría de amarillo sin que nadie la haya
// tocado. Para el interruptor eso da igual (apagar cero celdas no hace nada); para un fondo, no.

describe('cuándo un conjunto está entero', () => {
  const c = (fecha: string) => ({ colaboradorId: 'c1', fecha });
  const HOY = '2026-09-29';
  const ninguna = () => false;
  const todas = () => true;

  it('todas las escribibles marcadas: está entera', () => {
    expect(conjuntoCompleto(['2026-09-29', '2026-09-30'].map(c), todas, HOY)).toBe(true);
  });

  it('con una sin marcar, no', () => {
    const marcadas = new Set(['2026-09-29']);
    expect(conjuntoCompleto(['2026-09-29', '2026-09-30'].map(c), x => marcadas.has(x.fecha), HOY)).toBe(false);
  });

  it('LOS DÍAS PASADOS NO CUENTAN: una fila que empieza el lunes puede estar entera un jueves', () => {
    // Si contaran, ninguna fila de la semana en curso estaría entera jamás y el fondo no saldría
    // nunca, que es el mismo defecto que ya tuvo el interruptor del botón.
    const semana = ['2026-09-28', '2026-09-29', '2026-09-30'].map(c);
    const marcadas = new Set(['2026-09-29', '2026-09-30']);
    expect(conjuntoCompleto(semana, x => marcadas.has(x.fecha), HOY)).toBe(true);
  });

  it('UNA FILA ENTERA EN EL PASADO NO ESTÁ ENTERA, está vacía', () => {
    // El caso que separa esto de `alternarConjunto`: ahí no hay nada que marcar, y `every` sobre una
    // lista vacía dice `true`. Pintarla de amarillo diría que alguien la seleccionó, y nadie pudo.
    expect(conjuntoCompleto(['2026-09-01', '2026-09-02'].map(c), ninguna, HOY)).toBe(false);
    expect(conjuntoCompleto(['2026-09-01', '2026-09-02'].map(c), todas, HOY)).toBe(false);
  });

  it('sin celdas tampoco', () => {
    expect(conjuntoCompleto([], todas, HOY)).toBe(false);
  });
});
