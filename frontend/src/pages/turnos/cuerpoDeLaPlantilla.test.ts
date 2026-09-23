import { describe, it, expect } from 'vitest';
import { cuerpoDeLaPlantilla, type FormularioDePlantilla } from './cuerpoDeLaPlantilla';

// El cuerpo que se manda al guardar un turno del catálogo (19 de septiembre de 2026).
//
// El servidor ya revisa todo esto otra vez (`limpiarPlantilla`), así que aquí no se valida nada: lo
// único que se decide es QUÉ VIAJA, y eso sí importa en dos sitios.

const TURNO: FormularioDePlantilla = {
  nombre: 'Mañana', color: 'ambar', esDescanso: false, sedeId: 's1',
  horaEntrada: '06:00', horaSalida: '14:00',
  tieneAlmuerzo: true, almuerzoInicio: '10:00', almuerzoFin: '10:30',
  descansos: [{ inicio: '08:00', fin: '08:15' }],
};

describe('cuerpoDeLaPlantilla: el turno de trabajo', () => {
  it('manda lo que el administrador escribió', () => {
    expect(cuerpoDeLaPlantilla(TURNO)).toEqual({
      nombre: 'Mañana', color: 'ambar', esDescanso: false, sedeId: 's1',
      horaEntrada: '06:00', horaSalida: '14:00',
      tieneAlmuerzo: true, almuerzoInicio: '10:00', almuerzoFin: '10:30',
      descansos: [{ inicio: '08:00', fin: '08:15' }],
    });
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

describe('cuerpoDeLaPlantilla: el descanso', () => {
  // ESTA ES LA DECISIÓN. Quien marca «es un día de descanso» después de haber escrito un horario
  // deja los campos llenos en el formulario, porque la pantalla solo los oculta. Si esas horas
  // viajaran, el cuerpo diría una cosa y la casilla otra. El servidor las descarta igual, pero un
  // cuerpo que se contradice a sí mismo es el que después nadie sabe leer.
  it('no manda ninguna hora, aunque hayan quedado escritas en el formulario', () => {
    const cuerpo = cuerpoDeLaPlantilla({ ...TURNO, esDescanso: true });
    expect(cuerpo).toEqual({ nombre: 'Mañana', color: 'ambar', esDescanso: true, sedeId: 's1' });
  });

  it('conserva el nombre, el color y la sede', () => {
    const cuerpo = cuerpoDeLaPlantilla({
      ...TURNO, esDescanso: true, nombre: 'Día libre', color: 'grafito', sedeId: '',
    });
    expect(cuerpo).toEqual({ nombre: 'Día libre', color: 'grafito', esDescanso: true, sedeId: null });
  });
});
