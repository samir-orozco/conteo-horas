import { sePuedePintar } from './semana';
import type { AccionDeEscritura } from './aplicacionPorBloques';

// LO QUE SE DICE ANTES DE ESCRIBIR (28 de septiembre de 2026).
//
// Marcar cien celdas y darle a un turno escribe cien jornadas de las que alguien es responsable.
// Aquí vive la decisión de qué se le cuenta ANTES: cuántas se escriben de verdad, cuántas ya tenían
// eso mismo, cuántas no se tocan, y los dos avisos que cuestan dinero.
//
// ES PURO PORQUE DE ESTO DEPENDE UN «SÍ». Un conteo que se equivoque hacia abajo hace aprobar a
// ciegas; uno que se equivoque hacia arriba enseña a ignorar el aviso. Ninguna de las dos cosas se
// nota mirando la pantalla, y las dos se comprueban aquí sin red ni servidor.
//
// EL AVISO DE LAS 42 HORAS NO ESTÁ AQUÍ, A PROPÓSITO. Para decir «quedaría en 56 h» hay que convertir
// un turno en minutos exigidos (entrada, salida, cruce de medianoche, menos el almuerzo no pagado,
// menos los descansos no remunerados), y eso lo resuelve el backend al pintar: rehacerlo en la
// pantalla pondría en dos sitios la regla de la que salen las horas extra (CLAUDE.md §9.3). Y el
// total que la fila trae es del rango completo, nunca por semana, que es la unidad del tope. Entra
// cuando el backend exponga los minutos de cada turno, calculados por el mismo código que los calcula
// al escribir.

// Lo que hay que saber de una celda para poder anunciar lo que le va a pasar. Todo sale de la
// respuesta del calendario; aquí no se deduce ninguna regla legal.
export type CeldaParaPrevia = {
  colaboradorId: string;
  fecha: string;
  // Si ese día ES el descanso obligatorio de esa persona. Lo decide el backend
  // (`esDescansoObligatorioDe`, a partir de las franjas de su horario o de la programación) y viaja en
  // la respuesta: deducirlo aquí sería la segunda copia de la regla de la que sale el recargo dominical.
  esDescansoObligatorio: boolean;
  // El turno del catálogo que el día ya tiene encima, o `null` si no lo pintó ninguno.
  plantillaIdActual: string | null;
  // Si el día ya se comporta como descanso, sea el obligatorio o uno marcado a mano.
  esDescansoHoy: boolean;
  // Si hay algo pintado a mano en ese día (`origen === 'MANUAL'`). Es lo que el borrado quita, y no
  // es lo mismo que tener un turno: una marca de descanso no lleva turno y también se quita.
  pintadoAMano: boolean;
};

export type ConteoDePrevia = {
  escribe: number;
  iguales: number;
  bloqueadas: number;
};

// SI LA CELDA VA A RECIBIR EXACTAMENTE LO QUE YA TIENE.
//
// Un caso por valor y no un `? :`, que es lo que pide CLAUDE.md §9.4 cuando la pregunta es «de qué
// tipo es esto»: el día que aparezca una cuarta acción, esto obliga a venir a escribirla en vez de
// heredar en silencio la rama de otra.
function recibeLoMismo(celda: CeldaParaPrevia, accion: AccionDeEscritura): boolean {
  switch (accion.tipo) {
    case 'TURNO':
      return celda.plantillaIdActual === accion.plantillaId;
    case 'DESCANSO':
      return celda.esDescansoHoy;
    case 'QUITAR':
      // Quitar escribe si hay algo pintado a mano que borrar, y eso incluye una marca de descanso sin
      // turno encima. Sin la segunda mitad, quitar un día marcado libre se anunciaría como «no pasa
      // nada» y el día sí cambia: vuelve a lo que el horario exija.
      return celda.plantillaIdActual === null && !celda.pintadoAMano;
  }
}

