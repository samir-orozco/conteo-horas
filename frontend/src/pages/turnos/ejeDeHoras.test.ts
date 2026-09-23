import { describe, it, expect } from 'vitest';
import { minutosDeReloj, ejeDelDia, tramoDeJornada, horasDelEje, EJE_POR_DEFECTO } from './ejeDeHoras';

// LA VISTA DE DÍA, EN HORAS (22 de septiembre de 2026).
//
// Pedido del dueño: «en la parte de día que no vea arriba la M de martes 22, sino las horas, y que
// la barra vaya del color del turno desde la hora de inicio hasta la hora de fin, que muestre todo
// el rango de hora que está ocupando la persona».
//
// LA DECISIÓN QUE SE ROMPE SOLA SI SE ESCRIBE A OJO: EL TURNO NOCTURNO. Una empresa de este
// producto tiene guardas de 22:00 a 06:00, y su catálogo trae el turno «Noche 22:00–06:00». Esa
// jornada CRUZA LA MEDIANOCHE, y ahí hay dos formas de dibujarla:
//
//   - Partida en dos pedazos (22 a 24, y 00 a 06). Se lee como si la persona trabajara DOS veces
//     ese día, y el segundo pedazo aparece a la izquierda del primero, antes de haber entrado.
//   - Una sola barra continua que sigue de largo, con el eje estirado más allá de la medianoche.
//
// Se eligió la segunda: es UN turno, se dibuja como UNA barra. El precio es que el eje pasa de las
// 24 horas, y entonces las horas de después se rotulan 00, 01, 02 y no 24, 25, 26.
//
// Todo va en MINUTOS desde la medianoche del día que se está mirando, así que 06:00 del día
// siguiente son 1800 y no 360. Es la única forma de que «después» sea de verdad un número mayor.

describe('minutosDeReloj', () => {
  it('convierte la hora de pared a minutos', () => {
    expect(minutosDeReloj('00:00')).toBe(0);
    expect(minutosDeReloj('08:30')).toBe(510);
    expect(minutosDeReloj('23:59')).toBe(1439);
  });

  it('lo que no es una hora devuelve null, y no un cero', () => {
    // Cero es medianoche, que es una hora válida. Confundir «no hay dato» con «medianoche» pintaría
    // una barra al principio del día para alguien que no trabaja.
    expect(minutosDeReloj(null)).toBeNull();
    expect(minutosDeReloj('')).toBeNull();
    expect(minutosDeReloj('mañana')).toBeNull();
    expect(minutosDeReloj('24:00')).toBeNull();
    expect(minutosDeReloj('08:99')).toBeNull();
  });
});

describe('ejeDelDia: qué horas se muestran', () => {
  it('cubre la jornada con un respiro a cada lado', () => {
    // 08:00 a 16:00, con una hora de margen: de 07:00 a 17:00.
    expect(ejeDelDia([{ horaEntrada: '08:00', horaSalida: '16:00' }])).toEqual({ desde: 420, hasta: 1020 });
  });

  it('toma la entrada más temprana y la salida más tardía de TODOS', () => {
    expect(ejeDelDia([
      { horaEntrada: '09:00', horaSalida: '13:00' },
      { horaEntrada: '06:00', horaSalida: '14:00' },
      { horaEntrada: '10:00', horaSalida: '18:00' },
    ])).toEqual({ desde: 300, hasta: 1140 }); // 05:00 a 19:00
  });

  it('una jornada NOCTURNA estira el eje más allá de la medianoche', () => {
    // 22:00 a 06:00 del día siguiente = de 1320 a 1800 minutos. Con margen, de 21:00 a 07:00.
    expect(ejeDelDia([{ horaEntrada: '22:00', horaSalida: '06:00' }])).toEqual({ desde: 1260, hasta: 1860 });
  });

  it('no se sale por la izquierda cuando alguien entra a medianoche', () => {
    expect(ejeDelDia([{ horaEntrada: '00:00', horaSalida: '08:00' }]).desde).toBe(0);
  });

  it('sin ninguna jornada válida cae a un eje por defecto, no a uno vacío', () => {
    // Un eje de ancho cero haría una división por cero al calcular los porcentajes.
    expect(ejeDelDia([])).toEqual(EJE_POR_DEFECTO);
    expect(ejeDelDia([{ horaEntrada: null, horaSalida: null }])).toEqual(EJE_POR_DEFECTO);
  });

  it('un turno cortísimo no deja el eje más angosto que el mínimo', () => {
    // Con una jornada de una hora, el eje sin mínimo sería de tres horas y cada barra ocuparía un
    // tercio de la pantalla para representar sesenta minutos.
    const eje = ejeDelDia([{ horaEntrada: '10:00', horaSalida: '11:00' }]);
    expect(eje.hasta - eje.desde).toBeGreaterThanOrEqual(360);
  });
});

