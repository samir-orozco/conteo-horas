import { describe, it, expect } from 'vitest';
import { etiquetaDelPeriodo } from './etiquetaDelPeriodo';

// DÓNDE ESTÁ PARADO EL CALENDARIO RESPECTO A HOY (28 de septiembre de 2026).
//
// El título dice «Septiembre de 2026» o «28 sep – 4 oct», y eso no responde la pregunta que uno se
// hace al llegar: ¿esto es la semana en curso o me fui tres semanas adelante? Se navega con dos
// flechas, así que perderse es lo normal, y programar turnos en el mes equivocado no se ve raro en
// pantalla: se ve exactamente igual que programarlos en el correcto.
//
// POR QUÉ ES UNA FUNCIÓN PURA Y NO UN `? :` EN EL JSX: es aritmética de calendario, que es justo la
// que falla en silencio. Una diferencia de semanas contada sobre las fechas en vez de sobre los lunes
// dice «semana pasada» un domingo; una diferencia de meses contada con el número de mes dice «hace
// once meses» el 1 de enero. Las dos salen plausibles.
//
// `hoy` ENTRA POR PARÁMETRO, igual que en `sePuedePintar`: si lo leyera del reloj, estas pruebas
// dirían una cosa distinta cada día y no se podría afirmar nada.

describe('la etiqueta del día', () => {
  it('hoy es «Hoy», y es el período actual', () => {
    expect(etiquetaDelPeriodo('DIA', '2026-09-28', '2026-09-28')).toEqual({ texto: 'Hoy', esActual: true });
  });

  it('el de al lado se dice con su nombre, no con un número', () => {
    // «En 1 día» y «Hace 1 día» son correctos y suenan a máquina. Ayer y mañana tienen nombre.
    expect(etiquetaDelPeriodo('DIA', '2026-09-29', '2026-09-28')).toEqual({ texto: 'Mañana', esActual: false });
    expect(etiquetaDelPeriodo('DIA', '2026-09-27', '2026-09-28')).toEqual({ texto: 'Ayer', esActual: false });
  });

  it('más lejos se cuenta', () => {
    expect(etiquetaDelPeriodo('DIA', '2026-10-03', '2026-09-28')).toEqual({ texto: 'En 5 días', esActual: false });
    expect(etiquetaDelPeriodo('DIA', '2026-09-23', '2026-09-28')).toEqual({ texto: 'Hace 5 días', esActual: false });
  });

  it('LA VISTA DE DÍA TIENE SU PROPIO TEXTO, que es donde la maqueta se equivoca', () => {
    // En la maqueta la etiqueta se decide con `if (VISTA === 'SEMANA') ... else ...`, o sea binario
    // sobre TRES modos: la vista de día cae en el `else` y muestra «Semanas completas», que de un día
    // no dice nada. Es el `? :` sobre un conjunto abierto del que advierte CLAUDE.md §9.4.
    //
    // El caso se queda para que el día que alguien junte dos modos en una rama, esto se ponga rojo.
    expect(etiquetaDelPeriodo('DIA', '2026-09-28', '2026-09-28').texto).toBe('Hoy');
    expect(etiquetaDelPeriodo('DIA', '2026-09-28', '2026-09-28').texto).not.toMatch(/semana/i);
  });
});

