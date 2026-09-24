import { describe, it, expect } from 'vitest';
import { cuerpoDeLaPlantilla, type FormularioDePlantilla } from './cuerpoDeLaPlantilla';

// El cuerpo que se manda al guardar un turno del catálogo (19 de septiembre de 2026).
//
// El servidor ya revisa todo esto otra vez (`limpiarPlantilla`), así que aquí no se valida nada: lo
// único que se decide es QUÉ VIAJA, y eso sí importa en dos sitios.

const TURNO: FormularioDePlantilla = {
  nombre: 'Mañana', color: 'ambar', sedeId: 's1',
  horaEntrada: '06:00', horaSalida: '14:00',
  tieneAlmuerzo: true, almuerzoInicio: '10:00', almuerzoFin: '10:30',
  descansos: [{ inicio: '08:00', fin: '08:15' }],
  // Este turno hereda la tolerancia de quien lo tenga puesto (23 de septiembre de 2026).
  usaToleranciaPropia: false, toleranciaMin: '', toleranciaSalidaMin: '', ajustaEntrada: false,
};

describe('cuerpoDeLaPlantilla: el turno de trabajo', () => {
  it('manda lo que el administrador escribió', () => {
    expect(cuerpoDeLaPlantilla(TURNO)).toEqual({
      nombre: 'Mañana', color: 'ambar', sedeId: 's1',
      horaEntrada: '06:00', horaSalida: '14:00',
      tieneAlmuerzo: true, almuerzoInicio: '10:00', almuerzoFin: '10:30',
      descansos: [{ inicio: '08:00', fin: '08:15' }],
      toleranciaMin: null, toleranciaSalidaMin: null, ajustaEntrada: null,
    });
  });

  // El cuerpo ya no lleva `esDescanso`: la clave desapareció con el concepto (23 de septiembre de
  // 2026). Esta es la guarda de que no vuelva a colarse desde el formulario.
  it('no manda ninguna clave de descanso', () => {
    expect(Object.keys(cuerpoDeLaPlantilla(TURNO))).not.toContain('esDescanso');
  });

  // Igual que en el horario: la clave `descansos` viaja SIEMPRE, también vacía. Es la que le dice al
  // servidor que esta pantalla sí sabe de descansos.
  it('sin descansos, la clave viaja igual, como lista vacía', () => {
    expect(cuerpoDeLaPlantilla({ ...TURNO, descansos: [] })).toMatchObject({ descansos: [] });
  });

  // Las filas a medias viajan tal cual: el servidor las ignora si están vacías, y numera sus avisos
  // («descanso 2: ...») contando la fila que ve el administrador. Quitarlas aquí correría ese número.
  it('las filas a medias o vacías viajan como están', () => {
    const conHuecos = { ...TURNO, descansos: [{ inicio: '', fin: '' }, { inicio: '15:00', fin: '' }] };
    expect(cuerpoDeLaPlantilla(conHuecos)).toMatchObject({
      descansos: [{ inicio: '', fin: '' }, { inicio: '15:00', fin: '' }],
    });
  });

  // Un campo de hora vacío en el navegador es la cadena vacía. Mandarla diría «esta es la hora»;
  // null dice «no hay ventana», que es lo que el administrador quiso.
  it('el almuerzo sin llenar viaja como null, no como cadena vacía', () => {
    expect(cuerpoDeLaPlantilla({ ...TURNO, almuerzoInicio: '', almuerzoFin: '' }))
      .toMatchObject({ almuerzoInicio: null, almuerzoFin: null });
  });

  it('sin sede elegida viaja null', () => {
    expect(cuerpoDeLaPlantilla({ ...TURNO, sedeId: '' })).toMatchObject({ sedeId: null });
  });

  // Esta prueba la puso una mutación que SOBREVIVIÓ: fijar `tieneAlmuerzo: true` no rompía nada,
  // porque el fixture ya lo tenía en true y ninguna prueba lo movía. No es un detalle: así es como
  // un turno corto dice que a esa gente no se le descuenta almuerzo, y sin eso se le restarían los
  // minutos fijos del horario a quien trabaja cuatro horas. Es dinero.
  it('un turno que no descuenta almuerzo lo dice, y eso viaja', () => {
    expect(cuerpoDeLaPlantilla({ ...TURNO, tieneAlmuerzo: false })).toMatchObject({ tieneAlmuerzo: false });
  });
});

