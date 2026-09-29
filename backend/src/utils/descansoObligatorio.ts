// Del módulo sin dependencias y NO de `tardanzas`: tenerla allí cerraba el ciclo
// horasColombiana → descansoObligatorio → tardanzas → horasColombiana.
import { DIAS_SEMANA, diaValido, diaSemanaDeFechaBogota } from './diasDeLaSemana';
// `fechas` no importa nada de `utils` (solo `date-fns-tz`), así que traerlo NO reabre el ciclo que
// describe el comentario de arriba. Se comprobó leyendo el archivo, no suponiéndolo.
import { rangoSemanaBogota, claveDiaBogota } from './fechas';

// QUÉ DÍA ES EL DESCANSO OBLIGATORIO DE UNA PERSONA (20 de septiembre de 2026).
//
// Hasta hoy el motor lo decide con `esDomingo = diaSemana === 'DOMINGO'` escrito a mano
// (horasColombiana.ts:136). Eso acierta, pero por una razón frágil: nadie ha podido registrar nunca
// otro día, así que la presunción legal se cumple sola. Medido en producción el 20 de septiembre de
// 2026: 22 horarios activos incluyen el domingo, y en 10 de ellos (26 personas) se trabajan los
// SIETE días, que es la forma que toma una operación rotativa metida en una herramienta de horarios
// fijos.
//
// La regla legal tiene dos mitades y esta función resuelve SOLO la primera:
//
//   1. ¿Qué día quedaría libre según lo que la persona trabaja?
//   2. ¿Se puede mover el descanso fuera del domingo?  <- exige acuerdo escrito. NO se deduce.
//
// De ahí que la salida distinga dos cosas que es tentador juntar:
//
//   PRESUNCION  el domingo está libre. Lo dice la ley y no hace falta ningún acuerdo.
//   PROPUESTA   el domingo se trabaja y queda un solo día libre. Es lo más probable, y aun así sin
//               acuerdo escrito no se puede dar por cierto.
//
// Tratar una PROPUESTA como si fuera firme sería dejar de pagar un recargo dominical por deducción
// propia. El error tiene que poder equivocarse hacia pagar de más, nunca hacia pagar de menos.

export type OrigenDelDescanso = 'PRESUNCION' | 'PROPUESTA' | 'AMBIGUO' | 'SIN_DIA_LIBRE';

export type DeduccionDeDescanso =
  | { dia: string; origen: 'PRESUNCION' | 'PROPUESTA' }
  | { dia: null; origen: 'AMBIGUO' | 'SIN_DIA_LIBRE' };

// `diaValido` vivía aquí, privada. Se mudó a `diasDeLaSemana` el 21 de septiembre de 2026, al
// aparecer la tercera necesidad: `descansoDeLaSemana`, más abajo. Al buscarla con `grep` resultó
// que ya estaban escritas DOS —esta y otra dentro de `cuerpoDeRespuestaDescanso`— y las dos se
// migran en este mismo commit, que es lo que pide CLAUDE.md §9.3. Se comprobó antes de fundirlas
// que hacían exactamente lo mismo.

export function deducirDiaDescanso(diasQueTrabaja: readonly unknown[]): DeduccionDeDescanso {
  const trabaja = new Set(
    diasQueTrabaja.map(diaValido).filter((d): d is string => d !== null),
  );

  // El domingo libre manda sobre cualquier otro día libre: alguien de lunes a viernes tiene dos días
  // sin trabajar y solo uno de ellos es el descanso obligatorio. Por eso esta pregunta va PRIMERO y
  // no se mira cuántos días quedan libres.
  if (!trabaja.has('DOMINGO')) return { dia: 'DOMINGO', origen: 'PRESUNCION' };

  const libres = DIAS_SEMANA.filter(d => !trabaja.has(d));
  if (libres.length === 0) return { dia: null, origen: 'SIN_DIA_LIBRE' };
  if (libres.length === 1) return { dia: libres[0], origen: 'PROPUESTA' };
  return { dia: null, origen: 'AMBIGUO' };
}

// ─────────────────── QUÉ DÍA DESCANSA ESTA PERSONA, EN LA PRÁCTICA ───────────────────

