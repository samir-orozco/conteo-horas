import { describe, it, expect } from 'vitest';
import { estadoDescansoDe } from './descansoObligatorio';

// DE LAS TRES COLUMNAS DE `colaboradores` AL ESTADO QUE USA EL MOTOR (20 de septiembre de 2026).
//
//   descansoTipo       PRESUMIDO | FIJO | ROTATIVO
//   descansoDia        solo con FIJO: "MIERCOLES"
//   descansoAcuerdoEn  cuándo se firmó el acuerdo escrito. NULL = no hay acuerdo.
//
// AQUÍ VIVE LA GUARDA LEGAL, y es la razón de que esta función exista en vez de leer las columnas
// sueltas en el motor: la ley presume el domingo SALVO acuerdo escrito. Así que declarar otro día
// sin tener el papel NO alcanza para dejar de pagar el recargo dominical.
//
// Dicho en plata: si alguien marca a un mesero como «descansa los miércoles» y no hay acuerdo, sus
// domingos siguen valiendo el 90% de recargo. El error solo puede equivocarse hacia pagar de más.
//
// La columna es texto libre, así que cualquier valor que no se reconozca cae también a PRESUMIDO.
// Un dato raro no puede dejar a nadie sin recargo.

const ACUERDO = new Date('2026-09-01T05:00:00.000Z');

describe('presumido: el domingo, y nada lo mueve', () => {
  it('es el estado normal', () => {
    expect(estadoDescansoDe({ descansoTipo: 'PRESUMIDO', descansoDia: null, descansoAcuerdoEn: null }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  // Datos que quedaron de una declaración anterior que se revirtió. El tipo manda.
  it('aunque queden un día y un acuerdo guardados de antes', () => {
    expect(estadoDescansoDe({ descansoTipo: 'PRESUMIDO', descansoDia: 'MIERCOLES', descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });
});

describe('fijo en otro día', () => {
  it('con acuerdo y con día, vale', () => {
    expect(estadoDescansoDe({ descansoTipo: 'FIJO', descansoDia: 'MIERCOLES', descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'FIJO', dia: 'MIERCOLES' });
  });

  // ESTA ES LA GUARDA. Sin el papel, la presunción del domingo no cede.
  it('SIN acuerdo se trata como presumido: le siguen pagando el domingo', () => {
    expect(estadoDescansoDe({ descansoTipo: 'FIJO', descansoDia: 'MIERCOLES', descansoAcuerdoEn: null }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  it('con acuerdo pero sin día no se puede cumplir: presumido', () => {
    expect(estadoDescansoDe({ descansoTipo: 'FIJO', descansoDia: null, descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  it('con un día que no existe, tampoco', () => {
    expect(estadoDescansoDe({ descansoTipo: 'FIJO', descansoDia: 'FERIADO', descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  it('el día se guarda recortado y en mayúsculas', () => {
    expect(estadoDescansoDe({ descansoTipo: 'FIJO', descansoDia: ' miercoles ', descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'FIJO', dia: 'MIERCOLES' });
  });
});

describe('rotativo', () => {
  it('con acuerdo, vale, y no necesita día: lo pone el turno de cada semana', () => {
    expect(estadoDescansoDe({ descansoTipo: 'ROTATIVO', descansoDia: null, descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'ROTATIVO' });
  });

  // LA MISMA GUARDA. Es el caso que más importa: son las 26 personas de los horarios de siete días.
  it('SIN acuerdo se trata como presumido', () => {
    expect(estadoDescansoDe({ descansoTipo: 'ROTATIVO', descansoDia: null, descansoAcuerdoEn: null }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });
});

describe('lo que llega mal escrito', () => {
  it('un tipo desconocido cae a presumido', () => {
    expect(estadoDescansoDe({ descansoTipo: 'VARIABLE', descansoDia: 'MARTES', descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  it('un tipo vacío cae a presumido', () => {
    expect(estadoDescansoDe({ descansoTipo: '', descansoDia: null, descansoAcuerdoEn: null }))
      .toEqual({ tipo: 'PRESUMIDO' });
  });

  it('acepta el tipo en minúsculas o con espacios', () => {
    expect(estadoDescansoDe({ descansoTipo: ' rotativo ', descansoDia: null, descansoAcuerdoEn: ACUERDO }))
      .toEqual({ tipo: 'ROTATIVO' });
  });
});
