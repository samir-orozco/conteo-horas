import { describe, it, expect } from 'vitest';
import { avisoFueraDeGeocerca, jornadaFueraDeGeocerca } from './avisoFueraDeGeocerca';

// El aviso de la campana cuando un PRESENCIAL marca fuera de la geocerca de su sede,
// dentro del margen que la sede permite (11 de octubre de 2026). Sin metros, por decisión
// del dueño: guardar a cuánto estaba toca la política de datos, y la alerta no lo necesita.
describe('avisoFueraDeGeocerca', () => {
  const ana = { nombre: 'Ana', apellido: 'Pérez' };

  it('una entrada dice quién, qué marca y en qué sede', () => {
    expect(avisoFueraDeGeocerca(ana, 'ENTRADA', 'Poblado')).toEqual({
      tipo: 'MARCO_FUERA_DE_GEOCERCA',
      titulo: 'Ana Pérez marcó fuera de la geocerca',
      cuerpo: 'Marcó la entrada fuera de la geocerca de Poblado, dentro del margen que permite la sede.',
    });
  });

  it('una salida dice «la salida», no «la entrada»', () => {
    expect(avisoFueraDeGeocerca(ana, 'SALIDA', 'Laureles').cuerpo)
      .toBe('Marcó la salida fuera de la geocerca de Laureles, dentro del margen que permite la sede.');
  });

  it('no dice a cuántos metros estaba', () => {
    const { titulo, cuerpo } = avisoFueraDeGeocerca(ana, 'ENTRADA', 'Poblado');
    expect(`${titulo} ${cuerpo}`).not.toMatch(/\d/);
  });
});

// La fila de Registros es una JORNADA y puede tener varias marcaciones (pausas). La alerta
// sale si CUALQUIERA de sus marcas se hizo fuera: el regreso del almuerzo cuenta igual.
describe('jornadaFueraDeGeocerca', () => {
  const marca = (entrada = false, salida = false) => ({ fueraGeocercaEntrada: entrada, fueraGeocercaSalida: salida });

  it('sin ninguna marca fuera, no hay alerta', () => {
    expect(jornadaFueraDeGeocerca([marca(), marca()])).toBe(false);
  });

  it('la entrada del día fuera basta', () => {
    expect(jornadaFueraDeGeocerca([marca(true), marca()])).toBe(true);
  });

  it('la salida del día fuera basta', () => {
    expect(jornadaFueraDeGeocerca([marca(), marca(false, true)])).toBe(true);
  });

  it('una marca del medio también: el regreso del almuerzo fuera', () => {
    expect(jornadaFueraDeGeocerca([marca(), marca(true), marca()])).toBe(true);
  });

  it('una jornada sin marcaciones no tiene alerta', () => {
    expect(jornadaFueraDeGeocerca([])).toBe(false);
  });
});
