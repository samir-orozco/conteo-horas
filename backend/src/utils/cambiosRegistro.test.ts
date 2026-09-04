import { describe, it, expect } from 'vitest';
import { diferenciasDeRegistro, type EstadoRegistro } from './cambiosRegistro';

// Instantes reales; lo que se guarda como texto es la hora de Bogotá.
const h = (iso: string) => new Date(iso);

const base: EstadoRegistro = {
  fecha: h('2026-08-20T05:00:00.000Z'),
  entrada: h('2026-08-20T13:15:00.000Z'),   // 8:15 a.m. en Bogotá
  salida: h('2026-08-20T22:00:00.000Z'),    // 5:00 p.m.
  tipo: 'NORMAL',
  observacion: null,
  salidaAlmuerzo: false,
};

describe('qué cambió en una marcación', () => {
  it('sin cambios, no hay nada que registrar', () => {
    expect(diferenciasDeRegistro(base, {})).toEqual([]);
  });

  it('un campo que llega con el MISMO valor no cuenta como cambio', () => {
    // Guardar sin tocar nada no puede ensuciar el historial.
    expect(diferenciasDeRegistro(base, { entrada: h('2026-08-20T13:15:00.000Z') })).toEqual([]);
  });

  it('adelantar la entrada queda con la hora de antes y la de después', () => {
    const d = diferenciasDeRegistro(base, { entrada: h('2026-08-20T13:00:00.000Z') });
    expect(d).toEqual([{ campo: 'entrada', antes: '08:15', despues: '08:00' }]);
  });

  it('las horas se escriben en la hora de Bogotá, no en UTC', () => {
    // 22:00 UTC son las 5 p.m. en Bogotá. Si esto saliera en UTC, el historial
    // diría que alguien salió a las 10 de la noche.
    const d = diferenciasDeRegistro(base, { salida: h('2026-08-20T23:30:00.000Z') });
    expect(d).toEqual([{ campo: 'salida', antes: '17:00', despues: '18:30' }]);
  });

  it('borrar una hora se escribe como "sin marcar", no como vacío', () => {
    const d = diferenciasDeRegistro(base, { salida: null });
    expect(d).toEqual([{ campo: 'salida', antes: '17:00', despues: 'sin marcar' }]);
  });

  it('poner una hora donde no había', () => {
    const sinSalida = { ...base, salida: null };
    const d = diferenciasDeRegistro(sinSalida, { salida: h('2026-08-20T22:00:00.000Z') });
    expect(d).toEqual([{ campo: 'salida', antes: 'sin marcar', despues: '17:00' }]);
  });

  it('varios cambios a la vez salen todos, en orden estable', () => {
    const d = diferenciasDeRegistro(base, {
      entrada: h('2026-08-20T13:00:00.000Z'),
      salida: h('2026-08-20T23:00:00.000Z'),
      observacion: 'Llegó tarde por cita médica',
    });
    expect(d.map(x => x.campo)).toEqual(['entrada', 'salida', 'observacion']);
  });

  it('la fecha se escribe como día, no como hora', () => {
    const d = diferenciasDeRegistro(base, { fecha: h('2026-08-21T05:00:00.000Z') });
    expect(d).toEqual([{ campo: 'fecha', antes: '2026-08-20', despues: '2026-08-21' }]);
  });

  it('el tipo y la observación se guardan tal cual', () => {
    const d = diferenciasDeRegistro(base, { tipo: 'FESTIVO', observacion: 'Corregido' });
    expect(d).toEqual([
      { campo: 'tipo', antes: 'NORMAL', despues: 'FESTIVO' },
      { campo: 'observacion', antes: 'sin observación', despues: 'Corregido' },
    ]);
  });

  it('marcar que la salida era al almuerzo también queda registrado', () => {
    const d = diferenciasDeRegistro(base, { salidaAlmuerzo: true });
    expect(d).toEqual([{ campo: 'salidaAlmuerzo', antes: 'no', despues: 'sí' }]);
  });

  it('un campo ausente del cambio no se toca aunque tenga valor', () => {
    // El PUT admite cambios parciales: lo que no viene, no cambió.
    expect(diferenciasDeRegistro(base, { tipo: 'NORMAL' })).toEqual([]);
  });
});