// LA TOLERANCIA PROPIA DEL TURNO (23 de septiembre de 2026).
//
// El turno puede sobrescribir la tolerancia del horario. Vacío significa «la del horario».
//
// UN INTERRUPTOR Y NO TRES CASILLAS SUELTAS: `ajustaEntrada` es un sí/no, y un sí/no no sabe decir
// «hereda». Con una casilla suelta no habría forma de distinguir «que no ajuste» de «que mande el
// horario». El interruptor resuelve las tres a la vez, igual que `tieneAlmuerzo` ya hace en este
// mismo modal.
//
// Y EL CASO QUE SE ROMPE SOLO: el formulario guarda TEXTO, así que el vacío es `''`. Con
// `p.toleranciaMin || null`, un turno donde alguien escriba 0 viajaría como «hereda», que es lo
// contrario de lo que quiso decir. Es el mismo defecto del `??` del backend, entrando por la puerta
// de atrás.
describe('cuerpoDeLaPlantilla: la tolerancia propia', () => {
  it('con el interruptor apagado, las tres viajan vacías: el turno hereda', () => {
    expect(cuerpoDeLaPlantilla(TURNO)).toMatchObject({
      toleranciaMin: null, toleranciaSalidaMin: null, ajustaEntrada: null,
    });
  });

  it('encendido, viajan los números que se escribieron', () => {
    const propio = {
      ...TURNO, usaToleranciaPropia: true,
      toleranciaMin: '3', toleranciaSalidaMin: '20', ajustaEntrada: true,
    };
    expect(cuerpoDeLaPlantilla(propio)).toMatchObject({
      toleranciaMin: 3, toleranciaSalidaMin: 20, ajustaEntrada: true,
    });
  });

  it('un CERO escrito viaja como cero, no como vacío', () => {
    // El caso que separa `=== ''` de `||`. «Sin tolerancia» no es «la del horario».
    const propio = { ...TURNO, usaToleranciaPropia: true, toleranciaMin: '0' };
    expect(cuerpoDeLaPlantilla(propio)).toMatchObject({ toleranciaMin: 0 });
  });

  it('encendido pero con un campo en blanco, ESE campo hereda', () => {
    // Se puede sobrescribir solo la de entrada y dejar la de salida como la tenga el horario.
    const propio = { ...TURNO, usaToleranciaPropia: true, toleranciaMin: '5', toleranciaSalidaMin: '' };
    expect(cuerpoDeLaPlantilla(propio)).toMatchObject({ toleranciaMin: 5, toleranciaSalidaMin: null });
  });

  it('encendido, un `ajustaEntrada` en false viaja como false y no como vacío', () => {
    // Es la forma de que el turno APAGUE esa política de la empresa.
    const propio = { ...TURNO, usaToleranciaPropia: true, ajustaEntrada: false };
    expect(cuerpoDeLaPlantilla(propio)).toMatchObject({ ajustaEntrada: false });
  });

  it('apagado, lo que quedó escrito NO viaja', () => {
    // Quien llenó los campos y después apagó el interruptor dejó texto ahí, porque la pantalla solo
    // lo oculta. Mandarlo diría lo contrario de lo que la casilla muestra.
    const residuo = {
      ...TURNO, usaToleranciaPropia: false,
      toleranciaMin: '3', toleranciaSalidaMin: '20', ajustaEntrada: true,
    };
    expect(cuerpoDeLaPlantilla(residuo)).toMatchObject({
      toleranciaMin: null, toleranciaSalidaMin: null, ajustaEntrada: null,
    });
  });
});

// AQUÍ HABÍA UN BLOQUE ENTERO sobre el día de descanso, y se borró el 23 de septiembre de 2026.
//
// Describía qué viajaba al marcar «es un día de descanso»: que no fueran horas contradictorias, que
// se conservaran nombre, color y sede. Ese camino dejó de existir por decisión del dueño, no porque
// las pruebas estorbaran.
//
// EL PORQUÉ, medido antes de decidirlo: un turno de descanso solo llevaba nombre y color, y la
// celda del calendario no lee ninguno de los dos. Y marcarlo no cambiaba el estado del día salvo
// para gente ROTATIVA; para un FIJO o un PRESUMIDO quedaba como «sin turno», que es el defecto que
// el dueño reportó viendo el botón de «Agregar» donde esperaba un descanso.
//
// Lo que ocupa su lugar se prueba en el CALENDARIO, no aquí: marcar un día como libre es ahora una
// acción sobre el día.
