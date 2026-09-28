import { useState, useEffect, useLayoutEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Clock, Scale, X, Plus, Check, Moon, RotateCw } from 'lucide-react';
import api from '../../lib/api';
import {
  hoyEnBogota, horasDeMinutos, sePuedePintar, inicialDeDia,
} from './semana';
// La selección en bloque y el guardado por bloques: dos decisiones puras, probadas y mutadas aparte.
// Qué celdas caen dentro de un rectángulo y qué se va a escribir de verdad NO se deciden aquí.
import { claveDeCelda, celdasDelRectangulo, type Celda as CeldaMarcada } from './seleccionEnBloque';
import { bloquesDe, planDeEscritura, type AccionDeEscritura } from './aplicacionPorBloques';
// Las cuentas y los avisos de la previa. También puros, probados y mutados: la pantalla los APLICA,
// no los decide. De ellos depende que alguien apruebe o cancele un envío de cien jornadas.
import {
  conteoDePrevia, descansosPisados, cruzanAHabitual, type CeldaParaPrevia,
} from './previaDeBloque';
// El motor de rotaciones y la proyección del mes: también puros, probados y mutados. Qué le toca a
// cada día del ciclo y qué semanas quedarían sin descanso NO se deciden aquí.
import { ROTACIONES, accionDelDia, semanasSinDescanso, type PatronDeRotacion } from './rotacion';
import { proyeccionDelMes } from './proyeccionDeRotacion';
// Qué se le escribe a cada día con lo que está pendiente: una acción igual para todas las celdas, o
// una rotación que reparte turnos y descansos por el ciclo. Puro, probado y mutado aparte.
import { accionDeLoPendiente, type LoPendiente } from './loPendiente';
import { diasEntre, sumarDias, nombreDelMes, rotuloCorto } from './semana';
// Qué rango le toca a cada modo y cómo se mueven las flechas. Es una decisión pura, probada y
// mutada aparte: aquí solo se aplica.
import { vistaDelCalendario, moverVista, type ModoDeVista } from './vistaDelCalendario';
// Qué semanas hay dentro de las columnas y cuántos minutos exige cada una. Puro, probado y mutado:
// de ese número sale la alarma de las 42 horas, que es semanal.
import { semanasDeLasColumnas, minutosDeLaSemana } from './semanasDeLaRejilla';
import { nombreDelDia } from '../../lib/diasDeLaSemana';
import { CLASES_COLOR, PUNTO_COLOR, normalizarColor } from '../../lib/coloresDeTurno';
import { rotuloDeCelda, type OrigenDelRotulo } from './rotuloDeCelda';
// Dónde cabe un panel flotante sin salirse de la pantalla. Vive en `lib/` porque el pedido del
// dueño fue para TODA esta clase de elementos, no solo para este.
import { posicionDePanel, type Rect } from '../../lib/posicionDePanel';
import { detalleDeJornada } from './detalleDeJornada';
// El eje de horas de la vista de día, con la regla del turno nocturno. Puro, probado y mutado.
import { ejeDelDia, horasDelEje, tramoDeJornada, type EjeDeHoras } from './ejeDeHoras';

// EL CALENDARIO DE TURNOS: una semana, una fila por persona (20 de septiembre de 2026).
//
// Por qué semana × persona y no día × hora: un día de descanso es una AUSENCIA, y una ausencia no
// se dibuja en una línea de tiempo por horas —quien descansa simplemente no tendría bloque—. Justo
// lo único que esta pantalla viene a vigilar sería lo único invisible. Además el eje de recursos
// serían personas, y una sola empresa de las que hay en producción tiene 35: no caben como
// columnas, sí como filas.
//
// Las tarjetas de arriba: las dos primeras son descriptivas y las dos últimas son las que
// distinguen a este producto. NO hay tarjeta de «cobertura»: para calcularla haría falta saber
// cuánta gente exige cada turno, y eso no existe en el modelo. Una tarjeta que dijera «100%»
// sin dato detrás sería peor que no tenerla.

type DiaDelCalendario = {
  fecha: string;
  estado: 'TRABAJA' | 'DESCANSO' | 'DESCANSO_TRABAJADO' | 'SIN_TURNO';
  horaEntrada: string | null;
  horaSalida: string | null;
  minutosEsperados: number;
  // LAS REGLAS CON LAS QUE ESTE DÍA SE LIQUIDA, que el panel de la celda muestra. Salen de la fila
  // del día y no del horario vigente, igual que `horarioNombre`: son las de ESE día.
  //
  // Van juntas y completas porque `detalleDeJornada` las necesita todas para redactarlas. OJO: los
  // fixtures de las pruebas pasan por `unknown[]`, así que TypeScript no obliga a ponerlas ahí.
  toleranciaMin: number;
  toleranciaSalidaMin: number;
  ajustaEntrada: boolean;
  almuerzoMin: number;
  almuerzoInicio: string | null;
  almuerzoFin: string | null;
  descansos: { inicio: string; fin: string }[];
  esFestivo: boolean;
  // SI ESTE DÍA ES EL DESCANSO OBLIGATORIO DE ESA PERSONA (28 de septiembre de 2026).
  //
  // Lo decide el backend, con la guarda legal del acuerdo escrito dentro, y viaja porque la
  // programación en bloque tiene que poder avisar «pintarías sobre el descanso obligatorio de tres
  // jornadas» ANTES de escribir.
  //
  // NO SE DEDUCE DE `estado`, que fue lo primero que se intentó: un día marcado a mano como descanso
  // también llega como `DESCANSO` sin ser el obligatorio, así que deducirlo daría un aviso falso
  // justo en el caso que cuesta dinero. Y tampoco de `descanso.tipo` de la fila: esa regla lleva
  // dentro que sin acuerdo escrito cualquier día declarado vale como domingo, y una segunda copia es
  // como se separan (CLAUDE.md §9.3).
  esDescansoObligatorio: boolean;
  origen: string | null;
  // El turno del CATÁLOGO con el que se pintó este día, cuando alguien lo pintó. `null` significa
  // que no lo pintó ninguno, y entonces el nombre lo pone `horarioNombre`.
  // El `id` viaja desde el 28 de septiembre de 2026 y lo usa la previa de la programación en bloque:
  // para decir cuántas jornadas NO cambian hay que comparar el turno que el día YA tiene contra el
  // que se le va a poner, y eso se compara por identidad. Por nombre sería frágil, porque dos turnos
  // del catálogo pueden llamarse igual.
  turno: { id: string; nombre: string; color: string } | null;
  // El nombre del horario que rige ESTE día, tal como lo resolvió el backend: el del horario con
  // el que la fila quedó congelada, no el que la persona tenga hoy. `null` solo cuando de verdad
  // no hay horario detrás, que es el único caso que merece decir «sin asignar».
  horarioNombre: string | null;
  // Qué se decidió sobre este descanso trabajado. Lo resuelve `decisionDelDia` en el backend:
  // `null` cuando el día no es un descanso trabajado, y `PENDIENTE` cuando lo es y nadie ha
  // decidido todavía (la fila nace al decidir, así que su ausencia ES el pendiente).
  decision: 'PENDIENTE' | 'DINERO' | 'COMPENSATORIO' | null;
};

type FilaDelCalendario = {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string | null;
  descanso: { tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO'; dia: string | null };
  minutosEsperados: number;
  // Lo PROGRAMADO en la semana: cuántos de sus días de descanso tienen turno encima. Sale del
  // horario, no de lo que ocurrió.
  descansosConTurno: number;
  // La regla legal, que es otra cosa y por eso viaja aparte: los descansos que TRABAJÓ de verdad
  // (con marcaciones) en el mes calendario. Medido contra la base, los dos conjuntos resultaron
  // disjuntos, así que confundirlos no es un matiz.
  descansoHabitual: {
    porMes: Record<string, number>;
    mes: string;
    trabajados: number;
    clase: 'NINGUNO' | 'OCASIONAL' | 'HABITUAL';
  };
  dias: DiaDelCalendario[];
  // Qué proponerle a quien planifica esta semana. Ver `PropuestaDeDescanso`.
  propuesta: PropuestaDeDescanso | null;
};

// `minimoHabitual` es el tercer descanso trabajado del mes, a partir del cual compensar con TIEMPO
// deja de ser opcional (art. 181). Viaja por la misma razón que `horasSemanales`: son los dos números
// legales que esta pantalla nombra, y escribirlos aquí a mano los congelaría el día que la ley los
// mueva. La constante del backend ya lo advertía en su comentario.
//
// OPCIONAL a propósito: una respuesta vieja en caché o un backend anterior no lo traen, y en ese caso
// la previa CALLA el aviso del habitual en vez de suponer un tres. Inventar el umbral en la pantalla
// sería la segunda copia de una regla legal.
type Respuesta = {
  desde: string;
  hasta: string;
  horasSemanales: number;
  minimoHabitual?: number;
  filas: FilaDelCalendario[];
};

// Lo que el selector necesita de un turno del catálogo. La ruta devuelve bastante más (ventana de
// almuerzo, descansos, sede) y eso sigue fuera: lo que ese turno EXIGE lo resuelve el backend al
// pintar, no esta pantalla.
//
// LAS HORAS SÍ ENTRAN, desde el 28 de septiembre de 2026. Antes se descartaban aquí mismo, en el
// borde de tipos, aunque la respuesta ya las traía. El problema se vio en la pantalla real del dueño:
// sus turnos se llaman «test», «test 2» y «Test largo», y al aplicar a un bloque de veinte personas
// la tarjeta no dejaba confirmar QUÉ horario se iba a escribir sin salir al catálogo y perder la
// selección. Lo que se escribe es lo que ese día va a exigir, así que el nombre solo no basta.
//
// `null` en las dos es un turno sin jornada (un descanso del catálogo), y entonces no se dice ninguna
// hora en vez de inventarse un «00:00».
type TurnoDelCatalogo = {
  id: string;
  nombre: string;
  color: string;
  horaEntrada: string | null;
  horaSalida: string | null;
};

// LA PASTILLA DE UN TURNO DEL CATÁLOGO, en un solo sitio.
//
// Se pintaba en TRES: el carril de la tarjeta de bloque, el panel del día y la ventana de rotación.
// Las tres eran el mismo botón redondo con el nombre dentro, y al añadirles el horario habrían sido
// tres copias de la misma regla de presentación destinadas a separarse (CLAUDE.md §9.3). Se
// encontraron buscando el patrón `CLASES_COLOR[normalizarColor(t.color)]`, no de memoria.
//
// El punto de color viene de `PUNTO_COLOR`, que ya existía en la librería para el selector del
// catálogo: es el relleno sólido del mismo tono que el fondo claro de la pastilla.
//
// EL PUNTO NO TIENE PRUEBA, Y ESO ES DELIBERADO. Se comprobó con una mutación: quitándolo no se pone
// roja ninguna de las 51 pruebas de esta pantalla. La única forma de sujetarlo sería afirmar una
// clase de CSS, y eso es justo lo que CLAUDE.md §7 prohíbe —una prueba que se rompe al renombrar una
// clase no prueba comportamiento, solo parece cobertura—. Lo que sí está cubierto es lo que el punto
// acompaña: el nombre y el horario del turno, y el color del propio fondo de la pastilla. El punto se
// verificó a ojo en el navegador y se queda como decoración declarada, no como algo probado.
function PastillaDeTurno({ turno, activa = true }: { turno: TurnoDelCatalogo; activa?: boolean }) {
  const horas = turno.horaEntrada && turno.horaSalida ? `${turno.horaEntrada}–${turno.horaSalida}` : null;
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        activa ? PUNTO_COLOR[normalizarColor(turno.color)] : 'bg-gray-400'}`} />
      <span className="flex flex-col items-start leading-tight">
        <span>{turno.nombre}</span>
        {/* Sin horas no se dice nada: un turno de descanso del catálogo no tiene jornada, y poner un
            guion o un «00:00» afirmaría una que no existe. */}
        {horas && <span className="text-[10px] font-normal tabular-nums opacity-70">{horas}</span>}
      </span>
    </span>
  );
}

// LA PROPUESTA DE DESCANSO DE UNA SEMANA ROTATIVA. La decide el backend (`propuestaDeDescanso`,
// pura y mutada) y aquí solo se muestra: es una regla que roza el dinero, y deducirla otra vez en
// la pantalla la pondría en dos sitios.
//
// `null` significa «no se calculó para este rango» (la ruta solo la calcula cuando se pide una
// semana), que es distinto de `NO_APLICA` («esta persona no es rotativa»).
// LO QUE EL MODAL DEL DESCANSO TRABAJADO NECESITA PARA ABRIRSE (22 de septiembre de 2026).
//
// Lo decide todo el backend (`opcionesDeCompensacion`, `revisionDeDecision`, puras y mutadas): la
// pantalla no vuelve a razonar qué cabe según la clase. Si lo hiciera, la regla viviría en dos
// sitios, y es una regla de la que depende si a alguien le deben un día libre.
type DecisionDeDescansoTrabajado = {
  fecha: string;
  decision: 'PENDIENTE' | 'DINERO' | 'COMPENSATORIO';
  fechaCompensatorio: string | null;
  nota: string | null;
  claseAlDecidir: 'NINGUNO' | 'OCASIONAL' | 'HABITUAL' | null;
  decididoPor: string | null;
  decididoEn: string | null;
  claseActual: 'NINGUNO' | 'OCASIONAL' | 'HABITUAL';
  opciones: ('DINERO' | 'COMPENSATORIO')[];
  // Art. 180: siendo ocasional, la elección es del TRABAJADOR. La pantalla lo dice con todas las
  // letras para que nadie la use como «elige tú, empresa».
  eligeElTrabajador: boolean;
  revision: 'SIN_DECIDIR' | 'AL_DIA' | 'REVISAR_COMPENSATORIO' | 'REVISAR_SOBRANTE';
  cambios: { campo: string; antes: string; despues: string; quien: string | null; cuando: string }[];
};

type PropuestaDeDescanso =
  | { estado: 'NO_APLICA' }
  | { estado: 'RESUELTA'; dia: string; fecha: string | null }
  | { estado: 'PROPUESTA'; dia: string; fecha: string | null }
  | { estado: 'SIN_DESCANSO' }
  | { estado: 'AMBIGUA' };

// Qué día descansa esta persona, dicho en palabras. El tipo ya viene con la guarda legal aplicada
// desde el backend: si alguien declaró un día sin acuerdo escrito, aquí llega como PRESUMIDO.
function descansoEnPalabras(d: FilaDelCalendario['descanso']): string {
  if (d.tipo === 'ROTATIVO') return 'Rotativo';
  if (d.tipo === 'FIJO' && d.dia) return nombreDelDia(d.dia);
  return 'Domingo';
}

function Inicial({ nombre, apellido }: { nombre: string; apellido: string }) {
  return (
    <div className="bg-primary/30 rounded-full w-8 h-8 shrink-0 flex items-center justify-center text-xs font-bold text-ink">
      {`${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()}
    </div>
  );
}

