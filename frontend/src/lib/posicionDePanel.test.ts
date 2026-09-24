import { describe, it, expect } from 'vitest';
import { posicionDePanel, MARGEN_DE_PANTALLA } from './posicionDePanel';

// DÓNDE CABE UN PANEL FLOTANTE SIN SALIRSE DE LA PANTALLA (22 de septiembre de 2026).
//
// Pedido del dueño, y dicho para TODA esta clase de elementos, no solo para uno: «no deben de
// ocultarse con la pantalla, que se acomode al espacio».
//
// Por eso vive en `lib/` y no junto al calendario: nace para reutilizarse.
//
// POR QUÉ ES UNA DECISIÓN PURA Y NO CSS: un panel anclado a un botón se sale por abajo cuando el
// botón está en la última fila, y por la derecha cuando está en la última columna. Las dos cosas
// pasan SIEMPRE en una rejilla de siete días: el domingo es la última columna y la última persona
// es la última fila. Es un defecto que no se ve en el caso de en medio, que es el que uno prueba a
// mano, y por eso se prueba aquí.
//
// LOS DOS EJES TIENEN TRES CASOS, Y SON LOS MISMOS TRES (el horizontal desde el 24 de septiembre
// de 2026). Primero el lado preferido, si no cabe el contrario, y si no cabe en ninguno se pega
// dentro de la ventana. Nunca sale, y nunca queda en negativo.
//
//   alto:  debajo del botón · si no, encima · si no, pegado dentro
//   ancho: abre a la derecha · si no, a la izquierda · si no, pegado dentro
//
// POR QUÉ VOLTEAR Y NO SOLO CORRER. Hasta hoy el ancho tenía un solo caso, el último: si se salía
// se corría hacia adentro lo justo. Eso deja el panel dentro de la pantalla pero DESPEGADO de la
// celda: en el calendario, el panel del domingo terminaba encima del miércoles y ya no se veía de
// qué día hablaba. Alineándolo al borde derecho de la celda y creciendo hacia la izquierda, el
// panel sigue tocando la celda que se abrió.
//
// Y POR QUÉ NO VOLTEARLO SIEMPRE, que fue la primera idea: siete columnas tienen DOS extremos.
// Abrir siempre hacia la izquierda arregla el domingo y rompe el lunes. Por eso es condicional.

const ventana = { ancho: 1000, alto: 800 };
const panel = { ancho: 300, alto: 200 };