// El estado de cada persona, decidido con el dueño el 20 de septiembre de 2026. Es UN campo con
// tres valores y no dos mecanismos separados, por una razón concreta: el acuerdo escrito hace falta
// tanto para fijar otro día como para rotar, y partirlo en dos lo duplicaría o lo perdería.
//
// El tercer valor además hace innecesaria una marca aparte de «fijo o rotativo»: ya lo dice él.
export type EstadoDescanso =
  | { tipo: 'PRESUMIDO' }            // el domingo, por ley. El valor por defecto de todo el mundo.
  | { tipo: 'FIJO'; dia: string }    // otro día de la semana. Solo vale con acuerdo escrito.
  | { tipo: 'ROTATIVO' };            // lo define el turno planificado de esa semana. También exige acuerdo.

// Lo que guardan las tres columnas de `colaboradores`, tal cual salen de la base.
export type FilaDeDescanso = {
  descansoTipo: string;
  descansoDia: string | null;
  descansoAcuerdoEn: Date | null;
};

// De las tres columnas al estado que usa el motor.
//
// AQUÍ VIVE LA GUARDA LEGAL, y es la razón de que esta función exista en vez de leer las columnas
// sueltas donde haga falta: la ley presume el domingo SALVO acuerdo escrito, así que declarar otro
// día sin tener el papel no alcanza para dejar de pagar el recargo dominical.
//
// Dicho en plata: si alguien marca a un mesero como «descansa los miércoles» y no hay acuerdo, sus
// domingos siguen valiendo el 90% de recargo.
//
// La comprobación del acuerdo va PRIMERO, antes de mirar el tipo, a propósito: así no hay ninguna
// rama que pueda saltársela. Y cualquier valor que no se reconozca cae también a PRESUMIDO, porque
// la columna es texto libre y un dato raro no puede dejar a nadie sin recargo.
export function estadoDescansoDe(fila: FilaDeDescanso): EstadoDescanso {
  if (!fila.descansoAcuerdoEn) return { tipo: 'PRESUMIDO' };

  const tipo = typeof fila.descansoTipo === 'string' ? fila.descansoTipo.trim().toUpperCase() : '';
  if (tipo === 'ROTATIVO') return { tipo: 'ROTATIVO' };
  if (tipo === 'FIJO') {
    // Un día pactado que no existe no se puede cumplir, así que la declaración no vale.
    const dia = diaValido(fila.descansoDia);
    return dia === null ? { tipo: 'PRESUMIDO' } : { tipo: 'FIJO', dia };
  }
  return { tipo: 'PRESUMIDO' };
}

// La pregunta que hoy responde `esDomingo = diaSemana === 'DOMINGO'` (horasColombiana.ts:136), y la
// que decide si una hora lleva el recargo del 90%.
//
// `diaDeLaFecha` llega ya resuelto por quien llama: el motor lo calcula una vez por minuto y no
// tiene sentido volver a hacer aquí la conversión de zona horaria.
//
// LA REGLA: un turno pintado puede AGREGAR un recargo, nunca quitarlo. Por eso cada camino que no
// puede afirmar un día cae al DOMINGO en vez de devolver «ninguno»:
//
//   - PRESUMIDO ignora por completo lo planificado. Sin acuerdo escrito, pintar un turno no mueve
//     el descanso de nadie.
//   - FIJO con un día que no existe (dato viejo, error de escritura) vuelve al domingo.
//   - ROTATIVO sin semana planificada vuelve al domingo. Que nadie haya pintado el calendario es
//     una omisión del administrador, y no puede dejar a una persona sin descanso obligatorio.
export function esDescansoObligatorio(
  diaDeLaFecha: string,
  estado: EstadoDescanso,
  descansoPlanificado: string | null,
): boolean {
  const hoy = diaValido(diaDeLaFecha);
  const esDomingo = hoy === 'DOMINGO';

  if (estado.tipo === 'FIJO') {
    const pactado = diaValido(estado.dia);
    return pactado === null ? esDomingo : hoy === pactado;
  }

  if (estado.tipo === 'ROTATIVO') {
    const planificado = diaValido(descansoPlanificado);
    return planificado === null ? esDomingo : hoy === planificado;
  }

  return esDomingo;
}

