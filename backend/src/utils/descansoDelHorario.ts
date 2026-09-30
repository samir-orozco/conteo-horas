import { estadoDescansoDe, type FilaDeDescanso } from './descansoObligatorio';

// QUÉ DÍA DESCANSA LA GENTE DE UN HORARIO. El bloque de la prueba tiene el porqué; aquí el resumen.
//
// Sale de una corrección del dueño: «el descanso se define por el horario, no por el trabajador».
// El producto ya lo trataba así —el modal de revisión pregunta POR HORARIO— pero el dato se guarda en
// cada colaborador, porque `descansoAcuerdoEn` es el acuerdo escrito y la ley lo pide por persona.
//
// Para ENSEÑAR la declaración en el formulario del horario hay que leerla de su gente, y su gente
// puede no coincidir: alguien que cambió de horario arrastra su declaración anterior, y quien entró
// después de la revisión nunca fue preguntado.

// `MIXTO` es un valor y no un `null`: son dos situaciones distintas y la pantalla las dice distinto.
export type DescansoDeUnHorario = { tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO'; dia: string | null };
export type LecturaDelHorario = DescansoDeUnHorario | 'MIXTO' | null;

// SE LEE CON `estadoDescansoDe` Y NO DE LAS COLUMNAS CRUDAS, y eso decide casos enteros: la guarda
// legal está ahí dentro, así que alguien marcado «FIJO MIERCOLES» SIN acuerdo escrito vale como
// presumido. Comparándolo en crudo saldría «mixto» de un horario donde el motor trata a todos igual,
// y mandaría a arreglar algo que ya está bien.
//
// MIXTO NO SE RESUELVE POR MAYORÍA. Enseñar «descansan el miércoles» cuando dos de siete descansan el
// domingo haría que guardar sin tocar nada les CAMBIARA el día a esos dos, en silencio y sin que nadie
// lo pidiera. Diciendo que están mezclados, quien mira decide.
export function descansoDelHorario(gente: readonly FilaDeDescanso[]): LecturaDelHorario {
  if (gente.length === 0) return null;

  const primero = comoLoVeElMotor(gente[0]);
  for (const quien of gente.slice(1)) {
    const suyo = comoLoVeElMotor(quien);
    if (suyo.tipo !== primero.tipo || suyo.dia !== primero.dia) return 'MIXTO';
  }
  return primero;
}

// El estado del motor, aplanado a tipo + día. `estadoDescansoDe` devuelve una unión donde solo FIJO
// lleva día; aquí se normaliza para poder compararlos con `===` sin ramas.
function comoLoVeElMotor(fila: FilaDeDescanso): DescansoDeUnHorario {
  const estado = estadoDescansoDe(fila);
  return estado.tipo === 'FIJO' ? { tipo: 'FIJO', dia: estado.dia } : { tipo: estado.tipo, dia: null };
}