describe('posicionDePanel', () => {
  it('con espacio de sobra va DEBAJO del botón y alineado a su izquierda', () => {
    const ancla = { x: 100, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, ventana)).toEqual({ x: 100, y: 148 });
  });

  it('si no cabe debajo, va ENCIMA', () => {
    // El botón de la última fila de la rejilla: debajo solo quedan 60 px y el panel mide 200.
    const ancla = { x: 100, y: 700, ancho: 80, alto: 40 };
    // Encima: 700 - 200 - 8 = 492.
    expect(posicionDePanel(ancla, panel, ventana).y).toBe(492);
  });

  it('PREFIERE abrir a la derecha aunque también quepa a la izquierda', () => {
    // ESTA PRUEBA FALTABA, y la destapó una mutación que sobrevivió: «voltear siempre» pasaba la
    // suite entera. Pasaba por casualidad, no por estar bien cubierta: con las anclas que había,
    // voltear daba una x negativa, no cabía, y el último recurso devolvía la MISMA x que abrir a
    // la derecha. Las dos ramas coincidían en el resultado y ninguna prueba las separaba.
    //
    // Aquí la celda es ancha, así que las dos aperturas son posibles y dan sitios distintos: 400
    // abriendo a la derecha, 300 volteando. Lo único que las separa es el ORDEN de los casos, que
    // es precisamente lo que no se puede invertir: voltear siempre arregla el domingo y rompe el
    // lunes.
    const ancla = { x: 400, y: 100, ancho: 200, alto: 40 };
    expect(posicionDePanel(ancla, panel, ventana).x).toBe(400);
  });

  it('si no cabe a la derecha, abre hacia la IZQUIERDA', () => {
    // El domingo, que es la última columna. Abriendo a la derecha se saldría: 900 + 300 = 1200.
    const ancla = { x: 900, y: 100, ancho: 80, alto: 40 };
    // Alineado al borde derecho de la celda: 900 + 80 - 300 = 680.
    expect(posicionDePanel(ancla, panel, ventana).x).toBe(680);
  });

  it('y al voltear queda PEGADO a la celda, no a mitad de la tabla', () => {
    // La razón de voltear en vez de correr, escrita como una igualdad: el borde derecho del panel
    // y el borde derecho de la celda son el mismo punto. Corriéndolo hacia adentro esto no se
    // cumple, y el panel del domingo aparece flotando sobre otro día.
    const ancla = { x: 900, y: 100, ancho: 80, alto: 40 };
    const p = posicionDePanel(ancla, panel, ventana);
    expect(p.x + panel.ancho).toBe(ancla.x + ancla.ancho);
  });

  it('si no cabe a NINGUNO de los dos lados, se pega dentro de la ventana', () => {
    // Una celda estrecha contra el borde derecho de una ventana angosta: ni cabe a la derecha
    // (860 + 300) ni hay sitio a la izquierda alineándola (860 + 40 - 300 = 600, pero su borde
    // derecho cae en 900 y la ventana solo admite hasta 892).
    const angosta = { ancho: 900, alto: 800 };
    const ancla = { x: 860, y: 100, ancho: 40, alto: 40 };
    const p = posicionDePanel(ancla, panel, angosta);
    expect(p.x).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.x + panel.ancho).toBeLessThanOrEqual(angosta.ancho - MARGEN_DE_PANTALLA);
  });

  it('nunca se pasa del margen izquierdo', () => {
    const ancla = { x: 2, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, ventana).x).toBe(MARGEN_DE_PANTALLA);
  });

  it('si no cabe ni arriba ni abajo, se queda DENTRO de la ventana', () => {
    // Ventana baja (un portátil con el teclado virtual abierto, o una ventana a media pantalla).
    const chica = { ancho: 1000, alto: 260 };
    const ancla = { x: 100, y: 120, ancho: 80, alto: 40 };
    const p = posicionDePanel(ancla, panel, chica);
    expect(p.y).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.y + panel.alto).toBeLessThanOrEqual(chica.alto - MARGEN_DE_PANTALLA);
  });

  it('un panel MÁS ALTO que la ventana se ancla arriba, no en negativo', () => {
    // Un `y` negativo deja el panel cortado por arriba y sin forma de llegar a su primer control.
    // Más vale que sobre por abajo, que al menos se puede desplazar.
    const enana = { ancho: 1000, alto: 150 };
    const ancla = { x: 100, y: 50, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, enana).y).toBe(MARGEN_DE_PANTALLA);
  });

  it('un panel MÁS ANCHO que la ventana tampoco queda en negativo', () => {
    const angosta = { ancho: 200, alto: 800 };
    const ancla = { x: 100, y: 100, ancho: 80, alto: 40 };
    expect(posicionDePanel(ancla, panel, angosta).x).toBe(MARGEN_DE_PANTALLA);
  });

  it('respeta el margen en los cuatro bordes en un caso cualquiera', () => {
    // La invariante que resume todo lo anterior, escrita una vez.
    const ancla = { x: 940, y: 740, ancho: 50, alto: 40 };
    const p = posicionDePanel(ancla, panel, ventana);
    expect(p.x).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.y).toBeGreaterThanOrEqual(MARGEN_DE_PANTALLA);
    expect(p.x + panel.ancho).toBeLessThanOrEqual(ventana.ancho - MARGEN_DE_PANTALLA);
    expect(p.y + panel.alto).toBeLessThanOrEqual(ventana.alto - MARGEN_DE_PANTALLA);
  });
});
