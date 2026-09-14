import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { Plus, Edit2, Trash2, X, Info, ChevronLeft, ChevronRight, AlertTriangle, UtensilsCrossed, Coffee, Eye, ArrowRight, Clock, User, type LucideIcon } from 'lucide-react';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ModalJornada, { type RegistroEditable, type ResumenDePausa } from './registros/ModalJornada';
import { HORAS_VACIAS, horasDeLaJornada, cuerpoDeLaJornada, horasDelHorario, resumenDeLaJornada, type PausaDelFormulario, type HorarioDelDia } from './registros/formJornada';
import { etiquetaDeDescansos, detalleDeDescansos } from './registros/resumenDeDescansos';
import { MAX_DESCANSOS_POR_FRANJA, MAX_MARCACIONES_POR_JORNADA } from '../lib/descansos';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import MenuFiltros from '../components/MenuFiltros';
import MenuAcciones from '../components/MenuAcciones';
import { cruzoDeSede, cumpleSede, cumpleCruce, opcionesDeSede, muestraColumnaSede, CRUCE_DISTINTAS, type SedeCorta } from '../lib/sedeDeJornada';
import SelectorColaborador from '../components/SelectorColaborador';
import ActividadRegistro from '../features/registros/ActividadRegistro';
import { avisoDeFotosPorBorrar, type FotoPorBorrar } from '../lib/fotosPorBorrar';
import AvatarMini from '../components/AvatarMini';

const TZ = 'America/Bogota';
// `fotoMini`: la miniatura que ya manda GET /colaboradores. La lista de jornadas no trae fotos.
type Colaborador = { id: string; nombre: string; apellido: string; fotoMini?: string | null };
// La foto de la persona de cada fila de la tabla (13 de septiembre de 2026). Quien ya no está
// activo no viene en GET /colaboradores y sale con sus iniciales.
const fotoMiniDe = (colaboradores: Colaborador[], id: string) =>
  colaboradores.find(c => c.id === id)?.fotoMini ?? null;
type Marcacion = {
  id: string; entrada: string | null; salida: string | null;
  salidaAlmuerzo: boolean; salidaDescanso?: boolean; entradaEstimada: boolean; salidaEstimada: boolean;
  tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
  // La novedad que nació de esta marcación (salida temprana en el kiosco) se
  // borra con ella. El diálogo tiene que decirlo ANTES: si esa novedad ya
  // estaba aprobada, borrarla mueve la liquidación.
  tieneNovedadLigada?: boolean;
};
// Una fila de la tabla es una JORNADA, no una marcación. Marcar una pausa
// —almuerzo o descanso— parte el día en tramos; todos son la misma jornada y
// bajan juntos en `marcaciones`. Volver por la tarde a hacer horas extra sí abre
// otra jornada, y esa llega como otra fila.
type Registro = {
  id: string; colaboradorId: string; colaborador: Colaborador; fecha: string;
  entrada: string | null; salida: string | null; tipo: string; observacion: string | null;
  // Dónde se abrió y dónde se cerró la jornada. Opcionales por la ventana del
  // despliegue en la que el servidor todavía responde sin ellos.
  sede?: SedeCorta | null; sedeSalida?: SedeCorta | null;
  // La sede que el servidor le atribuye al leer a la jornada de un presencial que no
  // abrió en una sede probada (decisión del dueño del 12 de septiembre de 2026).
  // Opcional por la misma ventana del despliegue.
  sedeAtribuida?: SedeCorta | null;
  // null = sin horario asignado o día que no aplica; 0 = a tiempo; >0 = minutos tarde
  minutosTarde: number | null;
  // Lo que contó esta jornada, con sus pausas ya descontadas.
  minutosContados: number;
  // Lo que ESTA jornada pagó de almuerzo, que no siempre es el descuento del día.
  minutosAlmuerzoAqui: number;
  // Lo mismo del descanso no remunerado. Opcional: un servidor anterior no lo manda.
  minutosDescansoAqui?: number;
  tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
  // El sistema cerró el turno (la persona no marcó salida): la hora es estimada y hay que revisarla
  salidaEstimada?: boolean;
  salidaAlmuerzo?: boolean;
  // Solo viene en la jornada que contiene el almuerzo; en las otras es null.
  almuerzo: ResumenDePausa | null;
  // Un resumen por cada descanso de ESTA jornada, en su orden (12 de septiembre de
  // 2026). Lista vacía si el día no tiene descansos o si son de otra jornada.
  // Opcional: un servidor anterior no la manda, y entonces no hay columna.
  descansos?: ResumenDePausa[];
  // Opcional a propósito. Durante un despliegue hay una ventana en la que el
  // navegador ya tiene este bundle y el servidor todavía responde el anterior,
  // que no manda este campo. Que falte un dato no puede tumbar la pantalla, así
  // que aquí se declara como puede llegar y `marcasDe` pone el respaldo.
  marcaciones?: Marcacion[];
  // La novedad que toca ese día, si la hay. `remunerada` sale del tipo más la
  // política de la empresa, no de un campo guardado.
  novedad: { id: string; tipo: string; aprobado: boolean; remunerada: boolean } | null;
};
// Lo que devuelve el servidor cuando rechaza un guardado. `conflicto` solo viene
// con el código de cruce, y trae la marcación que estorba para poder ofrecerse a
// quitarla sin salir del formulario. `fotos` solo viene con el código de fotos
// por borrar, y son las que se perderían si se confirma.
type RespuestaDeError = {
  response?: {
    data?: {
      error?: string;
      codigo?: string;
      conflicto?: { id: string; entrada: string | null; salida: string | null };
      fotos?: FotoPorBorrar[];
    };
  };
};

// "1 h", "45 min", "1 h 25 min"
const enHoras = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

// Las marcaciones de una fila, con respaldo. Sin el campo, la fila se trata como
// UNA marcación —que es justo lo que significaba antes de que existiera— en vez
// de reventar al primer clic.
const marcasDe = (r: Registro): Marcacion[] => r.marcaciones ?? [{
  id: r.id, entrada: r.entrada, salida: r.salida,
  salidaAlmuerzo: r.salidaAlmuerzo ?? false, salidaDescanso: false, entradaEstimada: false,
  salidaEstimada: r.salidaEstimada ?? false,
  tieneFotoEntrada: r.tieneFotoEntrada, tieneFotoSalida: r.tieneFotoSalida,
  tieneNovedadLigada: false,
}];

