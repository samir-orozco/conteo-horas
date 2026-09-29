import { describe, it, expect } from 'vitest';
import { fondoDeLaColumna } from './fondoDeLaColumna';

// EL FONDO DE UNA COLUMNA DE LA REJILLA (29 de septiembre de 2026).
//
// Cuatro cosas quieren pintar el mismo sitio y solo puede ganar una:
//
//   SELECCIÓN ENTERA  la fila de esa persona, o esa columna, está marcada completa. Pedido del dueño
//                     con una maqueta: siete halos sueltos no se leen como «esta persona entera», hay
//                     que recorrerlos y comprobar que no falta ninguno. Un fondo continuo lo dice sin
//                     contar nada.
//   HOY               la referencia de «dónde estoy» en un mes de cuarenta y dos columnas.
//   DE OTRO MES       el relleno de la primera y la última fila del mes.
//   nada              el caso normal.
//
// LA PRECEDENCIA NO ES ARBITRARIA y por eso vive aquí y no en un ternario dentro del JSX: la
// selección gana SIEMPRE porque es lo que esa persona acaba de hacer, y un fondo que no responde al
// gesto se lee como que el gesto no funcionó. Hoy gana al relleno porque hoy puede caer en una
// columna de relleno —el 1 de octubre en la vista de septiembre— y ahí es cuando más falta hace.
//
// DEVUELVE UNA CLASE COMPLETA Y NO UN TROZO: una clase armada como `bg-${x}-100` se ve bien en
// desarrollo y sale SIN COLOR en el paquete de producción, porque Tailwind purga lo que no encuentra
// escrito. Es la misma guarda que los mapas de `coloresDeTurno` y `colorDeAvatar`.
//
// SON OPACOS Y NO TRANSLÚCIDOS: la columna de la persona es `sticky`, y un fondo con alfa deja ver
// por debajo las columnas que van pasando al desplazar. Los valores son el mismo amarillo de la marca
// ya compuesto sobre blanco, así que en el resto de la rejilla no cambia nada.
//
// LLEVA `!` LA DE LA SELECCIÓN, y no es decoración: dos utilidades del mismo `background-color` no se
// ordenan por su posición en el atributo `class` sino por el orden de la HOJA, así que sin el `!` el
// gris del relleno le ganaba al amarillo aunque fuera después. Ya mordió una vez con los bordes.

describe('el fondo de una columna', () => {
  const nada = { enSeleccionEntera: false, esHoy: false, deOtroMes: false };

  it('sin nada especial, sin fondo', () => {
    expect(fondoDeLaColumna(nada)).toBe('');
  });

  it('la selección entera manda sobre todo lo demás', () => {
    // Es lo que esa persona acaba de hacer. Un fondo que no responde al gesto se lee como que el
    // gesto no funcionó.
    const amarillo = fondoDeLaColumna({ enSeleccionEntera: true, esHoy: false, deOtroMes: false });
    expect(fondoDeLaColumna({ enSeleccionEntera: true, esHoy: true, deOtroMes: true })).toBe(amarillo);
    expect(fondoDeLaColumna({ enSeleccionEntera: true, esHoy: false, deOtroMes: true })).toBe(amarillo);
  });

  it('HOY gana al relleno de otro mes, que es cuando de verdad hace falta', () => {
    // El 1 de octubre en la vista de septiembre es a la vez hoy y relleno. Pintarlo de gris ahí
    // esconde la única referencia de «dónde estoy» justo el día que se cambia de mes.
    const deHoy = fondoDeLaColumna({ ...nada, esHoy: true });
    expect(fondoDeLaColumna({ enSeleccionEntera: false, esHoy: true, deOtroMes: true })).toBe(deHoy);
    expect(deHoy).not.toBe(fondoDeLaColumna({ ...nada, deOtroMes: true }));
  });

  it('el relleno de otro mes, cuando no es ninguna de las otras dos', () => {
    expect(fondoDeLaColumna({ ...nada, deOtroMes: true })).toBeTruthy();
  });

  it('los cuatro fondos son DISTINTOS entre sí', () => {
    // Si dos coincidieran, una de las cuatro situaciones dejaría de poder verse y nadie lo notaría:
    // la pantalla se vería bien y diría menos.
    const todos = [
      fondoDeLaColumna(nada),
      fondoDeLaColumna({ ...nada, enSeleccionEntera: true }),
      fondoDeLaColumna({ ...nada, esHoy: true }),
      fondoDeLaColumna({ ...nada, deOtroMes: true }),
    ];
    expect(new Set(todos).size).toBe(4);
  });

  it('las clases van escritas enteras, para que Tailwind las encuentre', () => {
    for (const estado of [{ ...nada, enSeleccionEntera: true }, { ...nada, esHoy: true }, { ...nada, deOtroMes: true }]) {
      // `bg-primary/20`, `bg-primary/5`, `bg-gray-100`: nombre, escala opcional y opacidad opcional.
      // La primera versión de este patrón no admitía la barra de la opacidad y dio un rojo FALSO:
      // decía que `bg-primary/20` estaba mal armada cuando está escrita entera, que es lo único que
      // esto viene a comprobar.
      expect(fondoDeLaColumna(estado)).toMatch(/^!?bg-([a-z]+(-\d{2,3})?|\[#[0-9a-f]{6}\])$/);
    }
  });

  it('la de la selección lleva `!`, porque compite con el gris del relleno', () => {
    // Dos utilidades del mismo `background-color` las ordena la HOJA, no el atributo. Sin el `!`, el
    // gris gana aunque se escriba después. Comprobado en el navegador con los bordes de la celda.
    expect(fondoDeLaColumna({ ...nada, enSeleccionEntera: true })).toMatch(/^!/);
  });
});
