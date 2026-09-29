import { useState, useEffect, useLayoutEffect, useMemo, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Clock, Scale, X, Plus, Check, Moon, RotateCw, Search, Calendar, Bed, MapPin, Briefcase } from 'lucide-react';
import api from '../../lib/api';
import {
  hoyEnBogota, horasDeMinutos, sePuedePintar, inicialDeDia, abreviaturaDeDia,
  esFinDeSemana, esDeOtroMes,
} from './semana';
// La selección en bloque y el guardado por bloques: dos decisiones puras, probadas y mutadas aparte.
// Qué celdas caen dentro de un rectángulo y qué se va a escribir de verdad NO se deciden aquí.
import { claveDeCelda, celdasDelRectangulo, type Celda as CeldaMarcada } from './seleccionEnBloque';
import { bloquesDe, planDeEscritura, type AccionDeEscritura } from './aplicacionPorBloques';
// Por dónde va el envío: el porcentaje, los círculos y si terminó o se cortó. Puro, probado y mutado
// aparte. El porcentaje va sobre JORNADAS y no sobre bloques, y ahí está el porqué.
import { estadoDelProgreso } from './progresoDelBloque';
// A qué se devuelve cada celda para deshacer un envío. Puro, probado y mutado: el caso que se hace mal
// es el día que NADIE había pintado, que se despinta en vez de repintarse.
import { accionParaDeshacer } from './deshacerElLote';
import { codigosDelCatalogo } from './codigoDeTurno';
import { cargoYSede } from './cargoYSede';
import { avisoDeDescansos } from './avisoDeDescansos';
// A quién se ve con los filtros de arriba. Puro, probado y mutado: de esta lista sale qué se puede
// seleccionar, y por lo tanto a quién se le escribe al aplicar un bloque.
import { quienSeVe, type FiltrosDeLaRejilla } from './quienSeVe';
// Cuántos turnos y cuántos descansos hay en lo que se está viendo. Puro, probado y mutado: la cuenta
// descarta las columnas de relleno del mes, y equivocarse ahí da un número más grande y plausible.
import { conteoDeLaRejilla } from './conteoDeLaRejilla';
// Las cuentas y los avisos de la previa. También puros, probados y mutados: la pantalla los APLICA,
// no los decide. De ellos depende que alguien apruebe o cancele un envío de cien jornadas.
import {
  conteoDePrevia, descansosPisados, cruzanAHabitual, type CeldaParaPrevia,
} from './previaDeBloque';
// El motor de rotaciones y la proyección del mes: también puros, probados y mutados. Qué le toca a
// cada día del ciclo y qué semanas quedarían sin descanso NO se deciden aquí.
import { ROTACIONES, accionDelDia, semanasSinDescanso, type PatronDeRotacion } from './rotacion';
import { proyeccionDelMes, proyeccionDelBloque, minutosProyectados } from './proyeccionDeRotacion';
// Qué se le escribe a cada día con lo que está pendiente: una acción igual para todas las celdas, o
// una rotación que reparte turnos y descansos por el ciclo. Puro, probado y mutado aparte.
import { accionDeLoPendiente, type LoPendiente } from './loPendiente';
import { diasEntre, sumarDias, nombreDelMes, rotuloCorto, horarioCorto } from './semana';
// Dónde está parado el calendario respecto a hoy. Puro, probado y mutado aparte: es aritmética de
// calendario, que es la que falla en silencio (una diferencia de meses mal contada dice «hace once
// meses» del mes que viene).
import { etiquetaDelPeriodo } from './etiquetaDelPeriodo';
// Qué rango le toca a cada modo y cómo se mueven las flechas. Es una decisión pura, probada y
// mutada aparte: aquí solo se aplica.
import { vistaDelCalendario, moverVista, type ModoDeVista } from './vistaDelCalendario';
// Qué semanas hay dentro de las columnas y cuántos minutos exige cada una. Puro, probado y mutado:
// de ese número sale la alarma de las 42 horas, que es semanal.
//
// OJO CON DOS NOMBRES CASI IGUALES EN ESTE ARCHIVO, y lo señaló el compilador al traer el segundo:
// `semanasSobreElTope` (de aquí) es la función que dice QUÉ semanas de un mes se pasan y en cuánto,
// para la previa; `semanasSobreTope`, más abajo, es un NÚMERO local: cuántas semanas-persona se pasan
// en lo que hay en pantalla, para la tarjeta de resumen. No son lo mismo y no se sustituyen.
import {
  semanasDeLasColumnas, minutosDeLaSemana, semanasSobreElTope, mesQueSePrograma,
} from './semanasDeLaRejilla';
import { nombreDelDia } from '../../lib/diasDeLaSemana';
import { CLASES_COLOR, PUNTO_COLOR, CELDA_COLOR, normalizarColor } from '../../lib/coloresDeTurno';
import { PilaDeAvisos, type Aviso } from '../../components/Toast';
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
  // LAS SEDES A LAS QUE ESTÁ ASIGNADA, en plural: `ColaboradorSede` es una tabla puente y un
  // supervisor puede recorrer varias. El filtro pregunta «¿tiene esta entre las suyas?».
  sedes: { id: string; nombre: string }[];
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
  // CUÁNTOS MINUTOS LE EXIGIRÍA A ESTA PERSONA CADA TURNO DEL CATÁLOGO, por id de plantilla.
  //
  // Va por persona y no por turno porque un turno que descuenta almuerzo sin ventana propia hereda el
  // `almuerzoMin` del horario de CADA una. Lo calcula el servidor con la misma función que corre al
  // pintar un día; aquí no se rehace, porque sería la segunda copia de la regla de la que salen las
  // horas extra.
  //
  // Un turno con horas inválidas NO está en el mapa: de ese no se puede decir veredicto.
  minutosPorTurno: Record<string, number>;
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