// Celda de una pausa —almuerzo o descanso—. La pausa llega solo en la jornada
// que la contiene, así que aquí ya no hay que decidir en qué fila se pinta: si
// viene, es de esta.
function CeldaPausa({ p, minutosAqui, enCurso }: { p: ResumenDePausa | null | undefined; minutosAqui: number; enCurso: string }) {
  const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '';

  if (!p || (p.estado === 'SIN_VENTANA' && minutosAqui === 0)) {
    return <span className="text-gray-300">—</span>;
  }

  // Una sola etiqueta por fila. El detalle —cuánto se descuenta, por qué, si el
  // regreso lo puso el sistema— vive en el modal, a un clic. En una tabla de
  // cuarenta personas, dos renglones por celda es ruido que nadie lee.
  // En su pausa ahora mismo. En ámbar y no en rojo: no hay nada que corregir,
  // solo está fuera. El rojo se guarda para cuando de verdad se le pasó la hora.
  if (p.estado === 'EN_CURSO') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
        {enCurso} · {hhmm(p.salida)}
      </span>
    );
  }

  if (p.estado === 'ABIERTO') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 whitespace-nowrap">
        No volvió
      </span>
    );
  }

  if (p.estado === 'MARCADO') {
    return (
      <span className={`font-mono text-xs whitespace-nowrap ${p.seExcedio ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
        {hhmm(p.salida)} → {hhmm(p.regreso)}
      </span>
    );
  }

  if (p.estado === 'SIN_VENTANA') {
    // Sin ventana pero con descuento: el caso de la mayoría con el almuerzo.
    // Ese descuento existe todos los días y hasta ahora no se veía en ninguna
    // pantalla. Lo que pagó ESTA jornada, no lo que descontó el día: con dos
    // jornadas y almuerzo fijo, decir "−1 h" sobre la fila que solo alcanzó a
    // pagar media es una contradicción que se ve a simple vista.
    return <span className="text-xs text-gray-600 whitespace-nowrap">−{enHoras(minutosAqui)}</span>;
  }

  // NO_MARCADO
  return <span className="text-xs text-gray-500">No marcó</span>;
}

// Celda de los descansos no remunerados de una jornada (12 de septiembre de 2026): hasta
// tres, con una sola etiqueta. Qué se dice lo decide `etiquetaDeDescansos`, con sus
// pruebas; con uno solo se pinta igual que antes. El detalle de cada uno va en el
// `title` y en el modal.
function CeldaDescansos({ descansos, minutosAqui }: { descansos: ResumenDePausa[] | undefined; minutosAqui: number }) {
  const etiqueta = etiquetaDeDescansos(descansos);
  const titulo = detalleDeDescansos(descansos);
  switch (etiqueta.tipo) {
    case 'UNO':
    case 'EN_CURSO':
    case 'NO_VOLVIO':
      return <span title={titulo}><CeldaPausa p={etiqueta.pausa} minutosAqui={minutosAqui} enCurso="En descanso" /></span>;
    case 'SIN_MARCAR':
      return (
        <span title={titulo} className="text-xs text-gray-500 whitespace-nowrap">
          {`${etiqueta.faltan} de ${etiqueta.de} sin marcar`}
        </span>
      );
    case 'MARCADOS':
      // En ámbar si alguno se pasó, igual que un descanso único marcado.
      return (
        <span title={titulo} className={`text-xs whitespace-nowrap ${etiqueta.seExcedio ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
          {`${etiqueta.cuantos} · ${enHoras(etiqueta.minutos)}`}
        </span>
      );
    case 'NINGUNO':
    default:
      return <CeldaPausa p={null} minutosAqui={0} enCurso="En descanso" />;
  }
}

// Celda de sede. Fuera del componente a propósito: definida adentro, React la
// trataría como un tipo nuevo en cada render.
//
// Una sola sede cuando abrió y cerró en la misma, o cuando la de cierre no se
// sabe (todo lo anterior a que se guardara). La flecha solo cuando se conocen las
// dos y son distintas: es lo que se quiere encontrar de un vistazo.
function CeldaSede({ r }: { r: Registro }) {
  if (cruzoDeSede(r)) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap" title={`Abrió en ${r.sede!.nombre} y cerró en ${r.sedeSalida!.nombre}`}>
        {r.sede!.nombre}
        <ArrowRight size={12} className="text-amber-600" aria-hidden="true" />
        <span className="font-semibold text-amber-700">{r.sedeSalida!.nombre}</span>
      </span>
    );
  }
  if (r.sede) return <span className="whitespace-nowrap">{r.sede.nombre}</span>;
  // Abrió sin sede pero cerró en una: se dice dónde CERRÓ, no se deja creer que
  // toda la jornada fue ahí.
  if (r.sedeSalida) return <span className="whitespace-nowrap">Cerró en {r.sedeSalida.nombre}</span>;
  // Sin ninguna sede probada, la que se le atribuye: un presencial no se ve sin sede
  // (decisión del dueño del 12 de septiembre de 2026). Desde el 13, solo con su nombre: el
  // dueño pidió quitar «por defecto».
  if (r.sedeAtribuida) return <span className="whitespace-nowrap">{r.sedeAtribuida.nombre}</span>;
  return <span className="text-gray-300">-</span>;
}

// El diseño del formulario de la jornada (13 de septiembre de 2026, aprobado por el dueño):
// campos grises sin borde y rótulos legibles. Antes todo llevaba borde, con rótulos pequeños
// y grises, y ningún campo pesaba más que otro. El gris va con `!` porque index.css pinta de
// blanco, con !important, todo input y select (lo mismo hace el kiosco con `hp-input-dark`).
const ETIQUETA = 'block text-sm font-medium text-ink mb-1.5';
const CAMPO = 'w-full !bg-blue-50 rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary';
const HORA_DE_PAUSA = 'w-[6.5rem] bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary';
const TIPOS_DE_REGISTRO = [
  { valor: 'NORMAL', texto: 'Normal' },
  { valor: 'PERMISO', texto: 'Permiso' },
  { valor: 'FESTIVO', texto: 'Festivo' },
] as const;

