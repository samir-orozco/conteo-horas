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
  // que `sedes`. Llega como estado y no como las tres columnas crudas: la guarda del acuerdo escrito
  // —sin papel, cualquier día declarado vale como domingo— es la que protege el recargo dominical, y
  // una segunda copia aquí es como se separan (§9.3).
  descanso?: { tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO'; dia: string | null };
};

// Los días tal como los escribe la base, sin tildes. La lista completa vive en `lib/diasDeLaSemana`
// y de ahí sale el nombre; aquí solo hace falta reconocer el domingo, que es el que NO se escribe.
const DOMINGO = 'DOMINGO';

// CUÁNDO DESCANSA, dicho solo cuando se aparta de lo que se supone.
//
// UN CASO POR VALOR y no un `? :` sobre el tipo, que es lo que pide el §9.4: los tres estados de hoy
// van a ser cuatro (la excepción marcada ya está en el plan), y con un ternario el cuarto heredaría
// en silencio la rama de otro. Aquí obliga a venir a escribirlo.
//
// PRESUMIDO Y FIJO-DOMINGO CALLAN LOS DOS, aunque por dentro sean estados distintos: para quien
// programa significan lo mismo, «descansa el domingo», que es lo que ya se supone de todo el mundo.
// Escribirlo en las veinte filas gastaría la línea en repetir el caso normal y los rotativos —los
// únicos a los que hay que marcarles el descanso a mano— dejarían de saltar a la vista.
function cuandoDescansa(descanso: ParaLaLinea['descanso']): string {
  if (!descanso) return '';
  switch (descanso.tipo) {
    case 'ROTATIVO':
      // El que importa: pintarle turnos NO le mueve el descanso, hay que marcárselo.
      return 'descanso rotativo';
    case 'FIJO':
      // Sin día no se nombra ninguno. `estadoDescansoDe` ya cae a PRESUMIDO en ese caso, así que
      // esto no debería llegar; si llega, inventarle un día sería peor que callar.
      return !descanso.dia || descanso.dia === DOMINGO ? '' : `descansa ${nombreDelDia(descanso.dia).toLowerCase()}`;
    case 'PRESUMIDO':
      return '';
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