// UNA TIRA Y NO TARJETAS SUELTAS (28 de septiembre de 2026, al igualar la maqueta). Allí el cambio
// se hizo el 26 con este motivo, y vale igual aquí: seis cajas con borde propio y un número grande
// cada una se leen como el asunto de la pantalla, y no lo son. El asunto es la rejilla. Los seis
// datos siguen estando, dentro de una sola caja y separados por una línea fina.
//
// CADA ICONO CON SU COLOR, también de la maqueta. No es decoración: son seis celdas iguales pegadas
// en fila, y el color es lo que deja saltar a la de alerta sin leer los seis rótulos.
//
// EN DOS COLUMNAS EN PANTALLA CHICA, y ahí la raya divisoria se quita: separa bien cuando están en
// una fila, pero al envolver queda colgando a la izquierda de la primera de cada fila nueva,
// marcando una separación que ahí no significa nada.
function Tarjeta({ icono: Icono, tinte, valor, titulo, nota, alerta }: {
  icono: typeof Users; tinte: string; valor: string; titulo: string; nota?: string; alerta?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_calc(50%-1px)] items-center gap-2.5 px-2.5 py-1.5 sm:flex-[1_1_150px] sm:px-3 sm:[&+&]:border-l sm:[&+&]:border-gray-100">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-[9px] ${
        alerta ? 'bg-red-100 text-red-600' : tinte}`}>
        <Icono size={15} />
      </div>
      <div className="min-w-0">
        <div className={`text-base font-extrabold leading-tight tabular-nums ${alerta ? 'text-red-700' : 'text-ink'}`}>{valor}</div>
        <div className="text-[11px] leading-[1.25] text-muted">{titulo}</div>
        {nota && <div className={`mt-px text-[10px] leading-tight ${alerta ? 'text-red-700' : 'text-gray-400'}`}>{nota}</div>}
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
// SIN BORDE, igual que los del catálogo. En la maqueta la celda de un turno es fondo y nada más: su
// borde existe pero es transparente, y solo se pinta cuando la celda está marcada. Un borde de
// reposo por origen obligaría a que ese amarillo peleara en la cascada contra tres colores más.
//
// EL BLANCO DEL HORARIO PASA A GRIS CLARO. Sobre una tabla blanca, una celda blanca sin borde
// desaparece: el día quedaría indistinguible de un hueco, y un día que el horario programa SÍ exige
// presencia. El gris es lo mínimo que la hace existir sin darle un color que nadie eligió.
const NEUTRO: Record<OrigenDelRotulo, string> = {
  CATALOGO: '', // no se usa: ese caso trae su propio color
  HORARIO: 'bg-gray-100 text-ink',
  NINGUNO: 'bg-gray-50 text-gray-400',
};

// EL PUNTO DE COLOR ANTES DEL NOMBRE, como en la maqueta. No es adorno: con el fondo claro que ahora
// lleva la celda, el punto es lo que sostiene de qué turno se trata cuando la celda está marcada y el
// amarillo de la selección domina el contorno.
//
// Los dos orígenes sin catálogo también llevan punto, en gris. Sin él, una fila mezclada queda con
// unas celdas empezando en el punto y otras en la letra, y el ojo lee eso como desalineación.
const PUNTO_NEUTRO: Record<OrigenDelRotulo, string> = {
  CATALOGO: '', // no se usa
  HORARIO: 'bg-gray-400',
  NINGUNO: 'bg-gray-300',
};

function tonoDeJornada(dia: DiaDelCalendario) {
  const rotulo = rotuloDeCelda(dia.turno, dia.horarioNombre);
  const delCatalogo = rotulo.origen === 'CATALOGO' && dia.turno;
  return {
    rotulo,
    tono: delCatalogo ? CELDA_COLOR[normalizarColor(dia.turno!.color)] : NEUTRO[rotulo.origen],
    punto: delCatalogo ? PUNTO_COLOR[normalizarColor(dia.turno!.color)] : PUNTO_NEUTRO[rotulo.origen],
  };
}

// `compacta` ES LA VISTA DE MES (28 de septiembre de 2026). Medido en el navegador antes de tocar
// nada: con 42 columnas la tabla mide 4001 px dentro de un contenedor de 1006, o sea que se ve la
// CUARTA PARTE del mes y hay que raspar a lo ancho para llegar a la última semana.
//
// Lo que se quita es el HORARIO, no el turno. En un mes lo que se lee de un vistazo es quién lleva
// qué; la hora exacta sigue estando en la vista de semana, en el panel del día y en la pastilla del
// catálogo, que son los tres sitios donde se está mirando UN día. Y de paso la fila pasa de dos
// renglones a uno, que es lo que hace que quepa más gente sin desplazar hacia abajo.
//
// EL NOMBRE PASA A DOS RENGLONES, NO SE RECORTA, y esa fue una corrección sobre la marcha.
//
// Medido: con el nombre en una sola línea las columnas de día quedan entre 56 y 94 px, y los 35 días
// suman 2813 de los 3264 que mide la tabla. O sea que lo que la ensancha es el nombre sin partir.
//
// El primer intento fue recortarlo con puntos suspensivos, y está mal: a 48 px caben siete letras,
// así que «Jornada mañana» y «Jornada tarde» se leerían las dos «Jornad…» y la celda dejaría de
// decir lo único que tiene que decir. Dejándolo partir, la columna se estrecha hasta la palabra más
// larga en vez de hasta la frase entera, no se esconde nada, y el sitio vertical ya estaba ahí.
//
// LO QUE NO SE PUDO COPIAR DE LA MAQUETA: allí la celda del mes muestra un código corto por turno
// («Mñ», «Tr»), y con eso la tabla baja a 1630 px. Ese campo no existe en el catálogo —solo hay
// `nombre`—, y ponerlo pide una decisión de producto y un cambio de esquema, no CSS. Mientras no
// exista, el mes se sigue desplazando a lo ancho: menos que antes, pero se desplaza.
// ¿ESTA CELDA ESTÁ VACÍA? Lo preguntan DOS sitios: `Celda`, para ofrecer el «+», y el envoltorio de
// la rejilla, para decidir dónde va el visto. En una celda vacía va centrado y grande, como en la
// maqueta (`.jornada.t-vacio.sel .tic`); sobre un turno taparía el nombre, que es justo el dato que
// hace falta para saber qué se va a sobrescribir.
//
// Escrita una sola vez porque si no, el día que aparezca un estado nuevo, solo se acordaría uno de
// los dos y el visto saldría centrado encima del nombre de un turno.
function esCeldaVacia(dia: DiaDelCalendario): boolean {
  return dia.estado !== 'TRABAJA' && dia.estado !== 'DESCANSO' && dia.estado !== 'DESCANSO_TRABAJADO';
}

function Celda({ dia, sePuedeAgregar = false, compacta = false, marcada = false, apagada = false, codigo }: {
  dia: DiaDelCalendario; sePuedeAgregar?: boolean; compacta?: boolean; marcada?: boolean;
  // Marcada PERO de un día que ya pasó: entra en la selección y no se va a escribir.
  apagada?: boolean;
  // El código corto del turno, para la vista de mes. Lo calcula `codigosDelCatalogo` mirando el
  // catálogo ENTERO, porque si dos turnos chocan solo se sabe teniéndolos todos delante.
  codigo?: string;
}) {
  // EL BORDE DE UNA CELDA MARCADA LO CAMBIA LA PROPIA CELDA, y por eso esto es una variable y no un
  // anillo puesto por fuera.
  //
  // Con el anillo por fuera se veían DOS contornos a la vez: el anillo del envoltorio y el borde
  // punteado de la celda, uno dentro del otro. La maqueta tiene uno solo: la celda cambia el COLOR
  // de su propio borde y conserva su ESTILO —punteado si está vacía, sólido si lleva turno—, y por
  // fuera va un halo translúcido que no se lee como un segundo borde.
  //
  // Una variable y no cuatro copias: la usan las cuatro ramas, pero la regla está escrita una vez.
  //
  // LLEVA `!` Y NO ES PEREZA. Cada rama trae ya su propio `border-*`, y dos utilidades del mismo
  // `border-color` NO se ordenan por su posición en el atributo `class`: gana la que Tailwind haya
  // escrito más abajo en la hoja, que uno no controla. Medido: la celda de descanso trabajado se
  // quedaba naranja con el `border-primary-dark` puesto al final de la cadena. El `!` lo zanja, que
  // es lo que corresponde a un estado que manda sobre el color de reposo.
  const bordeMarcado = !marcada ? '' : apagada ? ' !border-[#ddd0a4]' : ' !border-primary-dark';
  // EL HORARIO COMO CABE EN LA CELDA: «6–14» y no «06:00–14:00». La regla vive en `horarioCorto`,
  // que está probada: en los 75 px útiles de la celda, esos cuatro ceros son un tercio del renglón
  // repitiendo lo mismo en cada casilla de la pantalla.
  const horas = dia.horaEntrada && dia.horaSalida ? horarioCorto(dia.horaEntrada, dia.horaSalida) : null;

  // El descanso trabajado manda sobre el turno pintado: es el dato que cuesta dinero, y pintarlo
  // como un día cualquiera lo escondería.
  if (dia.estado === 'DESCANSO_TRABAJADO') {
    // EN EL MES, SOLO EL TRIÁNGULO, como en la maqueta. Esta rama se había quedado sin compactar y era
    // la que mandaba el ancho de la rejilla: medido, sus columnas iban a 90 px mientras las de un turno
    // con código corto median 56. Una sola celda ancha estira su columna el mes entero.
    //
    // Lo que se esconde no se pierde: el `title` lo dice con palabras, y el panel del día lo explica.
    if (compacta) {
      return (
        <div title={`Descanso trabajado${dia.decision === 'PENDIENTE' ? ' · pendiente de decidir' : ''}`}
          className={`grid h-[26px] w-full place-items-center rounded-lg border-[1.5px] border-transparent bg-orange-50 text-orange-900 shadow-[inset_0_0_0_2px_rgb(253,186,116)]${bordeMarcado}`}>
          <AlertTriangle size={13} aria-hidden="true" />
          <span className="sr-only">Descanso trabajado</span>
        </div>
      );
    }

    // DOS RENGLONES Y NO TRES, que es lo que de verdad hace que esta tabla se parezca a la maqueta.
    //
    // MEDIDO EN LAS DOS PANTALLAS RENDERIZADAS, a 800 px: la fila de la maqueta mide 58 px y la de la
    // app medía 87. La causa era esta celda, la única con tres renglones (nombre, horario y el chip
    // «Pendiente»): pesaba 66 px mientras las demás medían 51, y UNA sola celda así estira la fila
    // ENTERA. La maqueta ya había pasado por esto y dejó su nota: «el segundo renglón dice una cosa
    // u otra, nunca las dos».
    //
    // QUÉ SE VA Y QUÉ SE QUEDA. El horario se va: en una celda marcada como descanso trabajado el
    // dato que hay que leer es ese, y el rango horario está en el panel del día, en la pastilla del
    // catálogo y en el propio nombre del turno. «Pendiente» NO se va, porque es lo único que pide una
    // acción: baja al segundo renglón, pegado a la palabra.
    //
    // Y ARRIBA VA EL NOMBRE DEL TURNO y no la palabra «Descanso», como en la maqueta: quien mira la
    // fila necesita saber QUÉ se le puso encima a ese descanso para decidir si estuvo bien.
    const { rotulo: suRotulo } = tonoDeJornada(dia);
    return (
      // EL AVISO VA EN UN ANILLO INTERIOR y no en el borde, como en la maqueta (medido allí:
      // `inset 0 0 0 2px #fdba74`). El borde queda libre para el amarillo de lo marcado, así que una
      // celda de descanso trabajado Y marcada dice las dos cosas a la vez en vez de que una tape a la
      // otra.
      <div className={`flex min-h-[36px] flex-col justify-center rounded-xl border-[1.5px] border-transparent bg-orange-50 px-2 py-1.5 text-orange-900 shadow-[inset_0_0_0_2px_rgb(253,186,116)]${bordeMarcado}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="truncate">{suRotulo.texto}</span>
        </div>
        {/* SOLO SE AVISA LO QUE FALTA (22 de septiembre de 2026). Un día ya decidido no dice nada
            extra: la ausencia de la palabra es la señal de que está atendido.

            `=== 'PENDIENTE'` y no una comprobación laxa: aquí `undefined` (una respuesta vieja en
            caché, un backend anterior) SÍ debe comportarse distinto, porque marcarlo pendiente
            sería inventar un aviso. */}
        <div className="truncate text-[11px] opacity-[.78]">
          descanso{dia.decision === 'PENDIENTE' && ' · pendiente'}
        </div>
      </div>
    );
  }

  // DICE «DESCANSO» Y NO «LIBRE» desde el 23 de septiembre de 2026, con esas palabras del dueño:
  // «debería verse una tarjeta que diga descanso». Eran dos palabras para una sola cosa, y desde que
  // el día se marca con un botón que dice «Marcar como descanso», el resultado tiene que llamarse
  // igual que la acción: nadie debería tener que deducir que lo que pidió salió con otro nombre.
  if (dia.estado === 'DESCANSO') {
    // EL DESCANSO OBLIGATORIO SE VE DISTINTO DE UNO MARCADO A MANO (28 de septiembre de 2026), como en
    // la maqueta con su clase `obligatorio`: fondo asentado en vez del recuadro punteado.
    //
    // No son la misma cosa y confundirlos cuesta dinero: sobre el obligatorio, pintar un turno paga
    // recargo y desde el tercero del mes obliga a compensar con tiempo. Sobre uno marcado a mano, no.
    // Hasta hoy los dos se veían igual, y para distinguirlos había que abrir el día.
    const obligatorio = dia.esDescansoObligatorio === true;
    // EL ICONO ARRIBA Y LA PALABRA DEBAJO, como en la maqueta, donde lo eligió el dueño el 25 de
    // septiembre: una celda de turno ocupa dos renglones (nombre y horario) y la de descanso ocupaba
    // uno solo, así que al lado de las demás se veía hueca y el renglón quedaba desparejo.
    //
    // EN EL MES NO CABEN LOS DOS: la celda mide 26 px. Va el icono solo, y la palabra sigue estando
    // para quien lee con lector de pantalla y para las pruebas, que consultan por lo que se lee.
    // LOS DOS DESCANSOS NO SE DIBUJAN IGUAL, y eso sale de abrir la maqueta y medirla, no de leer su
    // CSS: el que alguien MARCÓ lleva el icono encima de la palabra, y el OBLIGATORIO sin pintar lo
    // lleva al lado. Son dos hechos distintos —«decidí que descansa» y «la ley dice que hoy le toca»—
    // y en la maqueta se distinguen por la forma antes que por el color.
    //
    // El fondo es el mismo #ECEFF4 de la maqueta en los dos casos.
    return (
      <div className={`flex items-center justify-center rounded-xl border-[1.5px] text-center text-[11px] font-medium ${
        compacta ? 'flex-col px-1 py-1' : 'min-h-[36px] gap-1.5 px-2 py-1.5'} ${
        obligatorio ? '' : 'flex-col gap-0.5'} ${
        obligatorio
          ? 'border-transparent bg-[#eceff4] text-[#5b6472]'
          : 'border-transparent bg-gray-100 text-muted'}${bordeMarcado}`}>
        <Bed size={compacta ? 13 : 15} aria-hidden="true" className="shrink-0" />
        {compacta ? <span className="sr-only">Descanso</span> : 'Descanso'}
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
    const { rotulo, tono, punto } = tonoDeJornada(dia);

    return (
      <div
        // EL NOMBRE COMPLETO, AL PASAR EL PUNTERO, y solo donde la celda no lo dice. Sin esto, una
        // empresa de horario fijo —que es media clientela— vería un mes entero de letras sueltas sin
        // forma de saber a qué horario corresponden. La maqueta hace lo mismo con el motivo del
        // descanso obligatorio: lo que no cabe en la celda no se borra, se mueve al puntero.
        title={compacta ? [rotulo.texto, horas].filter(Boolean).join(' · ') : undefined}
        className={`rounded-xl border-[1.5px] border-transparent ${
        compacta
          ? 'grid h-[26px] w-full place-items-center rounded-lg px-0.5 text-[11px] font-extrabold'
          : 'flex min-h-[36px] flex-col justify-center px-2 py-1.5'} ${tono}${bordeMarcado}`}>
        {/* EN EL MES VA EL CÓDIGO CORTO, como en la maqueta, y no el nombre. Medido antes de tocarlo:
            con el nombre entero la tabla de un mes pesaba más de tres mil píxeles dentro de un
            contenedor de mil, o sea que para llegar a la última semana había que raspar a lo ancho.
            Partirlo en dos renglones ayudaba, pero seguía mandando el nombre más largo del catálogo.

            EL NOMBRE NO SE PIERDE: va en el rótulo accesible del botón de la celda, en el panel del
            día y en la leyenda de colores que está encima de la rejilla. Y la letra no está sola: se
            pinta con el color del turno, así que una «M» amarilla y una «M» azul no se confunden.

            El `??` es la red para un día cuyo turno no esté en el catálogo cargado —una respuesta
            vieja en caché, un turno recién borrado—: antes que una celda muda, su inicial. */}
        {compacta ? codigo ?? rotulo.texto.charAt(0).toUpperCase() : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap">
              <span aria-hidden="true" className={`h-[7px] w-[7px] shrink-0 rounded-full ${punto}`} />
              {rotulo.texto}
            </div>
            {horas && <div className="text-[11px] tabular-nums opacity-[.78] whitespace-nowrap">{horas}</div>}
          </>
        )}
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
  if (!sePuedeAgregar) {
    // EN EL MES, UN CUADRO PUNTEADO Y NO UNA RAYA, como en la maqueta: un mes es una cuadrícula, y una
    // raya suelta entre cuadros rompe la retícula que deja contar días de un vistazo.
    return compacta
      ? <div className={`h-[26px] w-full rounded-lg border-[1.5px] border-dashed border-gray-200${bordeMarcado}`} />
      : <div className="py-1.5 text-center text-[11px] text-gray-300">—</div>;
  }

  // UNA CELDA VACÍA MARCADA DEJA DE OFRECER «AGREGAR» (28 de septiembre de 2026), como en la maqueta,
  // donde `.jornada.t-vacio.sel .n { display: none }`. El «+» es la invitación a poner algo; una celda
  // ya marcada no invita a nada, está esperando que se elija qué ponerle a todo el bloque. Y deja sitio
  // para que se vea el visto, que es lo que dice que está marcada.
  if (marcada) {
    return <div className={`border-[1.5px] border-dashed bg-primary-light ${
      compacta ? 'h-[26px] rounded-lg' : 'min-h-[36px] rounded-xl'}${bordeMarcado}`} />;
  }

  return (
    // SOLO EL «+», sin la palabra y sin relleno, como en la maqueta. La palabra «Agregar» ensanchaba
    // la columna para repetir lo que el signo ya dice, en TODAS las celdas vacías de la pantalla.
    <div className={`flex items-center justify-center border-[1.5px] border-dashed border-gray-300 text-gray-300 ${
      compacta ? 'h-[26px] rounded-lg' : 'min-h-[36px] rounded-xl'}${bordeMarcado}`}>
      <Plus size={14} className="shrink-0" />
      <span className="sr-only">Agregar</span>
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
  cuenta, catalogo, ocupado, puedeRotar, onTurno, onDescanso, onQuitar, onRotacion, onCancelar,
}: {
  cuenta: { total: number; personas: number; dias: number; pasadas: number; nombre: string | null };
  catalogo: TurnoDelCatalogo[];
  ocupado: boolean;
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
      // LA TARJETA ABRAZA SU CONTENIDO, NO OCUPA TODO EL ANCHO (28 de septiembre de 2026).
      //
      // Con `inset-x-3 mx-auto max-w-5xl` medía 1024 px siempre, llevara ocho turnos o una sola línea
      // que dice «1 jornada seleccionada». Una barra de lado a lado se lee como parte del armazón de
      // la pantalla; lo que esto es en realidad es un aviso de que hay algo marcado, y eso se lee
      // mejor en una tarjeta del tamaño de lo que dice.
      //
      // `w-max` + centrada a mano, como la maqueta. El tope es el ancho de la ventana menos los dos
      // márgenes: sin él, un catálogo largo la haría más ancha que la pantalla.
      className="fixed bottom-3 left-1/2 z-[60] !mt-0 w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200">
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
        {/* EL TOPE DE 330 px VA JUNTO CON EL `w-max` DE LA TARJETA, no es un adorno aparte. Mientras
            la tarjeta medía 1024 px fijos, el carril se encogía contra ese borde y las flechas
            aparecían solas cuando el catálogo no cabía. Con la tarjeta abrazando su contenido ya no
            hay contra qué encogerse: el carril pediría el ancho de todas las pastillas, la tarjeta
            crecería hasta el tope de la ventana y las flechas no saldrían nunca. El tope es el mismo
            de la maqueta. */}
        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:max-w-[330px] sm:flex-1">
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
        {/* LA RAYA SOLO DESDE `sm`, y no es un descuido: el comentario de arriba ya había decidido que
            apiladas no se separan con una raya vertical, porque una raya horizontal entre dos filas no
            dice «estas tres son otra cosa», dice «aquí se parte la tarjeta». En fila sí separa, que es
            lo que hace la maqueta: el catálogo cambia de empresa a empresa y estas tres son siempre
            las mismas, y sin raya se leen como ocho botones seguidos. */}
        <div className="flex shrink-0 flex-wrap items-stretch justify-center gap-1.5 sm:border-l sm:border-gray-200 sm:pl-3">
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

      {/* POR DÓNDE VA YA NO SE DICE AQUÍ (28 de septiembre de 2026): lo dice su propia ventana, con
          el porcentaje, los bloques y el botón de detener. Tenerlo en dos sitios es como se
          desincronizan. */}
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
        className="hp-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 pt-5 pb-4">
          <h3 className="text-xl font-extrabold text-ink">Rotación de {nombre}</h3>
          <p className="mt-1 text-sm text-muted">
            Se aplica sobre los días que tienes marcados, semana tras semana.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tipo de rotación</span>
            {/* DOS POR DOS Y GRANDES, como en la maqueta, y no cuatro en fila. Con cuatro columnas
                cada tarjeta se queda en unos setenta píxeles: el nombre del patrón entra, pero «6 de
                trabajo, 1 de descanso» —que es lo único que explica QUÉ es un 6x1— se parte en tres
                renglones minúsculos. Es una elección que se hace una vez y hay que poder leerla. */}
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(Object.keys(ROTACIONES) as PatronDeRotacion[]).map(patron => (
                <button key={patron} type="button" aria-pressed={rot.patron === patron}
                  onClick={() => onPatron(patron)}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    rot.patron === patron
                      ? 'border-primary-dark bg-primary-light text-ink'
                      : 'border-gray-200 text-muted hover:border-gray-300'}`}>
                  <span className="block text-base font-extrabold text-ink">{patron}</span>
                  <span className="block text-[12px] leading-tight">
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
                  // GRANDES, como en la maqueta: esta lista es la que se mira para elegir, y una
                  // pastilla de doce píxeles con su punto de color al lado no deja distinguir un turno
                  // de otro de un vistazo, que es justo para lo que sirve el color.
                  className={`rounded-xl px-3 py-2 text-[13px] font-bold ring-2 transition-colors ${
                    rot.plantillaId === t.id
                      ? `${CLASES_COLOR[normalizarColor(t.color)]} ring-ink/70`
                      : 'bg-gray-100 text-muted ring-transparent'}`}>
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
                    // CAJAS LEGIBLES, como en la maqueta: la inicial arriba y el número grande
                    // debajo. Antes eran tres renglones de diez píxeles —inicial, número y una T o una
                    // D— y había que acercarse a la pantalla para leer en qué día arranca el ciclo,
                    // que es la única pregunta que esta tira contesta.
                    // CADA CAJA DICE SI ESE DÍA TRABAJA O DESCANSA, y no solo con el color.
                    //
                    // La maqueta lo deja al color, y copiarlo tal cual sería copiar un defecto: correr
                    // el arranque del ciclo es un botón cuyo ÚNICO efecto sería un cambio de tono, así
                    // que quien no distinga bien los colores no vería que pasó nada. Con el nombre
                    // accesible, además, una prueba puede afirmar el SIGNIFICADO y no un texto suelto.
                    <div key={fecha}
                      aria-label={`${rotuloCorto(fecha)}: ${
                        !entra ? 'no entra en el envío' : trabaja ? 'trabaja' : 'descansa'}`}
                      className={`w-10 shrink-0 rounded-lg px-1 py-1.5 text-center leading-tight ${
                        !entra ? 'bg-gray-50 text-gray-300'
                          : trabaja ? 'bg-primary-light text-ink' : 'bg-gray-200 text-muted'}`}>
                      <div className="text-[11px] font-bold">{inicialDeDia(fecha)}</div>
                      <div className="text-sm font-extrabold tabular-nums">{Number(fecha.slice(8, 10))}</div>
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
// POR DÓNDE VA EL ENVÍO, en su propia ventana (28 de septiembre de 2026).
//
// Antes era una línea dentro de la tarjeta: «Bloque 2 de 7 · no cierres esta ventana». Con siete
// bloques informa; con treinta, quien mira no sabe si va por la mitad o por el final. Y sobre todo no
// había forma de PARAR: un mes para veinte personas son cien bloques en serie, y una vez arrancado no
// quedaba más que esperar o cerrar el navegador.
//
// LAS CUENTAS NO SE HACEN AQUÍ. El porcentaje, los círculos y si terminó o se cortó los decide
// `estadoDelProgreso`, que es puro y está probado y mutado: de ese número depende que alguien espere o
// detenga, y un porcentaje sobre el denominador equivocado no se ve mal, se ve plausible.
function VentanaDeProgreso({
  estado, escritas, total, detenido, sePuedeDeshacer, onDetener, onDeshacer, onCerrar,
}: {
  estado: ReturnType<typeof estadoDelProgreso>;
  escritas: number;
  total: number;
  detenido: boolean;
  // Hay una foto del antes que revertir. Falso cuando lo que acaba de correr YA era un deshacer.
  sePuedeDeshacer: boolean;
  onDetener: () => void;
  onDeshacer: () => void;
  onCerrar: () => void;
}) {
  const acabo = estado.terminado || estado.cortado;

  return (
    <div className="fixed inset-0 !mt-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Cómo va la programación"
        className="hp-pop w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          {/* EL ICONO DICE EL FINAL DE UN VISTAZO, y «se detuvo» no es «listo»: uno dejó todo escrito
              y el otro dejó jornadas sin escribir. */}
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
            estado.cortado ? 'bg-rose-100 text-rose-700'
              : estado.terminado ? 'bg-emerald-100 text-emerald-700'
                : 'bg-primary-light text-ink'}`}>
            {estado.cortado ? <AlertTriangle size={20} /> : estado.terminado ? <Check size={20} /> : <Clock size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-ink">
              {estado.cortado ? 'Se detuvo' : estado.terminado ? 'Listo' : 'Programando'}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {estado.cortado ? 'Lo que alcanzó a escribirse se quedó escrito.'
                : estado.terminado ? 'Puedes cerrar esta ventana cuando quieras.'
                  : 'No cierres esta ventana.'}
            </p>
          </div>
          {/* EL PORCENTAJE SOLO SE PONE VERDE SI TERMINÓ DE VERDAD: en un envío cortado, el verde
              diría «todo bien» sobre una escritura incompleta. */}
          <span className={`ml-auto text-2xl font-extrabold tabular-nums ${
            estado.terminado ? 'text-emerald-700' : 'text-muted'}`}>
            {estado.pct}%
          </span>
        </div>

        {/* UN CÍRCULO POR BLOQUE, y con más de diez se esconden y manda la barra: cien circulitos no
            informan de nada. La regla la decide el módulo puro, aquí solo se dibuja. */}
        {estado.seVenLosPasos ? (
          <div className="mt-5 flex items-center" aria-hidden="true">
            {estado.pasos.map((paso, i) => (
              <Fragment key={i}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                  paso === 'HECHO' ? 'bg-emerald-600 text-white'
                    : paso === 'EN_CURSO' ? 'bg-primary text-ink ring-4 ring-primary/40'
                      : 'bg-gray-200 text-gray-500'}`}>
                  {paso === 'HECHO' ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                {i < estado.pasos.length - 1 && (
                  <span className={`h-1 flex-1 ${paso === 'HECHO' ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                )}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-200">
            <div className={`h-full rounded-full transition-all ${estado.terminado ? 'bg-emerald-600' : 'bg-primary'}`}
              style={{ width: `${estado.pct}%` }} />
          </div>
        )}

        {/* DOS CAJAS Y NO UNA LÍNEA, como en la maqueta: lo que se escribió y por dónde va el envío son
            dos datos distintos, y juntos en una línea de texto pequeño no se leen. */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-muted shadow-sm">
              <Check size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-none text-ink tabular-nums">{escritas}</span>
              <span className="block text-[11px] text-muted">
                {escritas === 1 ? 'jornada escrita' : 'jornadas escritas'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-muted shadow-sm">
              <Users size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-none text-ink tabular-nums">
                {estado.pasos.filter(p => p === 'HECHO').length} de {estado.pasos.length}
              </span>
              <span className="block text-[11px] text-muted">bloques enviados</span>
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted tabular-nums">de {jornadas(total)}</p>

        <div className="mt-5 flex items-center justify-end gap-3">
          {acabo ? (
            <>
              {/* DESHACER VA POR EL MISMO CAMINO: otro envío por bloques, con esta misma ventana. Y se
                  dice lo que NO puede devolver, porque prometer una marcha atrás completa cuando no lo
                  es sería peor que no ofrecerla. */}
              {sePuedeDeshacer && (
                <button type="button" onClick={onDeshacer}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink">
                  Deshacer esta programación
                </button>
              )}
              <button type="button" onClick={onCerrar}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-ink hover:bg-primary-dark">
                Cerrar
              </button>
            </>
          ) : (
            // DETENER AL TERMINAR EL BLOQUE, y lo dice con esas palabras: no corta lo que ya está en
            // vuelo, porque entonces nadie sabría cuáles de esas seis llegaron.
            <button type="button" onClick={onDetener} disabled={detenido}
              className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
              {detenido ? 'Se detendrá al terminar este bloque…' : 'Detener al terminar este bloque'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviaDeBloque({
  titulo, conteo, pisados, habituales, sinDescanso, sobreElTope, topeHoras, ocupado, onCancelar, onAplicar,
}: {
  titulo: string;
  conteo: { escribe: number; iguales: number; bloqueadas: number };
  pisados: { nombre: string; fecha: string }[];
  habituales: { nombre: string; antes: number; despues: number }[];
  sinDescanso: { nombre: string; lunes: string }[];
  sobreElTope: { nombre: string; lunes: string; minutos: number }[];
  // El tope viene de la jornada legal vigente, que la respuesta trae. No se escribe un 42 aquí: sube
  // o baja con la ley y esta ventana tiene que decir el número que de verdad rige.
  topeHoras: number;
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

          {/* LOS AVISOS SE SEPARAN A PROPÓSITO. Pintar sobre el descanso obligatorio puede terminar en
              recargo; cruzar a habitual cambia una obligación; una semana entera sin descanso no es un
              riesgo, es una infracción. Un solo aviso juntándolos los volvería ruido.

              ESTE VA PRIMERO por eso mismo: los otros dos dicen «esto te va a costar», y este dice
              «esto no se puede». Y es el único que ve el MES completo y no solo las celdas tocadas:
              una semana se completa marcando dos días sobre cinco que ya estaban, sin pisar nada. */}
          {sinDescanso.length > 0 && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-900">
                <AlertTriangle size={13} className="shrink-0" />
                Semanas que quedarían sin ningún descanso
              </p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-rose-900">
                {sinDescanso.map(s => (
                  <li key={`${s.nombre}|${s.lunes}`}>{s.nombre}, semana del {rotuloCorto(s.lunes)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* EL TOPE DE HORAS, que es semanal. Va junto al de arriba porque son de la misma familia:
              los dos dicen «esto no se puede», no «esto te va a costar». Y se dice EN CUÁNTO quedaría
              cada semana: «se pasa» sin el número obliga a ir a contarlo a mano. */}
          {sobreElTope.length > 0 && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-900">
                <AlertTriangle size={13} className="shrink-0" />
                Semanas que se pasarían del tope de {topeHoras} horas
              </p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-rose-900">
                {sobreElTope.map(s => (
                  <li key={`${s.nombre}|${s.lunes}`}>
                    {s.nombre}, semana del {rotuloCorto(s.lunes)}: <b>{horasDeMinutos(s.minutos)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

// Lo que separa dos toques para que cuenten como doble clic. Es el mismo de la maqueta.
const MS_DOBLE_CLIC = 400;

// De MAYOR a menor, como en la maqueta del dueño: Mes · Semana · Día. El orden no es decorativo,
// es el que deja «Semana» —el modo por defecto y el que más se usa— en el medio, donde cae el
// pulgar y donde la vista en blanco de la pista gris lo destaca.
// DE LO CHICO A LO GRANDE, como en la maqueta. `DIA` va primero porque la maqueta no lo tiene y el
// orden ascendente es el único que no obliga a inventarle un sitio.
//
// SIN QUINCENA, por decisión del dueño el 28 de septiembre de 2026: catorce columnas no son ni la
// semana, que se lee entera de un vistazo, ni el mes. Rompía la rejilla sin resolver nada.
const MODOS: ModoDeVista[] = ['DIA', 'SEMANA', 'MES'];

export default function CalendarioDeTurnos() {
  const [modo, setModo] = useState<ModoDeVista>('SEMANA');
  // A QUIÉN SE VE. La maqueta tiene estos tres desde el principio y la vista no los tenía: con doce
  // personas se vive sin ellos, con ciento cincuenta programarle a una obliga a recorrer la lista.
  const [filtros, setFiltros] = useState<FiltrosDeLaRejilla>({ texto: '', cargo: '', sedeId: '' });
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
  // EL DOBLE CLIC SE DETECTA A MANO, como en la maqueta, y no con el `dblclick` del navegador: ese
  // llega DESPUÉS de dos ciclos completos de pulsar y soltar, o sea cuando el rango ya se abrió con el
  // primer clic y se cerró con el segundo. Funcionaría de rebote, y de rebote significa que el día que
  // cambie el gesto de abajo, este deja de funcionar sin que nadie sepa por qué.
  const ultimoToque = useRef<{ clave: string; cuando: number } | null>(null);
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
  // EL MES DE TODA LA SELECCIÓN, para el veredicto de las semanas sin descanso de la previa.
  //
  // Se guarda CON EL MES AL QUE PERTENECE, y eso resuelve dos cosas de una. Una: no hay que limpiarlo
  // al cerrar la previa, así que el efecto no necesita un `setState` síncrono, que es lo que hace
  // saltar `react-hooks/set-state-in-effect`. Dos: un mes traído para septiembre no puede juzgar una
  // selección de octubre, porque el cálculo compara el mes guardado con el de la selección y si no
  // coinciden se calla. Sin eso habría un parpadeo de veredicto falso al cambiar de mes.
  const [mesDeLaPrevia, setMesDeLaPrevia] = useState<{ mes: string; filas: FilaDelCalendario[] } | null>(null);
  // POR DÓNDE VA EL ENVÍO, y se queda después de terminar: la ventana no se cierra sola.
  //
  // Lleva las JORNADAS además de los bloques porque el porcentaje se calcula sobre ellas: los bloques
  // no son iguales y el último puede llevar una o seis. Ver `progresoDelBloque`.
  // LOS AVISOS FLOTANTES. Los levanta `aplicarABloque` al terminar, y son la única manera de que el
  // «deshacer» siga a mano después de cerrar la ventana de progreso: hasta ahora, cerrarla dejaba
  // una escritura de cientos de filas sin marcha atrás visible en ninguna parte.
  //
  // El `id` es un contador y no la posición: la lista cambia mientras hay avisos en pantalla.
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteAviso = useRef(1);
  const avisar = (aviso: Omit<Aviso, 'id'>) =>
    setAvisos(previos => [...previos, { ...aviso, id: siguienteAviso.current++ }]);

  const [progreso, setProgreso] = useState<
    { bloquesHechos: number; bloques: number; escritas: number; total: number } | null
  >(null);
  // PEDIR DETENER ES UNA BANDERA QUE SE MIRA ENTRE BLOQUES, no dentro. Cortar a mitad de un bloque
  // dejaría seis peticiones en vuelo sin saber cuáles llegaron; al terminar el bloque, lo escrito está
  // escrito y lo que falta no se empezó.
  //
  // Un `ref` Y ADEMÁS un estado: el bucle lee el ref (un estado quedaría congelado en el valor que
  // tenía cuando arrancó), y el estado es lo que hace que el botón se vuelva a dibujar.
  const detener = useRef(false);
  const [detenido, setDetenido] = useState(false);
  // LO QUE HABÍA ANTES DEL ÚLTIMO ENVÍO, para poder deshacerlo. Son las celdas tal como la previa las
  // leyó, que es justo lo que `accionParaDeshacer` necesita.
  //
  // `null` significa «no hay nada que deshacer»: o no se ha aplicado nada, o lo último que corrió FUE
  // un deshacer. Deshacer un deshacer no se ofrece, porque eso es aplicar otra vez y llamarlo
  // «deshacer» mentiría sobre lo que el servidor hizo.
  const [loQueHabia, setLoQueHabia] = useState<CeldaParaPrevia[] | null>(null);
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
  // Y la PRIMERA de cada semana, que es donde va la raya que separa una de otra.
  //
  // Sale de `semanas`, que agrupa por lunes y está probada con mutación. La maqueta lo hace con
  // `i % 7 === 0`, o sea «de siete en siete desde la primera columna», y eso es la misma regla que ya
  // se rechazó para los totales semanales: en un rango que empieza a media semana la raya cae en la
  // columna equivocada y estaría diciendo que la semana corta por donde no corta.
  const abreSemana = new Set(semanas.map(s => s.fechas[0]));

  // LAS TRES SEÑALES DE UNA COLUMNA, en un solo sitio porque la rejilla las pregunta DOS veces —en el
  // encabezado y en la celda— y dos copias de la misma regla es peor que ninguna (CLAUDE.md §9.3).

  // PRECEDENCIA: «de otro mes» manda sobre «fin de semana». Un domingo de relleno es las dos cosas, y
  // lo primero que hay que ver es que ese día NO es del mes que dice el título.
  const fondoDeColumna = (fecha: string) => {
    if (enMes && esDeOtroMes(fecha, ancla)) return 'bg-gray-100';
    if (esFinDeSemana(fecha)) return 'bg-rose-50';
    return '';
  };

  // La raya solo entre semanas, nunca al principio: en la primera columna no separa nada de nada, y
  // en la vista de semana no hay dos semanas que separar.
  const corteDeSemana = (fecha: string) =>
    haySemanales && abreSemana.has(fecha) && fecha !== dias[0] ? 'border-l-2 border-gray-300' : '';

  // EL RÓTULO DE LA COLUMNA NOMBRA EL MES CUANDO EL DÍA ES DE OTRO. Sin esto, el «1» de este mes y el
  // «1» del siguiente se llaman igual —«Marcar el día 1 de todos»— y quien navega con lector de
  // pantalla oye dos columnas idénticas, una de las cuales escribe en un mes que no es el del título.
  //
  // Solo en el mes: ahí el título nombra UN mes y el relleno es la excepción. En la semana el título
  // ya dice el rango entero, y el mes del ancla es arbitrario.
  const rotuloDeColumna = (fecha: string) => {
    const numero = Number(fecha.slice(8, 10));
    return enMes && esDeOtroMes(fecha, ancla)
      ? `Marcar el día ${numero} de ${nombreDelMes(fecha)} de todos`
      : `Marcar el día ${numero} de todos`;
  };

  // La persona + los días + el total, MÁS una celda por semana cuando las hay. Era una constante con
  // un 9 escrito a mano, de cuando la rejilla siempre tenía siete días: con un día son 3 y con un mes
  // 33, y la fila de «Cargando…» habría dejado de abarcar la tabla. Ahora pasaría lo mismo con las
  // columnas semanales, así que se derivan y no se cuentan a ojo.
  const columnas = dias.length + 2 + (haySemanales ? semanas.length : 0);
  const hoy = hoyEnBogota();
  const etiquetaPeriodo = etiquetaDelPeriodo(modo, ancla, hoy);

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

  // TODAS las que respondió el servidor, y `filas` ya filtradas. La diferencia importa dos veces:
  //
  //   · LOS DESPLEGABLES SE LLENAN CON `todas`. Si se llenaran con las filtradas, al elegir «Supervisor»
  //     desaparecerían los demás cargos de la lista y no habría forma de volver.
  //   · `filas` es lo que recorre la REJILLA Y LA SELECCIÓN. Marcar una columna o arrastrar un
  //     rectángulo solo puede alcanzar a quien se está viendo, y eso es exactamente lo que hace la
  //     maqueta con `visibles()`.
  const todas = cargando ? [] : datos?.filas ?? [];
  const filas = quienSeVe(todas, filtros);
  // Los cargos que de verdad hay, sin repetir y sin los vacíos: hay gente sin cargo puesto.
  const cargosQueHay = [...new Set(todas.map(f => f.cargo).filter((c): c is string => Boolean(c)))].sort();
  // Las sedes que de verdad hay. Por `Map` y no por `Set`: son objetos, y dos personas de la misma sede
  // traen dos objetos distintos con el mismo id.
  //
  // `?? []` NO ES DEFENSA PARANOICA: una respuesta vieja en caché, o un backend anterior al 28 de
  // septiembre de 2026, no trae este campo, y sin la guarda `flatMap` revienta y la pantalla entera se
  // queda EN BLANCO. Quedarse sin filtro de sede es mucho menos grave que quedarse sin calendario.
  const sedesQueHay = [...new Map(todas.flatMap(f => f.sedes ?? []).map(s => [s.id, s])).values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
  // AQUÍ VIVÍA `trabajaronSuDescanso`, que alimentaba una tarjeta propia. Esa tarjeta se quitó el 28
  // de septiembre de 2026 al pasar a las seis de la maqueta, y con ella el contador.
  //
  // Lo que NO se pierde, porque era lo que de verdad importaba: la alarma del compensatorio, que
  // ahora es la nota de «descansos marcados». Y el hallazgo que dejó aquel comentario queda dicho,
  // porque cuesta de encontrar: `descansosConTurno` es lo PROGRAMADO y `descansoHabitual.trabajados`
  // es lo que ocurrió con marcación. Medido contra la base el 21 de septiembre de 2026, los dos
  // conjuntos resultaron DISJUNTOS —3 programados y 0 trabajados en las mismas personas—, así que
  // usar el primero para decir «trabajaron» era falso.
  // Quiénes ya cruzaron a habitual. Es la única alarma de verdad: ahí la compensación en tiempo
  // deja de ser opcional. Uno o dos se pagan con recargo y no exigen nada más.
  const habituales = filas.filter(f => f.descansoHabitual.clase === 'HABITUAL').length;
  // LOS DOS NÚMEROS QUE LA MAQUETA TIENE Y LA VISTA NO: turnos programados y descansos marcados.
  //
  // El mes va en `null` fuera de la vista de mes, y eso no es pereza: una semana puede cruzar de mes
  // legítimamente —la del 28 de septiembre llega al 4 de octubre— y esos siete días SON la semana que
  // se está viendo. En el mes, en cambio, las columnas de los extremos son de otro mes y contarlas
  // inflaría los dos números con jornadas que el título ni nombra.
  //
  // `conteoDeTarjetas` y no `conteo`: ese nombre YA está tomado por el de la previa, unas líneas más
  // abajo. Dos variables casi iguales en el mismo archivo es como se confunden.
  const conteoDeTarjetas = conteoDeLaRejilla(
    filas.map(f => f.dias),
    modo === 'MES' ? ancla.slice(0, 7) : null,
  );
  // CUÁNTAS SEMANAS-PERSONA PASAN DEL TOPE (28 de septiembre de 2026).
  //
  // Antes esto contaba PERSONAS cuyo total del período pasaba de 42 h, y solo en la vista de semana:
  // en un mes son treinta jornadas, cualquiera pasa, y encender la alarma ahí habría pintado de ámbar
  // a la empresa entera diciendo algo falso. Por eso valía cero en mes, y con ello el aviso
  // desaparecía justo donde más jornadas se programan de una vez.
  //
  // La pregunta correcta era otra: no «cuántas personas se pasan en el mes» —que es falsa por
  // construcción— sino «cuántas SEMANAS se pasan», que es cierta en los dos modos porque el tope es
  // semanal. Hasta ahora no se podía calcular; con los totales por semana, sí.
  //
  // UN SOLO SIGNIFICADO PARA LOS DOS MODOS: en la vista de semana hay una sola semana, así que
  // «semanas-persona por encima» y «personas que se pasan» son el mismo número. No hace falta una
  // redacción por modo, que sería otra rama donde equivocarse.
  //
  // `topeAplica` NO se toca: sus otros dos usos comparan el TOTAL DE LA FILA, y ahí la regla de hoy
  // sigue siendo la correcta.
  const semanasSobreTope = filas.reduce((cuantas, fila) => {
    const minutosPorFecha = Object.fromEntries(fila.dias.map(d => [d.fecha, d.minutosEsperados]));
    return cuantas + semanas.filter(s => minutosDeLaSemana(s.fechas, minutosPorFecha) > tope * 60).length;
  }, 0);
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
  // `cuando` ES LA MARCA DE TIEMPO DEL EVENTO, y no `Date.now()` leído aquí dentro. Dos razones, y la
  // segunda es la que importa: el linter de React prohíbe llamar funciones impuras en el cuerpo de un
  // componente, y además el dato bueno es CUÁNDO OCURRIÓ EL CLIC, no cuándo alcanzó a ejecutarse el
  // manejador. Con la pestaña ocupada, esa diferencia puede ser de decenas de milisegundos.
  const iniciarArrastre = (celda: CeldaMarcada, cuando: number) => {
    // DOBLE CLIC: BORRA TODO Y DEJA SOLO ESA. Es el cuarto gesto de la maqueta y sirve para corregir
    // una selección grande sin empezar de cero. `cerrarRango` deja `arrastre.current` en nulo, así que
    // la escucha de `pointerup` sale sin hacer nada y este gesto no se pisa con el de marcar.
    const clave = claveDeCelda(celda);
    const antes = ultimoToque.current;
    if (antes && antes.clave === clave && cuando - antes.cuando < MS_DOBLE_CLIC) {
      ultimoToque.current = null;
      cerrarRango();
      setMarcadas({ [clave]: celda });
      return;
    }
    ultimoToque.current = { clave, cuando };

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

  // FILTRAR LIMPIA LO MARCADO, igual que en la maqueta, y no es cosmética: sin esto quedarían celdas
  // marcadas de gente que dejó de verse, y al aplicar se les escribirían jornadas a personas que quien
  // programa ni siquiera tenía en pantalla.
  const cambiarFiltro = (cambio: Partial<FiltrosDeLaRejilla>) => {
    setFiltros(antes => ({ ...antes, ...cambio }));
    limpiarMarcadas();
  };

  // CAMBIAR DE PERÍODO LIMPIA LO MARCADO (28 de septiembre de 2026).
  //
  // Salió de ver 87 jornadas armadas en pantalla que nadie había marcado a propósito, en una página
  // recién cargada y solo tras pasar a la vista de mes. Sea cual sea el gesto que las creó, el
  // peligro es el mismo y no depende de saberlo: una selección hecha sobre UN período no puede seguir
  // armada en OTRO, donde las columnas ni siquiera son las mismas. Lo que se ve marcado y lo que está
  // marcado tienen que coincidir, porque de la tarjeta a escribir hay un solo clic.
  //
  // SE LIMPIA AQUÍ Y NO EN UN EFECTO atado al rango, que fue el primer intento: el linter lo rechazó
  // con `react-hooks/set-state-in-effect` y tenía razón, porque así React dibuja una vez con la
  // selección vieja y vuelve a dibujar al limpiarla. Este archivo ya sigue ese idioma en otro sitio
  // (`cargando` se DERIVA en vez de guardarse, por esta misma regla).
  //
  // Y pasan por AQUÍ los cuatro caminos que cambian el período —el selector de modo y las tres
  // flechas, «Hoy» incluida—, en vez de repetir la limpieza en cada manejador: un quinto camino
  // tendría que pasar por uno de estos dos, y si alguien llama a `setModo` o `setAncla` a pelo se ve
  // a simple vista (CLAUDE.md §9.3).
  const verEnModo = (nuevo: ModoDeVista) => { setModo(nuevo); limpiarMarcadas(); };
  const irAlPeriodo = (nueva: string | ((anterior: string) => string)) => {
    setAncla(nueva);
    limpiarMarcadas();
  };

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
      // El tipo DECLARADO de la respuesta. A un rotativo este aviso no le aplica: el motivo está en
      // `cruzanAHabitual`, que es quien lo decide.
      descansoRotativo: filas.find(f => f.id === colaboradorId)?.descanso.tipo === 'ROTATIVO',
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

  // El mes que se está programando sale de LO MARCADO y no del período en pantalla: se puede estar
  // viendo una semana que cruza de mes, y el veredicto tiene que hablar del mes al que pertenece lo
  // que se va a escribir.
  //
  // «El mes que pone más días» y no «el del primero»: la rejilla de un mes empieza en el lunes de su
  // primera semana, así que marcar la fila entera de alguien en septiembre incluye el 31 de agosto y
  // con la regla vieja el veredicto entero hablaba de agosto. Está contado en `mesQueSePrograma`.
  const mesDeLaSeleccion = mesQueSePrograma(seleccion.map(c => c.fecha)) ?? hoy.slice(0, 7);
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

  // EL MISMO VEREDICTO, PERO PARA CUALQUIER ENVÍO Y PARA TODA LA SELECCIÓN (28 de septiembre de 2026).
  //
  // Hasta ahora esto solo existía dentro de la ventana de rotación, y eso es media foto: marcar siete
  // días seguidos con un turno cualquiera deja la semana entera trabajada igual que un ciclo mal
  // cuadrado, y nadie decía nada. El aviso de «pintarías sobre el descanso obligatorio» no lo ve,
  // porque solo mira las celdas que se tocan: una semana que ya venía con cinco días trabajados se
  // completa marcando los otros dos sin que ninguna celda pise nada.
  //
  // SE PIDE EL MES APARTE porque en pantalla puede haber solo una semana. Es UNA petición para todas
  // las personas: la ruta devuelve todas las filas del rango.
  const hayPendiente = pendiente !== null;
  useEffect(() => {
    if (!hayPendiente) return;
    let vivo = true;
    const primero = `${mesDeLaSeleccion}-01`;
    const ultimo = sumarDias(`${sumarDias(primero, 32).slice(0, 7)}-01`, -1);
    api.get('/turnos/calendario', { params: { desde: primero, hasta: ultimo } })
      .then(r => { if (vivo) setMesDeLaPrevia({ mes: mesDeLaSeleccion, filas: r.data.filas as FilaDelCalendario[] }); })
      // Sin el mes no se dice veredicto. Inventar uno sería peor que no darlo, que es lo mismo que ya
      // hace la ventana de rotación.
      .catch(() => { /* la previa se calla y sus otros avisos siguen saliendo */ });
    return () => { vivo = false; };
  }, [hayPendiente, mesDeLaSeleccion]);

  const semanasSinDescansoDelEnvio = (): { nombre: string; lunes: string }[] => {
    if (!pendiente || mesDeLaPrevia?.mes !== mesDeLaSeleccion) return [];
    // UN BORRADO NO SE JUZGA. Quitar lo pintado a mano deja el día como lo diga el horario de esa
    // persona, y eso el navegador no lo sabe: dar por hecho que queda igual podría APAGAR un aviso que
    // corresponde. Está explicado en `proyeccionDelBloque`, que ni siquiera admite ese caso.
    if (pendiente.clase === 'IGUAL' && pendiente.accion.tipo === 'QUITAR') return [];

    const salida: { nombre: string; lunes: string }[] = [];
    for (const colaboradorId of new Set(seleccion.map(c => c.colaboradorId))) {
      const suya = mesDeLaPrevia.filas.find(f => f.id === colaboradorId);
      if (!suya) continue;
      // Trabajado es tener turno encima, sea un día normal o su descanso con turno. La misma regla con
      // la que juzga la ventana de rotación, y la misma que espera `semanasSinDescanso`.
      const diasDelMes = suya.dias.map(d => ({
        fecha: d.fecha,
        trabajado: d.estado === 'TRABAJA' || d.estado === 'DESCANSO_TRABAJADO',
      }));
      const marcadasSuyas = seleccion.filter(c => c.colaboradorId === colaboradorId).map(c => c.fecha);
      const proyeccion = pendiente.clase === 'ROTACION'
        ? proyeccionDelMes({
          diasDelMes, marcadas: marcadasSuyas,
          rotacion: { patron: pendiente.patron, desfase: pendiente.desfase, primerDia: pendiente.primerDia },
          hoy,
        })
        : proyeccionDelBloque({
          diasDelMes, marcadas: marcadasSuyas,
          accion: pendiente.accion.tipo === 'TURNO' ? { tipo: 'TURNO' } : { tipo: 'DESCANSO' },
          hoy,
        });
      for (const lunes of semanasSinDescanso(proyeccion, mesDeLaSeleccion)) {
        salida.push({ nombre: nombreDe(colaboradorId), lunes });
      }
    }
    return salida;
  };

  // LAS SEMANAS QUE SE PASARÍAN DEL TOPE DE HORAS (28 de septiembre de 2026).
  //
  // Hermana del aviso de arriba y con el mismo motivo de fondo: el tope de la jornada legal es
  // SEMANAL. El total que la fila trae es del RANGO, así que en un mes pasa de 42 h por definición y
  // compararlo no significa nada; y mirando solo lo marcado tampoco se ve, porque una semana llega a
  // 56 h entre lo que ya estaba programado y los dos días que se marcan encima.
  //
  // LOS MINUTOS DE CADA TURNO LOS DA EL SERVIDOR (`minutosPorTurno`), no se calculan aquí: convertir
  // una franja en minutos exigidos lleva dentro el cruce de medianoche, el almuerzo no pagado y los
  // descansos no remunerados, y rehacerlo sería la segunda copia de la regla de la que salen las horas
  // extra (CLAUDE.md §9.3).
  const semanasSobreElTopeDelEnvio = (): { nombre: string; lunes: string; minutos: number }[] => {
    if (!pendiente || mesDeLaPrevia?.mes !== mesDeLaSeleccion) return [];
    // Un borrado no se juzga, por lo mismo que en el otro aviso: el día vuelve a lo que diga el
    // horario y eso el navegador no lo sabe.
    if (pendiente.clase === 'IGUAL' && pendiente.accion.tipo === 'QUITAR') return [];

    const salida: { nombre: string; lunes: string; minutos: number }[] = [];
    for (const colaboradorId of new Set(seleccion.map(c => c.colaboradorId))) {
      const suya = mesDeLaPrevia.filas.find(f => f.id === colaboradorId);
      if (!suya) continue;

      // QUÉ TURNO SE VA A PONER, y de ahí sus minutos PARA ESTA PERSONA.
      const plantillaId = pendiente.clase === 'ROTACION' ? pendiente.plantillaId
        : pendiente.accion.tipo === 'TURNO' ? pendiente.accion.plantillaId : null;
      // Un turno con horas inválidas no está en el mapa. Se SALTA esta persona en vez de contarlo como
      // cero: cero sería afirmar que ese turno no exige nada, y de eso no se sabe nada.
      const minutosDelTurno = plantillaId === null ? 0 : suya.minutosPorTurno?.[plantillaId];
      if (minutosDelTurno === undefined) continue;

      const diasDelMes = suya.dias.map(d => ({ fecha: d.fecha, minutos: d.minutosEsperados }));
      const marcadasSuyas = seleccion.filter(c => c.colaboradorId === colaboradorId).map(c => c.fecha);
      // UNA ROTACIÓN VALE DISTINTO CADA DÍA: turno unos, descanso otros. Por eso los minutos entran
      // como función de la fecha y no como un número, y por eso este aviso SÍ puede juzgar rotaciones
      // —que son el caso más peligroso, no el menos: un 6x1 de nueve horas son 54 h semanales.
      const minutosSiSePinta = (fecha: string): number => {
        if (pendiente.clase !== 'ROTACION') return minutosDelTurno;
        const toca = accionDelDia(
          pendiente.patron, pendiente.desfase, diasEntre(pendiente.primerDia, fecha),
        );
        return toca === 'TURNO' ? minutosDelTurno : 0;
      };

      const proyectados = minutosProyectados({ diasDelMes, marcadas: marcadasSuyas, minutosSiSePinta, hoy });
      for (const semana of semanasSobreElTope(proyectados, mesDeLaSeleccion, tope * 60)) {
        salida.push({ nombre: nombreDe(colaboradorId), lunes: semana.lunes, minutos: semana.minutos });
      }
    }
    return salida;
  };

  // ───────── APLICAR A TODO LO MARCADO, POR BLOQUES ─────────
  //
  // QUÉ SE ESCRIBE Y QUÉ NO lo decide `planDeEscritura`, y CÓMO SE PARTE lo decide `bloquesDe`: las
  // dos son puras y están probadas y mutadas. Aquí solo quedan las peticiones y lo que se le cuenta a
  // quien mira.
  //
  // SE INFORMA LO QUE FALLÓ, UNA A UNA. Escribir diecinueve de veinte y decir «listo» es exactamente
  // la forma en que esta pantalla mentiría: el servidor rechaza días sueltos con motivo propio («ya
  // empezó su jornada»), y ese motivo tiene que salir a la pantalla.
  // `celdas` entra por parámetro y ya no se lee la selección aquí dentro: es lo que permite que
  // DESHACER pase por esta misma máquina, con sus mismos bloques, su misma ventana y su mismo botón de
  // detener. Es lo que pidió el dueño con esas palabras: «un proceso parcial, no de inmediato».
  //
  // `paraDeshacer` es la foto del antes, o `null` cuando lo que corre YA es un deshacer.
  const aplicarABloque = async (
    celdas: readonly CeldaMarcada[],
    accionDe: (celda: CeldaMarcada) => AccionDeEscritura,
    paraDeshacer: CeldaParaPrevia[] | null,
  ) => {
    const plan = planDeEscritura(celdas, accionDe, hoy);
    const bloques = bloquesDe(plan.escribe, EN_VUELO);
    setResultado(null);
    setGuardando(true);
    detener.current = false;
    setDetenido(false);

    // EL «ANTES», SOLO DE LO QUE DE VERDAD SE VA A ESCRIBIR. Un día que quedó bloqueado por haber
    // pasado nadie lo tocó, así que meterlo aquí haría que deshacer escribiera sobre algo que no
    // cambió. Se guarda ANTES de empezar, porque al terminar la selección se limpia.
    const escritas0 = new Set(plan.escribe.map(e => `${e.colaboradorId}|${e.fecha}`));
    // EN UNA VARIABLE LOCAL Y NO SOLO EN EL ESTADO. El aviso que se levanta al final lleva el
    // «deshacer» dentro, y su función queda cerrada sobre ESTA pasada: si leyera `loQueHabia`,
    // leería el valor de la pintada anterior y desharía el envío de antes. Es la trampa clásica de
    // un cierre sobre estado de React, y aquí costaría cientos de filas mal escritas.
    const elAntes = paraDeshacer === null
      ? null
      : paraDeshacer.filter(c => escritas0.has(`${c.colaboradorId}|${c.fecha}`));
    setLoQueHabia(elAntes);

    let escritas = 0;
    const fallos: string[] = [];
    // Estado de ARRANQUE explícito: la ventana se reutiliza entre envíos, y sin esto el segundo
    // empezaría mostrando el «Listo» del primero.
    setProgreso({ bloquesHechos: 0, bloques: bloques.length, escritas: 0, total: plan.escribe.length });
    try {
      for (let i = 0; i < bloques.length; i++) {
        // SE MIRA ANTES DE EMPEZAR EL BLOQUE, no dentro: lo que se empieza se termina, así que al
        // detenerse nadie queda con seis peticiones en vuelo de las que no se sabe cuáles llegaron.
        if (detener.current) break;
        // `allSettled` y no `all`: con `all`, la primera negativa aborta el bloque y las otras cinco
        // quedarían escritas o no según el azar de la red, sin que nadie pueda saber cuáles.
        const idas = await Promise.allSettled(
          bloques[i].map(e => escribirDia(e.colaboradorId, e.fecha, e.accion)),
        );
        for (const ida of idas) {
          if (ida.status === 'fulfilled') escritas++;
          else fallos.push(motivoDe(ida.reason, 'No pudimos guardar ese día.'));
        }
        setProgreso({
          bloquesHechos: i + 1, bloques: bloques.length, escritas, total: plan.escribe.length,
        });
      }
    } finally {
      // `progreso` NO se limpia aquí, y esa es la diferencia con antes: la ventana se queda con su
      // estado final hasta que la cierre una persona. Cerrándola sola, el final se veía como un
      // parpadeo y nadie alcanzaba a leer cuánto se escribió.
      setGuardando(false);
    }

    setResultado({ escritas, bloqueadas: plan.bloqueadas, fallos });
    setMarcadas({});
    setRecarga(n => n + 1);

    // EL AVISO, como en la maqueta. Dice lo mismo que la ventana, pero sobrevive a cerrarla, y por
    // eso lleva el deshacer dentro cuando hay algo que deshacer.
    //
    // `paraDeshacer === null` significa que lo que acaba de correr YA era un deshacer: entonces el
    // aviso no ofrece deshacer —eso sería aplicar otra vez— y dice que se volvió atrás.
    const cortado = detener.current && escritas < plan.escribe.length;
    const conFallos = fallos.length > 0;
    // EL AVISO DICE LO QUE PASÓ DE VERDAD, no «aplicada» a secas. Se detuvo, falló algo, o quedaron
    // días fuera por haber pasado: las tres cosas caben a la vez y las tres cambian lo que hay que
    // hacer después. Un «listo» sobre un envío con negativas del servidor es la clase de mentira
    // plausible de la que habla el encabezado del CLAUDE.md.
    const detalle = [
      `${jornadas(escritas)} ${cortado ? 'alcanzaron a escribirse' : 'escritas'}.`,
      cortado ? 'Lo demás quedó sin tocar.' : null,
      plan.bloqueadas > 0 ? `${plan.bloqueadas} no se tocaron porque el día ya pasó.` : null,
      conFallos ? `${fallos.length} no se pudieron guardar.` : null,
    ].filter(Boolean).join(' ');

    if (paraDeshacer === null) {
      avisar({ tipo: 'ok', titulo: 'Programación deshecha', texto: 'Quedó como estaba antes de aplicar.' });
    } else {
      avisar({
        tipo: cortado || conFallos ? 'aviso' : 'ok',
        titulo: cortado ? 'Se detuvo la programación'
          : conFallos ? 'La programación terminó con errores'
            : 'Programación aplicada',
        texto: detalle,
        accion: elAntes && elAntes.length > 0
          ? { texto: 'Deshacer esta programación', al: () => deshacerElLote(elAntes) }
          : undefined,
      });
    }
  };

  // DESHACER ES OTRO ENVÍO POR BLOQUES, por la misma máquina y con la misma ventana. Cada celda
  // vuelve a lo que `accionParaDeshacer` diga de su foto anterior, y se pasa `null` como foto del
  // nuevo envío: deshacer un deshacer no se ofrece, porque eso es aplicar otra vez.
  //
  // LA FOTO ENTRA POR PARÁMETRO y no se lee del estado: la piden DOS sitios —el botón de la ventana
  // y la acción del aviso flotante—, y el segundo queda cerrado sobre la pasada en la que nació.
  // Leyendo el estado, cada uno desharía un envío distinto.
  const deshacerElLote = (antes: CeldaParaPrevia[]) => {
    const porClave = new Map(antes.map(c => [`${c.colaboradorId}|${c.fecha}`, c] as const));
    aplicarABloque(
      antes.map(c => ({ colaboradorId: c.colaboradorId, fecha: c.fecha })),
      celda => {
        const suya = porClave.get(`${celda.colaboradorId}|${celda.fecha}`);
        // No puede faltar: las celdas salen de esa misma foto. Se comprueba igual porque el tipo lo
        // permite, y adivinar aquí escribiría algo que nadie pidió.
        return suya ? accionParaDeshacer(suya) : { tipo: 'QUITAR' };
      },
      null,
    );
  };

  // LA VISTA DE DÍA EN HORAS (22 de septiembre de 2026). Pedido del dueño: «que no vea arriba la M
  // de martes 22, sino las horas, y que la barra vaya del color del turno desde la hora de inicio
  // hasta la hora de fin».
  //
  // El eje se calcula con las jornadas de TODAS las personas de ese día, no con cada una por su
  // lado: si cada fila tuviera su propio eje, dos barras del mismo largo significarían horarios
  // distintos y la pantalla dejaría de poder compararse de un vistazo, que es para lo que sirve.
  // LOS CÓDIGOS CORTOS, uno por turno del catálogo. Se calculan de una porque la unicidad es una
  // propiedad del CONJUNTO: mirando un turno solo no se puede saber si su inicial ya está tomada.
  const codigosDeTurno = useMemo(() => codigosDelCatalogo(catalogo), [catalogo]);

  const enDia = modo === 'DIA';
  // El mes es el único modo donde el ancho aprieta: 42 columnas contra un contenedor de mil y pico.
  // Ver el comentario de `Celda` con la medida.
  const enMes = modo === 'MES';
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
    opciones?: {
      clase?: string;
      contenido?: (sePuedeAgregar: boolean) => React.ReactNode;
      // Si está marcada. Lo necesita la celda para esconder el «Agregar» del hueco.
      marcada?: boolean;
      apagada?: boolean;
    },
  ) => {
    const clase = opciones?.clase
      ?? 'w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-primary hover:opacity-80 transition-opacity';
    // `sePuedeAgregar` llega desde aquí y no desde quien llama: es el único sitio que sabe si este
    // día es pintable, y el hueco con el «+» solo se ofrece donde el servidor lo va a aceptar.
    const dibujar = opciones?.contenido
      ?? ((sePuedeAgregar: boolean) => (
        <Celda dia={dia} sePuedeAgregar={sePuedeAgregar} compacta={enMes}
          marcada={opciones?.marcada === true} apagada={opciones?.apagada === true}
          codigo={dia.turno ? codigosDeTurno[dia.turno.id] : undefined} />
      ));

    return dia.estado === 'DESCANSO_TRABAJADO' ? (
      <button type="button"
        aria-label={`Descanso trabajado de ${fila.nombre} ${fila.apellido}, día ${Number(dia.fecha.slice(8, 10))}`}
        // DOBLE CLIC, porque el clic simple ahora MARCA la celda (28 de septiembre de 2026). Los dos
        // gestos no caben en el mismo clic, y el de marcar es el que se usa a todas horas.
        // CLIC DERECHO, no doble clic (28 de septiembre de 2026): el doble clic pasó a ser el gesto de
        // la maqueta —«borra todo y deja solo esa»—, así que este panel necesitaba otro. El derecho es
        // el que ya significa «más opciones» en cualquier parte.
        onContextMenu={e => { e.preventDefault(); abrirDecision(fila, dia); }} className={clase}>
        {dibujar(false)}
      </button>
    ) : sePuedePintar(dia.fecha, hoy) ? (
      <button type="button"
        aria-label={`Turno de ${fila.nombre} ${fila.apellido}, día ${Number(dia.fecha.slice(8, 10))}`}
        // DOBLE CLIC, no clic simple: desde el 28 de septiembre de 2026 el clic marca la celda, que es
        // el gesto del trabajo diario. El panel con las tolerancias, el almuerzo y los descansos de
        // ESE día sigue estando, un gesto más adentro.
        // CLIC DERECHO, por lo mismo que arriba: el doble clic es ahora «deja solo esa».
        onContextMenu={e => {
          e.preventDefault();
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
      {/* LA CABECERA, COMO EN LA MAQUETA (28 de septiembre de 2026). Todo a la derecha y en dos filas:
          arriba el segmentado y la navegación, debajo la etiqueta de período.

          EL RANGO DEJÓ DE SER UN TÍTULO Y PASÓ A SER EL BOTÓN DEL MEDIO. No es un cambio de sitio
          cualquiera: ahí también ES el «ir a hoy», así que el texto que dice dónde estás es el mismo
          control que te devuelve. Y por eso cambió de formato a «28 sep – 4 oct 2026», que es de
          ancho estable: el largo cambiaba de tamaño según la semana y movía las flechas mientras
          alguien hacía clic repetido en ellas. */}
      <div className="mb-1 flex flex-col items-center gap-2 sm:items-end">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {/* DÍA · SEMANA · MES. `aria-pressed` y no un `select`: son opciones fijas y la
            encendida tiene que verse sin abrir nada. */}
        <div role="group" aria-label="Cómo se ve el calendario"
          className="flex items-center gap-[3px] rounded-xl bg-gray-200 p-[3px]">
          {MODOS.map(m => (
            <button key={m} type="button" onClick={() => verEnModo(m)} aria-pressed={modo === m}
              className={`rounded-[9px] px-4 py-1.5 text-[13px] transition-colors ${
                modo === m
                  ? 'bg-white text-ink font-extrabold shadow-sm'
                  : 'text-muted font-semibold hover:text-ink'}`}>
              {PERIODO[m].unidad}
            </button>
          ))}
        </div>

        {/* BLANCOS CON BORDE, como en la maqueta, y no grises: el gris del segmentado que va al lado
            es el fondo de un grupo de opciones, y usarlo también para los controles de navegación
            hacía que las dos cosas se leyeran como una sola pieza. */}
        <div className="flex items-center gap-2">
          {/* Las flechas se mueven en la UNIDAD DEL MODO, y lo dicen: en un mes, «Semana anterior»
              sería una etiqueta falsa para quien navega con lector de pantalla. */}
          <button type="button" onClick={() => irAlPeriodo(a => moverVista(modo, a, -1))}
            aria-label={`${PERIODO[modo].unidad} anterior`}
            className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-gray-200 bg-white text-ink transition-colors hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          {/* EL RANGO ES EL BOTÓN DEL MEDIO, y también lleva a hoy. Dos controles que hacen lo mismo
              no es un descuido: uno se pulsa porque dice dónde estás, el otro porque dice a dónde
              vas, y la maqueta los tiene los dos. El ancho mínimo es lo que impide que las flechas
              bailen al cambiar de período. */}
          <button type="button" onClick={() => irAlPeriodo(hoy)}
            className="h-[38px] min-w-[200px] rounded-[11px] border border-gray-200 bg-white px-4 text-[13px] font-bold text-ink transition-colors hover:bg-gray-50">
            {vista.rotulo}
          </button>
          <button type="button" onClick={() => irAlPeriodo(a => moverVista(modo, a, 1))}
            aria-label={`${PERIODO[modo].unidad} siguiente`}
            className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-gray-200 bg-white text-ink transition-colors hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => irAlPeriodo(hoy)}
            className="h-[38px] rounded-[11px] border border-gray-200 bg-white px-[18px] text-[13px] font-bold text-ink transition-colors hover:bg-gray-50">
            Hoy
          </button>
        </div>
        </div>

        {/* DÓNDE ESTÁ PARADO EL CALENDARIO (28 de septiembre de 2026). El botón dice «28 sep – 4 oct
            2026» o «Septiembre de 2026», y eso no contesta la pregunta que uno se hace al llegar:
            ¿esto es la semana en curso, o me fui tres semanas adelante con las flechas? Programar en
            el período equivocado no se ve raro en pantalla; se ve igual que programar en el correcto.

            EN ÁMBAR CUANDO ES EL PERÍODO ACTUAL, como la maqueta y por decisión del dueño. Yo la
            había puesto en tinta negra con el argumento de no gastar el color de aviso en algo
            normal; queda constancia del argumento, no de la decisión. */}
        <div className={`text-[10px] font-extrabold uppercase tracking-[0.06em] ${
          etiquetaPeriodo.esActual ? 'text-amber-800' : 'text-muted'}`}>
          {etiquetaPeriodo.texto}
        </div>
      </div>

      {/* LA BARRA DE HERRAMIENTAS (28 de septiembre de 2026). Buscador, sede y cargo, como en la
          maqueta. No es adorno: lo que filtra es la lista que recorre la SELECCIÓN. */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-card border border-gray-200 bg-white p-2.5">
        <div className="relative min-w-[200px] flex-[2_1_240px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" aria-label="Buscar empleado" placeholder="Buscar empleado..."
            value={filtros.texto} onChange={e => cambiarFiltro({ texto: e.target.value })}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-gray-400 focus:border-primary-dark focus:outline-none" />
        </div>
        {/* El valor vacío es «todas», y por eso la opción va primero y sin id: un desplegable que
            empezara en una sede concreta escondería a media empresa sin que nadie lo hubiera pedido. */}
        {/* UN <select> NO ADMITE UN ICONO DENTRO, así que va encima de su zona izquierda y el campo se
            abre hueco con el relleno, igual que el buscador. `pointer-events-none` para que el icono
            no se coma el clic que tiene que abrir la lista. Es lo mismo que hace la maqueta. */}
        <div className="relative flex min-w-[165px] flex-1 items-center">
          <MapPin size={15} className="pointer-events-none absolute left-3 text-muted" />
          <select aria-label="Sede" value={filtros.sedeId} onChange={e => cambiarFiltro({ sedeId: e.target.value })}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm text-ink focus:border-primary-dark focus:outline-none">
            <option value="">Todas las sedes</option>
            {sedesQueHay.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="relative flex min-w-[165px] flex-1 items-center">
          <Briefcase size={15} className="pointer-events-none absolute left-3 text-muted" />
          <select aria-label="Cargo" value={filtros.cargo} onChange={e => cambiarFiltro({ cargo: e.target.value })}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm text-ink focus:border-primary-dark focus:outline-none">
            <option value="">Todos los cargos</option>
            {cargosQueHay.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* SEIS EN UNA TIRA (28 de septiembre de 2026, decisión del dueño): las CUATRO de la maqueta
          —personas, turnos programados, descansos marcados y semanas sobre el tope— más las dos que
          la vista ya tenía y ella no: horas programadas y promedio por persona.

          LA QUE SALE ES «trabajaron su descanso», y su alarma NO se pierde: el aviso de descanso
          habitual pasa a ser la nota de «descansos marcados», que es donde se lee en contexto. */}
      <div className="mb-3 flex flex-wrap items-stretch rounded-card border border-gray-200 bg-white px-0.5 py-1">
        <Tarjeta icono={Users} tinte="bg-indigo-50 text-indigo-600"
          valor={String(filas.length)} titulo="personas en la lista" />
        <Tarjeta icono={Calendar} tinte="bg-emerald-50 text-emerald-600"
          valor={String(conteoDeTarjetas.turnos)} titulo="turnos programados"
          nota={PERIODO[modo].enEl} />
        <Tarjeta icono={Moon} tinte="bg-primary-light text-[#8a6d1f]"
          valor={String(conteoDeTarjetas.descansos)} titulo="descansos marcados"
          // LA ALARMA DEL COMPENSATORIO SE MUDA AQUÍ al quitarse su propia tarjeta. Es la única de
          // verdad: uno o dos descansos trabajados se pagan con recargo, pero desde el tercero del mes
          // la compensación en tiempo deja de ser opcional (art. 181).
          nota={habituales > 0
            ? `${habituales} en descanso habitual: compensar en tiempo`
            : undefined}
          alerta={habituales > 0} />
        {/* EL RÓTULO NO CAMBIA ENTRE SEMANA Y MES, al revés que la maqueta, que dice «pasan de 42 h
            esta semana» en una y «semanas por encima» en la otra. «Semanas por encima» es cierto en
            los dos casos —en una semana el número es cero o uno— y evita una rama más donde
            equivocarse. El tope sale de la jornada legal vigente, no escrito aquí. */}
        <Tarjeta icono={AlertTriangle} tinte="bg-red-50 text-red-600" valor={String(semanasSobreTope)}
          titulo={`semanas por encima de ${tope} h`}
          nota={semanasSobreTope > 0 ? undefined : `tope legal ${tope} h semanales`}
          alerta={semanasSobreTope > 0} />
        <Tarjeta icono={Clock} tinte="bg-sky-50 text-sky-600"
          valor={horasDeMinutos(minutosTotales)} titulo="horas programadas" nota={PERIODO[modo].enEl} />
        <Tarjeta icono={Scale} tinte="bg-violet-50 text-violet-600"
          valor={horasDeMinutos(promedio)} titulo="promedio por persona" />
      </div>

      {/* LA LEYENDA DE COLORES, que la maqueta tiene y la vista no tenía. Sin ella, el color de una
          celda no se puede leer: hay que abrir el día para saber qué turno es.

          SALE DEL CATÁLOGO y no de una lista escrita a mano: los turnos son de cada empresa. El punto
          usa `PUNTO_COLOR`, el mismo relleno entero de la pastilla del carril, y no `CLASES_COLOR`,
          que es un par fondo claro + texto oscuro pensado para llevar el nombre escrito ENCIMA: en un
          círculo vacío los ocho colores se verían casi iguales.

          «Descanso» va aparte y en gris fijo: no es un turno del catálogo, es una acción sobre el día. */}
      {catalogo.length > 0 && (
        <ul aria-label="Colores de los turnos"
          className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {catalogo.map(turno => (
            <li key={turno.id} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${PUNTO_COLOR[normalizarColor(turno.color)]}`} />
              {turno.nombre}
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-[11px] text-muted">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
            Descanso
          </li>
        </ul>
      )}

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
              <th className="sticky left-0 bg-white z-10 w-px whitespace-nowrap text-left text-xs font-bold text-muted px-4 py-3">
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
                  {/* El MÍNIMO de la columna, que es lo que de verdad fija el ancho de la tabla: 42
                      columnas de 96 px son 4001 px contra un contenedor de 1006. En el mes baja a 56
                      porque la celda ya no lleva horario y el nombre se recorta. Sigue habiendo
                      desplazamiento horizontal —cerrarlo del todo pide un nombre corto por turno, que
                      no existe en el catálogo—, pero de cuatro pantallas pasa a algo más de dos. */}
                  <th className={`py-3 text-center ${enMes ? 'px-0.5 min-w-[38px]' : 'px-1.5 min-w-[75px]'} ${fondoDeColumna(fecha)} ${corteDeSemana(fecha)}`}>
                    {/* EL ENCABEZADO MARCA LA COLUMNA ENTERA: ese día de todo el mundo. Es el gesto
                        con el que se programa una jornada completa —un domingo, un festivo— sin
                        recorrer la lista persona por persona. Vuelve a tocarse y se desmarca, porque
                        marcar una columna por error no puede obligar a limpiar todo. */}
                    <button type="button" onClick={() => marcarColumna(fecha)}
                      aria-label={rotuloDeColumna(fecha)}
                      className="w-full rounded-lg px-1 py-0.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary">
                      {/* Sale de la FECHA y no del número de columna: con `[i]`, de la octava columna
                          en adelante el encabezado salía en blanco.

                          TRES LETRAS EN LA SEMANA Y UNA EN EL RESTO, como en la maqueta. Con la
                          inicial sola, lunes y martes son «L» y «M» pero martes y miércoles son «M»
                          y «M»: en la mitad de las columnas hay que contar desde la izquierda para
                          saber en qué día se está pintando. En la semana sobra ancho para las tres;
                          en un mes de cuarenta y dos columnas, no. */}
                      <div className={`text-xs font-semibold ${esHoy ? 'text-ink' : 'text-muted'}`}>
                        {modo === 'SEMANA' ? abreviaturaDeDia(fecha) : inicialDeDia(fecha)}
                      </div>
                      {/* HOY, EN UNA PÍLDORA OSCURA, como en la maqueta (medido allí: fondo #303030,
                          texto blanco, radio completo). Poner hoy en negrita y ya es una diferencia
                          que hay que buscar comparando siete columnas entre sí; la píldora se ve sin
                          comparar nada, que es lo que tiene que hacer la referencia de «dónde estoy». */}
                      <div className="text-sm tabular-nums">
                        <span className={esHoy
                          ? 'inline-block rounded-full bg-ink px-2.5 py-0.5 font-bold text-white'
                          : 'text-muted'}>
                          {Number(fecha.slice(8, 10))}
                        </span>
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
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-muted">
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
                        {/* «Guarda · Centro», como en la maqueta. Los dos datos faltan por separado, y aquí una
                            persona puede tener VARIAS sedes, cosa que la maqueta no contempla: la línea la arma
                            `cargoYSede`, que está probada. */}
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[11px] text-muted">{cargoYSede(fila)}</span>
                          {/* EL AVISO DE DESCANSOS TRABAJADOS, pegado al nombre como en la maqueta. El dato ya
                              existía pero solo como un número en la tarjeta de arriba: decía que hay tres y no
                              quiénes son, así que para encontrarlos había que abrir persona por persona.
                              `shrink-0` para que sea el cargo el que se recorte y no el aviso: si se recortan
                              los dos, lo que se pierde es la palabra que dice cuánto cuesta. */}
                          {(() => {
                            const aviso = avisoDeDescansos(fila.descansoHabitual);
                            if (!aviso) return null;
                            return (
                              <span className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${
                                aviso.grave ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>
                                <AlertTriangle size={9} aria-hidden="true" className="shrink-0" />
                                {aviso.texto}
                              </span>
                            );
                          })()}
                        </div>
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
                        onPointerDown={e => iniciarArrastre(suya, e.timeStamp)}
                        onPointerOver={() => extenderArrastre(suya)}
                        // MARCADA Y FONDO DE COLUMNA SON EXCLUYENTES A PROPÓSITO. Los dos son un
                        // `background-color`, así que entre `bg-primary/20` y `bg-rose-50` no gana el
                        // que se escriba después aquí, sino el que Tailwind ponga después en su hoja.
                        // Emitir los dos dejaría al azar si un sábado marcado se ve marcado.
                        // EL FONDO DE LA COLUMNA YA NO COMPITE CON LO MARCADO: marcada se dice con el
                        // anillo de abajo, que se ve igual sobre cualquier color de turno. Antes era un
                        // `bg-primary/20` aquí, y encima había que hacerlo excluyente con el fondo del
                        // fin de semana porque los dos eran `background-color`.
                        className={`align-middle ${enMes ? 'px-0.5 py-1' : 'px-1 py-1'} ${corteDeSemana(dia.fecha)} ${fondoDeColumna(dia.fecha)}`}>
                        {/* TRES CASOS Y NO DOS (22 de septiembre de 2026).
                            Un DESCANSO TRABAJADO abre su propio modal, y NO mira `sePuedePintar`:
                            por definición ya ocurrió, así que es pasado o de hoy, y colgándolo del
                            botón de pintar —que es solo hacia adelante— casi ninguno sería alcanzable.
                            Decidir la compensación de un día pasado es legítimo; repintarlo no.

                            Los demás siguen igual: solo los pintables son botones. Ofrecer un clic
                            que el servidor va a rechazar con un 400 es peor que no ofrecerlo. */}
                        {/* MARCADA SE VE COMO EN LA MAQUETA: borde ámbar con halo alrededor de la
                            celda y el visto DENTRO, arriba a la derecha. Antes era un visto flotando
                            fuera del borde y un fondo suave en la celda de la tabla; sobre el color de
                            un turno ese fondo se perdía, y el visto por fuera se leía como un adorno
                            pegado y no como el estado de la celda.

                            El anillo va aquí y no en cada rama de `Celda`: son cuatro ramas y cuatro
                            copias del mismo borde se separan a la primera. */}
                        {/* UNA CELDA YA PASADA SE VE MARCADA PERO APAGADA, como en la maqueta
                            (`.jornada.bloqueada.sel`): sin halo, en tono apagado y con el visto gris.
                            Está dentro de la selección —el rectángulo la abarca— pero NO se va a
                            escribir, y la previa lo dice aparte: «no se tocan porque el día ya pasó».
                            Pintarla igual que las demás prometería una escritura que no va a ocurrir. */}
                        {/* SOLO EL HALO, SIN ANILLO. El contorno lo pinta la propia celda cambiando
                            el color de SU borde; poner además un anillo aquí dibujaba DOS contornos
                            concéntricos, uno sólido y otro punteado. Es el halo translúcido de la
                            maqueta, que no se lee como un borde.

                            Una celda ya pasada no lleva halo: está dentro de la selección pero NO se
                            va a escribir, y prometer lo contrario con el mismo destaque sería mentir.
                            La previa lo dice aparte. */}
                        <div className={`relative rounded-xl ${
                          !marcada ? ''
                            : sePuedePintar(dia.fecha, hoy)
                              ? 'shadow-[0_0_0_2.5px_rgba(240,198,63,0.4)]'
                              : 'opacity-60'}`}>
                          {celdaDeDia(fila, dia, { marcada, apagada: !sePuedePintar(dia.fecha, hoy) })}
                          {marcada && (
                            <span aria-hidden="true"
                              className={`absolute grid place-items-center ${
                                esCeldaVacia(dia)
                                  ? 'inset-0 m-auto h-6 w-6 rounded-lg'
                                  : 'right-1 top-1 h-4 w-4 rounded'} ${
                                sePuedePintar(dia.fecha, hoy) ? 'bg-primary-dark text-ink' : 'bg-gray-300 text-gray-600'}`}>
                              <Check size={esCeldaVacia(dia) ? 16 : 11} strokeWidth={3} />
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
                        // `whitespace-nowrap` POR LA MISMA RAZÓN QUE EL TOTAL DE LA SEMANA: sin él,
                        // «6,8 h» se parte en dos renglones en esta columna estrecha, y una sola celda
                        // que envuelve estira la FILA ENTERA del mes. Es el mismo defecto en la otra
                        // vista, y no se vio hasta abrirla.
                        //
                        // Y EN ROJO, como en la maqueta, no en ámbar: pasarse del tope legal no es una
                        // advertencia suave, y el ámbar ya lo gasta el amarillo de lo marcado.
                        //
                        // Va con `//` y NO con `{/* */}`: esto está en posición de EXPRESIÓN, dentro
                        // del `return` de la función. Una llave ahí abre un objeto y el parser revienta.
                        return (
                          <td className="whitespace-nowrap bg-gray-50 px-2 py-1 text-center align-middle">
                            <div className={`text-[12px] font-bold tabular-nums ${
                              pasaLaSemana ? 'text-red-600' : 'text-ink'}`}>
                              {horasDeMinutos(minutos)}
                            </div>
                            {pasaLaSemana && (
                              <div className="text-[10px] font-bold text-red-600 tabular-nums">
                                +{horasDeMinutos(minutos - tope * 60)}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                      </Fragment>
                    );
                  })}
                  {/* «40 / 42 h» Y NO «40 h», como en la maqueta: el número solo no dice si está bien
                      o mal, y obliga a acordarse del tope. Con el tope al lado, la comparación la hace
                      la pantalla. Cuando se pasa, debajo va CUÁNTO se pasó, que es el dato con el que
                      se decide a quién quitarle una jornada.

                      El tope sale de la jornada legal vigente y no escrito aquí: baja a 42 en 2026 y
                      a 42 se quedará mientras la ley no cambie otra vez. */}
                  {/* `whitespace-nowrap` NO ES COSMÉTICO: medido clonando cada celda a su propio
                      ancho, esta pedía 83 px mientras las demás pedían 56, porque «50,3 / 42 h»
                      envolvía en los 88 px de la columna. Una sola celda que envuelve estira la
                      FILA ENTERA, y era lo que dejaba la tabla en 84 px por fila contra los 58
                      de la maqueta. */}
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <span className={`text-sm font-bold tabular-nums ${sePasa ? 'text-red-600' : 'text-ink'}`}>
                      {horasDeMinutos(fila.minutosEsperados).replace(' h', '')}
                    </span>
                    <span className="text-sm text-muted tabular-nums"> / {tope} h</span>
                    {sePasa && (
                      <div className="text-[10px] font-bold text-red-600 tabular-nums">
                        +{horasDeMinutos(fila.minutosEsperados - tope * 60)}
                      </div>
                    )}
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
                            <div className="text-[11px] text-muted truncate">{cargoYSede(fila)}</div>
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

          Lo que NO se pudo escribir sigue siendo un `alert`: una negativa del servidor no puede tener
          el mismo peso que un «listo».

          EL DE «TODO BIEN» YA NO ES UN `status`, desde que el aviso flotante dice lo mismo: dos
          regiones vivas con el mismo texto se leen DOS VECES seguidas con un lector de pantalla. El
          que anuncia es el aviso, porque además lleva dentro el deshacer; este se queda como
          registro en pantalla, que es para lo que sirve estar quieto. */}
      {resultado && resultado.fallos.length === 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
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
      {/* LA VENTANA DEL ENVÍO. Se queda con su estado final hasta que la cierre una persona: antes se
          desvanecía sola y el final se veía como un parpadeo, sin decir cuánto se escribió. */}
      {/* LOS AVISOS FLOTANTES, abajo a la derecha. Sobreviven a cerrar la ventana de progreso, y por
          eso son los que de verdad sostienen el «deshacer»: hasta ahora, cerrarla dejaba una
          escritura de cientos de filas sin marcha atrás a la vista en ninguna parte. */}
      <PilaDeAvisos avisos={avisos} onCerrar={id => setAvisos(ps => ps.filter(a => a.id !== id))} />

      {progreso && (
        <VentanaDeProgreso
          estado={estadoDelProgreso({ ...progreso, detenido })}
          escritas={progreso.escritas}
          total={progreso.total}
          detenido={detenido}
          sePuedeDeshacer={loQueHabia !== null && loQueHabia.length > 0}
          onDetener={() => { detener.current = true; setDetenido(true); }}
          onDeshacer={() => { if (loQueHabia) deshacerElLote(loQueHabia); }}
          onCerrar={() => setProgreso(null)} />
      )}

      {pendiente && (
        <PreviaDeBloque
          titulo={tituloDePendiente()}
          conteo={conteo}
          pisados={pisados.map(c => ({ nombre: nombreDe(c.colaboradorId), fecha: c.fecha }))}
          habituales={habitualesQueCruzan.map(h => ({ nombre: nombreDe(h.colaboradorId), antes: h.antes, despues: h.despues }))}
          sinDescanso={semanasSinDescansoDelEnvio()}
          sobreElTope={semanasSobreElTopeDelEnvio()}
          topeHoras={tope}
          ocupado={guardando}
          onCancelar={() => setPendiente(null)}
          // Se captura lo pendiente ANTES de limpiarlo: el estado ya no está cuando la escritura corre,
          // y leerlo desde dentro daría `null` y escribiría un «quitar» sobre todo lo marcado.
          onAplicar={() => {
            const que = pendiente;
            setPendiente(null);
            aplicarABloque(seleccion, celda => accionDeLoPendiente(que, celda.fecha), celdasParaPrevia);
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

      {/* SITIO AL PIE PARA LA TARJETA FLOTANTE (28 de septiembre de 2026).
          La tarjeta es `fixed`, así que tapa SIEMPRE los últimos píxeles de la ventana, y cuando la
          página está desplazada del todo esos píxeles caen sobre el final del documento. Medido: en
          escritorio tapa 100 px y quedaban 68 de este párrafo por debajo; apilada en el teléfono tapa
          192 y quedaban 168. No se ve como un error: se ve como si la página terminara ahí.

          VA AL FINAL DE TODO, y esto costó una pasada. El primer intento lo puso justo antes de la
          tarjeta, dando por hecho que ahí acababa la página; pero este párrafo se dibuja DESPUÉS de
          ella, así que el separador solo empujó todo hacia abajo y el déficit quedó idéntico, en los
          mismos 168 px. Lo delató que el número no se moviera ni un píxel.

          ES UN SEPARADOR CON ALTURA Y NO RELLENO EN EL CONTENEDOR, y la diferencia no es de estilo:
          el contenedor lleva `p-6 md:p-8`, y un `pb-*` suelto se lo comería el atajo `p-8` de la
          variante `md`, que Tailwind emite después por ir dentro de una media query. El arreglo
          desaparecería justo en escritorio y sin decir nada.

          Solo cuando la tarjeta está, con la misma condición con la que se dibuja: un hueco
          permanente al final de la página no lo pide nadie. */}
      {cuenta.total > 0 && <div aria-hidden="true" className="h-52 sm:h-28" />}
    </div>
  );
}
