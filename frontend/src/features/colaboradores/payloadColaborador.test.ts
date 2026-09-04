import { describe, it, expect } from 'vitest';
import { payloadColaborador } from './payloadColaborador';

// Qué se le manda al servidor al guardar un colaborador.
//
// El caso que importa es la foto. La LISTA no devuelve la foto grande a
// propósito —son cientos de kilobytes por persona en cada carga—, así que lo que
// hay en el formulario al editar desde ahí es la MINIATURA. Mandarla siempre
// tiene dos formas de salir mal, y las dos son silenciosas: degradarle la foto a
// 64 píxeles a quien solo vino a corregir el cargo, o borrársela con un null.

const form = {
  nombre: 'Ana', apellido: 'Giraldo', cedula: '1020304050', cargo: 'Cajera',
  email: '', telefono: '', fechaNacimiento: '', salarioMensual: 1_750_000,
  horarioId: 'h1', sedeIds: ['s1'], modalidad: 'PRESENCIAL',
  foto: 'data:image/jpeg;base64,MINIATURA', fotoMini: 'data:image/jpeg;base64,MINIATURA',
};

describe('payloadColaborador', () => {
  describe('la foto', () => {
    it('NO viaja si no se tocó: editar el cargo no puede degradar ni borrar la foto', () => {
      const p = payloadColaborador(form, false);
      expect('foto' in p).toBe(false);
      expect('fotoMini' in p).toBe(false);
    });

    it('viaja si se eligió una nueva', () => {
      const nueva = { ...form, foto: 'data:image/jpeg;base64,GRANDE', fotoMini: 'data:image/jpeg;base64,CHICA' };
      const p = payloadColaborador(nueva, true);
      expect(p.foto).toBe('data:image/jpeg;base64,GRANDE');
      expect(p.fotoMini).toBe('data:image/jpeg;base64,CHICA');
    });

    it('viaja como null si se quitó, que es lo contrario de no tocarla', () => {
      const p = payloadColaborador({ ...form, foto: null, fotoMini: null }, true);
      expect(p.foto).toBeNull();
      expect(p.fotoMini).toBeNull();
    });
  });

  describe('el resto de campos', () => {
    it('un horario vacío viaja como null, no como cadena vacía', () => {
      // Prisma rechaza la cadena vacía en una relación.
      expect(payloadColaborador({ ...form, horarioId: '' }, false).horarioId).toBeNull();
    });

    it('una fecha de nacimiento vacía viaja como null', () => {
      // Prisma rechaza la cadena vacía en un campo de fecha.
      expect(payloadColaborador(form, false).fechaNacimiento).toBeNull();
    });

    it('una fecha puesta viaja tal cual', () => {
      expect(payloadColaborador({ ...form, fechaNacimiento: '1990-05-12' }, false).fechaNacimiento).toBe('1990-05-12');
    });

    it('sin sedes viaja un arreglo vacío, no undefined', () => {
      // El servidor sincroniza las sedes con lo que llegue: un undefined ahí
      // significaría "no cambiar", y quitarle todas las sedes a alguien dejaría
      // de funcionar sin que nadie se entere.
      expect(payloadColaborador({ ...form, sedeIds: undefined }, false).sedeIds).toEqual([]);
    });

    it('los datos que sí escribió la persona pasan intactos', () => {
      const p = payloadColaborador(form, false);
      expect(p.nombre).toBe('Ana');
      expect(p.cedula).toBe('1020304050');
      expect(p.salarioMensual).toBe(1_750_000);
      expect(p.modalidad).toBe('PRESENCIAL');
    });
  });
});