// ────────── CUÁL DE LOS SIETE DÍAS LLEVA EL DESCANSO EN UNA SEMANA PLANIFICADA ──────────
//
// Es lo que alimenta el tercer argumento de `esDescansoObligatorio`, que hasta hoy recibía `null`
// desde sus CINCO llamadores: la rama ROTATIVO existía y nada la alimentaba, así que un rotativo
// caía siempre al domingo.
//
// La fuente de verdad es el propio calendario, sin entidad nueva ni columna nueva: el día que lleva
// pintado un turno cuyo `PlantillaTurno.esDescanso` es true ES el descanso de esa semana. Lo que
// faltaba no era dónde guardarlo, era preguntárselo a la SEMANA en vez de al día suelto.
//
// TODO LO QUE NO SEA «EXACTAMENTE UNO» DEVUELVE NULL, y el llamador cae entonces al domingo. Las
// dos razones son la misma regla: un turno pintado puede AGREGAR un recargo, nunca quitarlo.
//
//   ninguno    la semana no está planificada. Es una omisión del administrador, y una omisión no
//              puede dejar a una persona sin descanso obligatorio.
//   dos o más  alguien se equivocó al planificar. Elegir uno convertiría al otro en día ordinario,
//              y si ese otro era el domingo le quitaría el recargo del 90% sin que nadie lo decida.
//
// Y el día EN BLANCO no se asume como descanso (decidido con el dueño el 21 de septiembre de 2026).
// El olvido de pintar un día y la decisión de dejarlo libre producen exactamente el mismo dato, así
// que asumir sería dejar de pagar un recargo por deducción propia. El planificador lo PROPONE
// cuando sobra un solo día y una persona lo confirma; esta función solo lee lo confirmado.
export function descansoDeLaSemana(
  dias: readonly { dia: unknown; esDescanso: boolean }[],
): string | null {
  const marcados = diasConTurnoDeDescanso(dias);
  return marcados.size === 1 ? Array.from(marcados)[0] : null;
}

// Los días de una semana que llevan pintado un turno de descanso, validados y sin repetir.
//
// Vive aparte porque lo necesitan DOS: esta función, que colapsa cero y ambiguo en `null`, y
// `propuestaDeDescanso`, que tiene que distinguirlos para decirle a la persona cosas distintas.
// Copiar el bucle habría sembrado la cuarta copia de una regla el mismo día que se migraron tres
// (CLAUDE.md §9.3).
//
// Un conjunto y no un contador: si la misma fecha llegara dos veces (no debería, hay una fila por
// persona y día), contarla dos veces diría «ambiguo» sobre una semana que está clara.
function diasConTurnoDeDescanso(
  dias: readonly { dia: unknown; esDescanso: boolean }[],
): Set<string> {
  const marcados = new Set<string>();
  for (const d of dias) {
    if (d.esDescanso !== true) continue;
    const nombre = diaValido(d.dia);
    if (nombre !== null) marcados.add(nombre);
  }
  return marcados;
}