// Una pausa DENTRO de la jornada y no como otra salida. Es una pausa dentro del
// turno: sirve para saber si se tomó a tiempo y en su medida, no para decir que
// la persona se fue. Fuera del componente por la misma razón que `CeldaSede`:
// definida adentro, cada tecla la volvería a montar y el campo perdería el foco.
//
// Una fila por pausa, con sus dos horas y su papelera: la del almuerzo borra sus dos horas y
// la de un descanso lo quita de la lista. En pantallas angostas las horas bajan a otra línea.
function FilaDePausa({ titulo, Icono, salida, regreso, onSalida, onRegreso, onQuitar }: {
  titulo: string; Icono: LucideIcon; salida: string; regreso: string;
  onSalida: (v: string) => void; onRegreso: (v: string) => void; onQuitar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 py-2.5 border-b border-blue-200">
      <Icono size={17} className="text-blue-600 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-[6rem] text-sm text-ink">{titulo}</span>
      <div className="flex items-center gap-2 ml-auto">
        <input type="time" aria-label={`${titulo}: salió`} value={salida}
          onChange={e => onSalida(e.target.value)} className={HORA_DE_PAUSA} />
        <span className="text-xs text-muted">a</span>
        <input type="time" aria-label={`${titulo}: regresó`} value={regreso}
          onChange={e => onRegreso(e.target.value)} className={HORA_DE_PAUSA} />
        <button type="button" onClick={onQuitar} aria-label={`Quitar el ${titulo.toLowerCase()}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Registros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<RegistroEditable | null>(null);
  // El formulario tiene la forma de la JORNADA, no la de una marcación suelta.
  // Editando marcaciones, la que abre el día mostraba como "Salida" la hora del
  // almuerzo, y quien no había terminado su turno veía una salida que no marcó.
  const [form, setForm] = useState({
    colaboradorId: '', fecha: '', ...HORAS_VACIAS, tipo: 'NORMAL', observacion: '',
  });
  // La jornada que se está editando, para saber a qué endpoint escribir y con
  // cuántas marcaciones se está tratando.
  const [jornadaEditada, setJornadaEditada] = useState<Registro | null>(null);
  // Qué marcaciones se van a borrar. Una jornada partida por sus pausas son
  // varias, y borrar solo la primera dejaba la tarde suelta como una fila huérfana.
  const [porEliminar, setPorEliminar] = useState<{ ids: string[]; horas: string; novedades: number } | null>(null);
  // Detalle de una marcación. La fila de la tabla no se explica sola: el
  // almuerzo vive en el hueco entre dos filas y la tardanza solo se mide en la
  // primera entrada del día.
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  // Otros registros que ya existen en el día que se está creando/editando. La
  // tardanza solo se evalúa sobre la PRIMERA entrada del día, así que si ya hay
  // una anterior, la que se está agregando no va a mostrar minutos tarde. Sin
  // este aviso el usuario cree que el cálculo falló.
  const [otrosDelDia, setOtrosDelDia] = useState<Marcacion[]>([]);
  // Por qué no se pudo guardar. Si el motivo es que este horario se cruza con
  // otra marcación del día, viene con ella: querer que UNA marcación cubra todo
  // el día es lo normal al corregir un día que el kiosco dejó partido, y sin
  // esto había que cancelar, buscar la otra —que ya no tiene fila propia porque
  // la tabla agrupa por jornada— y borrarla a mano antes de volver a empezar.
  const [errorGuardar, setErrorGuardar] = useState<
    { texto: string; conflicto?: { id: string; entrada: string | null; salida: string | null } } | null
  >(null);
  // Las fotos del kiosco que se borrarían al guardar la jornada, cuando el
  // servidor pide confirmarlo. Mientras esto está abierto no se ha escrito nada.
  const [fotosPorBorrar, setFotosPorBorrar] = useState<FotoPorBorrar[] | null>(null);
  // Por qué no se pudo traer el horario de ese día a una jornada nueva.
  const [avisoHorario, setAvisoHorario] = useState<string | null>(null);

  // Filtro de llegada y paginación. La página vuelve a 1 desde cada setter en
  // vez de con un efecto: así no hay un render intermedio mostrando la página 7
  // de una lista que ahora tiene dos.
  // Listas, no valores sueltos: dentro de un grupo las opciones SUMAN. "Tarde o
  // a tiempo" no sirve de nada, pero "no marcó salida o sin salida" es
  // exactamente la búsqueda de todo lo que hay que arreglar.
  const [filtroLlegada, setFiltroLlegada] = useState<string[]>([]);
  const [filtroSalida, setFiltroSalida] = useState<string[]>([]);
  const [filtroSede, setFiltroSede] = useState<string[]>([]);
  const [filtroCruce, setFiltroCruce] = useState<string[]>([]);
  const [sedes, setSedes] = useState<SedeCorta[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);

  useEffect(() => {
    if (!modal || !form.colaboradorId || !form.fecha) { setOtrosDelDia([]); return; }
    let vigente = true;
    api.get('/registros', { params: { colaboradorId: form.colaboradorId, desde: form.fecha, hasta: form.fecha } })
      .then(r => {
        if (!vigente) return;
        // Se aplanan las jornadas: el aviso es sobre MARCACIONES del día, y la
        // que se está editando puede ser el regreso de una pausa, que ya no
        // tiene fila propia en la tabla.
        //
        // Se excluyen las PROPIAS. Editando una jornada entera, sus marcaciones
        // son justo lo que el formulario controla: listarlas aquí hacía que el
        // registro se avisara de sí mismo, y con la hora que tenía antes de la
        // última corrección, que es lo más desconcertante de todo.
        const propias = new Set<string>(
          jornadaEditada ? marcasDe(jornadaEditada).map(m => m.id)
            : editando ? [editando.id] : [],
        );
        const otros = (r.data as Registro[])
          .flatMap(j => marcasDe(j))
          .filter(m => !propias.has(m.id) && m.entrada);
        setOtrosDelDia(otros.sort((a, b) => (a.entrada! < b.entrada! ? -1 : 1)));
      })
      .catch(() => { if (vigente) setOtrosDelDia([]); });
    return () => { vigente = false; };
  }, [modal, form.colaboradorId, form.fecha, editando, jornadaEditada]);

  const cargar = () => {
    const params: any = { desde, hasta };
    if (filtroColaborador) params.colaboradorId = filtroColaborador;
    api.get('/registros', { params }).then(r => setRegistros(r.data));
  };

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);
  // Las sedes son para el filtro. Que fallen no puede tumbar la tabla: sin ellas
  // el grupo «Sede» simplemente no se pinta.
  useEffect(() => { api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([])); }, []);
  useEffect(() => { cargar(); }, [desde, hasta, filtroColaborador]);

  const hhmm = (s: string | null | undefined) =>
    s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '';

  // Editar la JORNADA de una fila: entrada, pausas y salida juntos, que es como
  // se lee la tabla y como la piensa quien la corrige.
  const abrirJornada = (j: Registro) => {
    setErrorGuardar(null);
    setAvisoHorario(null);
    setEditando(null);
    setJornadaEditada(j);
    setForm({
      colaboradorId: j.colaboradorId,
      fecha: format(toZonedTime(new Date(j.fecha), TZ), 'yyyy-MM-dd'),
      // La salida es la de la JORNADA, que no es la de una pausa: si salió a
      // almorzar y no ha vuelto, va vacía, porque no ha terminado de trabajar.
      // Qué pausa es cuál lo decide `horasDeLaJornada`, con sus pruebas.
      ...horasDeLaJornada(marcasDe(j), j.salida),
      tipo: j.tipo, observacion: j.observacion || '',
    });
    setModal(true);
  };

  // Alta manual, o edición de UNA marcación suelta desde el detalle.
  const abrir = (reg?: RegistroEditable) => {
    setErrorGuardar(null);
    setAvisoHorario(null);
    setJornadaEditada(null);
    setEditando(reg || null);
    setForm(reg ? {
      colaboradorId: reg.colaboradorId,
      fecha: format(toZonedTime(new Date(reg.fecha), TZ), 'yyyy-MM-dd'),
      ...HORAS_VACIAS,
      entrada: hhmm(reg.entrada),
      salida: hhmm(reg.salida),
      tipo: reg.tipo, observacion: reg.observacion || '',
    } : {
      colaboradorId: '', fecha: format(new Date(), 'yyyy-MM-dd'), ...HORAS_VACIAS, tipo: 'NORMAL', observacion: '',
    });
    setModal(true);
  };

  // Un descanso del editor de la jornada, por su posición en la lista.
  const cambiarDescanso = (i: number, cambio: Partial<PausaDelFormulario>) =>
    setForm(p => ({ ...p, descansos: p.descansos.map((d, j) => (j === i ? { ...d, ...cambio } : d)) }));

  // Trae a una jornada nueva el horario de ese día: la entrada, el almuerzo, los descansos
  // y la salida, para no escribirlos uno por uno (12 de septiembre de 2026, idea del
  // dueño). Un día sin turno lo dice y no toca lo que ya estaba escrito.
  const traerHorario = async () => {
    setAvisoHorario(null);
    try {
      const { data } = await api.get('/registros/horario-del-dia', { params: { colaboradorId: form.colaboradorId, fecha: form.fecha } });
      const horas = horasDelHorario(data as HorarioDelDia);
      // «De entonces»: lo que se trae es el día guardado, y con el horario de hoy ese día puede
      // tener turno. Sin decirlo parecía un error (13 de septiembre de 2026, pedido del dueño).
      if (!horas) { setAvisoHorario('Ese día, su horario de entonces no tenía turno.'); return; }
      setForm(p => ({ ...p, ...horas }));
    } catch {
      setAvisoHorario('No pudimos traer el horario de ese día.');
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGuardar(null);
    await enviar();
  };

  // Editando una jornada, las horas viajan como horas: quien decide en qué día
  // cae cada una es el servidor, que es donde vive la regla de que lo que no
  // avanza es del día siguiente. Armarlas aquí sobre una sola fecha es lo que
  // guardaba turnos nocturnos con la salida antes de la entrada.
  //
  // Si guardar dejaría fotos del kiosco sin marca a la cual pertenecer —las de
  // una pausa al quitarla, la de la salida al reabrir—, el servidor no escribe
  // nada y devuelve cuáles. Se le pregunta a quien edita, y solo si confirma se
  // vuelve a mandar lo mismo diciéndolo.
  //
  // Una jornada nueva viaja igual, entera, a POST /registros/jornada (12 de septiembre de
  // 2026): el alta a mano guardaba una sola marcación, sin sus pausas.
  const enviarJornada = async (confirmarBorrarFotos = false) => {
    const cuerpo = {
      colaboradorId: form.colaboradorId,
      fecha: form.fecha,
      ...cuerpoDeLaJornada(form),
      tipo: form.tipo,
      observacion: form.observacion,
      ...(confirmarBorrarFotos ? { confirmarBorrarFotos: true } : {}),
    };
    try {
      if (jornadaEditada) await api.put(`/registros/jornada/${jornadaEditada.id}`, cuerpo);
      else await api.post('/registros/jornada', cuerpo);
      setModal(false);
      cargar();
    } catch (err) {
      const d = (err as RespuestaDeError).response?.data;
      if (d?.codigo === 'BORRA_FOTOS' && d.fotos?.length) {
        setFotosPorBorrar(d.fotos);
        return;
      }
      setErrorGuardar({
        texto: d?.error ?? 'No pudimos guardar la jornada.',
        conflicto: d?.codigo === 'CRUCE_DE_MARCACIONES' ? d.conflicto : undefined,
      });
    }
  };

  const borrarFotosYGuardar = async () => {
    setFotosPorBorrar(null);
    await enviarJornada(true);
  };

  const enviar = async (extra?: { salidaAlmuerzo: boolean; salidaDescanso: boolean }) => {
    // Una jornada, nueva o editada, viaja entera. Solo la marcación suelta que se abre
    // desde el detalle se guarda por su lado.
    if (jornadaEditada || !editando) {
      await enviarJornada();
      return;
    }

    const fecha = new Date(`${form.fecha}T00:00:00`);
    const entrada = form.entrada ? new Date(`${form.fecha}T${form.entrada}:00`) : null;
    let salida = form.salida ? new Date(`${form.fecha}T${form.salida}:00`) : null;
    // Turno que cruza la medianoche: la salida es del día SIGUIENTE. El
    // formulario arma las dos horas sobre la misma fecha, así que sin esto un
    // 20:00-05:00 quedaba guardado con la salida nueve horas ANTES de su
    // entrada, y ese tramo le restaba horas al día en vez de sumarlas.
    if (entrada && salida && salida <= entrada) salida = new Date(salida.getTime() + 86400000);
    const data = { ...form, fecha, entrada, salida, ...extra };
    try {
      await api.put(`/registros/${editando.id}`, data);
      setModal(false);
      cargar();
    } catch (err) {
      const d = (err as RespuestaDeError).response?.data;
      setErrorGuardar({
        texto: d?.error ?? 'No pudimos guardar el registro.',
        conflicto: d?.codigo === 'CRUCE_DE_MARCACIONES' ? d.conflicto : undefined,
      });
    }
  };

  // Absorber la marcación que estorba: se borra y se reintenta el guardado, para
  // que el día quede con una sola. Es destructivo, así que va detrás de un botón
  // que dice qué horas se van, no detrás de un "reintentar".
  const absorberYGuardar = async () => {
    const c = errorGuardar?.conflicto;
    if (!c) return;
    setErrorGuardar(null);
    await api.delete(`/registros/${c.id}`);
    // Deja de ser una salida a una pausa: ya no hay regreso al que volver, y sin
    // esto la columna diría "Sin regreso" sobre un día que quedó completo.
    await enviar({ salidaAlmuerzo: false, salidaDescanso: false });
  };

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    // En serie y no en paralelo: si una falla, las anteriores ya se borraron y
    // la recarga muestra lo que de verdad quedó, en vez de un estado inventado.
    for (const id of porEliminar.ids) await api.delete(`/registros/${id}`);
    setPorEliminar(null);
    cargar();
  };

  // `minutosTarde` es null cuando la llegada no se puede medir (no es la primera
  // entrada del día, festivo, sin horario). Esas filas no son "a tiempo": no se
  // sabe, así que no entran en ninguno de los dos filtros.
  // Dentro de un grupo, O. Entre grupos, Y. Es lo que uno espera de un menú de
  // filtros: "(tarde o a tiempo) Y (sin salida)".
  const cumpleLlegada = (r: Registro) => {
    if (filtroLlegada.length === 0) return true;
    return filtroLlegada.some(v =>
      v === 'TARDE' ? (r.minutosTarde ?? 0) > 0 : r.minutosTarde === 0);
  };
  const cumpleSalida = (r: Registro) => {
    if (filtroSalida.length === 0) return true;
    return filtroSalida.some(v =>
      v === 'ESTIMADA' ? !!r.salidaEstimada : !r.salida);
  };
  const filtrados = registros.filter(r => cumpleLlegada(r) && cumpleSalida(r) && cumpleSede(r, filtroSede) && cumpleCruce(r, filtroCruce));

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  // Se acota al total por si la lista encogió con el filtro y la página actual
  // ya no existe.
  const pagActual = Math.min(pagina, totalPaginas);
  const primera = (pagActual - 1) * porPagina;
  const visibles = filtrados.slice(primera, primera + porPagina);

  // El menú NO se cierra al elegir: con varias opciones a la vez, cerrarse en
  // cada clic haría imposible componer una búsqueda.
  const hayFiltro = filtroLlegada.length + filtroSalida.length + filtroSede.length + filtroCruce.length > 0;

  // La columna de Almuerzo aparece cuando ese día descuenta almuerzo, tenga o no
  // ventana horaria. La mayoría de horarios hoy dicen "descontar almuerzo: sí,
  // 60 min" sin decir de qué hora a qué hora: exigir la ventana escondería la
  // columna justo donde el descuento es invisible.
  // La de Descansos, solo cuando alguna jornada del rango trae alguno: los descansos
  // no remunerados siempre tienen horario, y en una empresa que no los usa sería
  // una columna vacía en cada fila.
  // La columna de sede aparece si la empresa tiene alguna sede activa, o si alguna fila trae
  // una sede, probada o por defecto (`muestraColumnaSede`). Desde el 13 de septiembre de 2026
  // sale también en una empresa de una sola sede: el dueño la echaba de menos en la tabla.
  const haySedes = muestraColumnaSede(registros, sedes);
  const opcionesSede = opcionesDeSede(sedes, registros);
  const hayAlmuerzo = registros.some(r => r.almuerzo && (r.almuerzo.estado !== 'SIN_VENTANA' || r.minutosAlmuerzoAqui > 0));
  const hayDescanso = registros.some(r => (r.descansos ?? []).length > 0);

  const fmtHora = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '-';

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registros de Asistencia</h2>
        <button onClick={() => abrir()} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />Agregar manual
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3">
        <SelectorColaborador
          colaboradores={colaboradores}
          valor={filtroColaborador}
          onCambiar={id => { setFiltroColaborador(id); setPagina(1); }}
        />
        <SelectorRangoFechas
          desde={desde} hasta={hasta}
          onCambiar={(d, h) => { setDesde(d); setHasta(h); setPagina(1); }}
        />

        <MenuFiltros
          grupos={[
            { clave: 'llegada', titulo: 'Llegada', opciones: [
              { valor: 'TARDE', texto: 'Tarde' }, { valor: 'A_TIEMPO', texto: 'A tiempo' }] },
            { clave: 'salida', titulo: 'Salida', opciones: [
              { valor: 'ESTIMADA', texto: 'No marcó salida' }, { valor: 'SIN_SALIDA', texto: 'Sin salida' }] },
            // Un grupo sin opciones no se pinta, así que en una empresa sin sedes
            // estos dos no aparecen, y con una sola no hay cruce que buscar.
            { clave: 'sede', titulo: 'Sede', opciones: opcionesSede.map(s => ({
              valor: s.id, texto: s.activa ? s.nombre : `${s.nombre} (desactivada)` })) },
            { clave: 'cruce', titulo: 'Apertura y cierre', opciones: opcionesSede.length > 1
              ? [{ valor: CRUCE_DISTINTAS, texto: 'En sedes distintas' }] : [] },
          ]}
          seleccion={{ llegada: filtroLlegada, salida: filtroSalida, sede: filtroSede, cruce: filtroCruce }}
          onCambiar={sel => {
            setFiltroLlegada(sel.llegada ?? []);
            setFiltroSalida(sel.salida ?? []);
            setFiltroSede(sel.sede ?? []);
            setFiltroCruce(sel.cruce ?? []);
            setPagina(1);
          }}
        />
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-2.5 text-xs mb-4">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Las fotos de verificación facial se conservan durante <b>2 meses</b> y luego se eliminan automáticamente para no sobrecargar el servidor.</span>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          {/* Los títulos en letra normal y la persona y sus horas como en la imagen del dueño
              (13 de septiembre de 2026). */}
          <thead className="bg-gray-50 text-gray-600 text-[13px] [&_th]:font-medium">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1.5"><User size={14} aria-hidden="true" />Colaborador</span>
              </th>
              <th className="px-4 py-3 text-left">Fecha</th>
              {haySedes && <th className="px-4 py-3 text-left">Sede</th>}
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Clock size={14} aria-hidden="true" />Entrada{' '}<span aria-hidden="true" className="text-gray-300">|</span>{' '}Salida
                </span>
              </th>
              {hayAlmuerzo && <th className="px-4 py-3 text-center">Almuerzo</th>}
              {hayDescanso && <th className="px-4 py-3 text-center">Descansos</th>}
              <th className="px-4 py-3 text-center">Llegada</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Duración</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Tipo</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setJornadaId(r.id)}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-3">
                    <AvatarMini nombre={r.colaborador.nombre} apellido={r.colaborador.apellido}
                      foto={fotoMiniDe(colaboradores, r.colaboradorId)} />
                    <span className="whitespace-nowrap">{r.colaborador.nombre} {r.colaborador.apellido}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">{format(toZonedTime(new Date(r.fecha), TZ), "d MMM yyyy", { locale: es })}</td>
                {haySedes && <td className="px-4 py-3 text-gray-600"><CeldaSede r={r} /></td>}
                {/* La entrada y la salida en una sola columna, separadas por una raya. La entrada va en
                    un ancho fijo para que la raya quede alineada en todas las filas, y a un lector de
                    pantalla cada hora le dice cuál es. */}
                <td className="px-4 py-3">
                  <div className="flex items-center tabular-nums whitespace-nowrap">
                    <span className="w-12 text-ink"><span className="sr-only">Entrada </span><span>{fmtHora(r.entrada)}</span></span>
                    <span aria-hidden="true" className="mx-3 h-4 w-px bg-gray-300" />
                    <span className="min-w-[3.5rem]">
                      <span className="sr-only">Salida </span>
                      {r.salidaEstimada ? (
                        <span title="El sistema cerró el turno porque no marcó salida. Revisa la hora."
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
                          No marcó salida{r.salida ? ` · ~${fmtHora(r.salida)}` : ''}
                        </span>
                      ) : r.salida ? (
                        <span className="text-red-600">{fmtHora(r.salida)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </span>
                  </div>
                </td>
                {hayAlmuerzo && (
                  <td className="px-4 py-3 text-center">
                    <CeldaPausa p={r.almuerzo} minutosAqui={r.minutosAlmuerzoAqui} enCurso="Almorzando" />
                  </td>
                )}
                {hayDescanso && (
                  <td className="px-4 py-3 text-center">
                    <CeldaDescansos descansos={r.descansos} minutosAqui={r.minutosDescansoAqui ?? 0} />
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  {r.minutosTarde === null ? (
                    <span className="text-gray-300">—</span>
                  ) : r.minutosTarde > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                      Tarde +{r.minutosTarde} min
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">A tiempo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-600 hidden md:table-cell">
                  {r.entrada && r.salida ? enHoras(r.minutosContados) : '-'}
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.tipo === 'NORMAL' ? 'bg-blue-50 text-blue-700' : r.tipo === 'PERMISO' ? 'bg-yellow-50 text-yellow-700' : 'bg-purple-50 text-purple-700'}`}>{r.tipo}</span>
                    {/* La novedad va aquí y no DENTRO del Tipo: son dos cosas
                        distintas —el tipo es del registro, la novedad es del
                        día— y fundirlas haría imposible saber cuál se está
                        leyendo. Sin aprobar va en ámbar: es lo que hay que mirar. */}
                    {r.novedad && (
                      <span title={`Novedad ${r.novedad.aprobado ? 'aprobada' : 'sin aprobar'}: ${r.novedad.tipo}`}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          r.novedad.aprobado ? 'bg-green-50 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                        {r.novedad.aprobado ? 'Novedad' : 'Novedad · aprobar'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {/* Los botones tienen su propia acción: sin esto, tocarlos
                      dispararía además el modal de la fila. */}
                  <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                    {/* DOS ÍCONOS Y NO CUATRO.
                        La cámara se fue porque abría un modal con las mismas
                        fotos que el detalle ya trae en su sección de
                        verificación facial: eran dos puertas al mismo cuarto.
                        Editar y eliminar pasaron al menú de los tres puntos:
                        borrar no debería estar a un clic accidental del ojo, que
                        es el botón que más se toca.
                        Tocar la fila entera también abre el detalle, pero eso no
                        se ve: sin el ojo, quien no lo descubre por casualidad no
                        sabe que existe. */}
                    <button onClick={() => setJornadaId(r.id)} title="Ver el detalle de la jornada" aria-label="Ver el detalle de la jornada"
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><Eye size={15} /></button>
                    <MenuAcciones etiqueta="Más acciones de la jornada" acciones={[
                      { clave: 'editar', texto: 'Editar', icono: <Edit2 size={15} className="text-gray-500" />, onElegir: () => abrirJornada(r) },
                      {
                        clave: 'eliminar', texto: 'Eliminar', peligro: true, icono: <Trash2 size={15} />,
                        onElegir: () => setPorEliminar({
                          ids: marcasDe(r).map(m => m.id),
                          horas: marcasDe(r).map(m => `${fmtHora(m.entrada)}–${fmtHora(m.salida)}`).join(' y '),
                          novedades: marcasDe(r).filter(m => m.tieneNovedadLigada).length,
                        }),
                      },
                    ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtrados.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {registros.length === 0
              ? 'No hay registros para el período seleccionado'
              : 'Ningún registro coincide con los filtros'}
          </p>
        )}

        {/* Paginador. Siempre dice el TOTAL, aunque quepa en una página: sin ese
            número, quien filtra un mes no sabe si está viendo todo o un pedazo. */}
        {filtrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm">
            <p className="text-muted">
              Mostrando <b className="text-ink">{primera + 1}–{Math.min(primera + porPagina, filtrados.length)}</b> de{' '}
              <b className="text-ink">{filtrados.length}</b>
              {hayFiltro && <span className="text-amber-700"> (filtrados de {registros.length})</span>}
            </p>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-muted">
                Filas
                <select value={porPagina}
                  onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>

              {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagActual === 1}
                    aria-label="Página anterior"
                    className="p-1.5 rounded-lg border border-gray-300 text-ink hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 text-muted whitespace-nowrap">{pagActual} de {totalPaginas}</span>
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagActual === totalPaginas}
                    aria-label="Página siguiente"
                    className="p-1.5 rounded-lg border border-gray-300 text-ink hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-del-registro"
            className="bg-white rounded-card p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 id="titulo-del-registro" className="font-bold text-xl text-ink">{jornadaEditada ? 'Editar jornada' : editando ? 'Editar marcación' : 'Nuevo registro'}</h3>
                {!editando && <p className="text-sm text-muted mt-0.5">Una jornada completa, con sus pausas</p>}
              </div>
              <button type="button" onClick={() => setModal(false)} aria-label="Cerrar"
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={guardar} className="space-y-5">
              <div>
                <label className={ETIQUETA}>Colaborador</label>
                <select aria-label="Colaborador" value={form.colaboradorId} onChange={e => setForm(p => ({ ...p, colaboradorId: e.target.value }))} required
                  className={CAMPO}>
                  <option value="">Seleccionar...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                </select>
              </div>
              <div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={ETIQUETA}>Fecha</label>
                    <input type="date" aria-label="Fecha" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required className={CAMPO} />
                  </div>
                  <div>
                    <label className={ETIQUETA}>Entrada</label>
                    <input type="time" aria-label="Entrada" value={form.entrada} onChange={e => setForm(p => ({ ...p, entrada: e.target.value }))} className={CAMPO} />
                  </div>
                  <div>
                    <label className={ETIQUETA}>Salida</label>
                    <input type="time" aria-label="Salida" value={form.salida} onChange={e => setForm(p => ({ ...p, salida: e.target.value }))} className={CAMPO} />
                    {jornadaEditada && !form.salida && (
                      <p className="text-[11px] text-muted mt-1">Vacía: no ha terminado su turno</p>
                    )}
                  </div>
                </div>
                {/* Debajo de las horas, qué día queda la jornada, para verlo antes de guardar. En una
                    jornada nueva, al lado, el botón que la llena con el horario de ese día, y se
                    ajusta lo que haga falta (12 de septiembre de 2026). */}
                <div className="flex items-center justify-between gap-3 mt-2">
                  <p className="text-xs text-muted">{resumenDeLaJornada(form.fecha, form.entrada, form.salida)}</p>
                  {!jornadaEditada && !editando && (
                    <button type="button" onClick={traerHorario} disabled={!form.colaboradorId || !form.fecha}
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-ink font-semibold px-4 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
                      <Clock size={15} /> Traer su horario
                    </button>
                  )}
                </div>
                {avisoHorario && <p className="text-[11px] text-amber-700 mt-1 text-right">{avisoHorario}</p>}
              </div>

              {/* Las pausas, DENTRO de la jornada y no como otras salidas, juntas en un recuadro con
                  una fila por pausa. Cada una es una marcación más: con el almuerzo y los tres
                  descansos, la jornada son cinco, y se guardan en una sola fila de la tabla. A cuál
                  descanso del horario se anota cada uno lo decide el servidor por la hora. */}
              {(jornadaEditada || !editando) && (
                <div>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-sm font-medium text-ink">Pausas</span>
                    <span className="text-xs text-muted text-right">No se pagan: cuestan siempre su tiempo</span>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-4 pt-1 pb-3">
                    <FilaDePausa titulo="Almuerzo" Icono={UtensilsCrossed}
                      salida={form.almuerzoSalida} regreso={form.almuerzoRegreso}
                      onSalida={v => setForm(p => ({ ...p, almuerzoSalida: v }))}
                      onRegreso={v => setForm(p => ({ ...p, almuerzoRegreso: v }))}
                      onQuitar={() => setForm(p => ({ ...p, almuerzoSalida: '', almuerzoRegreso: '' }))} />
                    {form.descansos.map((d, i) => (
                      <FilaDePausa key={i} titulo={`Descanso ${i + 1}`} Icono={Coffee}
                        salida={d.salida} regreso={d.regreso}
                        onSalida={v => cambiarDescanso(i, { salida: v })}
                        onRegreso={v => cambiarDescanso(i, { regreso: v })}
                        onQuitar={() => setForm(p => ({ ...p, descansos: p.descansos.filter((_, j) => j !== i) }))} />
                    ))}
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, descansos: [...p.descansos, { salida: '', regreso: '' }] }))}
                      disabled={form.descansos.length >= MAX_DESCANSOS_POR_FRANJA}
                      className="mt-3 inline-flex items-center gap-1.5 bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus size={14} /> Agregar descanso
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">Deja vacía la pausa que ese día no marcó.</p>
                </div>
              )}
              {/* El tipo se elige con un clic, como la modalidad de trabajo (components/SelectorModalidad). */}
              <div>
                <span id="rotulo-tipo-del-registro" className={ETIQUETA}>Tipo</span>
                <div role="radiogroup" aria-labelledby="rotulo-tipo-del-registro" className="inline-flex gap-0.5 bg-blue-50 rounded-lg p-1">
                  {TIPOS_DE_REGISTRO.map(t => {
                    const activo = form.tipo === t.valor;
                    return (
                      <button key={t.valor} type="button" role="radio" aria-checked={activo}
                        onClick={() => setForm(p => ({ ...p, tipo: t.valor }))}
                        className={`px-3.5 py-1.5 rounded-md text-sm transition-colors ${activo ? 'bg-white text-ink font-medium shadow-sm' : 'text-blue-600 hover:text-ink'}`}>
                        {t.texto}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label htmlFor="observacion-del-registro" className={ETIQUETA}>Observación</label>
                <input id="observacion-del-registro" value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
                  placeholder="Olvidó marcar la salida" className={CAMPO} />
              </div>

              {/* La tardanza se evalúa solo sobre la primera entrada del día (para
                  que volver de una pausa no cuente como llegar tarde). Si ya hay
                  una anterior, este registro no va a mostrar minutos tarde, y sin
                  avisarlo parece que el cálculo falló. */}
              {otrosDelDia.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Ese día ya tiene {otrosDelDia.length === 1 ? 'otra marcación' : `otras ${otrosDelDia.length} marcaciones`}:{' '}
                    <b>{otrosDelDia.map(o => `${fmtHora(o.entrada)}–${fmtHora(o.salida)}`).join(', ')}</b>.
                    Las horas de esta no pueden cruzarse con ellas: nadie está en dos turnos a la vez.
                    {form.entrada && fmtHora(otrosDelDia[0].entrada) < form.entrada ? (
                      <> La llegada tarde se calcula sobre la primera entrada del día,
                      así que <b>este registro no mostrará minutos tarde</b>. Si vas a corregir la
                      hora de llegada, edita el registro de las {fmtHora(otrosDelDia[0].entrada)}.</>
                    ) : (
                      <> La llegada tarde se calcula sobre la primera entrada del día.</>
                    )}
                  </span>
                </div>
              )}
              {errorGuardar && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                  <p className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{errorGuardar.texto}</span>
                  </p>
                  {errorGuardar.conflicto && (
                    <>
                      <p className="mt-2 pl-6 text-xs text-red-700">
                        Si lo que quieres es que esta marcación cubra todo el día, hay que quitar la otra.
                      </p>
                      <button type="button" onClick={absorberYGuardar}
                        className="mt-2 ml-6 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                        Eliminar la de {fmtHora(errorGuardar.conflicto.entrada)}–{fmtHora(errorGuardar.conflicto.salida)} y guardar
                      </button>
                    </>
                  )}
                </div>
              )}

              {(jornadaEditada?.id ?? editando?.id) && (
                <ActividadRegistro registroId={(jornadaEditada?.id ?? editando?.id)!} />
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setModal(false)} className="px-5 py-2.5 text-sm text-ink border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 text-sm font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {jornadaId && (
        <ModalJornada
          key={jornadaId}
          registroId={jornadaId}
          onCerrar={() => setJornadaId(null)}
          // Se cierra el detalle antes de abrir la edición: los dos modales
          // están en la misma capa, así que el de editar quedaba escondido
          // debajo. Cerrarlo además evita que quede mostrando datos viejos.
          //
          // Y abre el editor de la JORNADA, no el de la marcación suelta: desde
          // el detalle salía el formulario viejo, con la salida del almuerzo en
          // la casilla de Salida — exactamente lo que se quitó de la tabla.
          // Solo cae al editor por marcación cuando la jornada tiene más marcaciones de
          // las que el guardado por jornada puede representar: cinco, la de la entrada
          // y una por pausa, el almuerzo y hasta tres descansos (12 de septiembre de 2026).
          onEditar={reg => {
            setJornadaId(null);
            const fila = registros.find(f => marcasDe(f).some(m => m.id === reg.id));
            if (fila && marcasDe(fila).length <= MAX_MARCACIONES_POR_JORNADA) abrirJornada(fila);
            else abrir(reg);
          }}
          // El detalle se cierra al eliminar: si no, queda encima mostrando una
          // marcación que ya no existe y el siguiente clic falla con un 404.
          onEliminar={(id, novedades) => { setJornadaId(null); setPorEliminar({ ids: [id], horas: '', novedades }); }}
          onVerMarcacion={setJornadaId}
        />
      )}

      <ConfirmDialog
        abierto={porEliminar !== null}
        titulo={(porEliminar?.ids.length ?? 0) > 1
          ? `¿Eliminar las ${porEliminar!.ids.length} marcaciones de esta jornada?`
          : '¿Eliminar este registro?'}
        subtitulo={[
          porEliminar?.horas ? `Se borran ${porEliminar.horas}.` : null,
          // El aviso va primero en la frase y con su propio peso: es la parte que
          // el administrador no espera, y la única que puede mover la nómina.
          (porEliminar?.novedades ?? 0) > 0
            ? `También se elimina ${porEliminar!.novedades === 1 ? 'la novedad que se reportó' : `las ${porEliminar!.novedades} novedades que se reportaron`} al marcar esta salida.`
            : null,
          'Esta acción no se puede deshacer.',
        ].filter(Boolean).join(' ')}
        textoContinuar="Eliminar"
        peligro
        onContinuar={confirmarEliminar}
        onCancelar={() => setPorEliminar(null)}
      />

      {/* Guardar la jornada dejaría fotos del kiosco sin marca. Son evidencia de
          asistencia: se dice cuáles antes de borrarlas, y cancelar vuelve al
          formulario sin haber escrito nada. */}
      <ConfirmDialog
        abierto={fotosPorBorrar !== null}
        titulo="¿Guardar y borrar fotos del kiosco?"
        subtitulo={fotosPorBorrar ? avisoDeFotosPorBorrar(fotosPorBorrar) : undefined}
        textoContinuar="Borrar fotos y guardar"
        peligro
        onContinuar={borrarFotosYGuardar}
        onCancelar={() => setFotosPorBorrar(null)}
      />
    </div>
  );
}