// CUÁNTAS SE ESCRIBEN, CUÁNTAS SOBRAN Y CUÁNTAS NO SE PUEDEN.
//
// LOS TRES NÚMEROS SON TRES COSAS DISTINTAS y juntarlos escondería algo cada vez. «Igual» es que no
// hacía falta: sin separarlo, repasar una semana ya programada anunciaría ciento cuarenta escrituras
// y nadie podría distinguir un cambio real de un repaso inofensivo. «Bloqueada» es que no se pudo:
// contarla con las iguales escondería que parte de lo marcado quedó fuera del envío.
//
// La acción la decide quien llama, celda por celda, que es lo que permite que una rotación pase por
// esta misma previa: unos días reciben turno y otros descanso, y con una acción única para todo el
// envío haría falta una segunda previa donde equivocarse aparte.
export function conteoDePrevia(
  celdas: readonly CeldaParaPrevia[],
  accionDe: (celda: CeldaParaPrevia) => AccionDeEscritura,
  hoy: string,
): ConteoDePrevia {
  let escribe = 0;
  let iguales = 0;
  let bloqueadas = 0;

  for (const celda of celdas) {
    // La MISMA `sePuedePintar` que usa la rejilla para decidir si ofrece el «+», no una copia: si
    // aquí se decidiera distinto, la previa prometería escrituras que el envío descarta (§9.3).
    if (!sePuedePintar(celda.fecha, hoy)) {
      bloqueadas++;
      continue;
    }
    if (recibeLoMismo(celda, accionDe(celda))) iguales++;
    else escribe++;
  }
  return { escribe, iguales, bloqueadas };
}

// LAS CELDAS DONDE ESTE ENVÍO PONDRÍA UN TURNO SOBRE EL DESCANSO OBLIGATORIO.
//
// Es el caso que cuesta dinero: ese día pasa a ser DESCANSO_TRABAJADO, paga recargo y, a partir del
// tercero del mes, obliga a compensar con tiempo.
//
// TRES COSAS NO CUENTAN COMO PISAR, y las tres por la misma razón —el aviso es de lo que ESTE envío
// provoca, no de lo que ya estaba—:
//
//   · marcar DESCANSO, que ES el descanso; y QUITAR, que deja el día en blanco, y un día en blanco no
//     es un día trabajado. Avisarlos volvería ruido justo las acciones que hacen lo correcto.
//   · un día ya pasado, que no se va a escribir: avisar de lo que no se toca manda a buscar un
//     problema que no existe.
//   · un día que YA tiene ese mismo turno encima, que ya estaba pisado antes de esto.
export function descansosPisados(
  celdas: readonly CeldaParaPrevia[],
  accionDe: (celda: CeldaParaPrevia) => AccionDeEscritura,
  hoy: string,
): CeldaParaPrevia[] {
  return celdas.filter(celda => {
    if (!celda.esDescansoObligatorio) return false;
    if (!sePuedePintar(celda.fecha, hoy)) return false;
    const accion = accionDe(celda);
    if (accion.tipo !== 'TURNO') return false;
    return !recibeLoMismo(celda, accion);
  });
}

export type PersonaParaHabitual = {
  colaboradorId: string;
  // Los descansos que YA trabajó este mes, contados con marcaciones. Viene de la respuesta.
  trabajadosEnElMes: number;
  // Cuántos de sus descansos obligatorios pisaría este envío.
  pisaEsteEnvio: number;
  // Si NO tiene horario, o sea si su descanso lo pone la programación. Ver abajo por qué eso apaga
  // este aviso.
  //
  // OBLIGATORIO Y NO OPCIONAL a propósito: con un valor por defecto, una pantalla nueva que se
  // olvidara del campo recibiría el aviso sin haber dicho de dónde sale su descanso, y este aviso
  // cambia una obligación legal. Siendo obligatorio, el compilador obliga a decirlo.
  sinHorario: boolean;
};

// QUIÉN CRUZA A DESCANSO HABITUAL CON ESTE ENVÍO.
//
// Es el aviso que cambia una OBLIGACIÓN, no una cifra de plata: el recargo se paga igual con uno que
// con cinco. Lo que cambia al llegar al tercero del mes es que compensar con TIEMPO deja de ser
// opcional (art. 181). Por eso se avisa el CRUCE y no el número.
//
// A QUIEN YA ERA HABITUAL NO SE LE AVISA. No cruza nada, ya estaba: si se avisara, el aviso saldría
// en cada envío del resto del mes y para el tercero nadie lo leería.
//
// EL UMBRAL ENTRA COMO PARÁMETRO Y NO ESCRITO AQUÍ. Es una regla legal, vive en el backend
// (`MINIMO_HABITUAL`) y su propio comentario ya advierte que la pantalla también lo nombra y que
// escribirlo dos veces es como se separan. Viaja en la respuesta igual que el tope de horas
// semanales, que es el mismo caso y el precedente.
export function cruzanAHabitual(
  personas: readonly PersonaParaHabitual[],
  minimoHabitual: number,
): { colaboradorId: string; antes: number; despues: number }[] {
  const cruzan: { colaboradorId: string; antes: number; despues: number }[] = [];
  for (const persona of personas) {
    // A QUIEN NO TIENE HORARIO ESTE AVISO NO LE APLICA EN LA PRÁCTICA, y el motivo es del dueño y es
    // condicional, así que va entero: el compensatorio es cosa de los turnos fijos. No es que la norma
    // no exista para quien rota, es que no se dispara mientras su rotación sí le dé descanso cada
    // semana. Si deja una semana sin ninguno, eso sale por el OTRO aviso —«semanas que quedarían sin
    // ningún descanso»—, que es el que de verdad le corresponde.
    //
    // POR ESO ESTA EXCLUSIÓN NO EXISTÍA ANTES: ese otro aviso se escribió el mismo día que esto. Sin
    // él, callar aquí habría quitado una advertencia dejando el caso sin nadie que lo recogiera.
    if (persona.sinHorario) continue;
    const antes = persona.trabajadosEnElMes;
    const despues = antes + persona.pisaEsteEnvio;
    // AQUÍ HABÍA UNA GUARDA DE `pisaEsteEnvio <= 0` Y ERA CÓDIGO MUERTO. Se descubrió mutándola: al
    // quitarla no se puso roja ninguna prueba. La razón es que la condición de abajo ya lo cubre —sin
    // nada pisado, `despues` es igual a `antes`, y `antes < minimo && antes >= minimo` es imposible—,
    // así que la guarda no podía cambiar ningún resultado y solo invitaba a creerla portante.
    // `< minimo` antes y `>= minimo` después: es el CRUCE. Y no se compara con un salto de uno,
    // porque marcar un mes entero puede pisar cuatro de golpe sin pasar por el tres exacto.
    if (antes < minimoHabitual && despues >= minimoHabitual) {
      cruzan.push({ colaboradorId: persona.colaboradorId, antes, despues });
    }
  }
  return cruzan;
}