// LO QUE VA DENTRO DE LA PISTA DE UNA FILA, en la vista de día (22 de septiembre de 2026).
//
// Con horas: una BARRA del color del turno, colocada donde diga `tramoDeJornada` —que es puro,
// probado y mutado—. Aquí no se calcula ningún porcentaje, solo se pinta el que devuelve.
//
// Sin horas (un descanso, o un día que nadie programó): no hay barra que dibujar, y se cae a la
// MISMA celda de la vista de semana, centrada en la pista. Así el descanso sigue diciendo Descanso
// y el hueco sigue ofreciendo su recuadro gris con el «+», sin una segunda versión de esos tres casos.
function PistaDeLaFila({ fila, dia, eje, celda }: {
  fila: FilaDelCalendario;
  dia: DiaDelCalendario | undefined;
  eje: EjeDeHoras;
  celda: (
    fila: FilaDelCalendario,
    dia: DiaDelCalendario,
    opciones?: { clase?: string; contenido?: (sePuedeAgregar: boolean) => React.ReactNode },
  ) => React.ReactNode;
}) {
  if (!dia) return null;
  const tramo = tramoDeJornada(dia.horaEntrada, dia.horaSalida, eje);
  if (!tramo) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-40 max-w-full">{celda(fila, dia)}</div>
      </div>
    );
  }

  const esDescansoTrabajado = dia.estado === 'DESCANSO_TRABAJADO';
  const { rotulo, tono } = tonoDeJornada(dia);
  // La barra pasa por el MISMO envoltorio que la celda de la semana, así que abre el panel y pinta
  // igual que ella. Primero salió como un `div` suelto y la vista de día se quedó sin clic.
  return (
    <div style={{ left: `${tramo.desdePct}%`, width: `${tramo.anchoPct}%` }}
      className="absolute inset-y-0">
      {celda(fila, dia, {
        clase: 'h-full w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-primary hover:opacity-80 transition-opacity',
        contenido: () => (
          <div className={`h-full w-full overflow-hidden rounded-lg px-2 flex flex-col justify-center ${
            esDescansoTrabajado ? 'bg-amber-100 ring-1 ring-amber-300 text-amber-900' : tono}`}>
            <span className="truncate text-[11px] font-semibold leading-tight">
              {esDescansoTrabajado ? 'Descanso' : rotulo.texto}
            </span>
            {/* El rango entero, que es lo que el dueño pidió ver: «desde la hora inicio, hora fin». */}
            <span className="truncate text-[11px] tabular-nums leading-tight opacity-80">
              {dia.horaEntrada}–{dia.horaSalida}
            </span>
          </div>
        ),
      })}
    </div>
  );
}

function Tarjeta({ icono: Icono, valor, titulo, nota, alerta }: {
  icono: typeof Users; valor: string; titulo: string; nota?: string; alerta?: boolean;
}) {
  return (
    <div className={`rounded-card border px-4 py-3 flex items-center gap-3 ${
      alerta ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className={`rounded-lg p-2 shrink-0 ${alerta ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-muted'}`}>
        <Icono size={16} />
      </div>
      <div className="min-w-0">
        <div className={`text-lg font-bold leading-tight tabular-nums ${alerta ? 'text-amber-900' : 'text-ink'}`}>{valor}</div>
        <div className={`text-[11px] leading-tight ${alerta ? 'text-amber-800' : 'text-muted'}`}>{titulo}</div>
        {nota && <div className={`text-[10px] leading-tight mt-0.5 ${alerta ? 'text-amber-700' : 'text-gray-400'}`}>{nota}</div>}
      </div>
    </div>
  );
}

// La celda de un día. Cada estado se pinta distinto a propósito: el descanso tiene que VERSE, porque
// una celda vacía y un descanso no son lo mismo (alguien de lunes a viernes tiene DOS días sin
// trabajar y solo uno es su descanso).
// DE DÓNDE SALE EL COLOR DE UNA JORNADA, en un solo sitio.
//
// Tabla por origen y no un ternario anidado: la decisión se extrajo a tres casos justamente para no
// volver a tener un `else` que suponga (CLAUDE.md §9.4).
//
// Vive FUERA de `Celda` desde el 22 de septiembre de 2026, cuando la vista de día estrenó su barra
// de horas: la barra tiene que llevar exactamente el mismo color que la celda de la semana, y dos
// copias de esta tabla se habrían separado al primer color nuevo del catálogo (CLAUDE.md §9.3).
const NEUTRO: Record<OrigenDelRotulo, string> = {
  CATALOGO: '', // no se usa: ese caso trae su propio color
  HORARIO: 'bg-white text-ink ring-1 ring-gray-300',
  NINGUNO: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200',
};

function tonoDeJornada(dia: DiaDelCalendario) {
  const rotulo = rotuloDeCelda(dia.turno, dia.horarioNombre);
  const tono = rotulo.origen === 'CATALOGO' && dia.turno
    ? CLASES_COLOR[normalizarColor(dia.turno.color)]
    : NEUTRO[rotulo.origen];
  return { rotulo, tono };
}

function Celda({ dia, sePuedeAgregar = false }: { dia: DiaDelCalendario; sePuedeAgregar?: boolean }) {
  const horas = dia.horaEntrada && dia.horaSalida ? `${dia.horaEntrada}–${dia.horaSalida}` : null;

  // El descanso trabajado manda sobre el turno pintado: es el dato que cuesta dinero, y pintarlo
  // como un día cualquiera lo escondería.
  if (dia.estado === 'DESCANSO_TRABAJADO') {
    return (
      <div className="rounded-lg bg-amber-100 ring-1 ring-amber-300 px-2 py-1.5">
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-900 whitespace-nowrap">
          <AlertTriangle size={11} className="shrink-0" />
          Descanso
        </div>
        {horas && <div className="text-[11px] text-amber-800 tabular-nums text-center whitespace-nowrap">{horas}</div>}
        {/* SOLO SE AVISA LO QUE FALTA (22 de septiembre de 2026). Un día ya decidido no dice nada
            extra: la ausencia de la palabra es la señal de que está atendido. Poner también un
            «resuelto» llenaría la rejilla de ruido y haría que «pendiente» dejara de saltar a la
            vista, que es lo único que tiene que hacer.

            `=== 'PENDIENTE'` y no una comprobación laxa: aquí `undefined` (una respuesta vieja en
            caché, un backend anterior) SÍ debe comportarse distinto, porque marcarlo pendiente
            sería inventar un aviso. */}
        {dia.decision === 'PENDIENTE' && (
          <div className="mt-1 rounded-full bg-rose-100 text-rose-900 text-[10px] font-semibold text-center">
            Pendiente
          </div>
        )}
      </div>
    );
  }

  // DICE «DESCANSO» Y NO «LIBRE» desde el 23 de septiembre de 2026, con esas palabras del dueño:
  // «debería verse una tarjeta que diga descanso». Eran dos palabras para una sola cosa, y desde que
  // el día se marca con un botón que dice «Marcar como descanso», el resultado tiene que llamarse
  // igual que la acción: nadie debería tener que deducir que lo que pidió salió con otro nombre.
  if (dia.estado === 'DESCANSO') {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-center text-[11px] font-medium text-muted">
        Descanso
      </div>
    );
  }

  if (dia.estado === 'TRABAJA') {
    // DE DÓNDE SALIÓ EL NOMBRE, Y POR QUÉ SE VE DISTINTO (21 de septiembre de 2026).
    //
    // Antes esta celda deducía «Mañana», «Tarde» o «Noche» de las horas del día. Como descripción
    // era cierta, pero se LEÍA como un turno asignado: el dueño vio un sábado y un domingo en verde
    // diciendo «Mañana» y preguntó quién se los había puesto. Nadie. Salían del horario.
    //
    // Se quitó, y la celda pasó a decir «Sin asignar» para todo lo que no estuviera pintado con el
    // catálogo. Eso tapó la mentira con otra: un día que el horario programa SÍ está asignado,
    // tiene horas y exige presencia. El dueño abrió la semana siguiente y vio a su equipo entero
    // «sin asignar» teniendo todos su horario puesto.
    //
    // Ahora son TRES orígenes con tres tonos, y quién es cuál lo decide `rotuloDeCelda`, que es
    // pura y está probada. El color dice de dónde viene el nombre: lo que alguien ELIGIÓ lleva el
    // color que le puso en el catálogo, lo que IMPONE el horario va en blanco con borde, y solo lo
    // que no tiene nada detrás se queda con el gris de «esto está pendiente».
    const { rotulo, tono } = tonoDeJornada(dia);

    return (
      <div className={`rounded-lg px-2 py-1.5 ${tono}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
          {rotulo.texto}
        </div>
        {horas && <div className="text-[11px] tabular-nums opacity-80 whitespace-nowrap">{horas}</div>}
      </div>
    );
  }

  // EL HUECO (22 de septiembre de 2026). Pedido del dueño: «cuando no exista nada, que se vea un
  // cuadro gris con un más adentro para agregar».
  //
  // La raya `—` decía «aquí no hay nada» sin decir que se podía poner algo: el hueco se leía como
  // un dato y no como una invitación.
  //
  // Solo donde de verdad se puede agregar. Un día ya pasado también llega aquí, y ofrecerle un «+»
  // sería prometer un clic que el servidor va a rechazar con un 400.
  if (!sePuedeAgregar) return <div className="py-1.5 text-center text-[11px] text-gray-300">—</div>;

  return (
    <div className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-gray-400">
      <Plus size={12} className="shrink-0" />
      Agregar
    </div>
  );
}

// EL PANEL DE LA JORNADA (22 de septiembre de 2026).
//
// Pedido del dueño: «cuando le doy clic en jornada, que salga más un input con las opciones en vez
// de un modal», y con más información, «similar a como tenemos en la creación de horario: las
// tolerancias, cómo se maneja el almuerzo, descansos no remunerados».
//
// UN PANEL Y NO UN MODAL, y la diferencia no es de estilo: un modal se anuncia con `aria-modal`,
// atrapa el foco y tapa la rejilla. Aquí se está comparando días entre sí, y taparlos para elegir
// un turno obliga a cerrar y volver a abrir para mirar el de al lado.
//
// DÓNDE SE DIBUJA lo decide `posicionDePanel`, que es pura y está probada y mutada aparte. Aquí no
// se calcula nada: se mide el panel, se mide la ventana, y se pregunta.
function PanelDeJornada({ ancla, titulo, subtitulo, dia, catalogo, ocupado, error, onElegir, onDescanso, onQuitar, onCerrar }: {
  ancla: Rect;
  titulo: string;
  subtitulo: string;
  dia: DiaDelCalendario;
  catalogo: TurnoDelCatalogo[];
  ocupado: boolean;
  error: string;
  onElegir: (plantillaId: string) => void;
  onDescanso: () => void;
  onQuitar: () => void;
  onCerrar: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Se mide DESPUÉS de dibujar y antes de pintar. Hasta que el panel no existe no se sabe cuánto
  // mide, y su alto cambia con el contenido: un día con tres descansos es más alto que uno sin
  // ninguno. Darle un alto fijo de memoria es justo lo que lo dejaría saliéndose por abajo.
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    // `offsetWidth`/`offsetHeight` Y NO `getBoundingClientRect()`, y esto es todo el asunto
    // (24 de septiembre de 2026).
    //
    // Este panel lleva la clase `hp-pop`, que es `animation: ... both`. Ese `both` aplica el PRIMER
    // fotograma desde que el elemento existe, y el primer fotograma es `transform: scale(0)`.
    // `getBoundingClientRect()` devuelve la caja YA TRANSFORMADA, así que aquí medía 0 por 0.
    //
    // Con cero, `posicionDePanel` contestaba lo correcto a una pregunta falsa: algo de 0 por 0 cabe
    // en cualquier parte, así que ninguno de sus topes llegaba a actuar nunca. El panel se dibujaba
    // pegado a la celda y, en la última columna, se salía de la pantalla. En una celda del medio se
    // veía bien por casualidad, porque sobraba espacio.
    //
    // `offsetWidth` y `offsetHeight` dan la caja de maquetación e IGNORAN el transform, que es
    // justo lo que hace falta: el tamaño que el panel va a tener cuando la animación termine.
    const acomodar = () => {
      setPos(posicionDePanel(
        ancla,
        { ancho: el.offsetWidth, alto: el.offsetHeight },
        { ancho: window.innerWidth, alto: window.innerHeight },
      ));
    };
    acomodar();
    // Si la ventana cambia de tamaño con el panel abierto, lo que cabía deja de caber.
    window.addEventListener('resize', acomodar);
    return () => window.removeEventListener('resize', acomodar);
  }, [ancla]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Las reglas redactadas. La lista viene vacía cuando el día no tiene horas, y entonces no se
  // dibuja el bloque: mostrar tolerancias y almuerzo de un día que nadie trabaja sería inventarlas.
  const detalle = detalleDeJornada(dia);

  return (
    <div ref={caja} role="dialog" aria-label={`Jornada de ${titulo}`}
      // `opacity` y no `visibility` para esconderlo mientras se mide: `visibility: hidden` lo saca
      // del árbol de accesibilidad, y con él se iría el `role="dialog"` que lo hace alcanzable.
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, opacity: pos ? 1 : 0 }}
      className="hp-pop fixed z-[70] !mt-0 w-[19rem] max-w-[calc(100vw-1rem)] max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
      <div className="px-4 pt-3 pb-2.5 border-b border-gray-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-ink truncate">{titulo}</h3>
          <p className="text-[11px] text-muted">{subtitulo}</p>
        </div>
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted hover:text-ink shrink-0">
          <X size={16} />
        </button>
      </div>

      {detalle.length > 0 && (
        <dl className="px-4 py-2.5 border-b border-gray-100 space-y-1.5">
          {detalle.map(l => (
            <div key={l.etiqueta} className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] text-muted shrink-0">{l.etiqueta}</dt>
              <dd className="min-w-0 text-right">
                <div className="text-[12px] font-medium text-ink">{l.valor}</div>
                {l.nota && <div className="text-[10px] text-muted leading-snug">{l.nota}</div>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Pintar un turno</p>
        {catalogo.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay turnos en el catálogo. Créalos en la pestaña <b>Catálogo</b>.
          </p>
        ) : (
          // Elegir ES la acción: no hay un «guardar» después, porque un paso más para algo
          // reversible solo añade fricción.
          <div className="flex flex-wrap gap-1.5">
            {catalogo.map(t => (
              <button key={t.id} type="button" disabled={ocupado} onClick={() => onElegir(t.id)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold disabled:opacity-60 ${CLASES_COLOR[normalizarColor(t.color)]}`}>
                <PastillaDeTurno turno={t} />
              </button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600 mt-2.5">{error}</p>}
      </div>

      {/* MARCAR EL DÍA COMO DESCANSO. Va al final y separado de los turnos a propósito: no es un
          turno más de la lista, es otra cosa. Y no necesita que exista nada en el catálogo, que es
          justo lo que antes lo hacía imposible. */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button type="button" disabled={ocupado} onClick={onDescanso}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[12px] font-semibold text-muted hover:text-ink hover:border-gray-400 disabled:opacity-60 transition-colors">
          Marcar como descanso
        </button>
      </div>

      {/* Quitar solo aparece si hay algo que quitar: ofrecerlo en un día limpio sugeriría que hay
          algo que deshacer, y el servidor respondería que no. */}
      {dia.origen === 'MANUAL' && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <button type="button" disabled={ocupado} onClick={onQuitar}
            className="text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-60">
            Quitar el turno y volver al horario
          </button>
        </div>
      )}
    </div>
  );
}

// QUÉ SE LE DICE A QUIEN PLANIFICA UNA SEMANA ROTATIVA (22 de septiembre de 2026).
//
// Decidido con el dueño: un día en blanco NO se asume como descanso, porque el olvido y la decisión
// producen el mismo dato y asumir dejaría de pagar un recargo por deducción propia. Pero pedir un
// clic en cada semana de cada persona es fricción real, así que el sistema PROPONE y alguien
// confirma con un clic.
//
// Los cuatro estados se pintan DISTINTOS a propósito. `SIN_DESCANSO` y `AMBIGUA` caen las dos al
// domingo, pero una es una omisión y la otra un error ya cometido: decirle «no hay descanso» a
// quien planificó dos lo mandaría a buscar lo que no falta.
function PropuestaDeSemana({ propuesta, onConfirmar, ocupado }: {
  propuesta: PropuestaDeDescanso | null;
  onConfirmar: (fecha: string) => void;
  ocupado: boolean;
}) {
  // Sin propuesta, no rotativa, o ya resuelta: no hay nada que decir. Una semana resuelta no lleva
  // felicitación: el calendario ya la muestra pintada.
  //
  // `!propuesta` y NO `propuesta === null`, aunque el tipo diga `| null`: el campo es nuevo, y una
  // respuesta que no lo traiga (un payload viejo en caché, una versión anterior del backend) haría
  // que esto leyera `.estado` de `undefined` y tumbara el calendario ENTERO de todo el mundo por una
  // fila. Se comprobó midiendo: con `=== null`, las 15 pruebas del planificador se caían.
  if (!propuesta || propuesta.estado === 'NO_APLICA' || propuesta.estado === 'RESUELTA') return null;

  if (propuesta.estado === 'AMBIGUA') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-900">
        <AlertTriangle size={10} /> Hay dos descansos esta semana
      </span>
    );
  }

  if (propuesta.estado === 'SIN_DESCANSO') {
    return (
      <span className="text-[11px] text-amber-800">Sin descanso asignado: se está tomando el domingo</span>
    );
  }

  // Confirmar PINTA el turno de descanso del catálogo. Sin ese turno no hay nada que pintar, así
  // que se dice en vez de ofrecer un botón que el servidor rechazaría con un error que quien mira
  // no podría explicar.
  // AQUÍ SE PEDÍA UN TURNO DE DESCANSO DEL CATÁLOGO, y si no existía este botón no aparecía nunca:
  // decía «falta un turno de descanso en el catálogo». Medido contra la base antes de cambiarlo, de
  // 10 empresas NINGUNA tenía uno, así que esta función estaba fuera del alcance de todo el mundo.
  //
  // Desde el 23 de septiembre de 2026 marcar un descanso es una acción sobre el día y no necesita
  // catálogo, así que lo único que puede faltar ya es la fecha.
  if (!propuesta.fecha) return null;

  const fecha = propuesta.fecha;
  return (
    <button type="button" disabled={ocupado}
      onClick={() => onConfirmar(fecha)}
      className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60">
      ¿Descansa el {nombreDelDia(propuesta.dia).toLowerCase()}?
    </button>
  );
}

