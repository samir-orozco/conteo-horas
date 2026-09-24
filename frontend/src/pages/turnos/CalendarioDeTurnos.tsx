import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Clock, Scale, X, Plus } from 'lucide-react';
import api from '../../lib/api';
import {
  hoyEnBogota, horasDeMinutos, sePuedePintar, inicialDeDia,
} from './semana';
// Qué rango le toca a cada modo y cómo se mueven las flechas. Es una decisión pura, probada y
// mutada aparte: aquí solo se aplica.
import { vistaDelCalendario, moverVista, type ModoDeVista } from './vistaDelCalendario';
import { nombreDelDia } from '../../lib/diasDeLaSemana';
import { CLASES_COLOR, normalizarColor } from '../../lib/coloresDeTurno';
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
  origen: string | null;
  // El turno del CATÁLOGO con el que se pintó este día, cuando alguien lo pintó. `null` significa
  // que no lo pintó ninguno, y entonces el nombre lo pone `horarioNombre`.
  turno: { nombre: string; color: string } | null;
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

type Respuesta = { desde: string; hasta: string; horasSemanales: number; filas: FilaDelCalendario[] };

// Lo que el selector necesita de un turno del catálogo, y nada más. La ruta devuelve bastante más
// (horas, ventana de almuerzo, descansos, sede), pero aquí solo se pinta un botón con su nombre y
// su color: lo que ese turno EXIGE lo resuelve el backend al pintar, no esta pantalla.
type TurnoDelCatalogo = { id: string; nombre: string; color: string };

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
                {t.nombre}
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

          {/* Lo que la ley obliga a decir, y por eso no es solo copy. */}
          <p className="text-sm text-muted">
            {datos.eligeElTrabajador
              ? 'Trabajó su descanso de forma ocasional: la ley deja la elección entre dinero y día compensatorio a su elección, o sea que elige el trabajador. Aquí se registra lo que eligió.'
              : 'Trabajó su descanso de forma habitual: el día compensatorio va además del recargo, sin perjuicio de la retribución en dinero. No hay nada que elegir.'}
          </p>

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

// CÓMO SE NOMBRA EL PERÍODO EN CADA MODO (22 de septiembre de 2026).
//
// Una tabla con un caso por valor y no un `? :`, porque el español no deja: es «de la semana» pero
// «del mes». Y hace falta de verdad: la pantalla decía «Resumen de la semana», «Total semanal» y
// «en la semana» en sitios fijos, y todos esos textos MIENTEN cuando lo que se está viendo es un
// mes. Un rótulo falso es un defecto, no un detalle.
const PERIODO: Record<ModoDeVista, { unidad: string; deEl: string; enEl: string }> = {
  DIA: { unidad: 'Día', deEl: 'del día', enEl: 'en el día' },
  SEMANA: { unidad: 'Semana', deEl: 'de la semana', enEl: 'en la semana' },
  MES: { unidad: 'Mes', deEl: 'del mes', enEl: 'en el mes' },
};

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

  const vista = vistaDelCalendario(modo, ancla);
  const dias = vista.dias;
  // La persona + los días + el total. Era una constante con un 9 escrito a mano, de cuando la
  // rejilla siempre tenía siete días: con un día son 3 y con un mes 33, y la fila de «Cargando…»
  // habría dejado de abarcar la tabla.
  const columnas = dias.length + 2;
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
      await api.put('/turnos/dia', { colaboradorId, fecha, ...que });
      setEditando(null);
      setRecarga(n => n + 1);
    } catch (err) {
      // El motivo viene del servidor y se muestra tal cual: «ya pasó», «ya empezó su jornada». Son
      // reglas del producto, y el administrador tiene que poder leer cuál lo frenó.
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorPintado(delServidor ?? 'No pudimos guardar el turno.');
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
      await api.delete('/turnos/dia', {
        params: { colaboradorId: editando.fila.id, fecha: editando.dia.fecha },
      });
      setEditando(null);
      setRecarga(n => n + 1);
    } catch (err) {
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorPintado(delServidor ?? 'No pudimos quitar el turno.');
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
        onClick={() => abrirDecision(fila, dia)} className={clase}>
        {dibujar(false)}
      </button>
    ) : sePuedePintar(dia.fecha, hoy) ? (
      <button type="button"
        aria-label={`Turno de ${fila.nombre} ${fila.apellido}, día ${Number(dia.fecha.slice(8, 10))}`}
        onClick={e => {
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
                  <th key={fecha} className="px-2 py-3 text-center min-w-[96px]">
                    {/* La inicial sale de la FECHA y no del número de columna: con `[i]`, de la
                        octava columna en adelante el encabezado salía en blanco. */}
                    <div className={`text-xs font-semibold ${esHoy ? 'text-ink' : 'text-muted'}`}>{inicialDeDia(fecha)}</div>
                    <div className={`text-sm tabular-nums ${esHoy ? 'font-bold text-ink' : 'text-muted'}`}>
                      {Number(fecha.slice(8, 10))}
                    </div>
                    {festivos.has(fecha) && <div className="text-[10px] font-medium text-violet-700">Festivo</div>}
                  </th>
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
                    <div className="flex items-center gap-2.5">
                      <Inicial nombre={fila.nombre} apellido={fila.apellido} />
                      {/* El tope existe para que la columna se ajuste al contenido SIN quedar a
                          merced de un nombre larguísimo: hasta ahí crece, y de ahí en adelante el
                          `truncate` hace su trabajo. Sin tope, `w-px` deja que un solo nombre de
                          cuarenta letras vuelva a robarse la pantalla. */}
                      <div className="min-w-0 max-w-[180px]">
                        <div className="text-sm font-medium text-ink truncate">{fila.nombre} {fila.apellido}</div>
                        <div className="text-[11px] text-muted truncate">{fila.cargo || '—'}</div>
                      </div>
                    </div>
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
                  ) : fila.dias.map(dia => (
                    <td key={dia.fecha} className="px-1.5 py-2.5 align-middle">
                      {/* TRES CASOS Y NO DOS (22 de septiembre de 2026).
                          Un DESCANSO TRABAJADO abre su propio modal, y NO mira `sePuedePintar`:
                          por definición ya ocurrió, así que es pasado o de hoy, y colgándolo del
                          botón de pintar —que es solo hacia adelante— casi ninguno sería alcanzable.
                          Decidir la compensación de un día pasado es legítimo; repintarlo no.

                          Los demás siguen igual: solo los pintables son botones. Ofrecer un clic
                          que el servidor va a rechazar con un 400 es peor que no ofrecerlo. */}
                      {celdaDeDia(fila, dia)}
                    </td>
                  ))}
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
