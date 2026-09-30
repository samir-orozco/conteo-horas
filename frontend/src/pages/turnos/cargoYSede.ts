import { nombreDelDia } from '../../lib/diasDeLaSemana';

// LA SEGUNDA LÍNEA DE LA COLUMNA DE LA PERSONA: «Guarda · Centro».
//
// Pedido del dueño el 28 de septiembre de 2026, copiando la maqueta. En una rejilla de doce personas,
// saber de qué sede es cada una es lo que evita programarle a alguien un turno donde no va.
//
// ES UNA FUNCIÓN Y NO UN `? :` porque los dos datos faltan por separado: son cuatro casos, que es el
// conjunto abierto del que advierte el §9.4. Escrito como ternario, lo que sale en cuanto uno viene
// vacío es « · Centro» o «Guarda · ». El bloque de la prueba tiene el resto del razonamiento.

type ParaLaLinea = {
  cargo: string | null;
  // Opcional a propósito: el campo se agregó a la ruta esta misma tarde, y un navegador con la
  // respuesta anterior en caché lo trae sin él. Ya dejó la pantalla en blanco una vez hoy.
  sedes?: readonly { id: string; nombre: string }[];
  // CUÁNDO DESCANSA, ya resuelto por el servidor (29 de septiembre de 2026). Opcional por lo mismo
  // que `sedes`.
  //
  // DOS CASOS Y EL DÍA YA DECIDIDO (30 de septiembre de 2026): con horario, el día que dicen sus
  // franjas; sin horario, no hay día fijo y lo pone la programación de cada semana. La regla de «si
  // sobra uno ese, si sobran varios el domingo» vive en el backend y NO se repite aquí: de ella sale el
  // recargo dominical, y una segunda copia es como se separan (§9.3).
  descanso?: { de: 'HORARIO' | 'PROGRAMACION'; dia: string | null };
};

// Los días tal como los escribe la base, sin tildes. La lista completa vive en `lib/diasDeLaSemana`
// y de ahí sale el nombre; aquí solo hace falta reconocer el domingo, que es el que NO se escribe.
const DOMINGO = 'DOMINGO';

// CUÁNDO DESCANSA, dicho solo cuando se aparta de lo que se supone.
//
// UN CASO POR VALOR y no un `? :`, que es lo que pide el §9.4: la excepción marcada ya está en el plan
// y con un ternario el tercer caso heredaría en silencio la rama de otro. Aquí obliga a venir a
// escribirlo.
//
// EL DOMINGO CALLA, que es lo que ya se supone de todo el mundo. Escribirlo en las veinte filas
// gastaría la línea en repetir el caso normal, y los que no tienen horario —los únicos a los que hay
// que marcarles el descanso a mano— dejarían de saltar a la vista.
function cuandoDescansa(descanso: ParaLaLinea['descanso']): string {
  if (!descanso) return '';
  switch (descanso.de) {
    case 'PROGRAMACION':
      // El que importa: no tiene día fijo, así que pintarle turnos no le pone ningún descanso. Hay que
      // marcárselo con el botón, semana por semana.
      return 'descanso según programación';
    case 'HORARIO':
      // Sin día no se nombra ninguno. `diaDeDescansoDelHorario` siempre devuelve uno, así que esto no
      // debería llegar; si llega, inventarle un día sería peor que callar.
      return !descanso.dia || descanso.dia === DOMINGO ? '' : `descansa ${nombreDelDia(descanso.dia).toLowerCase()}`;
  }
}

export function cargoYSede({ cargo, sedes, descanso }: ParaLaLinea): string {
  const suCargo = (cargo ?? '').trim();
  const susSedes = (sedes ?? []).map(s => s.nombre.trim()).filter(Boolean);

  // VARIAS SEDES SE CUENTAN Y NO SE LISTAN. Con la modalidad híbrida una persona puede estar en dos o
  // tres, cosa que la maqueta no contempla. «Centro, Norte, Sur» no cabe en los 180 px de la columna
  // y saldría recortado a «Centro, No…», que dice menos que el número.
  const laSede = susSedes.length === 1 ? susSedes[0]
    : susSedes.length > 1 ? `${susSedes.length} sedes`
      : '';

  // La raya cuando no hay NADA que decir: una línea vacía descuadra la fila respecto a las demás y
  // además no se distingue de un dato que no cargó. Va después de juntar los tres y no de los dos
  // primeros: con «— · descanso rotativo» la raya diría «no hay nada» al lado de algo que sí hay.
  return [suCargo, laSede, cuandoDescansa(descanso)].filter(Boolean).join(' · ') || '—';
}
