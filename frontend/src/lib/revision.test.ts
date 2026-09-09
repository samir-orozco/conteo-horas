import { describe, it, expect } from 'vitest';
import { motivoSinFoto, type EventoDeRevision } from './revision';

// POR QUÉ ESTA MARCACIÓN NO TIENE FOTO.
//
// Hasta ahora el producto lo ADIVINABA. `FotosJornada.tsx` dice, cuando falta la
// imagen, «marcó con cédula o se cargó a mano», porque el dato era el mismo
// `null` en los dos casos y no había forma de saberlo. Con `metodo` guardado ya
// no hay que adivinar, y quien audita necesita la diferencia: «marcó con cédula»
// es una decisión del trabajador, «la cargó un administrador» es un acto de otra
// persona, y «ya se borró» es una política del sistema.
//
// Un caso por valor y un `default` explícito (regla 9.4). El enum del esquema
// puede crecer, y un `? :` aquí sería el defecto esperando al cuarto caso.

const ev = (p: Partial<EventoDeRevision> = {}): EventoDeRevision => ({
  clave: 'r1:entrada', registroId: 'r1', momento: 'entrada',
  colaboradorId: 'c1', sedeId: null, hora: '2026-09-09T13:00:00.000Z',
  metodo: 'SIN_DATO', tieneFoto: false,
  laPusoElSistema: false, distanciaRepetida: false,
  ...p,
});

describe('por qué falta la foto de una marcación', () => {
  it('la hora la puso el sistema, así que nunca hubo nadie ni foto', () => {
    // Manda sobre todo lo demás: si el auto-cierre puso esa hora, no hubo
    // persona, y el método que traiga la fila es irrelevante.
    expect(motivoSinFoto(ev({ laPusoElSistema: true }), false)).toBe('LA_PUSO_EL_SISTEMA');
    expect(motivoSinFoto(ev({ laPusoElSistema: true, metodo: 'CEDULA' }), false)).toBe('LA_PUSO_EL_SISTEMA');
    // Y también manda sobre la expiración: la razón real es que nunca existió.
    expect(motivoSinFoto(ev({ laPusoElSistema: true }), true)).toBe('LA_PUSO_EL_SISTEMA');
  });

  it('marcó con cédula: es una decisión de la persona, y ya no se adivina', () => {
    expect(motivoSinFoto(ev({ metodo: 'CEDULA' }), false)).toBe('MARCO_CON_CEDULA');
  });

  it('la cargó un administrador desde el panel', () => {
    expect(motivoSinFoto(ev({ metodo: 'MANUAL' }), false)).toBe('LA_CARGO_UN_ADMIN');
  });

  it('si no se sabe el método y el día ya expiró, la foto se borró', () => {
    // Es el caso de una marcación vieja: hubo foto y el sistema la eliminó a los
    // 2 meses. Decir «marcó con cédula» aquí sería inventar.
    expect(motivoSinFoto(ev({ metodo: 'SIN_DATO' }), true)).toBe('YA_SE_BORRO');
  });

  it('sin método y sin expirar, no se sabe, y se dice', () => {
    // Marcaciones anteriores a que se midiera el método. El null significa «no
    // se sabe» y rellenarlo por descarte falsearía justo lo que se vino a medir.
    expect(motivoSinFoto(ev({ metodo: 'SIN_DATO' }), false)).toBe('NO_SE_SABE');
  });

  it('un ROSTRO sin foto es raro y NO se disfraza de cédula', () => {
    // Si el método dice ROSTRO, hubo cámara. Que falte la imagen es una
    // inconsistencia real, y taparla con «marcó con cédula» escondería el único
    // caso que de verdad habría que mirar.
    expect(motivoSinFoto(ev({ metodo: 'ROSTRO' }), false)).toBe('NO_SE_SABE');
    // Salvo que el día ya haya expirado: entonces sí hubo foto y se borró.
    expect(motivoSinFoto(ev({ metodo: 'ROSTRO' }), true)).toBe('YA_SE_BORRO');
  });
});