// ────────── QUÉ DÍAS DE LA SEMANA HAY QUE REESCRIBIR AL PLANIFICAR (22 de septiembre de 2026) ──────────
//
// `esDescanso` se escribe DÍA POR DÍA, pero «cuál de estos siete lleva el descanso» es una pregunta
// de la SEMANA. Por eso pintar el turno de descanso en miércoles no basta con poner `true` en el
// miércoles: hay que poner `false` en el domingo de esa misma semana, que ya está escrito desde
// hace días. Pintar un día tiene que reescribir OTRO día, y esto decide cuáles.
//
// LA GUARDA QUE IMPORTA: un día YA PASADO no se toca nunca. Reescribirlo cambiaría lo que ese día
// exigía, y de ahí salen la tardanza, el descuento de almuerzo y el saldo de un período que puede
// estar liquidado. El día de HOY sí entra aquí: si además esa persona ya marcó lo decide
// `diaTocable`, que es otra guarda, vive en `materializarDias` y necesita la base.
//
// Consecuencia conocida y aceptada: planificar el descanso en miércoles cuando el domingo de esa
// semana YA PASÓ deja la semana con dos descansos, porque el domingo está congelado y no se toca.
// Paga de más y nunca de menos, que es la dirección correcta, pero hay que saberlo.
//
// DEVUELVE SOLO LO QUE CAMBIA, y no es por ahorrar consultas: una fila reescrita con el mismo valor
// queda con `actualizadoEn` de hoy, y eso borra la única pista que permite fechar quién tocó qué.
// Hizo falta exactamente esa pista para entender un susto del 21 de septiembre de 2026.
export function reescrituraDeSemana(
  dias: readonly { fecha: Date; diaSemana: string; esDescanso: boolean | null }[],
  estado: EstadoDescanso,
  planificado: string | null,
  inicioDeHoy: Date,
): { fecha: Date; esDescanso: boolean }[] {
  const cambios: { fecha: Date; esDescanso: boolean }[] = [];
  for (const d of dias) {
    if (d.fecha.getTime() < inicioDeHoy.getTime()) continue;
    const debeSer = esDescansoObligatorio(d.diaSemana, estado, planificado);
    // `!==` y no `!`: una fila en `null` es la AUSENCIA del dato, no un `false`, y el motor la
    // resuelve con el respaldo (o sea, domingo). Dejarla sin escribir haría que esa semana se
    // liquidara contra el domingo justo cuando el plan dice otro día.
    if (d.esDescanso !== debeSer) cambios.push({ fecha: d.fecha, esDescanso: debeSer });
  }
  return cambios;
}

// ────────── EL PLAN DE CADA SEMANA, PARA UN RANGO DE MUCHAS (22 de septiembre de 2026) ──────────
//
// La pieza anterior arregló el pintado. Falta el otro camino, y es el que muerde en silencio:
// `materializarColaborador` recorre hasta 60 días escribiendo `esDescanso` día por día, y cuando
// alguien cambia un horario esa regeneración corre con `pisarExistentes` y devuelve al DOMINGO las
// filas AUTO de una semana ya planificada con otro día. No falla nada, solo cambia un recargo.
//
// Las dos mitades ya existen y están probadas: `rangoSemanaBogota` dice a qué semana pertenece un
// día y `descansoDeLaSemana` dice cuál lleva el descanso. Esto es la UNIÓN, que es donde un error
// aplicaría el plan de una semana a la de al lado.
//
// La clave es el LUNES de la semana, en "YYYY-MM-DD". Una semana sin plan o AMBIGUA no entra en el
// mapa: quien pregunta recibe `undefined`, pasa `null`, y cae al domingo. Así la regla de la
// ambigüedad vive en un solo sitio (`descansoDeLaSemana`) en vez de escribirse dos veces.
//
// EL CAMPO SE LLAMA `descansoMarcado` Y NO `esDescansoDeTurno` desde el 29 de septiembre de 2026.
// Es SOLO un cambio de nombre, sin ningún cambio de comportamiento: quien la llama ya consultaba
// `descansoPintado` desde el 23 de septiembre. Se renombra porque el nombre viejo es exactamente lo
// que indujo el error en la otra mitad, `propuestaDeDescanso`, que se quedó alimentada con
// `plantilla.esDescanso` durante seis días diciéndole a la pantalla lo contrario que el motor.
export function descansosPlanificadosPorSemana(
  dias: readonly { fecha: Date; descansoMarcado: boolean }[],
): Map<string, string> {
  const porSemana = new Map<string, { dia: unknown; esDescanso: boolean }[]>();
  for (const d of dias) {
    const { lunes } = rangoSemanaBogota(d.fecha);
    const clave = claveDiaBogota(lunes);
    const entrada = {
      dia: diaSemanaDeFechaBogota(d.fecha),
      // `=== true` y no un truthy: lo que llega de la relación puede ser `null`, y `null` no es un
      // día marcado como descanso.
      esDescanso: d.descansoMarcado === true,
    };
    const lista = porSemana.get(clave);
    if (lista) lista.push(entrada);
    else porSemana.set(clave, [entrada]);
  }

  const salida = new Map<string, string>();
  for (const [clave, lista] of porSemana) {
    const dia = descansoDeLaSemana(lista);
    if (dia !== null) salida.set(clave, dia);
  }
  return salida;
}