describe('tramoDeJornada: dónde va la barra', () => {
  const eje = { desde: 360, hasta: 1080 }; // 06:00 a 18:00, doce horas

  it('una jornada que ocupa la mitad del eje mide la mitad', () => {
    // 06:00 a 12:00 son seis de las doce horas.
    expect(tramoDeJornada('06:00', '12:00', eje)).toEqual({ desdePct: 0, anchoPct: 50 });
  });

  it('arranca donde le toca dentro del eje', () => {
    // 12:00 es la mitad del eje.
    expect(tramoDeJornada('12:00', '18:00', eje)).toEqual({ desdePct: 50, anchoPct: 50 });
  });

  it('la jornada NOCTURNA da UNA barra continua, no dos', () => {
    // Es lo que separa este diseño del otro. De 22:00 a 06:00 sobre un eje que llega a las 07:00.
    const nocturno = { desde: 1260, hasta: 1860 }; // 21:00 a 07:00, diez horas
    const t = tramoDeJornada('22:00', '06:00', nocturno);
    expect(t).not.toBeNull();
    // Entra una hora después de empezar el eje: 60 de 600 minutos.
    expect(t?.desdePct).toBeCloseTo(10);
    // Y dura ocho horas de las diez del eje.
    expect(t?.anchoPct).toBeCloseTo(80);
  });

  it('una jornada sin horas no dibuja nada', () => {
    expect(tramoDeJornada(null, '16:00', eje)).toBeNull();
    expect(tramoDeJornada('08:00', null, eje)).toBeNull();
  });

  it('nunca se sale del eje, aunque la jornada lo desborde', () => {
    // Puede pasar si el eje viene de otra fila: la barra se recorta, no se escapa del contenedor.
    const t = tramoDeJornada('05:00', '20:00', eje);
    expect(t?.desdePct).toBeGreaterThanOrEqual(0);
    expect((t?.desdePct ?? 0) + (t?.anchoPct ?? 0)).toBeLessThanOrEqual(100);
  });

  it('una jornada de duración cero deja una barra visible igual', () => {
    // Un ancho de 0% sería una barra invisible: la persona parecería no tener turno.
    const t = tramoDeJornada('09:00', '09:00', eje);
    expect(t?.anchoPct).toBeGreaterThan(0);
  });
});

describe('horasDelEje: los rótulos de arriba', () => {
  it('van en horario militar, de dos dígitos', () => {
    const horas = horasDelEje({ desde: 420, hasta: 600 }); // 07:00 a 10:00
    expect(horas.map(h => h.etiqueta)).toEqual(['07', '08', '09', '10']);
  });

  it('las horas pasadas la medianoche se rotulan 00 y 01, no 24 y 25', () => {
    // Si el eje llega a las 26 horas, el rótulo tiene que decir «02»: nadie lee «26:00».
    const horas = horasDelEje({ desde: 1380, hasta: 1560 }); // 23:00 a 02:00 del día siguiente
    expect(horas.map(h => h.etiqueta)).toEqual(['23', '00', '01', '02']);
  });

  it('cada rótulo sabe en qué porcentaje del eje se dibuja', () => {
    const horas = horasDelEje({ desde: 420, hasta: 600 });
    expect(horas[0].pct).toBe(0);
    expect(horas[horas.length - 1].pct).toBe(100);
  });
});
