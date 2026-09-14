import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import {
  X, Edit2, Trash2, MapPin, UtensilsCrossed, Coffee, LogIn, LogOut,
  Info, CalendarClock, type LucideIcon,
} from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import FotosJornada from '../../components/FotosJornada';
import { TIPO_PERMISO_LABEL as TIPO_NOVEDAD } from '../../constants/permisos';
import { MOMENTO_LABEL, MOMENTO_TONO, type Momento } from '../../constants/momentos';
import { totalesDeDescansos, salioDentroDeSuVentana } from './resumenDeDescansos';

const TZ = 'America/Bogota';

export type SedeDelDetalle = { id?: string; nombre: string; activa: boolean };

// Lo que el servidor resume de cada pausa del día —almuerzo o descanso no
// remunerado—: si se tomó, cuánto duró y qué le costó al día.
export type ResumenDePausa = {
  estado: 'SIN_VENTANA' | 'MARCADO' | 'EN_CURSO' | 'ABIERTO' | 'NO_MARCADO';
  ventana: { inicio: string; fin: string } | null;
  salida: string | null; regreso: string | null;
  minutos: number | null; minutosVentana: number | null; minutosDescontados: number;
  regresoEstimado: boolean; seExcedio: boolean; minutosDeMas: number;
};

export type Jornada = {
  registro: {
    id: string; colaboradorId: string; fecha: string;
    entrada: string | null; salida: string | null;
    tipo: string; observacion: string | null;
    salidaEstimada: boolean; salidaAlmuerzo: boolean; salidaDescanso?: boolean; entradaEstimada: boolean;
    creadoEn: string; editadoPor: string | null; editadoEn: string | null;
    sede: SedeDelDetalle | null;
    // Dónde se marcó la salida de ESTA marcación. No es dónde se cerró la
    // jornada: en una con almuerzo es la salida a almorzar. Para eso, `sedes`.
    sedeSalida?: SedeDelDetalle | null;
    tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
    // La novedad que nació de esta marcación se borra con ella. El diálogo de
    // confirmación lo dice antes, no después.
    tieneNovedadLigada?: boolean;
  };
  colaborador: { nombre: string; apellido: string; cargo: string | null };
  fecha: string;
  dia: {
    programado: boolean; horaEntrada: string | null; horaSalida: string | null;
    toleranciaMin: number; toleranciaSalidaMin: number; ajustaEntrada: boolean;
    almuerzoMin: number; almuerzoInicio: string | null; almuerzoFin: string | null;
    // Los descansos que el horario pedía ese día, como lista (12 de septiembre de 2026).
    descansos?: { inicio: string; fin: string }[];
    minutosEsperados: number; congelado: boolean;
  } | null;
  tramos: {
    id: string; entrada: string | null; salida: string | null;
    salidaAlmuerzo: boolean; salidaDescanso?: boolean; entradaEstimada: boolean; salidaEstimada: boolean;
    // Qué es cada extremo de este tramo dentro del día. Lo decide el backend:
    // depende de los tramos vecinos, no del registro solo.
    momentoEntrada: Momento | null; momentoSalida: Momento | null;
    tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
    tieneNovedadLigada?: boolean;
  }[];
  // Dónde se abrió y dónde se cerró la JORNADA, con la regla de la fila de la
  // tabla. Opcional: un servidor anterior no lo manda, y que falte un dato no
  // puede tumbar el detalle. `abrioAtribuida` es la sede que se le atribuye al leer
  // a un presencial cuya jornada no abrió en una sede probada (decisión del dueño
  // del 12 de septiembre de 2026).
  sedes?: { abrio: SedeDelDetalle | null; cerro: SedeDelDetalle | null; abrioAtribuida?: SedeDelDetalle | null };
  almuerzo: ResumenDePausa;
  // Un resumen por cada descanso no remunerado del día, en su orden (12 de septiembre
  // de 2026). Opcional por la misma razón: un servidor anterior no lo manda, y entonces
  // ese día no tiene descansos que mostrar.
  descansos?: ResumenDePausa[];
  minutosDelDia: number;
  minutosTarde: number | null;
  motivoSinTardanza: string | null;
  festivo: { nombre: string } | null;
  // `remunerada` no es un campo guardado: sale del tipo más la política de la
  // empresa. Por eso viaja resuelto desde el servidor, y por eso cambiar el tipo
  // puede cambiar si ese tiempo se paga.
  novedad: {
    id: string; tipo: string; descripcion: string | null; aprobado: boolean;
    fechaInicio: string; fechaFin: string; horaInicio: string | null; horaFin: string | null;
    remunerada: boolean | null;
  } | null;
};

type Tramo = Jornada['tramos'][number];