// ────────── QUÉ LE DICE LA PANTALLA A QUIEN PLANIFICA UNA SEMANA (22 de septiembre de 2026) ──────────
//
// Decidido con el dueño: un día EN BLANCO no se asume como descanso, porque el olvido de
// planificarlo y la decisión de dejarlo libre producen exactamente el mismo dato, y asumir sería
// dejar de pagar un recargo por deducción propia. Pero exigir un clic extra en cada semana de cada
// persona es fricción real. La salida es que el sistema PROPONGA y alguien confirme, que es el
// mismo patrón del modal del descanso: el backend deduce, llega preseleccionado cuando pudo
// deducir, y queda vacío cuando no.
//
// CUATRO ESTADOS Y NO UN BOOLEANO (CLAUDE.md §9.4): cada uno le dice algo distinto a quien mira, y
// un `? :` volvería a suponer en cuanto aparezca el quinto (la excepción marcada, que ya está en el
// plan). `SIN_DESCANSO` y `AMBIGUA` caen las dos al domingo, pero una es una omisión y la otra un
// error ya cometido: decirle «no hay descanso» a quien planificó dos lo mandaría a buscar lo que no
// falta.
//
// Y `NO_APLICA` para quien no es ROTATIVO: sin acuerdo escrito, pintar no mueve el descanso de
// nadie, así que proponerle un día sería ofrecerle una decisión que no puede tomar.
export type PropuestaDeDescanso =
  | { estado: 'NO_APLICA' }
  | { estado: 'RESUELTA'; dia: string }
  | { estado: 'PROPUESTA'; dia: string }
  | { estado: 'SIN_DESCANSO' }
  | { estado: 'AMBIGUA' };

export function propuestaDeDescanso(
  dias: readonly { dia: unknown; pintado: boolean; descansoMarcado: boolean }[],
  estado: EstadoDescanso,
): PropuestaDeDescanso {
  if (estado.tipo !== 'ROTATIVO') return { estado: 'NO_APLICA' };

  // El MISMO conjunto que usa `descansoDeLaSemana`, no una segunda versión: si contaran distinto,
  // la pantalla diría «resuelta el miércoles» mientras el motor liquida el domingo.
  //
  // Y SALE DE LA MISMA COLUMNA, que es lo que faltaba hasta el 29 de septiembre de 2026: este campo
  // se llamaba `esDescansoDeTurno` y la ruta lo alimentaba con `plantilla.esDescanso`, o sea con el
  // modelo viejo, el del turno de descanso del catálogo. El motor ya leía `descansoPintado`, la
  // columna del día, desde el 23 de septiembre. Compartir la función no alcanzaba: lo que las
  // separaba era el dato que cada una recibía. Se renombró para que el nombre no invite a repetirlo.
  const marcados = diasConTurnoDeDescanso(dias.map(d => ({ dia: d.dia, esDescanso: d.descansoMarcado })));
  // Lo que alguien ELIGIÓ manda sobre lo que se puede deducir de un hueco.
  if (marcados.size === 1) return { estado: 'RESUELTA', dia: Array.from(marcados)[0] };
  if (marcados.size > 1) return { estado: 'AMBIGUA' };

  // Sin ningún descanso pintado: se propone si sobra EXACTAMENTE un día. Los nombres inválidos se
  // descartan antes de contar, porque proponer un día que no existe pintaría un turno que el
  // backend rechazaría con un error que nadie sabría explicar.
  const enBlanco = new Set(
    dias.filter(d => d.pintado !== true)
      .map(d => diaValido(d.dia))
      .filter((n): n is string => n !== null),
  );
  return enBlanco.size === 1
    ? { estado: 'PROPUESTA', dia: Array.from(enBlanco)[0] }
    : { estado: 'SIN_DESCANSO' };
}