// ────────── CÓMO QUEDA LA SEMANA DE UNA PERSONA DESPUÉS DE ESTE ENVÍO (29 de septiembre de 2026) ──────────
//
// Los demás avisos de esta ventana miran celdas sueltas. El del descanso rotativo no puede: «a esta
// persona le va a quedar el domingo cobrado como descanso trabajado» es una pregunta de la SEMANA
// entera, y de esos siete días este envío toca unos pocos. Hay que juntar lo que la rejilla ya tiene
// con lo que está a punto de escribirse, y eso es lo que hace esto.
//
// LOS DOS MAPAS SALEN JUNTOS Y NO POR SEPARADO porque una misma acción mueve los dos a la vez y en
// direcciones contrarias: pintar un turno pone el día en trabajado Y le quita la marca de descanso.
// Calculándolos aparte, quien llamara podría actualizar uno y olvidar el otro, y entonces una
// persona a la que se le pinta un turno encima de su día libre seguiría contando con ese descanso.
//
// UN CASO POR VALOR Y NO UN `? :` (§9.4): son tres acciones hoy y la cuarta ya está prevista.
//
// `QUITAR` DEVUELVE NULL EN VEZ DE ADIVINAR. Quitar devuelve el día a lo que su HORARIO exija, y el
// horario no viaja a esta pantalla día por día: solo viaja lo que hoy está escrito. Suponer que el
// día queda libre daría avisos falsos y suponer que queda trabajado los daría al revés. Callar es lo
// único que se puede afirmar. Tampoco deja un hueco grande: un envío es o todo «Quitar» o turnos y
// descansos, nunca mezclado, porque `accionDeLoPendiente` solo produce QUITAR desde la rama `IGUAL`.
export type DiaDeLaSemanaResultante = { fecha: string; trabajado: boolean; descansoMarcado: boolean };

export function semanaResultanteDe(
  dias: readonly DiaDeLaSemanaResultante[],
  accionDe: (fecha: string) => AccionDeEscritura | null,
): { trabajado: Record<string, boolean>; descansoMarcado: Record<string, boolean> } | null {
  const trabajado: Record<string, boolean> = {};
  const descansoMarcado: Record<string, boolean> = {};

  for (const dia of dias) {
    const accion = accionDe(dia.fecha);
    // Sin acción, el día se copia tal cual. Perder esto haría que una semana con su descanso ya
    // marcado el lunes saliera como si no lo tuviera en cuanto se le pintara el miércoles.
    if (accion === null) {
      trabajado[dia.fecha] = dia.trabajado;
      descansoMarcado[dia.fecha] = dia.descansoMarcado;
      continue;
    }
    switch (accion.tipo) {
      case 'TURNO':
        trabajado[dia.fecha] = true;
        descansoMarcado[dia.fecha] = false;
        break;
      case 'DESCANSO':
        trabajado[dia.fecha] = false;
        descansoMarcado[dia.fecha] = true;
        break;
      case 'QUITAR':
        // Basta uno: el día que no se puede afirmar puede ser justo el que llevaba el descanso.
        return null;
    }
  }
  return { trabajado, descansoMarcado };
}