// EL MODAL DEL DESCANSO TRABAJADO.
//
// Antes de esto el sistema pagaba el recargo y no guardaba NINGUNA constancia de qué se acordó. En
// un reclamo laboral eso deja a la empresa sin con qué contestar.
//
// SE PUEDE EDITAR LIBREMENTE, que fue lo que pidió el dueño: nadie tiene que vivir con un error. Es
// seguro porque esta decisión NO mueve plata (el recargo sale del día congelado, que esto no toca),
// y porque cada cambio deja rastro de quién y cuándo.
//
// Solo se dibuja cuando ya tiene los datos: abrirlo vacío y llenarlo después deja medio segundo de
// modal en blanco.
function ModalDescansoTrabajado({ nombre, datos, guardando, error, onCerrar, onGuardar }: {
  nombre: string;
  datos: DecisionDeDescansoTrabajado;
  guardando: boolean;
  error: string;
  onCerrar: () => void;
  onGuardar: (decision: 'DINERO' | 'COMPENSATORIO', fechaCompensatorio: string | null) => void;
}) {
  const [dia, setDia] = useState(datos.fechaCompensatorio ?? '');
  const [faltaDia, setFaltaDia] = useState(false);

  const elegir = (decision: 'DINERO' | 'COMPENSATORIO') => {
    if (decision === 'COMPENSATORIO' && !dia) { setFaltaDia(true); return; }
    onGuardar(decision, decision === 'COMPENSATORIO' ? dia : null);
  };

  // LO QUE LA LEY OBLIGA A DECIR, ELEGIDO POR LA CLASE Y NO POR UN BOOLEANO.
  //
  // Esto era un ternario sobre `eligeElTrabajador`, y ahí estaba el defecto: las clases son TRES y
  // el booleano solo distingue dos. `opcionesDeCompensacion` devuelve `eligeElTrabajador: false`
  // para HABITUAL y también para NINGUNO, así que quien no tenía ningún descanso trabajado en el mes
  // recibía la frase del artículo 181: que se le debe un día compensatorio y que no hay nada que
  // elegir. Visto en pantalla el 28 de septiembre de 2026 con datos reales, contra una respuesta que
  // decía `trabajados: 0, clase: NINGUNO`.
  //
  // Un caso por valor y `default` explícito, que es lo que pide CLAUDE.md §9.4 cuando la pregunta es
  // «de qué tipo es esto»: el día que aparezca una cuarta clase, esto no la mete a la fuerza en la
  // rama de otra.
  const textoLegal = (() => {
    switch (datos.claseActual) {
      case 'OCASIONAL':
        return 'Trabajó su descanso de forma ocasional: la ley deja la elección entre dinero y día compensatorio a su elección, o sea que elige el trabajador. Aquí se registra lo que eligió.';
      case 'HABITUAL':
        return 'Trabajó su descanso de forma habitual: el día compensatorio va además del recargo, sin perjuicio de la retribución en dinero. No hay nada que elegir.';
      case 'NINGUNO':
        // El conteo sale de las MARCACIONES, no de que el día tenga un turno encima: un descanso
        // con turno programado que nadie trabajó no cuenta. Por eso aquí todavía no hay nada que
        // compensar, y decirlo es más honesto que callar.
        return 'Este mes no tiene ningún descanso trabajado registrado. El conteo sale de las marcaciones, no del turno que el día tenga encima, así que por ahora no hay compensación que decidir.';
      default:
        return 'No se puede determinar cómo compensar este día. Revisa el registro antes de decidir.';
    }
  })();

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div role="dialog" aria-modal="true" aria-label="Descanso trabajado"
        className="hp-pop bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-ink">{nombre} trabajó su descanso</h3>
          <p className="text-sm text-muted mt-1">{datos.fecha}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* El aviso que el dueño decidió que el sistema NO resolviera solo. */}
          {datos.revision === 'REVISAR_COMPENSATORIO' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Se decidió cuando era ocasional, y el mes <b>pasó a habitual</b>. Conviene revisar si
              además le corresponde un día compensatorio.
            </p>
          )}
          {datos.revision === 'REVISAR_SOBRANTE' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Se dio compensatorio por ser habitual, y el mes ya no lo es. Conviene revisarlo.
            </p>
          )}

          {/* Lo que la ley obliga a decir, y por eso no es solo copy. El texto lo elige la CLASE
              (ver `textoLegal` arriba), no `eligeElTrabajador`: ese booleano no distingue HABITUAL
              de NINGUNO y por eso se le prometía un compensatorio a quien no había trabajado
              ningún descanso. */}
          <p className="text-sm text-muted">{textoLegal}</p>

          {datos.opciones.includes('COMPENSATORIO') && (
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                Día compensatorio
              </span>
              <input type="date" value={dia} onChange={e => { setDia(e.target.value); setFaltaDia(false); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              {faltaDia && (
                <span className="mt-1 block text-sm text-red-600">
                  Elige el día compensatorio antes de guardar: sin decir qué día, la constancia no prueba nada.
                </span>
              )}
            </label>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          {datos.cambios.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">Cambios</h4>
              <ul className="space-y-1">
                {datos.cambios.map((c, i) => (
                  <li key={i} className="text-[11px] text-muted">
                    <b>{c.campo}</b>: {c.antes} → {c.despues} · {c.quien ?? 'alguien'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-muted">Cerrar</button>
          {datos.opciones.includes('DINERO') && (
            <button type="button" disabled={guardando} onClick={() => elegir('DINERO')}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
              Pagar en dinero
            </button>
          )}
          {datos.opciones.includes('COMPENSATORIO') && (
            <button type="button" disabled={guardando} onClick={() => elegir('COMPENSATORIO')}
              className="bg-primary hover:bg-primary-dark text-ink font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
              Dar compensatorio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// LA TARJETA DE LO QUE ESTÁ MARCADO (28 de septiembre de 2026).
//
// Programar a veinte personas una semana pintando día por día son ciento cuarenta clics. Marcado un
// bloque, esta tarjeta es donde se le aplica UNA cosa a todo.
//
// LOS TURNOS VAN EN UN CARRIL Y LAS TRES ACCIONES FIJAS NO, y eso salió de mirarlo con ocho turnos en
// vez de tres: el catálogo lo crea cada cliente y puede tener veinte. Descanso, Quitar turno y
// Cancelar son siempre las mismas tres, así que la mano las busca en el mismo sitio y no se corren
// cuando el catálogo crece.
//
// LAS FLECHAS DEL CARRIL SE MIDEN, NO SE SUPONEN: si los turnos caben, no aparecen. Y se mide con la
// tarjeta ya dibujada, porque un elemento que todavía no existe mide cero y entonces saldrían siempre.
function TarjetaDeBloque({
  cuenta, catalogo, ocupado, progreso, puedeRotar, onTurno, onDescanso, onQuitar, onRotacion, onCancelar,
}: {
  cuenta: { total: number; personas: number; dias: number; pasadas: number; nombre: string | null };
  catalogo: TurnoDelCatalogo[];
  ocupado: boolean;
  progreso: { bloque: number; bloques: number } | null;
  puedeRotar: boolean;
  onTurno: (plantillaId: string) => void;
  onDescanso: () => void;
  onQuitar: () => void;
  onRotacion: () => void;
  onCancelar: () => void;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const [carril, setCarril] = useState({ desborda: false, alInicio: true, alFinal: false });

  const medir = () => {
    const p = pista.current;
    if (!p) return;
    setCarril({
      desborda: p.scrollWidth > p.clientWidth + 1,
      alInicio: p.scrollLeft <= 1,
      alFinal: p.scrollLeft + p.clientWidth >= p.scrollWidth - 1,
    });
  };

  // Se mide con el largo del catálogo en las dependencias: un turno nuevo puede hacer que lo que
  // cabía deje de caber, y entonces las flechas tienen que aparecer.
  useLayoutEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [catalogo.length]);

  const correr = (hacia: number) => {
    const p = pista.current;
    if (!p) return;
    p.scrollLeft += hacia * Math.max(130, p.clientWidth * 0.8);
    // El desplazamiento es suave: se vuelve a medir cuando ya terminó, no mientras corre.
    setTimeout(medir, 340);
  };

  // QUIÉN Y CUÁNTO, dicho de forma que no haya que recordar nada. Con una sola persona va su NOMBRE y
  // no «1 persona»: «1 persona · 7 días» obliga a acordarse de a quién se marcó.
  const quien = cuenta.nombre ?? `${cuenta.personas} personas`;
  const detalle = `${quien} · ${cuenta.dias} ${cuenta.dias === 1 ? 'día' : 'días'}`;
  // LO QUE NO SE VA A ESCRIBIR TAMBIÉN SE DICE. Escribir menos de lo que alguien creyó haber pedido,
  // sin avisar, es la forma en que esta pantalla mentiría.
  const pasadas = cuenta.pasadas === 0 ? ''
    : cuenta.pasadas === 1 ? ' · 1 ya pasó y no se escribe'
      : ` · ${cuenta.pasadas} ya pasaron y no se escriben`;

  return (
    <div role="region" aria-label="Lo que tienes marcado"
      className="fixed inset-x-3 bottom-3 z-[60] !mt-0 mx-auto max-w-5xl rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200">
      {/* EN PANTALLA ANGOSTA SE APILA, CENTRADO (28 de septiembre de 2026). Medido en el navegador a
          375 px de ancho antes de tocarlo: la cuenta, el carril y las tres fijas se peleaban la misma
          fila, el carril se comprimía a unos 240 px con la segunda pastilla cortada por la mitad, y
          las flechas aparecían por falta de sitio en vez de por tener turnos de sobra.

          `w-full` y `min-w-0` van AQUÍ, en el padre, y esa es la parte que se hace mal: sin ellos
          esta caja se dimensiona por su contenido y sale más ancha que la tarjeta, y entonces la
          pista no tiene contra qué encogerse por mucho `min-w-0` que lleve ella. El desbordamiento se
          arregla en el padre, no en el hijo. Lo dice la maqueta con esas palabras, y costó descubrirlo
          allí. */}
      <div className="flex w-full min-w-0 flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">{jornadas(cuenta.total)} seleccionadas</div>
          <div className="text-[11px] text-muted">{detalle}{pasadas}</div>
        </div>

        {/* EL CATÁLOGO, en un carril que se corre. `min-w-0` en el carril y `flex-1` sobre él: sin
            eso, una pista con veinte turnos empuja a las acciones fijas fuera de la tarjeta.
            En pantalla angosta ocupa el ancho entero de la tarjeta, en su propia línea. */}
        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:flex-1">
          {carril.desborda && (
            <button type="button" onClick={() => correr(-1)} disabled={carril.alInicio}
              aria-label="Turnos anteriores"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-ink disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
          )}
          <div ref={pista} onScroll={medir}
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth">
            {catalogo.map(t => (
              <button key={t.id} type="button" disabled={ocupado} onClick={() => onTurno(t.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold disabled:opacity-60 ${
                  CLASES_COLOR[normalizarColor(t.color)]}`}>
                <PastillaDeTurno turno={t} />
              </button>
            ))}
          </div>
          {carril.desborda && (
            <button type="button" onClick={() => correr(1)} disabled={carril.alFinal}
              aria-label="Más turnos"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-ink disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* LAS FIJAS. Icono arriba y texto abajo, que fue lo que pidió el dueño, y fuera del carril
            porque no son turnos del catálogo. «Quitar turno» y no «Quitar» a secas: se lee como
            «deseleccionar» y es lo contrario, porque esto ESCRIBE en los días marcados dejándolos sin
            turno. */}
        {/* Las tres fijas bajan debajo del carril y se centran cuando no hay ancho, envolviendo si
            hace falta: apiladas, una raya vertical de separación no separaría nada. */}
        <div className="flex shrink-0 flex-wrap items-stretch justify-center gap-1.5">
          <button type="button" disabled={ocupado} onClick={onDescanso}
            className="flex w-[4.5rem] flex-col items-center gap-0.5 rounded-xl border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-semibold text-muted hover:text-ink hover:border-gray-400 disabled:opacity-60">
            <Moon size={15} />
            Descanso
          </button>
          <button type="button" disabled={ocupado} onClick={onQuitar}
            className="flex w-[4.5rem] flex-col items-center gap-0.5 rounded-xl border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
            <X size={15} />
            Quitar turno
          </button>
          {/* LA ROTACIÓN VIVE AQUÍ, junto a los turnos, porque es lo que pidió el dueño con esas
              palabras: «en el modal donde están los turnos, que se ponga el 6x1 o el 4x2». No es un
              turno más: es un patrón que reparte varios turnos y descansos a lo largo del período, y
              por eso abre su propia ventana en vez de aplicarse de una.

              APAGADA CON MÁS DE UNA PERSONA, y el título dice por qué. No es una limitación técnica:
              un ciclo arranca en un día concreto, y el mismo 4x2 con el mismo arranque para diez
              personas las deja a todas descansando el mismo día, que es lo contrario de para lo que
              existe una rotación. */}
          {/* EL `aria-label` NO ES REDUNDANTE CON EL TEXTO, y se puso tras mirar el navegador de
              verdad el 28 de septiembre de 2026: con solo `title`, el nombre accesible que expone el
              navegador es el del tooltip («Aplicar un patrón 6x1, 4x2…»), no «Rotación». Quien
              navegue con lector de pantalla buscaría la palabra que ve en la pantalla y no la
              encontraría. Ojo: jsdom calcula ese nombre con otra precedencia y da «Rotación», así que
              la prueba de rol pasaba en verde por un motivo que no se cumple aquí fuera; por eso su
              prueba afirma el ATRIBUTO. Y empieza por «Rotación» a propósito, para que el motivo de
              estar apagado llegue también a quien no puede ver el tooltip. */}
          <button type="button" disabled={ocupado || !puedeRotar} onClick={onRotacion}
            aria-label={puedeRotar
              ? 'Rotación'
              : 'Rotación: marca a una sola persona, cada rotación arranca en su propio día'}
            title={puedeRotar
              ? 'Aplicar un patrón 6x1, 4x2…'
              : 'Marca a una sola persona: cada rotación arranca en su propio día.'}
            className="flex w-[4.5rem] flex-col items-center gap-0.5 rounded-xl border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-ink hover:bg-gray-50 disabled:opacity-40">
            <RotateCw size={15} />
            Rotación
          </button>
          <button type="button" onClick={onCancelar}
            className="self-center rounded-xl px-3 py-2 text-[12px] font-semibold text-muted hover:text-ink">
            Cancelar
          </button>
        </div>
      </div>

      {/* POR DÓNDE VA, mientras va. Un guardado que tarda y no dice nada se lee como uno colgado. */}
      {progreso && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] font-medium text-muted">
          Bloque {progreso.bloque} de {progreso.bloques} · no cierres esta ventana
        </p>
      )}
    </div>
  );
}

// LA VENTANA DE ROTACIÓN (28 de septiembre de 2026).
//
// Pedido del dueño, con sus palabras: «si seleccionamos el nombre de la persona podamos poner en el
// modal donde están los turnos de que se ponga el 6x1 o el 4x2 para que semanalmente se apliquen los
// cambios, como que solo se seleccione el tipo de rotación, los días y el turno». Los días son la
// selección que ya está hecha en la rejilla, así que aquí quedan tres decisiones: el patrón, el turno
// que se trabaja, y en qué punto del ciclo arranca.
//
// Y SU RAZÓN DE SER, también con sus palabras: «que el sistema lea todo el mes y me diga que por norma
// no le estás dando el día de descanso». Nada de eso se decide aquí: el veredicto lo calculan
// `proyeccionDelMes` y `semanasSinDescanso`, que son puras y están probadas y mutadas.
function VentanaDeRotacion({
  nombre, catalogo, rot, dias, marcadas, hoy, primerDia, mes, semanasMalas, esperandoElMes,
  onPatron, onTurno, onCorrer, onCancelar, onVerPrevia,
}: {
  nombre: string;
  catalogo: TurnoDelCatalogo[];
  rot: { patron: PatronDeRotacion; plantillaId: string; desfase: number };
  dias: string[];
  marcadas: Set<string>;
  hoy: string;
  primerDia: string;
  mes: string;
  semanasMalas: string[];
  esperandoElMes: boolean;
  onPatron: (patron: PatronDeRotacion) => void;
  onTurno: (plantillaId: string) => void;
  onCorrer: (cuanto: number) => void;
  onCancelar: () => void;
  onVerPrevia: () => void;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 !mt-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Rotación de ${nombre}`}
        className="hp-pop max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 pt-5 pb-4">
          <h3 className="text-lg font-bold text-ink">Rotación de {nombre}</h3>
          <p className="mt-1 text-sm text-muted">
            Se aplica sobre los días que tienes marcados, semana tras semana.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tipo de rotación</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(ROTACIONES) as PatronDeRotacion[]).map(patron => (
                <button key={patron} type="button" aria-pressed={rot.patron === patron}
                  onClick={() => onPatron(patron)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    rot.patron === patron
                      ? 'border-primary bg-primary/10 text-ink'
                      : 'border-gray-200 text-muted hover:border-gray-300'}`}>
                  <span className="block text-sm font-bold">{patron}</span>
                  <span className="block text-[10px] leading-tight">
                    {ROTACIONES[patron].trabaja} de trabajo, {ROTACIONES[patron].descansa} de descanso
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">{ROTACIONES[rot.patron].nota}</p>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Turno que trabaja</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {catalogo.map(t => (
                <button key={t.id} type="button" aria-pressed={rot.plantillaId === t.id}
                  onClick={() => onTurno(t.id)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                    rot.plantillaId === t.id
                      ? CLASES_COLOR[normalizarColor(t.color)]
                      : 'bg-gray-100 text-muted'}`}>
                  {/* Apagada cuando no es la elegida: el punto pierde su color para que el elegido se
                      distinga de un vistazo, que es de lo que vive esta lista. */}
                  <PastillaDeTurno turno={t} activa={rot.plantillaId === t.id} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Dónde arranca el ciclo</span>
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" onClick={() => onCorrer(-1)} aria-label="Correr un día atrás"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-ink hover:bg-gray-200">
                <ChevronLeft size={14} />
              </button>
              {/* LA TIRA MUESTRA LO QUE DE VERDAD SE VA A ESCRIBIR, no el patrón en abstracto: un día
                  que no está marcado, o que ya pasó, conserva lo suyo y se ve apagado. Si pintara el
                  ciclo completo, prometería una rotación que la escritura no va a cumplir. */}
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {dias.map(fecha => {
                  const entra = marcadas.has(fecha) && sePuedePintar(fecha, hoy);
                  const trabaja = accionDelDia(rot.patron, rot.desfase, diasEntre(primerDia, fecha)) === 'TURNO';
                  return (
                    <div key={fecha}
                      className={`shrink-0 rounded-lg px-1.5 py-1 text-center text-[10px] leading-tight ${
                        !entra ? 'bg-gray-50 text-gray-300'
                          : trabaja ? 'bg-primary/20 text-ink' : 'bg-gray-200 text-muted'}`}>
                      <div className="font-semibold">{inicialDeDia(fecha)}</div>
                      <div className="tabular-nums">{Number(fecha.slice(8, 10))}</div>
                      <div className="font-bold">{!entra ? '·' : trabaja ? 'T' : 'D'}</div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => onCorrer(1)} aria-label="Correr un día adelante"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-ink hover:bg-gray-200">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* EL VEREDICTO. Mientras el mes viene en camino NO se dice nada: juzgarlo con los días que
              hay en pantalla sería decir «todo bien» de un mes que no se ha visto, y un aviso que no
              salta cuando debe enseña a confiar en él. */}
          {esperandoElMes ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-muted">
              Leyendo el mes para poder juzgar la rotación…
            </p>
          ) : semanasMalas.length > 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-[13px] font-semibold text-rose-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Por norma no le estarías dando el día de descanso en {semanasMalas.length}
                {semanasMalas.length === 1 ? ' semana' : ' semanas'} de {mes}
              </p>
              <p className="mt-1 pl-5 text-[11px] text-rose-900">
                {semanasMalas.map(l => `Semana del ${Number(l.slice(8, 10))}`).join(' · ')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-[13px] font-semibold text-emerald-900">
                <Check size={14} className="mt-0.5 shrink-0" />
                Cada semana de {mes} le queda con su día de descanso
              </p>
              <p className="mt-1 pl-5 text-[11px] text-emerald-900">{ROTACIONES[rot.patron].nota}.</p>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted">
            Un ciclo de <b>siete días</b> (6x1, 5x2) deja el descanso siempre en el mismo día. Uno de
            seis o de cuatro (4x2, 2x2) lo corre cada semana, y por eso hay que mirar el mes entero:
            puede dejar siete días seguidos de trabajo sin que ningún día pintado lo delate.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm text-muted">Cancelar</button>
          {/* NO ESCRIBE: deja la rotación pendiente y abre la MISMA previa que los turnos sueltos, con
              sus avisos y su guardado por bloques. Un segundo camino sería un segundo sitio donde
              equivocarse, y la rotación se saltaría los avisos que la previa ya sabe dar. */}
          <button type="button" onClick={onVerPrevia}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-ink hover:bg-primary-dark">
            Ver antes de aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// LO QUE SE DICE ANTES DE ESCRIBIR UN BLOQUE (28 de septiembre de 2026).
//
// POR QUÉ AQUÍ SÍ HAY UN PASO MÁS Y EN LA CELDA SUELTA NO: pintar un día es reversible y barato, así
// que su panel escribe de una («elegir ES la acción», y así sigue). Un bloque no: toca a varias
// personas a la vez, y dos de sus consecuencias cuestan dinero —pintar sobre el descanso obligatorio
// paga recargo, y cruzar el tercero del mes convierte el compensatorio en obligación—. Esas dos hay
// que poder leerlas antes de decir sí.
//
// ES UN MODAL Y NO UN PANEL ANCLADO, al contrario que el de la jornada, y la diferencia es deliberada:
// aquí no se está comparando celdas entre sí, se está decidiendo una sola cosa, y tapar la rejilla
// mientras se decide es correcto.
function PreviaDeBloque({ titulo, conteo, pisados, habituales, ocupado, onCancelar, onAplicar }: {
  titulo: string;
  conteo: { escribe: number; iguales: number; bloqueadas: number };
  pisados: { nombre: string; fecha: string }[];
  habituales: { nombre: string; antes: number; despues: number }[];
  ocupado: boolean;
  onCancelar: () => void;
  onAplicar: () => void;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 !mt-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Antes de aplicar"
        className="hp-pop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 pt-5 pb-4">
          <h3 className="text-lg font-bold text-ink">Antes de aplicar</h3>
          <p className="mt-1 text-sm text-muted">{titulo}</p>
        </div>

        <div className="space-y-4 p-6">
          <dl className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-muted">Se escriben</dt>
              <dd className="text-sm font-bold text-ink">{jornadas(conteo.escribe)}</dd>
            </div>
            {/* «Igual» es que no hacía falta. Sin separarlo, repasar una semana ya programada
                anunciaría ciento cuarenta escrituras y un cambio real quedaría indistinguible de un
                repaso inofensivo. */}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-muted">Ya tenían ese mismo turno</dt>
              <dd className="text-sm font-medium text-gray-400 tabular-nums">{conteo.iguales}</dd>
            </div>
            {/* Solo cuando hay alguna: una fila en cero es ruido, y su ausencia ya dice que no hay. */}
            {conteo.bloqueadas > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px] text-muted">No se tocan porque el día ya pasó</dt>
                <dd className="text-sm font-medium text-gray-400 tabular-nums">{conteo.bloqueadas}</dd>
              </div>
            )}
          </dl>

          {/* LOS DOS AVISOS SE SEPARAN A PROPÓSITO. Pintar sobre el descanso obligatorio puede
              terminar en recargo; cruzar a habitual cambia una obligación. Un solo aviso juntándolos
              los volvería ruido. */}
          {habituales.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-900">
                <AlertTriangle size={13} className="shrink-0" />
                Pasarían a descanso habitual: compensar con tiempo deja de ser opcional
              </p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-rose-900">
                {habituales.map(h => (
                  <li key={h.nombre}>
                    {h.nombre} pasaría de <b>{h.antes}</b> a <b>{h.despues}</b> descansos trabajados este mes
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pisados.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-900">
                <AlertTriangle size={13} className="shrink-0" />
                Pintarías sobre el descanso obligatorio de {jornadas(pisados.length)}
              </p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-amber-900">
                {/* La fecha dicha con palabras. Antes salía "2026-09-28" en crudo, que es la clave
                    con la que se escribe el día y no algo que un administrador tenga que leer. */}
                {pisados.map(p => (
                  <li key={`${p.nombre}|${p.fecha}`}>{p.nombre}, el {rotuloCorto(p.fecha)}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted">
            Lo que ya pasó no se toca nunca. Si alguien ya empezó su jornada de hoy, el servidor lo
            rechaza y el motivo se muestra al terminar.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm text-muted">Cancelar</button>
          {/* Sin nada que escribir el botón no se ofrece activo: prometería algo que no va a pasar. */}
          <button type="button" onClick={onAplicar} disabled={ocupado || conteo.escribe === 0}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-ink hover:bg-primary-dark disabled:opacity-60">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// CÓMO SE NOMBRA EL PERÍODO EN CADA MODO (22 de septiembre de 2026).
//
// Una tabla con un caso por valor y no un `? :`, porque el español no deja: es «de la semana» pero
// «del mes». Y hace falta de verdad: la pantalla decía «Resumen de la semana», «Total semanal» y
// «en la semana» en sitios fijos, y todos esos textos MIENTEN cuando lo que se está viendo es un
// mes. Un rótulo falso es un defecto, no un detalle.
// `elArt` existe para el botón que marca la fila entera de una persona: «Marcar la semana de Ana
// Ríos». Con `deEl` saldría «Marcar de la semana de Ana Ríos», y con `unidad` a secas, «Marcar Semana
// de». Es la misma razón que las otras dos columnas: el español no deja armar estos rótulos pegando
// trozos, y un rótulo falso que solo oye quien usa lector de pantalla es igual de falso.
const PERIODO: Record<ModoDeVista, { unidad: string; deEl: string; enEl: string; elArt: string }> = {
  DIA: { unidad: 'Día', deEl: 'del día', enEl: 'en el día', elArt: 'el día' },
  SEMANA: { unidad: 'Semana', deEl: 'de la semana', enEl: 'en la semana', elArt: 'la semana' },
  MES: { unidad: 'Mes', deEl: 'del mes', enEl: 'en el mes', elArt: 'el mes' },
};

// «1 jornada» / «6 jornadas». Sale a una función porque se dice en cuatro sitios de la tarjeta y del
// resultado, y cuatro copias de un plural se separan a la primera.
const jornadas = (n: number): string => `${n} ${n === 1 ? 'jornada' : 'jornadas'}`;

// EL ÚNICO SITIO QUE SABE A QUÉ RUTA SE LE ESCRIBE UN DÍA.
//
// Lo usan los cuatro caminos que escriben: el panel de la celda, el botón que confirma la propuesta
// de la semana, y ahora los turnos y el descanso de la tarjeta de bloque. Darle su propia llamada al
// bloque habría abierto un SEGUNDO camino de escritura sobre la tabla que alimenta la liquidación,
// que es justo lo que el planificador lleva evitando desde que existe (CLAUDE.md §9.3).
//
// La acción entra como la unión de `aplicacionPorBloques` y no como tres parámetros opcionales: así
// «un turno», «un descanso» y «quitar» son tres cosas y nunca dos a la vez ni ninguna.
function escribirDia(colaboradorId: string, fecha: string, accion: AccionDeEscritura) {
  if (accion.tipo === 'QUITAR') {
    // Por `query` y no por cuerpo, que es lo que espera la ruta: un DELETE con cuerpo lo tratan
    // distinto según el cliente.
    return api.delete('/turnos/dia', { params: { colaboradorId, fecha } });
  }
  const que = accion.tipo === 'TURNO' ? { plantillaId: accion.plantillaId } : { descanso: true };
  return api.put('/turnos/dia', { colaboradorId, fecha, ...que });
}

// El motivo que manda el servidor, que es una regla del producto («ya pasó», «ya empezó su jornada»)
// y tiene que llegarle al administrador tal cual. Estaba escrito cuatro veces.
function motivoDe(err: unknown, porDefecto: string): string {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? porDefecto;
}

// CUÁNTAS ESCRITURAS VAN A LA VEZ.
//
// Lo que puede tumbar el servidor no es el tamaño de lo seleccionado, es cuántas peticiones coinciden
// en vuelo: cada día escrito RECALCULA LA SEMANA ENTERA de esa persona, y el hosting es compartido.
// Por eso el bloque no es solo una unidad de progreso, es el tope de concurrencia: los bloques van en
// serie y dentro de cada uno las seis peticiones van juntas.
//
// Seis y no cuarenta: cuarenta recálculos de semana simultáneos es exactamente el atragantamiento que
// esto viene a evitar. Y no uno, porque una selección de un mes de una persona son 31 peticiones y de
// a una se siente detenido.
const EN_VUELO = 6;

// De MAYOR a menor, como en la maqueta del dueño: Mes · Semana · Día. El orden no es decorativo,
// es el que deja «Semana» —el modo por defecto y el que más se usa— en el medio, donde cae el
// pulgar y donde la vista en blanco de la pista gris lo destaca.
const MODOS: ModoDeVista[] = ['MES', 'SEMANA', 'DIA'];

export default function CalendarioDeTurnos() {
  const [modo, setModo] = useState<ModoDeVista>('SEMANA');
  // El ancla es CUALQUIER día dentro del período mostrado, no su primer día: así «Hoy» es siempre
  // hoy en los tres modos, y cambiar de modo no obliga a recalcularla.
  const [ancla, setAncla] = useState(() => hoyEnBogota());
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState('');
  // El catálogo de turnos, para el selector. Se pide una vez: no cambia al pasar de semana.
  const [catalogo, setCatalogo] = useState<TurnoDelCatalogo[]>([]);
  // Qué celda se está editando. `null` = el selector está cerrado.
  // `ancla` es el rectángulo del botón que se tocó, medido EN EL MOMENTO DEL CLIC. Tiene que
  // viajar en el estado y no leerse después: para cuando el panel se dibuja, el botón sigue ahí
  // pero la rejilla puede haberse desplazado, y un ancla releída apuntaría a otro día.
  const [editando, setEditando] = useState<{ fila: FilaDelCalendario; dia: DiaDelCalendario; ancla: Rect } | null>(null);
  const [errorPintado, setErrorPintado] = useState('');
  const [guardando, setGuardando] = useState(false);
  // El descanso trabajado que se está decidiendo. `datos` llega del servidor: la pantalla no
  // deduce qué opciones caben.
  const [decidiendo, setDecidiendo] = useState<{ fila: FilaDelCalendario; dia: DiaDelCalendario } | null>(null);
  const [decision, setDecision] = useState<DecisionDeDescansoTrabajado | null>(null);
  const [errorDecision, setErrorDecision] = useState('');

  const abrirDecision = async (fila: FilaDelCalendario, dia: DiaDelCalendario) => {
    setDecidiendo({ fila, dia });
    setDecision(null);
    setErrorDecision('');
    try {
      const r = await api.get('/turnos/descanso-trabajado', {
        params: { colaboradorId: fila.id, fecha: dia.fecha },
      });
      setDecision(r.data);
    } catch (err) {
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorDecision(delServidor ?? 'No pudimos cargar la decisión de ese día.');
    }
  };

  const guardarDecision = async (queDecide: 'DINERO' | 'COMPENSATORIO', fechaCompensatorio: string | null) => {
    if (!decidiendo) return;
    setErrorDecision('');
    setGuardando(true);
    try {
      await api.put('/turnos/descanso-trabajado', {
        colaboradorId: decidiendo.fila.id, fecha: decidiendo.dia.fecha,
        decision: queDecide, fechaCompensatorio,
      });
      setDecidiendo(null);
      setDecision(null);
      setRecarga(n => n + 1);
    } catch (err) {
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorDecision(delServidor ?? 'No pudimos guardar la decisión.');
    } finally {
      setGuardando(false);
    }
  };
  // Se incrementa al pintar para volver a pedir la semana. Es más simple que remendar los datos en
  // memoria, y sobre todo NO puede desalinearse: lo que se ve sale siempre del servidor, que es
  // quien decide qué exige un día.
  const [recarga, setRecarga] = useState(0);

  // LO QUE ESTÁ MARCADO, por clave de celda. Un objeto y no una lista: la pertenencia se pregunta una
  // vez por celda en cada dibujado (con un mes y cien personas son 3.100 preguntas), y buscar en una
  // lista las volvería 3.100 recorridos. La clave la arma `claveDeCelda`, que es la misma pareja con
  // la que el backend escribe un día.
  const [marcadas, setMarcadas] = useState<Record<string, CeldaMarcada>>({});
  // El gesto en curso. Va en un `ref` y no en el estado a propósito: cambia en cada celda por la que
  // pasa el puntero, y guardarlo en el estado redibujaría la rejilla entera en cada movimiento.
  const arrastre = useRef<{
    desde: CeldaMarcada;
    base: Record<string, CeldaMarcada>;
    movido: boolean;
    yaEstaba: boolean;
  } | null>(null);
  // SI HAY UN RANGO ABIERTO ESPERANDO SU SEGUNDA ESQUINA. Va en un `ref` y no en el estado porque
  // cambia a media gesto y no pinta nada por sí mismo: guardarlo en el estado redibujaría la rejilla
  // entera entre el primer clic y el segundo.
  const rangoAbierto = useRef(false);
  // LO QUE ESTÁ A PUNTO DE APLICARSE, mientras la previa está abierta. `null` = no hay previa.
  //
  // Se guarda como DATO y no como función, aunque la escritura reciba una función: hoy es una sola
  // acción para todo el envío, y cuando llegue la rotación esto pasa a ser una unión («una acción
  // igual para todos» o «un patrón»). Ese será el único sitio que cambie, y el camino de escritura
  // seguirá siendo uno.
  const [pendiente, setPendiente] = useState<LoPendiente | null>(null);
  // La ventana de rotación: sobre quién, con qué patrón, y el mes que se pidió aparte para juzgarlo.
  // `mesDeLaRotacion` es `null` mientras viene en camino, y entonces el veredicto todavía no se dice:
  // juzgar el mes con los siete días que hay en pantalla sería decir «todo bien» de lo que no se ha
  // visto, que es peor que callar.
  const [rotando, setRotando] = useState<FilaDelCalendario | null>(null);
  const [rot, setRot] = useState<{ patron: PatronDeRotacion; plantillaId: string; desfase: number } | null>(null);
  const [mesDeLaRotacion, setMesDeLaRotacion] = useState<{ fecha: string; trabajado: boolean }[] | null>(null);
  const [progreso, setProgreso] = useState<{ bloque: number; bloques: number } | null>(null);
  const [resultado, setResultado] = useState<{ escritas: number; bloqueadas: number; fallos: string[] } | null>(null);

  const vista = vistaDelCalendario(modo, ancla);
  const dias = vista.dias;
  // LAS SEMANAS QUE HAY DENTRO DE LAS COLUMNAS (28 de septiembre de 2026).
  //
  // En la vista de mes el total desaparecía como número semanal, y con él el guardia de las 42 horas,
  // que es SEMANAL. Un mes son cinco o seis semanas y ninguna tenía dónde decir «esta persona quedó
  // en 48». Quién agrupa con quién lo decide `semanasDeLasColumnas`, que es pura y está mutada.
  const semanas = semanasDeLasColumnas(dias);
  // Solo con MÁS DE UNA. En la vista de semana el total de la fila YA es el de esa semana, y repetir
  // el mismo número en dos celdas contiguas no informa de nada. En la de día no hay semana que sumar.
  const haySemanales = modo !== 'DIA' && semanas.length > 1;
  // La última columna de cada semana, que es debajo de la que va su total.
  const cierraSemana = new Set(semanas.map(s => s.fechas[s.fechas.length - 1]));

  // La persona + los días + el total, MÁS una celda por semana cuando las hay. Era una constante con
  // un 9 escrito a mano, de cuando la rejilla siempre tenía siete días: con un día son 3 y con un mes
  // 33, y la fila de «Cargando…» habría dejado de abarcar la tabla. Ahora pasaría lo mismo con las
  // columnas semanales, así que se derivan y no se cuentan a ojo.
  const columnas = dias.length + 2 + (haySemanales ? semanas.length : 0);
  const hoy = hoyEnBogota();

  // `cargando` se DERIVA, no se guarda: la respuesta trae el `desde` que contestó, así que si no
  // coincide con la semana en pantalla es que todavía viene en camino. Evita el `setState` síncrono
  // dentro del efecto (react-hooks/set-state-in-effect) y, de paso, que se pinten a la vez la fila
  // «Cargando» y las filas de la semana anterior.
  const cargando = !error && datos?.desde !== vista.desde;

  useEffect(() => {
    // `vivo` evita que la respuesta de una semana que ya se dejó atrás pise a la de la actual:
    // con clics rápidos en las flechas, la lenta llegaba después de la rápida.
    let vivo = true;
    api.get('/turnos/calendario', { params: { desde: vista.desde, hasta: vista.hasta } })
      .then(r => { if (vivo) { setDatos(r.data); setError(''); } })
      .catch(e => { if (vivo) setError(e.response?.data?.error ?? 'No se pudo cargar el calendario.'); });
    return () => { vivo = false; };
    // Las dependencias son las CADENAS del rango y no `vista`, que es un objeto nuevo en cada
    // dibujado: con el objeto, el efecto se dispararía sin parar.
  }, [vista.desde, vista.hasta, recarga]);

  // El catálogo, una sola vez. Si falla se queda vacío y el selector lo dice: no poder pintar es
  // molesto, pero romper el calendario entero por eso sería peor.
  useEffect(() => {
    let vivo = true;
    api.get('/plantillas-turno')
      .then(r => { if (vivo) setCatalogo(r.data); })
      .catch(() => { /* el selector muestra que no hay turnos */ });
    return () => { vivo = false; };
  }, []);

  // EL ÚNICO camino de escritura de esta pantalla hacia `PUT /turnos/dia`. Lo usan los dos sitios
  // que pintan: el selector de la celda y el botón que confirma la propuesta de la semana. Darle su
  // propia llamada al segundo habría abierto un segundo camino de escritura sobre la tabla que
  // alimenta la liquidación, que es justo lo que este trabajo vino a quitar.
  // `que` dice QUÉ se le pone al día: un turno del catálogo, o el descanso. Son dos cosas distintas
  // y por eso es una unión y no un campo opcional: `{ plantillaId }` o `{ descanso: true }`, nunca
  // las dos ni ninguna. Sigue habiendo UNA sola escritura hacia la ruta, que es lo que este módulo
  // protege; un `api.put` aparte para el descanso habría abierto el segundo camino.
  const pintarEn = async (
    colaboradorId: string,
    fecha: string,
    que: { plantillaId: string } | { descanso: true },
  ) => {
    setErrorPintado('');
    setGuardando(true);
    try {
      // Pasa por `escribirDia`, que es el único sitio que sabe a qué ruta se le escribe un día.
      await escribirDia(colaboradorId, fecha,
        'plantillaId' in que ? { tipo: 'TURNO', plantillaId: que.plantillaId } : { tipo: 'DESCANSO' });
      setEditando(null);
      setRecarga(n => n + 1);
    } catch (err) {
      // El motivo viene del servidor y se muestra tal cual: «ya pasó», «ya empezó su jornada». Son
      // reglas del producto, y el administrador tiene que poder leer cuál lo frenó.
      setErrorPintado(motivoDe(err, 'No pudimos guardar el turno.'));
    } finally {
      setGuardando(false);
    }
  };

  // El selector de la celda: pinta en el día que está abierto. Delega en `pintarEn` en vez de
  // repetir la llamada, para que siga habiendo UNA sola escritura hacia la ruta.
  const pintar = async (plantillaId: string) => {
    if (!editando) return;
    await pintarEn(editando.fila.id, editando.dia.fecha, { plantillaId });
  };

  // MARCAR EL DÍA COMO DESCANSO (23 de septiembre de 2026, decisión del dueño). No lleva ningún
  // identificador porque no hay nada que elegir: «descanso es siempre descanso». Antes había que
  // crearse un turno de descanso en el catálogo, con nombre y color que nadie mostraba.
  const marcarDescanso = async () => {
    if (!editando) return;
    await pintarEn(editando.fila.id, editando.dia.fecha, { descanso: true });
  };

  const quitar = async () => {
    if (!editando) return;
    setErrorPintado('');
    setGuardando(true);
    try {
      await escribirDia(editando.fila.id, editando.dia.fecha, { tipo: 'QUITAR' });
      setEditando(null);
      setRecarga(n => n + 1);
    } catch (err) {
      setErrorPintado(motivoDe(err, 'No pudimos quitar el turno.'));
    } finally {
      setGuardando(false);
    }
  };

  const filas = cargando ? [] : datos?.filas ?? [];
  const tope = datos?.horasSemanales ?? 42;
  // EL TOPE LEGAL ES SEMANAL, Y SOLO SE COMPARA CONTRA ÉL EN LA VISTA DE SEMANA.
  //
  // En un mes son treinta jornadas: TODO el mundo pasa de 42 horas, y la pantalla pintaría a la
  // empresa entera en ámbar diciendo que se pasaron del tope. Sería un número plausible y falso,
  // que es exactamente la forma en que este producto se rompe según su propio CLAUDE.md. En un día
  // pasa lo contrario: nadie lo alcanza nunca y la alarma quedaría muerta.
  //
  // Se compara en TRES sitios (esta tarjeta, la fila de la rejilla y la del resumen), y los tres
  // tienen que mirar esta misma bandera. Se encontraron buscando el patrón `tope * 60`, no de
  // memoria: de memoria había contado dos (CLAUDE.md §9.3).
  const topeAplica = modo === 'SEMANA';

  const minutosTotales = filas.reduce((a, f) => a + f.minutosEsperados, 0);
  const promedio = filas.length ? Math.round(minutosTotales / filas.length) : 0;
  // La cuenta LEGAL: del mes calendario y sobre días con marcación.
  //
  // Antes esta línea miraba `descansosConTurno`, que es lo PROGRAMADO, mientras la tarjeta decía
  // «trabajan». Medido contra la base el 21 de septiembre de 2026 los dos conjuntos resultaron
  // disjuntos (3 programados y 0 trabajados en las mismas personas), así que esa palabra era falsa.
  const trabajaronSuDescanso = filas.filter(f => f.descansoHabitual.trabajados > 0).length;
  // Quiénes ya cruzaron a habitual. Es la única alarma de verdad: ahí la compensación en tiempo
  // deja de ser opcional. Uno o dos se pagan con recargo y no exigen nada más.
  const habituales = filas.filter(f => f.descansoHabitual.clase === 'HABITUAL').length;
  const sobreTope = topeAplica ? filas.filter(f => f.minutosEsperados > tope * 60).length : 0;
  const festivos = new Set((filas[0]?.dias ?? []).filter(d => d.esFestivo).map(d => d.fecha));

  // ───────── LA SELECCIÓN EN BLOQUE ─────────
  //
  // QUÉ CELDAS CAEN DENTRO NO SE DECIDE AQUÍ: es `celdasDelRectangulo`, que es pura y está probada y
  // mutada. Aquí solo viven el gesto y el estado, que es la parte que no se puede probar sin montar
  // la pantalla.
  //
  // EL CLIC SUELTO NO MARCA, ABRE EL PANEL DEL DÍA. En la maqueta la selección estaba siempre activa
  // porque allí no existía ese panel; en la aplicación sí, es lo que el dueño pidió el 22 de
  // septiembre, y lleva dentro las tolerancias, el almuerzo y los descansos de ESE día. Por eso el
  // arrastre solo cuenta como arrastre cuando el puntero llega a OTRA celda (`movido`): si no se
  // movió, no se toca nada y el clic sigue su camino hasta el botón.
  const marcar = (celdas: readonly CeldaMarcada[], apagar: boolean) => {
    setMarcadas(antes => {
      const ahora = { ...antes };
      for (const celda of celdas) {
        if (apagar) delete ahora[claveDeCelda(celda)];
        else ahora[claveDeCelda(celda)] = celda;
      }
      return ahora;
    });
  };

  const cerrarRango = () => { rangoAbierto.current = false; arrastre.current = null; };

  // EL PRIMER CLIC ABRE EL RANGO Y EL SEGUNDO LO CIERRA, que es el gesto de la maqueta y el único
  // practicable en la vista de mes: arrastrar sobre 31 columnas obliga a desplazar con el botón
  // apretado. Arrastrar sigue valiendo para lo corto.
  //
  // El rectángulo se calcula AQUÍ, en el `pointerdown`, y no en la escucha de `pointerup`: esta
  // función se vuelve a crear en cada dibujado y ve `filas` y `dias` frescos, mientras que aquella se
  // registra una sola vez y los vería congelados del primer dibujado.
  const iniciarArrastre = (celda: CeldaMarcada) => {
    if (rangoAbierto.current && arrastre.current) {
      extenderArrastre(celda);
      cerrarRango();
      return;
    }
    arrastre.current = {
      desde: celda,
      base: { ...marcadas },
      movido: false,
      // Si ya estaba marcada, un clic suelto la QUITA. Sin esto, equivocarse en una celda de un
      // rectángulo de doscientas obligaría a limpiar todo y empezar de nuevo.
      yaEstaba: Boolean(marcadas[claveDeCelda(celda)]),
    };
  };

  // `pointerover` y no `pointerenter`: enter NO BURBUJEA, así que colgado de la celda de la tabla no
  // llegaría nunca desde el botón de dentro. Volver a pasar por la misma celda recalcula el mismo
  // rectángulo, así que repetirse es inofensivo.
  const extenderArrastre = (celda: CeldaMarcada) => {
    const gesto = arrastre.current;
    if (!gesto || claveDeCelda(gesto.desde) === claveDeCelda(celda)) return;
    gesto.movido = true;
    const rectangulo = celdasDelRectangulo(gesto.desde, celda, filas.map(f => f.id), dias);
    const ahora = { ...gesto.base };
    for (const c of rectangulo) ahora[claveDeCelda(c)] = c;
    setMarcadas(ahora);
  };

  // El gesto termina en la ventana y no en la celda: si termina fuera de la rejilla —que es lo que
  // pasa al arrastrar hasta el borde— una escucha colgada de la celda no se enteraría y el gesto se
  // quedaría abierto para siempre.
  useEffect(() => {
    // AL SOLTAR SE DECIDE QUÉ FUE EL GESTO, y son tres cosas distintas:
    //
    //   se movió          fue un arrastre: el rectángulo ya está marcado y el rango se cierra.
    //   no se movió y la
    //   celda ya estaba   fue un clic para QUITARLA.
    //   no se movió       fue el PRIMER clic de un rango: se marca esa celda y el rango queda
    //                     abierto esperando la segunda esquina.
    //
    // Solo toca una celda, así que no necesita `filas` ni `dias` y puede vivir en una escucha
    // registrada una sola vez. El estado se actualiza con la forma funcional, que tampoco los mira.
    const alSoltar = () => {
      const gesto = arrastre.current;
      if (!gesto) return;
      if (gesto.movido) { cerrarRango(); return; }

      const clave = claveDeCelda(gesto.desde);
      if (gesto.yaEstaba && !rangoAbierto.current) {
        setMarcadas(antes => {
          const ahora = { ...antes };
          delete ahora[clave];
          return ahora;
        });
        cerrarRango();
        return;
      }
      setMarcadas(antes => ({ ...antes, [clave]: gesto.desde }));
      // El ancla SOBREVIVE al primer clic: es la esquina desde la que el segundo cerrará el
      // rectángulo. Por eso aquí no se borra `arrastre.current`.
      gesto.base = { ...gesto.base, [clave]: gesto.desde };
      rangoAbierto.current = true;
    };
    const alCancelar = () => cerrarRango();
    window.addEventListener('pointerup', alSoltar);
    window.addEventListener('pointercancel', alCancelar);
    return () => {
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alCancelar);
    };
  }, []);

  // La fila de una persona son SUS días y no las columnas de la vista: una respuesta puede traerle
  // días que la rejilla no encabeza, y marcar lo que no se ve sería escribir a ciegas.
  // La fila y la columna CIERRAN el rango: son gestos completos en sí mismos, y dejarlo abierto haría
  // que el siguiente clic en una celda cualquiera estirara un rectángulo desde quién sabe dónde.
  const marcarFila = (fila: FilaDelCalendario) => {
    const suyas = fila.dias.map(d => ({ colaboradorId: fila.id, fecha: d.fecha }));
    const completa = suyas.every(c => marcadas[claveDeCelda(c)]);
    marcar(suyas, completa);
    cerrarRango();
  };

  const marcarColumna = (fecha: string) => {
    const esas = filas.map(f => ({ colaboradorId: f.id, fecha }));
    const completa = esas.every(c => marcadas[claveDeCelda(c)]);
    marcar(esas, completa);
    cerrarRango();
  };

  const limpiarMarcadas = () => { setMarcadas({}); setResultado(null); cerrarRango(); };

  const seleccion = Object.values(marcadas);
  const cuenta = {
    total: seleccion.length,
    personas: new Set(seleccion.map(c => c.colaboradorId)).size,
    dias: new Set(seleccion.map(c => c.fecha)).size,
    pasadas: seleccion.filter(c => !sePuedePintar(c.fecha, hoy)).length,
    // El nombre solo cuando hay UNA persona, y sale de las filas porque la selección solo guarda ids.
    nombre: (() => {
      const ids = new Set(seleccion.map(c => c.colaboradorId));
      if (ids.size !== 1) return null;
      const suya = filas.find(f => f.id === [...ids][0]);
      return suya ? `${suya.nombre} ${suya.apellido}` : null;
    })(),
  };

  // ───────── DE LO MARCADO A LO QUE LA PREVIA NECESITA ─────────
  //
  // La selección guarda solo persona y fecha, que es su identidad. Para contar y avisar hace falta lo
  // que ese día YA tiene encima, y eso vive en la respuesta.
  //
  // UN MAPA Y NO UNA BÚSQUEDA POR CELDA: con un mes y cien personas, buscar la fila y el día de cada
  // celda marcada serían miles de recorridos en cada dibujado.
  const porClave = new Map<string, { fila: FilaDelCalendario; dia: DiaDelCalendario }>();
  for (const fila of filas) {
    for (const dia of fila.dias) {
      porClave.set(claveDeCelda({ colaboradorId: fila.id, fecha: dia.fecha }), { fila, dia });
    }
  }

  const celdasParaPrevia: CeldaParaPrevia[] = seleccion.flatMap(celda => {
    const encontrada = porClave.get(claveDeCelda(celda));
    // Una celda marcada que ya no está en la respuesta (se cambió de período, cambió el filtro) se
    // descarta en vez de inventarle un estado: suponerla vacía diría que se va a escribir algo de lo
    // que no se sabe nada.
    if (!encontrada) return [];
    const { dia } = encontrada;
    return [{
      colaboradorId: celda.colaboradorId,
      fecha: celda.fecha,
      esDescansoObligatorio: dia.esDescansoObligatorio === true,
      // El id del turno del catálogo que el día ya tiene. Por identidad y no por nombre: dos turnos
      // pueden llamarse igual.
      plantillaIdActual: dia.turno?.id ?? null,
      // Los dos estados que se comportan como descanso, sea el obligatorio o uno marcado a mano.
      esDescansoHoy: dia.estado === 'DESCANSO' || dia.estado === 'DESCANSO_TRABAJADO',
      // Lo que el borrado quita. MANUAL es «lo ajustó una persona», y eso incluye una marca de
      // descanso sin turno encima.
      pintadoAMano: dia.origen === 'MANUAL',
    }];
  });

  // La acción se resuelve POR CELDA, que es lo que deja pasar una rotación por la misma maquinaria.
  const accionPendiente = (celda: { fecha: string }): AccionDeEscritura =>
    pendiente ? accionDeLoPendiente(pendiente, celda.fecha) : { tipo: 'QUITAR' };
  const conteo = pendiente
    ? conteoDePrevia(celdasParaPrevia, accionPendiente, hoy)
    : { escribe: 0, iguales: 0, bloqueadas: 0 };

  const nombreDe = (colaboradorId: string): string => {
    const suya = filas.find(f => f.id === colaboradorId);
    return suya ? `${suya.nombre} ${suya.apellido}` : 'esa persona';
  };

  const pisados = pendiente ? descansosPisados(celdasParaPrevia, accionPendiente, hoy) : [];

  // QUIÉN CRUZA A HABITUAL. Se cuenta cuántos de SUS descansos pisa este envío y se compara contra los
  // que ya trabajó este mes, que vienen contados con marcaciones desde el backend.
  //
  // SI EL UMBRAL NO VIENE, NO SE AVISA. Una respuesta vieja en caché o un backend anterior no traen
  // `minimoHabitual`, y poner un tres de respaldo aquí sería la segunda copia de una regla legal: el
  // aviso se calla y los otros siguen saliendo.
  const pisadosPorPersona = new Map<string, number>();
  for (const celda of pisados) {
    pisadosPorPersona.set(celda.colaboradorId, (pisadosPorPersona.get(celda.colaboradorId) ?? 0) + 1);
  }
  // `habitualesQueCruzan` y no `habituales`: ese nombre YA está tomado arriba por el número de la
  // cuarta tarjeta del resumen (cuántas personas están YA en descanso habitual), que es otra cosa.
  // Reusarlo hizo que el JSX de la previa resolviera contra el número y pidiera `.map` de un `number`.
  // Las dos cosas se parecen tanto de nombre que conviene que se distingan en el suyo.
  const habitualesQueCruzan = datos?.minimoHabitual === undefined ? [] : cruzanAHabitual(
    [...pisadosPorPersona].map(([colaboradorId, pisaEsteEnvio]) => ({
      colaboradorId,
      trabajadosEnElMes: filas.find(f => f.id === colaboradorId)?.descansoHabitual.trabajados ?? 0,
      pisaEsteEnvio,
    })),
    datos.minimoHabitual,
  );

  // Cómo se llama en una línea lo que está a punto de escribirse. Es lo único que cambia entre un
  // turno, un descanso y un borrado: de ahí para abajo la previa es la misma.
  const tituloDePendiente = (): string => {
    if (!pendiente) return '';
    const nombreDelTurno = (id: string) => catalogo.find(t => t.id === id)?.nombre ?? 'ese turno';
    const queCosa = pendiente.clase === 'ROTACION'
      ? `Rotación ${pendiente.patron} con turno de ${nombreDelTurno(pendiente.plantillaId).toLowerCase()}`
      : pendiente.accion.tipo === 'TURNO'
        ? `Turno de ${nombreDelTurno(pendiente.accion.plantillaId)}`
        : pendiente.accion.tipo === 'DESCANSO' ? 'Marcar como descanso' : 'Quitar el turno';
    return `${queCosa} · ${cuenta.nombre ?? `${cuenta.personas} personas`} · ${cuenta.dias} ${cuenta.dias === 1 ? 'día' : 'días'}`;
  };

  // ───────── LA ROTACIÓN ─────────
  //
  // UNA SOLA PERSONA, y no es una limitación técnica: un ciclo arranca en un día concreto, y aplicar el
  // mismo 4x2 con el mismo arranque a diez personas las deja a todas descansando el mismo día, que es
  // justo lo contrario de para lo que existe una rotación.
  const puedeRotar = cuenta.personas === 1 && catalogo.length > 0;

  // El mes que se está programando sale de la PRIMERA fecha marcada, no del período en pantalla: se
  // puede estar viendo una semana que cruza de mes, y el veredicto tiene que hablar del mes al que
  // pertenece lo que se va a escribir.
  const mesDeLaSeleccion = seleccion.map(c => c.fecha).sort()[0]?.slice(0, 7) ?? hoy.slice(0, 7);
  // El ancla del ciclo: el primer día del período mostrado. Así dos personas con el mismo desfase
  // quedan alineadas entre sí, que es de lo que vive una rotación en un equipo.
  const primerDiaDelPeriodo = dias[0] ?? hoy;

  const abrirRotacion = async () => {
    const quien = filas.find(f => f.id === seleccion[0]?.colaboradorId);
    if (!quien) return;
    setRotando(quien);
    setRot({ patron: '6x1', plantillaId: catalogo[0].id, desfase: 0 });
    setMesDeLaRotacion(null);
    // EL MES SE PIDE APARTE, y con la ruta que ya existe: acepta hasta 62 días. Sin esto el veredicto
    // juzgaría los siete días que hay en pantalla y diría «todo bien» de un mes que no ha visto.
    try {
      const primero = `${mesDeLaSeleccion}-01`;
      const ultimo = sumarDias(`${sumarDias(primero, 32).slice(0, 7)}-01`, -1);
      const r = await api.get('/turnos/calendario', { params: { desde: primero, hasta: ultimo } });
      const suya = (r.data.filas as FilaDelCalendario[]).find(f => f.id === quien.id);
      setMesDeLaRotacion((suya?.dias ?? []).map(d => ({
        fecha: d.fecha,
        // Trabajado es tener turno encima, sea un día normal o su descanso con turno. Un descanso o un
        // día sin nada no cuentan, que es la misma regla con la que `semanasSinDescanso` juzga.
        trabajado: d.estado === 'TRABAJA' || d.estado === 'DESCANSO_TRABAJADO',
      })));
    } catch {
      // Sin el mes no se dice veredicto. Inventar uno sería peor que no darlo.
      setMesDeLaRotacion(null);
    }
  };

  const cerrarRotacion = () => { setRotando(null); setRot(null); setMesDeLaRotacion(null); };

  // Las semanas del mes que quedarían sin ningún descanso CON esta rotación puesta. Se calcula con las
  // mismas funciones puras que juzgarían cualquier otra programación.
  const semanasMalas = (rotando && rot && mesDeLaRotacion)
    ? semanasSinDescanso(
      proyeccionDelMes({
        diasDelMes: mesDeLaRotacion,
        marcadas: seleccion.filter(c => c.colaboradorId === rotando.id).map(c => c.fecha),
        rotacion: { patron: rot.patron, desfase: rot.desfase, primerDia: primerDiaDelPeriodo },
        hoy,
      }),
      mesDeLaSeleccion,
    )
    : [];

  // ───────── APLICAR A TODO LO MARCADO, POR BLOQUES ─────────
  //
  // QUÉ SE ESCRIBE Y QUÉ NO lo decide `planDeEscritura`, y CÓMO SE PARTE lo decide `bloquesDe`: las
  // dos son puras y están probadas y mutadas. Aquí solo quedan las peticiones y lo que se le cuenta a
  // quien mira.
  //
  // SE INFORMA LO QUE FALLÓ, UNA A UNA. Escribir diecinueve de veinte y decir «listo» es exactamente
  // la forma en que esta pantalla mentiría: el servidor rechaza días sueltos con motivo propio («ya
  // empezó su jornada»), y ese motivo tiene que salir a la pantalla.
  const aplicarABloque = async (accionDe: (celda: CeldaMarcada) => AccionDeEscritura) => {
    const plan = planDeEscritura(seleccion, accionDe, hoy);
    const bloques = bloquesDe(plan.escribe, EN_VUELO);
    setResultado(null);
    setGuardando(true);

    let escritas = 0;
    const fallos: string[] = [];
    try {
      for (let i = 0; i < bloques.length; i++) {
        setProgreso({ bloque: i + 1, bloques: bloques.length });
        // `allSettled` y no `all`: con `all`, la primera negativa aborta el bloque y las otras cinco
        // quedarían escritas o no según el azar de la red, sin que nadie pueda saber cuáles.
        const idas = await Promise.allSettled(
          bloques[i].map(e => escribirDia(e.colaboradorId, e.fecha, e.accion)),
        );
        for (const ida of idas) {
          if (ida.status === 'fulfilled') escritas++;
          else fallos.push(motivoDe(ida.reason, 'No pudimos guardar ese día.'));
        }
      }
    } finally {
      setProgreso(null);
      setGuardando(false);
    }

    setResultado({ escritas, bloqueadas: plan.bloqueadas, fallos });
    setMarcadas({});
    setRecarga(n => n + 1);
  };

  // LA VISTA DE DÍA EN HORAS (22 de septiembre de 2026). Pedido del dueño: «que no vea arriba la M
  // de martes 22, sino las horas, y que la barra vaya del color del turno desde la hora de inicio
  // hasta la hora de fin».
  //
  // El eje se calcula con las jornadas de TODAS las personas de ese día, no con cada una por su
  // lado: si cada fila tuviera su propio eje, dos barras del mismo largo significarían horarios
  // distintos y la pantalla dejaría de poder compararse de un vistazo, que es para lo que sirve.
  const enDia = modo === 'DIA';
  const eje = enDia ? ejeDelDia(filas.flatMap(f => f.dias)) : null;

  // Los tres casos de una celda, tal cual los tenía la vista de semana. Es una función local y no
  // un componente para no tener que pasarle media docena de manejadores: cierra sobre los que ya
  // están aquí. La vista de día la reusa para el hueco y para el descanso, que no tienen barra.
  // QUÉ SE PUEDE HACER CON UN DÍA, en un solo sitio. La vista de semana lo usa con su celda de
  // siempre; la de día le pasa la BARRA de horas como contenido.
  //
  // Se generalizó el 22 de septiembre de 2026, cuando la barra de la vista de día salió como un
  // `div` y dejó de poder abrir el panel. La salida no era envolverla en otro botón —eso habría
  // dejado estos tres casos escritos dos veces, y el día que cambie uno se olvida el otro
  // (CLAUDE.md §9.3)—, sino que las dos vistas pasen por el MISMO envoltorio con otro contenido.
  const celdaDeDia = (
    fila: FilaDelCalendario,
    dia: DiaDelCalendario,
    opciones?: { clase?: string; contenido?: (sePuedeAgregar: boolean) => React.ReactNode },
  ) => {
    const clase = opciones?.clase
      ?? 'w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-primary hover:opacity-80 transition-opacity';
    // `sePuedeAgregar` llega desde aquí y no desde quien llama: es el único sitio que sabe si este
    // día es pintable, y el hueco con el «+» solo se ofrece donde el servidor lo va a aceptar.
    const dibujar = opciones?.contenido
      ?? ((sePuedeAgregar: boolean) => <Celda dia={dia} sePuedeAgregar={sePuedeAgregar} />);

    return dia.estado === 'DESCANSO_TRABAJADO' ? (
      <button type="button"
        aria-label={`Descanso trabajado de ${fila.nombre} ${fila.apellido}, día ${Number(dia.fecha.slice(8, 10))}`}
        // DOBLE CLIC, porque el clic simple ahora MARCA la celda (28 de septiembre de 2026). Los dos
        // gestos no caben en el mismo clic, y el de marcar es el que se usa a todas horas.
        onDoubleClick={() => abrirDecision(fila, dia)} className={clase}>
        {dibujar(false)}
      </button>
    ) : sePuedePintar(dia.fecha, hoy) ? (
      <button type="button"
        aria-label={`Turno de ${fila.nombre} ${fila.apellido}, día ${Number(dia.fecha.slice(8, 10))}`}
        // DOBLE CLIC, no clic simple: desde el 28 de septiembre de 2026 el clic marca la celda, que es
        // el gesto del trabajo diario. El panel con las tolerancias, el almuerzo y los descansos de
        // ESE día sigue estando, un gesto más adentro.
        onDoubleClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setEditando({ fila, dia, ancla: { x: r.x, y: r.y, ancho: r.width, alto: r.height } });
          setErrorPintado('');
        }}
        className={clase}>
        {dibujar(true)}
      </button>
    ) : (
      <div className={clase}>{dibujar(false)}</div>
    );
  };

  return (
    <div className="p-6 md:p-8">
      {/* EL ENCABEZADO, con la distribución de la maqueta del dueño (22 de septiembre de 2026):
          título grande a la izquierda, el selector de modo centrado, y la navegación agrupada a la
          derecha con «Hoy» ENTRE las dos flechas.

          Tres columnas desde `sm` y no `justify-between`: con `between`, el selector queda «en
          medio de lo que sobre», y se corre de sitio cada vez que el título cambia de largo (de
          «Septiembre de 2026» a «28 de septiembre al 4 de octubre» hay bastante diferencia). Con la
          rejilla, la columna del medio está centrada respecto a la pantalla y no se mueve nunca.

          EN PANTALLA ANGOSTA SE APILA Y SE CENTRA (24 de septiembre de 2026, pedido del dueño con
          la pantalla estrecha delante). Antes era `flex-wrap`, que no es lo mismo: al envolver, el
          título y el selector se quedaban juntos en la primera línea y la navegación caía sola a la
          izquierda, alineada con nada. Apilar en columna pone las tres piezas una debajo de otra y
          centradas, que es lo que se ve cuando no hay ancho para las tres en fila. */}
      <div className="mb-5 flex flex-col items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <h3 className="text-2xl sm:text-3xl font-light tracking-tight text-ink text-center sm:text-left">{vista.rotulo}</h3>

        {/* MES · SEMANA · DÍA. `aria-pressed` y no un `select`: son tres opciones fijas y la
            encendida tiene que verse sin abrir nada. */}
        <div role="group" aria-label="Cómo se ve el calendario"
          className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1 sm:justify-self-center">
          {MODOS.map(m => (
            <button key={m} type="button" onClick={() => setModo(m)} aria-pressed={modo === m}
              className={`rounded-xl px-4 py-1.5 text-sm transition-colors ${
                modo === m
                  ? 'bg-white text-ink font-bold shadow-sm'
                  : 'text-muted font-medium hover:text-ink'}`}>
              {PERIODO[m].unidad}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:justify-self-end">
          {/* Las flechas se mueven en la UNIDAD DEL MODO, y lo dicen: en un mes, «Semana anterior»
              sería una etiqueta falsa para quien navega con lector de pantalla. */}
          <button type="button" onClick={() => setAncla(a => moverVista(modo, a, -1))}
            aria-label={`${PERIODO[modo].unidad} anterior`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100 text-ink hover:bg-gray-200 transition-colors">
            <ChevronLeft size={18} />
          </button>
          {/* «Hoy» va SIEMPRE y en el medio, como en la maqueta. Antes solo aparecía cuando hoy no
              estaba a la vista, y eso tiene un costo que no se ve hasta que se usa: un botón que
              aparece y desaparece EMPUJA a las flechas de sitio, justo mientras se está haciendo
              clic repetido en ellas para avanzar semanas. */}
          <button type="button" onClick={() => setAncla(hoy)}
            className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-bold text-ink hover:bg-gray-200 transition-colors">
            Hoy
          </button>
          <button type="button" onClick={() => setAncla(a => moverVista(modo, a, 1))}
            aria-label={`${PERIODO[modo].unidad} siguiente`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100 text-ink hover:bg-gray-200 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* UNA TARJETA POR FILA EN EL TELÉFONO (24 de septiembre de 2026, pedido del dueño).
          Con dos columnas en pantalla angosta no cabía el rótulo: «Horas programadas», «Promedio
          por persona» y «Trabajaron su descanso» se partían en dos y tres líneas, y la tarjeta
          crecía a lo alto para sostener un texto que a lo ancho tenía sitio de sobra. A fila
          completa cada rótulo entra en una línea. El corte es el mismo `sm` del encabezado. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Tarjeta icono={Users} valor={String(filas.length)} titulo="Personas" />
        <Tarjeta icono={Clock} valor={horasDeMinutos(minutosTotales)} titulo="Horas programadas" nota={PERIODO[modo].enEl} />
        <Tarjeta icono={Scale} valor={horasDeMinutos(promedio)} titulo="Promedio por persona"
          // «semanales» va siempre, y no solo en la vista de semana: debajo de un promedio mensual,
          // un «tope legal 42 h» a secas se lee como si ese promedio tuviera que caber ahí.
          nota={sobreTope > 0 ? `${sobreTope} pasa${sobreTope === 1 ? '' : 'n'} de ${tope} h` : `tope legal ${tope} h semanales`}
          alerta={sobreTope > 0} />
        <Tarjeta icono={AlertTriangle} valor={String(trabajaronSuDescanso)} titulo="Trabajaron su descanso"
          nota={habituales > 0
            ? `${habituales} en descanso habitual: compensar en tiempo`
            : 'en el mes, con recargo'}
          alerta={habituales > 0} />
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
        {/* El ancho mínimo es el que el contenido NECESITA de verdad (persona + 7 días + total),
            no uno más chico: con 760px el navegador comprimía las columnas para que cupieran en
            vez de dejar desplazar al contenedor, y el chip del domingo se recortaba a «Descans»
            justo donde la pantalla avisa del recargo. Con el ancho real, el contenedor desplaza
            y no se parte nada.

            Es un MÍNIMO, así que la vista de mes no necesita otro número: con 31 columnas de 96px
            la tabla crece sola y el contenedor la desplaza, con la columna de la persona fija
            (`sticky left-0`) para no perder de vista de quién es cada fila. */}
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {/* `w-px` + `whitespace-nowrap` es el modo de decirle a una tabla `w-full` que esta
                  columna ocupe lo que ocupa su CONTENIDO y no una parte proporcional del ancho.
                  Sin eso se llevaba un tercio de la pantalla para mostrar un nombre corto, y las
                  columnas de los días quedaban apretadas al lado de un hueco en blanco. */}
              <th className="sticky left-0 bg-white z-10 w-px whitespace-nowrap text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">
                Persona
              </th>
              {enDia && eje ? (
                // EL EJE DE HORAS. Una sola columna con los rótulos puestos por porcentaje, para
                // que caigan exactamente sobre las mismas guías que la pista de cada fila. La
                // inicial del día y su número NO van aquí: el título grande ya dice qué día es, y
                // repetirlo quitaba el sitio a lo que el dueño sí quería ver.
                // `w-full` NO es decorativo: todo lo que lleva esta columna dentro está posicionado
                // en absoluto, y un elemento absoluto no le aporta ancho a su padre. Sin esto, la
                // tabla la trata como una columna de contenido CERO, le da lo mínimo, y el sobrante
                // se lo lleva la columna del total: el eje quedaba aplastado en el cuarto izquierdo
                // con un hueco enorme a la derecha. Con `w-full` reclama todo lo que sobre.
                <th className="w-full px-3 py-3">
                  <div className="relative h-4">
                    {horasDelEje(eje).map(h => (
                      <span key={h.minuto} style={{ left: `${h.pct}%` }}
                        className="absolute -translate-x-1/2 text-[11px] font-semibold text-muted tabular-nums">
                        {h.etiqueta}
                      </span>
                    ))}
                  </div>
                  {festivos.has(dias[0]) && (
                    <div className="mt-1 text-[10px] font-medium text-violet-700 text-left">Festivo</div>
                  )}
                </th>
              ) : dias.map(fecha => {
                const esHoy = fecha === hoy;
                return (
                  <Fragment key={fecha}>
                  <th className="px-2 py-3 text-center min-w-[96px]">
                    {/* EL ENCABEZADO MARCA LA COLUMNA ENTERA: ese día de todo el mundo. Es el gesto
                        con el que se programa una jornada completa —un domingo, un festivo— sin
                        recorrer la lista persona por persona. Vuelve a tocarse y se desmarca, porque
                        marcar una columna por error no puede obligar a limpiar todo. */}
                    <button type="button" onClick={() => marcarColumna(fecha)}
                      aria-label={`Marcar el día ${Number(fecha.slice(8, 10))} de todos`}
                      className="w-full rounded-lg px-1 py-0.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary">
                      {/* La inicial sale de la FECHA y no del número de columna: con `[i]`, de la
                          octava columna en adelante el encabezado salía en blanco. */}
                      <div className={`text-xs font-semibold ${esHoy ? 'text-ink' : 'text-muted'}`}>{inicialDeDia(fecha)}</div>
                      <div className={`text-sm tabular-nums ${esHoy ? 'font-bold text-ink' : 'text-muted'}`}>
                        {Number(fecha.slice(8, 10))}
                      </div>
                      {festivos.has(fecha) && <div className="text-[10px] font-medium text-violet-700">Festivo</div>}
                    </button>
                  </th>
                  {/* EL TOTAL DE LA SEMANA, al cerrar cada una. Sin esta columna, en un mes el tope de
                      42 horas no tiene dónde compararse y la alarma desaparece justo donde más
                      jornadas se programan de una vez. */}
                  {haySemanales && cierraSemana.has(fecha) && (
                    <th className="px-2 py-3 text-center text-[11px] font-semibold text-muted uppercase tracking-wider bg-gray-50">
                      Sem
                    </th>
                  )}
                  </Fragment>
                );
              })}
              {/* Decía «Semana» fijo, y en la vista de día encabezaba el total de UN día con esa
                  palabra. Se encontró midiendo los anchos de las columnas en el navegador, no
                  leyendo: la búsqueda de rótulos falsos había buscado «Total semanal» y «Resumen de
                  la semana», y este es un «Semana» pelado que no coincidía con ninguno de los dos. */}
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                {PERIODO[modo].unidad}
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={columnas} className="px-4 py-10 text-center text-sm text-muted">Cargando…</td></tr>
            )}
            {!cargando && !error && filas.length === 0 && (
              <tr><td colSpan={columnas} className="px-4 py-10 text-center text-sm text-muted">
                No hay colaboradores activos.
              </td></tr>
            )}
            {filas.map(fila => {
              const sePasa = topeAplica && fila.minutosEsperados > tope * 60;
              return (
                <tr key={fila.id} className="border-b border-gray-100 last:border-0">
                  <td className="sticky left-0 bg-white z-10 w-px whitespace-nowrap px-4 py-2.5">
                    {/* EL NOMBRE MARCA SU FILA ENTERA, que es el gesto de «a esta persona, todo el
                        período». Dice qué período con todas las letras («Marcar la semana de…»,
                        «Marcar el mes de…»): en un mes, un rótulo que dijera «semana» sería falso
                        para quien navega con lector de pantalla. */}
                    <button type="button" onClick={() => marcarFila(fila)}
                      aria-label={`Marcar ${PERIODO[modo].elArt} de ${fila.nombre} ${fila.apellido}`}
                      className="flex items-center gap-2.5 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                      <Inicial nombre={fila.nombre} apellido={fila.apellido} />
                      {/* El tope existe para que la columna se ajuste al contenido SIN quedar a
                          merced de un nombre larguísimo: hasta ahí crece, y de ahí en adelante el
                          `truncate` hace su trabajo. Sin tope, `w-px` deja que un solo nombre de
                          cuarenta letras vuelva a robarse la pantalla. */}
                      <div className="min-w-0 max-w-[180px]">
                        <div className="text-sm font-medium text-ink truncate">{fila.nombre} {fila.apellido}</div>
                        <div className="text-[11px] text-muted truncate">{fila.cargo || '—'}</div>
                      </div>
                    </button>
                  </td>
                  {enDia && eje ? (
                    // `w-full` por lo mismo que en el encabezado: la pista es puro posicionamiento
                    // absoluto y sin esto la columna no reclama ancho. Las dos tienen que llevarlo,
                    // o el encabezado y las barras dejarían de compartir caja.
                    //
                    // Y va con `//` y NO con `{/* */}`: esto cae dentro del paréntesis de un
                    // ternario, o sea posición de EXPRESIÓN, no hijos de JSX. Ahí una llave abre un
                    // objeto y el parser revienta con «Expected `,` or `)`».
                    <td className="w-full px-3 py-2.5">
                      {/* LA PISTA DE HORAS DE UNA PERSONA. El contenedor es relativo y todo lo de
                          adentro se posiciona en PORCENTAJE, que es lo que hace que la barra caiga
                          justo debajo de su hora en el encabezado sin depender de píxeles. */}
                      <div className="relative h-11">
                        {horasDelEje(eje).map(h => (
                          <div key={h.minuto} style={{ left: `${h.pct}%` }} aria-hidden="true"
                            className="absolute inset-y-0 w-px bg-gray-100" />
                        ))}
                        <PistaDeLaFila fila={fila} dia={fila.dias[0]} eje={eje} celda={celdaDeDia} />
                      </div>
                    </td>
                  ) : fila.dias.map(dia => {
                    const suya = { colaboradorId: fila.id, fecha: dia.fecha };
                    const marcada = Boolean(marcadas[claveDeCelda(suya)]);
                    return (
                      // El gesto vive en la CELDA DE LA TABLA y no en el botón de dentro: así también
                      // se puede arrastrar por encima de un día pasado o de un descanso trabajado,
                      // que no son botones. Lo que se escriba de esa selección lo decide después
                      // `planDeEscritura`, no el gesto.
                      <Fragment key={dia.fecha}>
                      <td
                        onPointerDown={() => iniciarArrastre(suya)}
                        onPointerOver={() => extenderArrastre(suya)}
                        className={`px-1.5 py-2.5 align-middle ${marcada ? 'bg-primary/20' : ''}`}>
                        {/* TRES CASOS Y NO DOS (22 de septiembre de 2026).
                            Un DESCANSO TRABAJADO abre su propio modal, y NO mira `sePuedePintar`:
                            por definición ya ocurrió, así que es pasado o de hoy, y colgándolo del
                            botón de pintar —que es solo hacia adelante— casi ninguno sería alcanzable.
                            Decidir la compensación de un día pasado es legítimo; repintarlo no.

                            Los demás siguen igual: solo los pintables son botones. Ofrecer un clic
                            que el servidor va a rechazar con un 400 es peor que no ofrecerlo. */}
                        <div className="relative">
                          {celdaDeDia(fila, dia)}
                          {/* El visto de que está marcada. El fondo de la celda ya lo dice, pero un
                              fondo suave se pierde sobre el color de un turno, y la cuenta que manda
                              la dice la tarjeta de abajo. */}
                          {marcada && (
                            <span aria-hidden="true"
                              className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-ink shadow">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </td>
                      {/* EL TOTAL DE ESA SEMANA, al cerrarla. Se compara contra el tope AQUÍ y no
                          contra el total de la fila: en un mes ese total son treinta jornadas y
                          compararlo con 42 horas pintaría a la empresa entera en ámbar. El tope es
                          semanal, así que su sitio es esta celda.

                          Los minutos los suma `minutosDeLaSemana`, que trata como CERO una fecha sin
                          fila: las columnas de relleno son de otro mes y esa persona puede no tener
                          día ahí. Sumar `undefined` daría un total en blanco sin decir por qué. */}
                      {haySemanales && cierraSemana.has(dia.fecha) && (() => {
                        const suSemana = semanas.find(s => s.fechas[s.fechas.length - 1] === dia.fecha);
                        const minutos = minutosDeLaSemana(
                          suSemana?.fechas ?? [],
                          Object.fromEntries(fila.dias.map(d => [d.fecha, d.minutosEsperados])),
                        );
                        const pasaLaSemana = minutos > tope * 60;
                        return (
                          <td className="bg-gray-50 px-2 py-2.5 text-center align-middle">
                            <div className={`text-[12px] font-semibold tabular-nums ${
                              pasaLaSemana ? 'text-amber-700' : 'text-ink'}`}>
                              {horasDeMinutos(minutos)}
                            </div>
                            {pasaLaSemana && (
                              <div className="text-[10px] font-medium text-amber-700">
                                +{horasDeMinutos(minutos - tope * 60)}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                      </Fragment>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-sm font-semibold tabular-nums ${sePasa ? 'text-amber-700' : 'text-ink'}`}>
                      {horasDeMinutos(fila.minutosEsperados)}
                    </span>
                    {sePasa && <div className="text-[10px] text-amber-700">pasa de {tope} h</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RESUMEN POR COLABORADOR. La rejilla de arriba responde «qué hace cada quien cada día»; esta
          tabla responde «cómo le quedó la semana», que es la pregunta con la que se cierra nómina. */}
      {!cargando && !error && filas.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-ink mb-2">Resumen {PERIODO[modo].deEl}</h4>
          <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Colaborador</th>
                  <th className="text-center px-3 py-2.5">Días con turno</th>
                  <th className="text-center px-3 py-2.5">Descansa</th>
                  <th className="text-center px-3 py-2.5">Descansos trabajados (mes)</th>
                  <th className="text-right px-4 py-2.5">Total {PERIODO[modo].deEl}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(fila => {
                  const conTurno = fila.dias.filter(d => d.estado === 'TRABAJA' || d.estado === 'DESCANSO_TRABAJADO').length;
                  const sePasa = topeAplica && fila.minutosEsperados > tope * 60;
                  return (
                    <tr key={fila.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Inicial nombre={fila.nombre} apellido={fila.apellido} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-ink truncate">{fila.nombre} {fila.apellido}</div>
                            <div className="text-[11px] text-muted truncate">{fila.cargo || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-ink tabular-nums">{conTurno}</td>
                      <td className="px-3 py-2.5 text-center text-sm text-muted">
                        <div>{descansoEnPalabras(fila.descanso)}</div>
                        {/* La propuesta va aquí y no en la rejilla: esta tabla responde «cómo le
                            quedó la semana», que es la pregunta que la propuesta viene a cerrar. */}
                        <PropuestaDeSemana
                          propuesta={fila.propuesta}
                          ocupado={guardando}
                          onConfirmar={fecha => pintarEn(fila.id, fecha, { descanso: true })} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {fila.descansoHabitual.trabajados > 0 ? (
                          // Rojo solo al cruzar a habitual: es el único estado que obliga a algo
                          // más que pagar el recargo. Pintar igual uno que tres borraría el umbral.
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            fila.descansoHabitual.clase === 'HABITUAL'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'}`}>
                            <AlertTriangle size={10} />
                            {fila.descansoHabitual.trabajados}
                            {fila.descansoHabitual.clase === 'HABITUAL' && ' habitual'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-sm font-semibold tabular-nums ${sePasa ? 'text-amber-700' : 'text-ink'}`}>
                          {horasDeMinutos(fila.minutosEsperados)}
                        </span>
                        <span className="text-[11px] text-muted"> / {tope} h</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EL PANEL DE LA JORNADA, anclado a la celda que se tocó. Si el servidor se niega, el motivo
          se queda dentro y el panel no se cierra. */}
      {editando && (
        <>
          {/* Capturador de clics, TRANSPARENTE a propósito: un panel anclado no oscurece la página
              —eso es justo lo que lo separa de un modal— pero sí necesita enterarse de un clic
              afuera para cerrarse. Va por debajo del panel y por encima de la rejilla. */}
          <div className="fixed inset-0 !mt-0 z-[69]" onClick={() => setEditando(null)} />
          <PanelDeJornada
            ancla={editando.ancla}
            titulo={`${editando.fila.nombre} ${editando.fila.apellido}`}
            subtitulo={`${editando.dia.fecha} · ${editando.dia.turno ? editando.dia.turno.nombre : 'sin turno pintado'}`}
            dia={editando.dia}
            catalogo={catalogo}
            ocupado={guardando}
            error={errorPintado}
            onElegir={pintar}
            onDescanso={marcarDescanso}
            onQuitar={quitar}
            onCerrar={() => setEditando(null)} />
        </>
      )}

      {/* El modal se dibuja solo cuando la decisión YA llegó del servidor: abrirlo vacío y llenarlo
          después deja medio segundo de modal en blanco. */}
      {decidiendo && decision && (
        <ModalDescansoTrabajado
          nombre={`${decidiendo.fila.nombre} ${decidiendo.fila.apellido}`}
          datos={decision}
          guardando={guardando}
          error={errorDecision}
          onCerrar={() => { setDecidiendo(null); setDecision(null); }}
          onGuardar={guardarDecision} />
      )}
      {/* Si la consulta falla, el modal no llega a abrirse. Sin esto, el clic no mostraría NADA y
          parecería que el botón está roto. Ojo: esta línea no tiene prueba que la cubra. */}
      {decidiendo && !decision && errorDecision && (
        <p role="alert" className="mt-3 text-sm text-red-600">{errorDecision}</p>
      )}

      {/* CÓMO QUEDÓ LO QUE SE APLICÓ. Se queda en pantalla hasta la siguiente vez: un resultado que
          se desvanece solo obliga a haber estado mirando justo en ese momento.

          Dos papeles distintos y no uno: todo bien es un `status` (se anuncia sin interrumpir), y
          algo que no se pudo escribir es un `alert`. Meter las dos cosas en el mismo sitio dejaría
          las negativas del servidor con el mismo peso que un «listo». */}
      {resultado && resultado.fallos.length === 0 && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <Check size={15} className="shrink-0" />
          {jornadas(resultado.escritas)} escritas.
          {resultado.bloqueadas > 0 && ` ${resultado.bloqueadas} no se tocaron porque el día ya pasó.`}
        </p>
      )}
      {resultado && resultado.fallos.length > 0 && (
        <div role="alert" className="mt-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            {jornadas(resultado.escritas)} escritas, y {resultado.fallos.length} no se pudieron escribir.
          </p>
          {/* El motivo del servidor, tal cual, y sin repetirlo veinte veces: cuando falla un bloque
              entero suele ser la misma razón, y veinte líneas iguales esconden la que es distinta. */}
          <ul className="mt-1.5 list-disc pl-5 text-[13px]">
            {[...new Set(resultado.fallos)].map(m => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* LA TARJETA DE LO MARCADO. Aparece sola cuando hay algo marcado y se va cuando no queda
          nada: un sitio fijo y vacío esperando una selección ocuparía la pantalla sin decir nada. */}
      {cuenta.total > 0 && (
        <TarjetaDeBloque
          cuenta={cuenta}
          catalogo={catalogo}
          ocupado={guardando}
          progreso={progreso}
          // Elegir NO escribe: abre la previa. Un bloque toca a varias personas a la vez y dos de sus
          // consecuencias cuestan dinero, así que hay que poder leerlas antes de decir sí.
          onTurno={plantillaId => setPendiente({ clase: 'IGUAL', accion: { tipo: 'TURNO', plantillaId } })}
          onDescanso={() => setPendiente({ clase: 'IGUAL', accion: { tipo: 'DESCANSO' } })}
          onQuitar={() => setPendiente({ clase: 'IGUAL', accion: { tipo: 'QUITAR' } })}
          puedeRotar={puedeRotar}
          onRotacion={abrirRotacion}
          onCancelar={limpiarMarcadas} />
      )}

      {/* LA PREVIA. Cancelar cierra pero NO limpia lo marcado: es «déjame mirarlo otra vez», no
          «empieza de cero». */}
      {pendiente && (
        <PreviaDeBloque
          titulo={tituloDePendiente()}
          conteo={conteo}
          pisados={pisados.map(c => ({ nombre: nombreDe(c.colaboradorId), fecha: c.fecha }))}
          habituales={habitualesQueCruzan.map(h => ({ nombre: nombreDe(h.colaboradorId), antes: h.antes, despues: h.despues }))}
          ocupado={guardando}
          onCancelar={() => setPendiente(null)}
          // Se captura lo pendiente ANTES de limpiarlo: el estado ya no está cuando la escritura corre,
          // y leerlo desde dentro daría `null` y escribiría un «quitar» sobre todo lo marcado.
          onAplicar={() => {
            const que = pendiente;
            setPendiente(null);
            aplicarABloque(celda => accionDeLoPendiente(que, celda.fecha));
          }} />
      )}

      {/* LA VENTANA DE ROTACIÓN. «Ver antes de aplicar» no escribe: deja la rotación pendiente y abre
          la MISMA previa que los turnos sueltos, con sus avisos y su guardado por bloques. */}
      {rotando && rot && (
        <VentanaDeRotacion
          nombre={`${rotando.nombre} ${rotando.apellido}`}
          catalogo={catalogo}
          rot={rot}
          dias={dias}
          marcadas={new Set(seleccion.filter(c => c.colaboradorId === rotando.id).map(c => c.fecha))}
          hoy={hoy}
          primerDia={primerDiaDelPeriodo}
          mes={nombreDelMes(`${mesDeLaSeleccion}-01`)}
          semanasMalas={semanasMalas}
          esperandoElMes={mesDeLaRotacion === null}
          onPatron={patron => setRot({ ...rot, patron, desfase: 0 })}
          onTurno={plantillaId => setRot({ ...rot, plantillaId })}
          onCorrer={cuanto => setRot({
            ...rot,
            desfase: ((rot.desfase + cuanto) % ROTACIONES[rot.patron].ciclo + ROTACIONES[rot.patron].ciclo)
              % ROTACIONES[rot.patron].ciclo,
          })}
          onCancelar={cerrarRotacion}
          onVerPrevia={() => {
            setPendiente({
              clase: 'ROTACION', patron: rot.patron, desfase: rot.desfase,
              plantillaId: rot.plantillaId, primerDia: primerDiaDelPeriodo,
            });
            cerrarRotacion();
          }} />
      )}

      <p className="mt-3 text-xs text-muted leading-relaxed">
        El tope de <b>{tope} horas</b> sale de la jornada legal vigente, no está escrito en la
        pantalla: sube o baja solo cuando cambia la ley. Los días salen de la misma fuente que la
        nómina, así que lo que se ve aquí es lo que se liquida. Un día que nadie pintó dice «Sin
        asignar» y conserva sus horas: el horario las sigue exigiendo aunque todavía no se haya
        elegido qué turno lo cubre.
      </p>
    </div>
  );
}