const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : null;
const enHoras = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};
// «Sábado 12 de septiembre de 2026»: mayúscula solo al principio. Con `capitalize` salía
// «Sábado 12 De Septiembre De 2026», y también el cargo con cada palabra en mayúscula.
const fechaLarga = (s: string) => {
  const texto = format(toZonedTime(new Date(s), TZ), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// El diseño del detalle (13 de septiembre de 2026, aprobado por el dueño sobre una maqueta):
// los títulos de sección en letra normal, como en el formulario de la jornada.
const TITULO_DE_SECCION = 'text-sm font-medium text-ink mb-2 flex items-center gap-1.5';

// Por qué esta marcación no tiene medida de llegada. Un guion mudo en una
// columna de asistencia solo genera dudas; la razón las cierra.
const SIN_TARDANZA: Record<string, string> = {
  SIN_ENTRADA: 'Esta marcación no tiene hora de entrada.',
  NO_ES_PRIMERA: 'No es la primera entrada del día. La llegada tarde solo se mide en la primera, para que volver del almuerzo o del descanso no cuente como llegar tarde.',
  FESTIVO: 'Ese día era festivo.',
  NO_PROGRAMADO: 'Ese día no estaba programado en su horario.',
  SIN_HORARIO: 'Este colaborador no tiene un horario activo.',
};

type Pausa = 'ALMUERZO' | 'DESCANSO';

// Cómo se dice cada pausa. Todo junto, para que el detalle de un descanso nunca
// salga con los textos del almuerzo.
const PAUSA: Record<Pausa, { rotulo: string; Icono: LucideIcon; enCurso: string; salio: string }> = {
  ALMUERZO: { rotulo: 'Almuerzo', Icono: UtensilsCrossed, enCurso: 'Está almorzando', salio: 'Salió a almorzar' },
  DESCANSO: { rotulo: 'Descanso', Icono: Coffee, enCurso: 'Está en su descanso', salio: 'Salió a su descanso' },
};

function Chip({ tono, children }: { tono: string; children: React.ReactNode }) {
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tono}`}>{children}</span>;
}

// Un tiempo del día en su tarjeta. El rótulo es un <p> con solo su texto: así se encuentra la
// tarjeta, y lo que dice va debajo.
function Tarjeta({ rotulo, Icono, aviso = false, children }: {
  rotulo: string; Icono: LucideIcon; aviso?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${aviso ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className={`text-xs flex items-center gap-1.5 ${aviso ? 'text-amber-700' : 'text-muted'}`}>
        <Icono size={13} aria-hidden="true" />{rotulo}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// La pausa en su tarjeta: lo que PASÓ, no lo que costó. Esta celda mostraba los
// minutos descontados, así que a quien marcaba bien su pausa —y por eso no se le
// descuenta nada— le salía un guion, como si no hubiera parado, encima del detalle
// de su hora y media. Al revés de lo que hay que premiar. El costo va debajo, en
// pequeño.
function TarjetaDePausa({ tipo, p }: { tipo: Pausa; p: ResumenDePausa | null | undefined }) {
  const { rotulo, Icono } = PAUSA[tipo];
  return (
    <Tarjeta rotulo={rotulo} Icono={Icono}>
      {p?.salida ? (
        <>
          <p className="text-[15px] font-semibold text-ink tabular-nums">{hhmm(p.salida)} a {hhmm(p.regreso) ?? '···'}</p>
          <p className="text-xs text-muted">
            {p.minutosDescontados > 0 ? `se descontó ${enHoras(p.minutosDescontados)}` : 'no se le descontó nada'}
          </p>
        </>
      ) : p && p.minutosDescontados > 0 ? (
        <>
          <p className="text-[15px] font-semibold text-ink">−{enHoras(p.minutosDescontados)}</p>
          <p className="text-xs text-muted">{p.ventana ? 'no lo marcó' : 'fijo del horario'}</p>
        </>
      ) : <p className="text-[15px] text-gray-400">—</p>}
    </Tarjeta>
  );
}

// Varios descansos en una sola tarjeta (12 de septiembre de 2026): a cuántos salió y lo que
// costaron entre todos. El detalle de cada uno va abajo, una fila por descanso.
function TarjetaDeDescansos({ descansos }: { descansos: ResumenDePausa[] }) {
  const { marcados, de, minutosDescontados } = totalesDeDescansos(descansos);
  return (
    <Tarjeta rotulo="Descansos" Icono={Coffee}>
      <p className="text-[15px] font-semibold text-ink">{`${marcados} de ${de} marcados`}</p>
      <p className="text-xs text-muted">
        {minutosDescontados > 0 ? `se descontó ${enHoras(minutosDescontados)}` : 'no se le descontó nada'}
      </p>
    </Tarjeta>
  );
}

// Una pausa en curso o sin regreso. En curso no hay nada que corregir: se dice y
// ya, para que nadie salga a buscar una marcación que falta. Sin regreso, el
// resto del día no se está contando, y eso sí hay que corregirlo.
function AvisoDePausa({ tipo, p }: { tipo: Pausa; p: ResumenDePausa }) {
  const { Icono, enCurso, salio } = PAUSA[tipo];
  if (p.estado === 'EN_CURSO') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
        <Icono size={16} className="mt-0.5 shrink-0" />
        <span>
          {enCurso} desde las <b>{hhmm(p.salida)}</b>. Su jornada sigue
          abierta: marcará el regreso al volver.
        </span>
      </div>
    );
  }
  if (p.estado === 'ABIERTO') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-900 flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          {salio} a las <b>{hhmm(p.salida)}</b> y nunca volvió a marcar.
          El resto de ese día <b>no se está contando ni pagando</b>. Si siguió trabajando,
          agrega la marcación de la tarde con el botón <b>Editar</b> o creando una nueva.
        </span>
      </div>
    );
  }
  return null;
}

// Lo de MÁS es lo que se tomó menos lo que le corresponde, no lo que se pasó al
// volver: quien sale quince minutos antes y vuelve quince tarde se tomó media
// hora de más, no quince.
//
// Un DESCANSO cuya salida no cayó en la ventana donde quedó anotado no fue «dentro de su
// hora» aunque durara menos: se dice que fue fuera de su hora, sin verde, con lo que se
// descontó (12 de septiembre de 2026). Es Carla, cuya salida de las 15:00 quedó en el de
// 09:00 a 09:15 y salía «dentro de su hora · se descontó 15 min». El almuerzo NO se tocó
// porque no se pidió, pero tiene el mismo hueco: el kiosco deja salir a almorzar a
// cualquier hora (`puedeSalirA`, backend/src/utils/almuerzo.ts), y uno de 10:00 a 10:30
// con ventana de 12:00 a 13:00 sigue diciendo «dentro de su hora · se descontó 1h». Lo
// decide el dueño.
function EfectoEnElDia({ tipo, p }: { tipo: Pausa; p: ResumenDePausa }) {
  if (p.estado === 'EN_CURSO') return <p className="text-sm text-amber-700 font-semibold">Está fuera ahora</p>;
  if (p.estado === 'ABIERTO') return <p className="text-sm text-red-600 font-semibold">No volvió a marcar</p>;
  if (p.estado === 'MARCADO' && p.minutos !== null && p.minutosVentana !== null) {
    const deMas = p.minutos - p.minutosVentana;
    if (tipo === 'DESCANSO' && !salioDentroDeSuVentana(p)) return (
      <>
        <p className="text-sm text-orange-700 font-semibold">Fuera de su hora</p>
        <p className="text-xs text-muted">
          {p.minutosDescontados > 0 ? `se descontó ${enHoras(p.minutosDescontados)}` : 'no se le descontó nada'}
        </p>
        {deMas > 0 && <p className="text-xs text-muted">{`se tomó ${enHoras(deMas)} de más`}</p>}
      </>
    );
    if (deMas > 0) return (
      <>
        <p className="text-sm text-orange-700 font-semibold">−{enHoras(deMas)}</p>
        <p className="text-xs text-muted">se tomó de más</p>
      </>
    );
    return (
      <>
        <p className="text-sm text-green-700 font-semibold">Dentro de su hora</p>
        {p.minutosDescontados > 0 && <p className="text-xs text-muted">se descontó {enHoras(p.minutosDescontados)}</p>}
      </>
    );
  }
  return (
    <>
      <p className="text-sm text-ink">−{enHoras(p.minutosDescontados)}</p>
      <p className="text-xs text-muted">de la ventana, siguió marcado</p>
    </>
  );
}

// Una pausa con horario, en su fila del recuadro de pausas: lo que pedía su horario, lo que se
// tomó y lo que le costó al día. Antes era un bloque por pausa, cada uno con su título; ahora
// van juntas, como en el formulario de la jornada, y con varios descansos cada uno lleva su
// número (13 de septiembre de 2026).
function FilaDePausa({ tipo, p, ventana, nombre }: {
  tipo: Pausa; p: ResumenDePausa; ventana: { inicio: string; fin: string }; nombre: string;
}) {
  const { Icono } = PAUSA[tipo];
  return (
    <div role="group" aria-label={nombre}
      className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr] gap-x-4 gap-y-1.5 py-3 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icono size={17} className="text-gray-500 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{nombre}</p>
          {/* Los minutos van juntos: sueltos, «min» se partía a otra línea. */}
          <p className="text-xs text-muted">
            su horario {ventana.inicio} a {ventana.fin}
            {p.minutosVentana !== null && <span className="whitespace-nowrap">{` · ${enHoras(p.minutosVentana)}`}</span>}
          </p>
        </div>
      </div>
      <div className="pl-7 sm:pl-0">
        {p.salida ? (
          <>
            <p className="text-sm text-ink tabular-nums">{hhmm(p.salida)} a {hhmm(p.regreso) ?? '···'}</p>
            <p className="text-xs text-muted">
              se lo tomó{p.minutos !== null ? ` · ${enHoras(p.minutos)}` : ' · sigue fuera'}
              {p.regresoEstimado && ' · regreso estimado'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">no lo marcó</p>
        )}
      </div>
      <div className="pl-7 sm:pl-0">
        <EfectoEnElDia tipo={tipo} p={p} />
      </div>
    </div>
  );
}

// Una hora de una marcación, con el rótulo de lo que fue: la entrada, la salida a almorzar, el
// regreso del descanso. `sinHora` es lo que dice cuando esa marca no existe.
function HoraDeMarcacion({ momento, hora, sinHora, estimada, textoEstimada }: {
  momento: Momento; hora: string | null; sinHora: string; estimada: boolean; textoEstimada: string;
}) {
  return (
    <span className="flex-1 min-w-0">
      <span className={`block text-xs ${MOMENTO_TONO[momento]}`}>{MOMENTO_LABEL[momento]}</span>
      {hora
        ? <span className="block text-base font-semibold text-ink tabular-nums">{hhmm(hora)}</span>
        : <span className="block text-sm text-amber-700">{sinHora}</span>}
      {estimada && <span className="block text-[11px] text-amber-700">{textoEstimada}</span>}
    </span>
  );
}

// Una marcación del día en su fila (13 de septiembre de 2026, pedido del dueño): más alta y con
// cada hora rotulada con lo que fue, en vez de una línea con las notas pegadas a las horas.
//
// Sigue siendo un botón. Dejó de serlo cuando cada marcación tenía su fila en la tabla y bastaba
// cerrar y tocar la otra; ahora la jornada entera es UNA fila, así que esta lista es el único
// camino al regreso de una pausa —y a su foto, su hora y su botón de editar.
function FilaDeMarcacion({ t, numero, esEsta, onVer }: { t: Tramo; numero: number; esEsta: boolean; onVer: () => void }) {
  const minutos = t.entrada && t.salida
    ? Math.round((new Date(t.salida).getTime() - new Date(t.entrada).getTime()) / 60000)
    : null;
  return (
    <button type="button" disabled={esEsta} onClick={onVer}
      className={`w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-4 transition-colors ${
        esEsta ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}`}>
      <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center">
        {numero}
      </span>
      <HoraDeMarcacion momento={t.momentoEntrada ?? 'ENTRADA'} hora={t.entrada} sinHora="sin entrada"
        estimada={t.entradaEstimada} textoEstimada="regreso estimado" />
      <HoraDeMarcacion momento={t.momentoSalida ?? 'SALIDA'} hora={t.salida} sinHora="sin salida"
        estimada={t.salidaEstimada} textoEstimada="salida estimada" />
      <span className="shrink-0 min-w-[4.5rem] text-right text-sm text-muted tabular-nums">
        {minutos !== null ? enHoras(minutos) : ''}
      </span>
    </button>
  );
}

// Un dato de lo que pedía el horario, con su rótulo encima.
function DatoDelHorario({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="text-sm text-ink tabular-nums">{valor}</dd>
    </div>
  );
}

export type RegistroEditable = {
  id: string; colaboradorId: string; fecha: string;
  entrada: string | null; salida: string | null; tipo: string; observacion: string | null;
};

type Props = {
  registroId: string;
  onCerrar: () => void;
  // Se entregan los datos, no solo el id: la marcación puede no estar en la
  // lista que tiene la tabla cargada (otro tramo del día, otro rango de fechas),
  // y buscarla allí dejaba el botón sin hacer nada.
  onEditar: (registro: RegistroEditable) => void;
  // Va también cuántas novedades se llevará por delante: el aviso se arma en la
  // pantalla que muestra el diálogo, pero solo aquí se sabe el número.
  onEliminar: (registroId: string, novedadesLigadas: number) => void;
  // Saltar a otra marcación del día. Desde que la tabla muestra una fila por
  // JORNADA, el regreso de una pausa ya no tiene fila propia: si no se puede
  // llegar a él desde aquí, no se puede llegar de ninguna forma.
  onVerMarcacion: (registroId: string) => void;
};

export default function ModalJornada({ registroId, onCerrar, onEditar, onEliminar, onVerMarcacion }: Props) {
  const [j, setJ] = useState<Jornada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);
  const [confirmarBorrarNovedad, setConfirmarBorrarNovedad] = useState(false);

  // Al saltar a otro tramo el componente se remonta (lleva `key={registroId}`),
  // así que el estado arranca limpio solo y no hay que resetearlo aquí dentro.
  useEffect(() => {
    let vigente = true;
    api.get(`/registros/${registroId}/jornada`)
      .then(r => { if (vigente) setJ(r.data); })
      .catch(err => {
        if (!vigente) return;
        setError(err.response?.status === 404
          ? 'Esta marcación ya no existe. Puede que alguien la haya borrado.'
          : 'No pudimos cargar el detalle de esta marcación.');
      });
    return () => { vigente = false; };
  }, [registroId]);

  // La novedad se resuelve aquí, que es donde el administrador la está mirando.
  // Mandarlo a otra pantalla para aprobar lo que acaba de leer es la forma más
  // segura de que no lo apruebe nunca, y una novedad sin decidir es tiempo que
  // no se está pagando —o que se está pagando— sin que nadie lo haya resuelto.
  const guardarNovedad = async (cambios: { tipo?: string; aprobado?: boolean }) => {
    if (!j?.novedad) return;
    setGuardandoNovedad(true);
    try {
      await api.put(`/permisos/${j.novedad.id}`, cambios);
      const { data } = await api.get(`/registros/${registroId}/jornada`);
      setJ(data);
    } catch {
      setError('No pudimos guardar el cambio en la novedad.');
    }
    setGuardandoNovedad(false);
  };

  // Borrar la novedad sin salir del día. Hasta ahora una novedad se podía crear
  // y aprobar pero no quitar, así que las que quedaron huérfanas de una marcación
  // borrada —las creadas antes de que existiera el vínculo— no había forma de
  // limpiarlas desde ninguna pantalla.
  const eliminarNovedad = async () => {
    if (!j?.novedad) return;
    setGuardandoNovedad(true);
    try {
      await api.delete(`/permisos/${j.novedad.id}`);
      setConfirmarBorrarNovedad(false);
      const { data } = await api.get(`/registros/${registroId}/jornada`);
      setJ(data);
    } catch {
      setError('No pudimos eliminar la novedad.');
    }
    setGuardandoNovedad(false);
  };

  const r = j?.registro;
  // Las sedes de la JORNADA, no de esta marcación suelta: en una jornada con
  // almuerzo, la salida de la primera marcación es la de almorzar. Un servidor
  // anterior no manda `sedes`, y entonces solo se sabe dónde abrió esta.
  const abrio = j?.sedes ? j.sedes.abrio : r?.sede ?? null;
  const cerro = j?.sedes ? j.sedes.cerro : null;
  const abrioAtribuida = j?.sedes?.abrioAtribuida ?? null;
  const entrada = hhmm(r?.entrada ?? null);
  const a = j?.almuerzo;
  // Los descansos del día, cada uno con su ventana. Con uno solo va en su tarjeta como el
  // almuerzo; con varios, una tarjeta los resume y abajo va una fila por cada uno.
  const ds = j?.descansos ?? [];
  // Los descansos que el horario pedía ese día. Opcional: un servidor anterior no los manda.
  const descansosDelDia = j?.dia?.descansos ?? [];
  const hayVentanaDeDescanso = ds.some(p => p.ventana);
  const hayPausasConHorario = !!a?.ventana || hayVentanaDeDescanso;

  // Los extremos del DÍA, no de esta marcación: la primera entrada, y la salida solo si la
  // última marcación la cerró. Antes se tomaba la última marcación que tuviera salida, y una
  // jornada que volvió del descanso y no marcó la salida decía «Salió 17:32», la hora en que
  // salió al descanso (13 de septiembre de 2026). Un servidor anterior no manda el momento de
  // cada marca, y entonces se lee de las banderas de la pausa.
  const primeraEntrada = j ? hhmm(j.tramos.find(t => t.entrada)?.entrada ?? null) : null;
  const ultimo = j && j.tramos.length > 0 ? j.tramos[j.tramos.length - 1] : null;
  const cierraLaJornada = !!ultimo?.salida && (ultimo.momentoSalida
    ? ultimo.momentoSalida === 'SALIDA'
    : !ultimo.salidaAlmuerzo && !ultimo.salidaDescanso);
  const salidaDelDia = cierraLaJornada ? hhmm(ultimo!.salida) : null;
  const sinSalida = !!ultimo && !cierraLaJornada;
  const salidaDelSistema = ultimo ? ultimo.salidaEstimada : !!r?.salidaEstimada;

  // Lo contado frente a lo que pedía el horario, para la barra. Sin «cuánto falta»: la deuda de
  // verdad sale del saldo del período, que tiene en cuenta más que un día (decisión del dueño del
  // 13 de septiembre de 2026). La barra no pasa del 100 aunque haya trabajado de más.
  const porcentaje = j?.dia?.programado && j.dia.minutosEsperados > 0
    ? Math.min(100, Math.round((j.minutosDelDia / j.dia.minutosEsperados) * 100))
    : null;
  const almuerzoDelHorario = j?.dia?.almuerzoInicio && j.dia.almuerzoFin
    ? `${j.dia.almuerzoInicio} a ${j.dia.almuerzoFin}`
    : j?.dia && j.dia.almuerzoMin > 0 ? enHoras(j.dia.almuerzoMin) : null;

  return (
    <>
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="titulo-del-detalle"
        onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h3 id="titulo-del-detalle" className="font-bold text-xl text-ink truncate">
              {entrada ? `Marcación de las ${entrada}` : 'Marcación sin hora de entrada'}
            </h3>
            {j && (
              <p className="text-sm text-muted truncate">
                {j.colaborador.nombre} {j.colaborador.apellido}
                {j.colaborador.cargo && ` · ${j.colaborador.cargo}`} · {fechaLarga(j.fecha)}
              </p>
            )}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="shrink-0 p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-center text-red-500 py-10 text-sm px-6">{error}</p>}
        {!j && !error && <p className="text-center text-gray-400 py-10 text-sm">Cargando la jornada...</p>}

        {j && r && (
          <div className="p-6 space-y-5">
            {/* Estado de un vistazo. Solo lo que es del DÍA: «Salió a almorzar» hablaba de la
                primera marcación, que la lista de abajo ya dice, y dos parejas de etiquetas
                decían lo mismo con otras palabras (13 de septiembre de 2026). */}
            <div className="flex flex-wrap gap-1.5">
              {sinSalida && <Chip tono="bg-amber-50 text-amber-700">Sin salida</Chip>}
              {salidaDelSistema && <Chip tono="bg-amber-100 text-amber-800">Salida puesta por el sistema</Chip>}
              {r.entradaEstimada && <Chip tono="bg-amber-50 text-amber-700">Regreso puesto por el sistema</Chip>}
              {r.editadoPor && <Chip tono="bg-gray-100 text-gray-700">Corregido a mano</Chip>}
              {j.festivo && <Chip tono="bg-purple-100 text-purple-700">Festivo: {j.festivo.nombre}</Chip>}
              {j.novedad && (
                <Chip tono={j.novedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                  Novedad {j.novedad.aprobado ? 'aprobada' : 'pendiente'}: {j.novedad.tipo}
                </Chip>
              )}
              {j.dia && !j.dia.programado && <Chip tono="bg-gray-100 text-gray-600">Día de descanso</Chip>}
              {/* La sede de la JORNADA: dónde se abrió, y dónde se cerró si fue
                  en otra. Se compara por id, porque dos sedes pueden llamarse
                  igual. Un cierre sin sede registrada no dice nada: no es «cerró
                  en otra parte», es «no se sabe». */}
              {abrio && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                  <MapPin size={12} /> {cerro && cerro.id !== abrio.id ? 'Abrió en ' : ''}{abrio.nombre}{!abrio.activa && ' (desactivada)'}
                </span>
              )}
              {cerro && (!abrio || cerro.id !== abrio.id) && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 inline-flex items-center gap-1">
                  <MapPin size={12} /> Cerró en {cerro.nombre}{!cerro.activa && ' (desactivada)'}
                </span>
              )}
              {/* Sin ninguna sede probada, la que se le atribuye al leer (decisión del dueño del 12
                  de septiembre de 2026), y desde el 13 solo con su nombre: el dueño pidió quitar
                  «por defecto». Con una probada no sale: «Abrió en» y «Cerró en» son solo de lo
                  que probó la ubicación. */}
              {!abrio && !cerro && abrioAtribuida && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                  <MapPin size={12} /> {abrioAtribuida.nombre}{!abrioAtribuida.activa && ' (desactivada)'}
                </span>
              )}
            </div>

            {/* Lo primero que se pregunta el administrador: ¿trabajó su jornada? Cada tiempo en
                su tarjeta, y la llegada pegada a la hora que la produce. */}
            <div className={`grid grid-cols-2 gap-2 ${hayVentanaDeDescanso ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <Tarjeta rotulo="Entró" Icono={LogIn}>
                <p className="text-lg font-semibold text-ink tabular-nums">{primeraEntrada ?? '—'}</p>
                {j.minutosTarde === null ? (
                  <p className="text-xs text-muted"
                    title={SIN_TARDANZA[j.motivoSinTardanza ?? ''] ?? 'No se puede medir la llegada.'}>
                    sin medir
                  </p>
                ) : j.minutosTarde > 0 ? (
                  <p className="text-xs text-orange-700 font-semibold"
                    title={`Entraba a las ${j.dia?.horaEntrada}${(j.dia?.toleranciaMin ?? 0) > 0 ? ` con ${j.dia!.toleranciaMin} min de tolerancia` : ''}`}>
                    {enHoras(j.minutosTarde)} tarde
                  </p>
                ) : (
                  <p className="text-xs text-green-700" title={`Entraba a las ${j.dia?.horaEntrada}`}>a tiempo</p>
                )}
              </Tarjeta>
              <Tarjeta rotulo="Salió" Icono={LogOut} aviso={sinSalida}>
                <p className={`text-lg font-semibold tabular-nums ${sinSalida ? 'text-amber-800' : 'text-ink'}`}>{salidaDelDia ?? '—'}</p>
                {sinSalida && <p className="text-xs text-amber-700">sin salida</p>}
                {salidaDelDia && salidaDelSistema && <p className="text-xs text-amber-700">la puso el sistema</p>}
              </Tarjeta>
              <TarjetaDePausa tipo="ALMUERZO" p={a} />
              {hayVentanaDeDescanso && (ds.length === 1
                ? <TarjetaDePausa tipo="DESCANSO" p={ds[0]} />
                : <TarjetaDeDescansos descansos={ds} />)}
            </div>

            <div className="space-y-1.5">
              <div className="rounded-xl border border-primary px-4 py-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Contado ese día</p>
                    <p className="text-2xl font-bold text-ink tabular-nums">{enHoras(j.minutosDelDia)}</p>
                  </div>
                  {j.dia?.programado && (
                    <p className="text-sm text-gray-600 text-right">el horario pedía {enHoras(j.dia.minutosEsperados)}</p>
                  )}
                </div>
                {porcentaje !== null && (
                  <div role="progressbar" aria-label="Contado frente a lo que pedía el horario"
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}
                    className="h-1.5 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${porcentaje}%` }} />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted">
                Suma todas las marcaciones del día, ya sin almuerzo ni descansos. No es plata: las horas
                ordinarias, extras y recargos están en Reportes.
              </p>
            </div>

            {a && <AvisoDePausa tipo="ALMUERZO" p={a} />}
            {ds.map((p, i) => <AvisoDePausa key={i} tipo="DESCANSO" p={p} />)}

            {/* La observación, que es lo único de la marcación que no cabe
                arriba. El resto —llegada, sede, horas— se subió a la cabecera:
                aquí repetía lo que las tarjetas ya decían y lo que la lista de abajo
                vuelve a decir marcación por marcación. */}
            {r.observacion && (
              <p className="text-sm text-ink bg-blue-50 rounded-xl px-4 py-3">{r.observacion}</p>
            )}

            {/* La novedad del día: verla, decidirla y, si el tipo estaba mal,
                corregirlo. El tipo es lo que decide si ese tiempo se paga, así
                que cambiarlo aquí es cambiar plata: se dice en la misma línea. */}
            {j.novedad && (
              <div>
                <p className={TITULO_DE_SECCION}>
                  <CalendarClock size={14} /> Novedad de este día
                </p>
                <div className={`rounded-xl px-4 py-3 space-y-2.5 text-sm border ${
                  j.novedad.aprobado ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/60 border-amber-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tono={j.novedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                      {j.novedad.aprobado ? 'Aprobada' : 'Sin aprobar'}
                    </Chip>
                    {j.novedad.remunerada !== null && (
                      <Chip tono={j.novedad.remunerada ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}>
                        {j.novedad.remunerada ? 'Se paga' : 'No se paga'}
                      </Chip>
                    )}
                    {j.novedad.horaInicio && j.novedad.horaFin && (
                      <span className="text-xs text-muted">{j.novedad.horaInicio} a {j.novedad.horaFin}</span>
                    )}
                  </div>

                  {j.novedad.descripcion && (
                    <p className="text-ink bg-white/70 rounded-lg px-3 py-2">{j.novedad.descripcion}</p>
                  )}

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[190px]">
                      <label className="block text-xs text-muted mb-1">Motivo</label>
                      <select value={j.novedad.tipo} disabled={guardandoNovedad}
                        onChange={e => guardarNovedad({ tipo: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60">
                        {Object.entries(TIPO_NOVEDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <button disabled={guardandoNovedad}
                      onClick={() => guardarNovedad({ aprobado: !j.novedad!.aprobado })}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 ${
                        j.novedad.aprobado
                          ? 'border border-gray-300 text-ink hover:bg-gray-50'
                          : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                      {guardandoNovedad ? 'Guardando...' : j.novedad.aprobado ? 'Quitar la aprobación' : 'Aprobar'}
                    </button>
                    <button disabled={guardandoNovedad}
                      onClick={() => setConfirmarBorrarNovedad(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60">
                      Eliminar novedad
                    </button>
                  </div>

                  <p className="text-[11px] text-muted">
                    {j.novedad.remunerada === null ? '' : j.novedad.remunerada
                      ? 'Con este motivo, ese tiempo se paga como trabajado.'
                      : 'Con este motivo, ese tiempo no se paga y queda como deuda.'}
                    {' '}Solo cuenta para la liquidación cuando está aprobada.
                  </p>
                </div>
              </div>
            )}

            {/* Las pausas del día que tienen horario, juntas en un recuadro */}
            {hayPausasConHorario && (
              <section aria-labelledby="titulo-pausas-del-dia">
                <p id="titulo-pausas-del-dia" className={TITULO_DE_SECCION}>Pausas de este día</p>
                <div className="bg-blue-50 rounded-xl px-4">
                  {a?.ventana && <FilaDePausa tipo="ALMUERZO" p={a} ventana={a.ventana} nombre="Almuerzo" />}
                  {ds.map((p, i) => p.ventana && (
                    <FilaDePausa key={i} tipo="DESCANSO" p={p} ventana={p.ventana}
                      nombre={ds.length > 1 ? `Descanso ${i + 1}` : 'Descanso'} />
                  ))}
                </div>
              </section>
            )}

            {/* El resto del día */}
            {j.tramos.length > 1 && (
              <section aria-labelledby="titulo-marcaciones-del-dia">
                <p id="titulo-marcaciones-del-dia" className={TITULO_DE_SECCION}>
                  Las {j.tramos.length} marcaciones de ese día
                </p>
                <div className="space-y-2">
                  {j.tramos.map((t, i) => (
                    <FilaDeMarcacion key={t.id} t={t} numero={i + 1} esEsta={t.id === r.id}
                      onVer={() => onVerMarcacion(t.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Lo que el horario exigía ese día, cada dato con su rótulo */}
            {j.dia && (
              <section aria-labelledby="titulo-horario-del-dia">
                <p id="titulo-horario-del-dia" className={TITULO_DE_SECCION}>Lo que el horario pedía ese día</p>
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
                  <Chip tono={j.dia.congelado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}>
                    {j.dia.congelado ? 'Guardado ese día' : 'Reconstruido con el horario actual'}
                  </Chip>
                  {j.dia.programado ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-3">
                      <DatoDelHorario rotulo="Entrada y salida" valor={`${j.dia.horaEntrada} a ${j.dia.horaSalida}`} />
                      <DatoDelHorario rotulo="Tolerancia de llegada" valor={`${j.dia.toleranciaMin} min`} />
                      {j.dia.toleranciaSalidaMin > 0 && (
                        <DatoDelHorario rotulo="Tolerancia de salida" valor={`${j.dia.toleranciaSalidaMin} min`} />
                      )}
                      {/* El almuerzo no aparecía, y es lo que más resta de lo exigido. */}
                      {almuerzoDelHorario && <DatoDelHorario rotulo="Almuerzo" valor={almuerzoDelHorario} />}
                      {/* Los descansos que pedía ese día (12 de septiembre de 2026). Restan de lo
                          exigido igual que el almuerzo, así que sin ellos la sección no decía por
                          qué el día pedía menos. */}
                      {descansosDelDia.length > 0 && (
                        <DatoDelHorario
                          rotulo={descansosDelDia.length === 1 ? 'Descanso no remunerado' : 'Descansos no remunerados'}
                          valor={descansosDelDia.map(d => `${d.inicio} a ${d.fin}`).join(' · ')} />
                      )}
                    </dl>
                  ) : (
                    <p className="mt-2">Ese día no estaba programado en su horario.</p>
                  )}
                  {!j.dia.congelado && (
                    <p className="text-xs text-muted mt-3">
                      Este día se armó con el horario que tiene hoy esta persona, que es el mismo
                      que se usó para liquidarlo. Solo cambiaría si le modificas el horario.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Verificación facial: la evidencia del DÍA, no la de esta
                marcación. Mostrar solo el par de la marcación abierta era el bug:
                en una jornada con almuerzo, la foto de la salida a almorzar
                aparecía rotulada "Salida" —como si la persona se hubiera ido a su
                casa a las 14:04 cuando volvió a las 14:50— y las dos marcas de la
                tarde no se veían por ningún lado. */}
            <FotosJornada registroId={registroId} />

            {/* Rastro de cambios y acciones */}
            <div className="border-t border-gray-100 pt-4 flex flex-wrap items-end justify-between gap-3">
              <div className="text-xs text-muted space-y-0.5">
                <p>Creado el {format(toZonedTime(new Date(r.creadoEn), TZ), "d 'de' MMMM 'a las' HH:mm", { locale: es })}</p>
                {r.editadoEn ? (
                  <p>
                    Última corrección: {r.editadoPor === 'SISTEMA' ? 'el sistema' : r.editadoPor},
                    {' '}{format(toZonedTime(new Date(r.editadoEn), TZ), "d 'de' MMMM 'a las' HH:mm", { locale: es })}.
                    {' '}Solo se guarda la última: no queda registro de qué campo cambió.
                  </p>
                ) : <p>Sin correcciones desde que se creó.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEliminar(r.id, r.tieneNovedadLigada ? 1 : 0)}
                  className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50">
                  <Trash2 size={14} /> Eliminar
                </button>
                <button onClick={() => onEditar({
                  id: r.id, colaboradorId: r.colaboradorId, fecha: r.fecha,
                  entrada: r.entrada, salida: r.salida, tipo: r.tipo, observacion: r.observacion,
                })}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-lg text-sm font-semibold">
                  <Edit2 size={14} /> Editar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Fuera del contenedor del modal, no dentro: ese div tiene fondo difuminado
        y animación, que crean un bloque contenedor y hacen que un `fixed` hijo se
        posicione contra ÉL en vez de contra la ventana. Metido ahí dentro, el
        diálogo salía encogido y encima del contenido, en lugar de cubrir la
        pantalla. Como hermano, su z-[60] sí queda por encima de todo. */}
    <ConfirmDialog
      abierto={confirmarBorrarNovedad}
      peligro
      titulo="¿Eliminar esta novedad?"
      subtitulo={j?.novedad?.aprobado
        ? 'Estaba APROBADA, así que sus días no se exigían. Al eliminarla vuelven a contar como ausencia y la liquidación cambia. No se puede deshacer.'
        : 'La marcación de ese día no se toca. Esta acción no se puede deshacer.'}
      textoContinuar={guardandoNovedad ? 'Eliminando...' : 'Sí, eliminar'}
      onContinuar={eliminarNovedad}
      onCancelar={() => setConfirmarBorrarNovedad(false)}
    />
    </>
  );
}