describe('la etiqueta de la semana', () => {
  it('cualquier día de esta semana es «Semana en curso»', () => {
    // EL CASO QUE CAZA CONTAR SOBRE LAS FECHAS EN VEZ DE SOBRE LOS LUNES. Hoy es lunes 28 y el ancla
    // es el jueves 1 de octubre: son la MISMA semana (lunes 28 a domingo 4), pero hay cuatro días de
    // diferencia y además cambia el mes. Restando fechas saldría «en 1 semana»; restando lunes, cero.
    expect(etiquetaDelPeriodo('SEMANA', '2026-10-01', '2026-09-28')).toEqual({ texto: 'Semana en curso', esActual: true });
    expect(etiquetaDelPeriodo('SEMANA', '2026-10-04', '2026-09-28')).toEqual({ texto: 'Semana en curso', esActual: true });
    expect(etiquetaDelPeriodo('SEMANA', '2026-09-28', '2026-10-04')).toEqual({ texto: 'Semana en curso', esActual: true });
  });

  it('la de al lado se dice con su nombre', () => {
    expect(etiquetaDelPeriodo('SEMANA', '2026-10-05', '2026-09-28')).toEqual({ texto: 'Semana siguiente', esActual: false });
    expect(etiquetaDelPeriodo('SEMANA', '2026-09-21', '2026-09-28')).toEqual({ texto: 'Semana pasada', esActual: false });
  });

  it('más lejos se cuenta en semanas', () => {
    expect(etiquetaDelPeriodo('SEMANA', '2026-10-19', '2026-09-28')).toEqual({ texto: 'En 3 semanas', esActual: false });
    expect(etiquetaDelPeriodo('SEMANA', '2026-09-14', '2026-09-28')).toEqual({ texto: 'Hace 2 semanas', esActual: false });
  });

  it('y la cuenta cruza el año sin descarrilarse', () => {
    // Hoy miércoles 30 de diciembre (semana del lunes 28), ancla lunes 4 de enero: es la semana
    // siguiente, aunque cambie el año. Contar con el número de semana del año diría «hace 51».
    expect(etiquetaDelPeriodo('SEMANA', '2027-01-04', '2026-12-30')).toEqual({ texto: 'Semana siguiente', esActual: false });
    expect(etiquetaDelPeriodo('SEMANA', '2026-12-30', '2027-01-04')).toEqual({ texto: 'Semana pasada', esActual: false });
  });
});

describe('la etiqueta del mes', () => {
  it('cualquier día de este mes es «Mes en curso»', () => {
    expect(etiquetaDelPeriodo('MES', '2026-09-01', '2026-09-28')).toEqual({ texto: 'Mes en curso', esActual: true });
    expect(etiquetaDelPeriodo('MES', '2026-09-30', '2026-09-28')).toEqual({ texto: 'Mes en curso', esActual: true });
  });

  it('el de al lado se dice con su nombre', () => {
    expect(etiquetaDelPeriodo('MES', '2026-10-15', '2026-09-28')).toEqual({ texto: 'Mes siguiente', esActual: false });
    expect(etiquetaDelPeriodo('MES', '2026-08-15', '2026-09-28')).toEqual({ texto: 'Mes pasado', esActual: false });
  });

  it('más lejos se cuenta en meses', () => {
    expect(etiquetaDelPeriodo('MES', '2027-01-15', '2026-09-28')).toEqual({ texto: 'En 4 meses', esActual: false });
    expect(etiquetaDelPeriodo('MES', '2026-06-15', '2026-09-28')).toEqual({ texto: 'Hace 3 meses', esActual: false });
  });

  it('EL CRUCE DE AÑO, que es el caso que caza restar el número de mes', () => {
    // Diciembre es 12 y enero es 1. Restando los números da -11, y la etiqueta diría «hace 11 meses»
    // del mes que viene. Hay que contar año y mes juntos.
    expect(etiquetaDelPeriodo('MES', '2027-01-10', '2026-12-15')).toEqual({ texto: 'Mes siguiente', esActual: false });
    expect(etiquetaDelPeriodo('MES', '2026-12-15', '2027-01-10')).toEqual({ texto: 'Mes pasado', esActual: false });
  });

  it('y el MISMO MES DE OTRO AÑO no es el mes en curso', () => {
    // El error simétrico: comparar solo el número de mes daría «Mes en curso» para septiembre del año
    // que viene, y ahí se programaría un mes entero en el año equivocado.
    expect(etiquetaDelPeriodo('MES', '2027-09-15', '2026-09-28')).toEqual({ texto: 'En 12 meses', esActual: false });
  });
});
