import { describe, it, expect } from 'vitest';
import { COLORES_DE_AVATAR, colorDeAvatar } from './colorDeAvatar';

// EL COLOR DEL CÍRCULO DE CADA PERSONA (29 de septiembre de 2026, propuesta del dueño).
//
// En la rejilla de turnos hay doce o veinte filas y todos los círculos eran del mismo amarillo, así
// que no ayudaban a nada: para volver a encontrar a alguien después de desplazarse había que leer
// los nombres. Con un color por persona, la fila se reconoce antes de leerla.
//
// SE DERIVA DEL `id` Y NO DEL NOMBRE, y esa es la única decisión de verdad. Del nombre, corregirle
// una tilde a alguien le cambiaría el color, y el color dejaría de servir para reconocer: al día
// siguiente esa persona está en otro sitio de la paleta sin que nadie haya tocado nada.
//
// NO SIGNIFICA NADA, a propósito. Es una ayuda para el ojo, no un dato: si alguien lo lee como una
// categoría —«los rosados son de Ventas»— se estará inventando una regla que no existe. Por eso no
// hay ningún mapa de color a nada, solo un reparto estable.

describe('el color del avatar', () => {
  it('la misma persona lleva SIEMPRE el mismo color', () => {
    // Es lo único que hace que sirva. Si cambia entre pintadas, estorba en vez de ayudar.
    const uno = colorDeAvatar('c1');
    expect(colorDeAvatar('c1')).toBe(uno);
    expect(colorDeAvatar('c1')).toBe(uno);
  });

  it('personas distintas reparten por toda la paleta', () => {
    // Con un reparto malo —por ejemplo, la primera letra— una lista de cuarenta personas saldría con
    // tres colores repetidos y el círculo volvería a no distinguir a nadie.
    const claves = Array.from({ length: 40 }, (_, i) => `colaborador-${i}`);
    const usados = new Set(claves.map(colorDeAvatar));
    expect(usados.size).toBe(COLORES_DE_AVATAR.length);
  });

  it('siempre devuelve uno de la paleta, nunca algo inventado', () => {
    for (const clave of ['c1', 'zzz', '42', 'ñ', '']) {
      expect(COLORES_DE_AVATAR).toContain(colorDeAvatar(clave));
    }
  });

  it('una clave vacía no revienta la rejilla', () => {
    // Un `id` que no llegó es un defecto del servidor, no un motivo para dejar la pantalla en blanco.
    expect(colorDeAvatar('')).toBeTruthy();
  });

  it('cada color trae fondo Y texto, en clases completas que Tailwind pueda encontrar escritas', () => {
    // La misma guarda que los mapas de `coloresDeTurno`: una clase armada como `bg-${x}-100` se ve
    // bien en desarrollo y sale SIN COLOR en el paquete de producción, porque Tailwind purga lo que
    // no encuentra escrito.
    for (const c of COLORES_DE_AVATAR) {
      expect(c, c).toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
      expect(c, c).toMatch(/\btext-[a-z]+-\d{2,3}\b/);
    }
  });

  it('no hay dos entradas que pinten igual', () => {
    expect(new Set(COLORES_DE_AVATAR).size).toBe(COLORES_DE_AVATAR.length);
  });
});
