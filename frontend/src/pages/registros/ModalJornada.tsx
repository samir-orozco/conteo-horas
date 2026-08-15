import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import {
  X, Edit2, Trash2, MapPin, UtensilsCrossed,
  Info, CalendarClock,
} from 'lucide-react';
import api from '../../lib/api';
import FotosJornada from '../../components/FotosJornada';
import { TIPO_PERMISO_LABEL as TIPO_NOVEDAD } from '../../constants/permisos';
import { type Momento } from '../../constants/momentos';

const TZ = 'America/Bogota';

export type Jornada = {
  registro: {
    id: string; colaboradorId: string; fecha: string;
    entrada: string | null; salida: string | null;
    tipo: string; observacion: string | null;
    salidaEstimada: boolean; salidaAlmuerzo: boolean; entradaEstimada: boolean;
    creadoEn: string; editadoPor: string | null; editadoEn: string | null;
    sede: { nombre: string; activa: boolean } | null;
    tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
  };
  colaborador: { nombre: string; apellido: string; cargo: string | null };
  fecha: string;
  dia: {
    programado: boolean; horaEntrada: string | null; horaSalida: string | null;
    toleranciaMin: number; toleranciaSalidaMin: number; ajustaEntrada: boolean;
    almuerzoMin: number; almuerzoInicio: string | null; almuerzoFin: string | null;
    minutosEsperados: number; congelado: boolean;
  } | null;
  tramos: {
    id: string; entrada: string | null; salida: string | null;
    salidaAlmuerzo: boolean; entradaEstimada: boolean; salidaEstimada: boolean;
    // Qué es cada extremo de este tramo dentro del día. Lo decide el backend:
    // depende de los tramos vecinos, no del registro solo.
    momentoEntrada: Momento | null; momentoSalida: Momento | null;
    tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
  }[];
  almuerzo: {
    estado: 'SIN_VENTANA' | 'MARCADO' | 'EN_CURSO' | 'ABIERTO' | 'NO_MARCADO';
    ventana: { inicio: string; fin: string } | null;
    salida: string | null; regreso: string | null;
    minutos: number | null; minutosVentana: number | null; minutosDescontados: number;
    regresoEstimado: boolean; seExcedio: boolean; minutosDeMas: number;
  };
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

const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : null;
const enHoras = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};
const fechaLarga = (s: string) =>
  format(toZonedTime(new Date(s), TZ), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

// Por qué esta marcación no tiene medida de llegada. Un guion mudo en una
// columna de asistencia solo genera dudas; la razón las cierra.
const SIN_TARDANZA: Record<string, string> = {
  SIN_ENTRADA: 'Esta marcación no tiene hora de entrada.',
  NO_ES_PRIMERA: 'No es la primera entrada del día. La llegada tarde solo se mide en la primera, para que volver del descanso no cuente como llegar tarde.',
  FESTIVO: 'Ese día era festivo.',
  NO_PROGRAMADO: 'Ese día no estaba programado en su horario.',
  SIN_HORARIO: 'Este colaborador no tiene un horario activo.',
};

function Chip({ tono, children }: { tono: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tono}`}>{children}</span>;
}

function Dato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{rotulo}</p>
      <div className="text-sm text-ink">{children}</div>
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
  onEliminar: (registroId: string) => void;
  // Saltar a otra marcación del día. Desde que la tabla muestra una fila por
  // JORNADA, el regreso del almuerzo ya no tiene fila propia: si no se puede
  // llegar a él desde aquí, no se puede llegar de ninguna forma.
  onVerMarcacion: (registroId: string) => void;
};

export default function ModalJornada({ registroId, onCerrar, onEditar, onEliminar, onVerMarcacion }: Props) {
  const [j, setJ] = useState<Jornada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);

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

  const r = j?.registro;
  const entrada = hhmm(r?.entrada ?? null);
  const a = j?.almuerzo;

  // Extremos del día: la primera entrada y la última salida de todos los tramos.
  const primeraEntrada = j ? hhmm(j.tramos.find(t => t.entrada)?.entrada ?? null) : null;
  const ultimaSalida = j ? hhmm([...j.tramos].reverse().find(t => t.salida)?.salida ?? null) : null;

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-ink truncate">
              {entrada ? `Marcación de las ${entrada}` : 'Marcación sin hora de entrada'}
            </h3>
            {j && (
              <p className="text-xs text-muted capitalize truncate">
                {j.colaborador.nombre} {j.colaborador.apellido}
                {j.colaborador.cargo && ` · ${j.colaborador.cargo}`} · {fechaLarga(j.fecha)}
              </p>
            )}
          </div>
          <button onClick={onCerrar} className="shrink-0"><X size={20} className="text-gray-400" /></button>
        </div>

        {error && <p className="text-center text-red-500 py-10 text-sm px-6">{error}</p>}
        {!j && !error && <p className="text-center text-gray-400 py-10 text-sm">Cargando la jornada...</p>}

        {j && r && (
          <div className="p-6 space-y-5">
            {/* Estado de un vistazo */}
            <div className="flex flex-wrap gap-1.5">
              {r.entrada && !r.salida && <Chip tono="bg-green-100 text-green-800">Está adentro ahora</Chip>}
              {r.salidaEstimada && <Chip tono="bg-amber-50 text-amber-700">El sistema cerró este turno</Chip>}
              {r.salidaAlmuerzo && <Chip tono="bg-yellow-50 text-yellow-700">Salió a su descanso</Chip>}
              {r.entradaEstimada && <Chip tono="bg-amber-50 text-amber-700">Regreso puesto por el sistema</Chip>}
              {r.editadoPor && <Chip tono="bg-blue-50 text-blue-700">Corregido a mano</Chip>}
              {j.festivo && <Chip tono="bg-purple-100 text-purple-700">Festivo: {j.festivo.nombre}</Chip>}
              {j.novedad && (
                <Chip tono={j.novedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                  Novedad {j.novedad.aprobado ? 'aprobada' : 'pendiente'}: {j.novedad.tipo}
                </Chip>
              )}
              {j.dia && !j.dia.programado && <Chip tono="bg-gray-100 text-gray-600">Día de descanso</Chip>}
              {r.sede && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                  <MapPin size={10} /> {r.sede.nombre}{!r.sede.activa && ' (desactivada)'}
                </span>
              )}
              {r.salidaEstimada && (
                <Chip tono="bg-amber-100 text-amber-800">Salida puesta por el sistema</Chip>
              )}
              {r.entrada && !r.salida && (
                <Chip tono="bg-green-100 text-green-800">Sigue adentro</Chip>
              )}
            </div>

            {/* Lo primero que se pregunta el administrador: ¿trabajó su jornada? */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* La llegada va aquí, pegada a la hora que la produce, en vez de
                  en un bloque aparte con su propia frase. */}
              <Dato rotulo="Entró">
                <span className="font-mono text-green-700">{primeraEntrada ?? '—'}</span>
                {j.minutosTarde === null ? (
                  <p className="text-[11px] text-muted"
                    title={SIN_TARDANZA[j.motivoSinTardanza ?? ''] ?? 'No se puede medir la llegada.'}>
                    sin medir
                  </p>
                ) : j.minutosTarde > 0 ? (
                  <p className="text-[11px] text-orange-700 font-semibold"
                    title={`Entraba a las ${j.dia?.horaEntrada}${(j.dia?.toleranciaMin ?? 0) > 0 ? ` con ${j.dia!.toleranciaMin} min de tolerancia` : ''}`}>
                    {enHoras(j.minutosTarde)} tarde
                  </p>
                ) : (
                  <p className="text-[11px] text-green-700" title={`Entraba a las ${j.dia?.horaEntrada}`}>a tiempo</p>
                )}
              </Dato>
              <Dato rotulo="Salió"><span className="font-mono text-red-600">{ultimaSalida ?? '—'}</span></Dato>
              {/* Lo que PASÓ, no lo que costó. Esta celda mostraba los minutos
                  descontados, así que a quien marcaba bien su descanso —y por eso
                  no se le descuenta nada— le salía un guion, como si no hubiera
                  descansado, encima del detalle de su hora y media. Al revés de
                  lo que hay que premiar. El costo va debajo, en pequeño. */}
              <Dato rotulo="Descanso">
                {a?.salida ? (
                  <>
                    <span className="font-mono text-sm">{hhmm(a.salida)} → {hhmm(a.regreso) ?? '···'}</span>
                    <p className="text-[11px] text-muted">
                      {a.minutosDescontados > 0
                        ? `se descontó ${enHoras(a.minutosDescontados)}`
                        : 'no se le descontó nada'}
                    </p>
                  </>
                ) : a && a.minutosDescontados > 0 ? (
                  <>−{enHoras(a.minutosDescontados)}
                    <p className="text-[11px] text-muted">{a.ventana ? 'no lo marcó' : 'fijo del horario'}</p></>
                ) : <span className="text-gray-400">—</span>}
              </Dato>
              <Dato rotulo="Contado ese día">
                <b className="text-base">{enHoras(j.minutosDelDia)}</b>
                {j.dia?.programado && (
                  <p className="text-[11px] text-muted">el horario pedía {enHoras(j.dia.minutosEsperados)}</p>
                )}
              </Dato>
            </div>
            <p className="text-[11px] text-muted -mt-3">
              El tiempo contado suma todas las marcaciones del día y ya tiene descontado el descanso.
              No es plata: el reparto en horas ordinarias, extras y recargos está en Reportes.
            </p>

            {/* Está descansando ahora mismo. No hay nada que corregir: se dice y
                ya, para que nadie salga a buscar una marcación que falta. */}
            {a?.estado === 'EN_CURSO' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                <UtensilsCrossed size={16} className="mt-0.5 shrink-0" />
                <span>
                  Está en su descanso desde las <b>{hhmm(a.salida)}</b>. Su jornada sigue
                  abierta: marcará el regreso al volver.
                </span>
              </div>
            )}

            {/* Salió a su descanso y nunca volvió: la tarde no se está contando. */}
            {a?.estado === 'ABIERTO' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-900 flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  Salió a su descanso a las <b>{hhmm(a.salida)}</b> y nunca volvió a marcar.
                  El resto de ese día <b>no se está contando ni pagando</b>. Si siguió trabajando,
                  agrega la marcación de la tarde con el botón <b>Editar</b> o creando una nueva.
                </span>
              </div>
            )}

            {/* La observación, que es lo único de la marcación que no cabe
                arriba. El resto —llegada, sede, horas— se subió a la cabecera:
                aquí repetía lo que la tira ya decía y lo que la lista de abajo
                vuelve a decir marcación por marcación. */}
            {r.observacion && (
              <p className="text-sm text-ink bg-gray-50 rounded-xl px-4 py-3">{r.observacion}</p>
            )}

            {/* La novedad del día: verla, decidirla y, si el tipo estaba mal,
                corregirlo. El tipo es lo que decide si ese tiempo se paga, así
                que cambiarlo aquí es cambiar plata: se dice en la misma línea. */}
            {j.novedad && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                  <CalendarClock size={13} /> Novedad de este día
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
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">Motivo</label>
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

            {/* El descanso del día */}
            {a?.ventana && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                  <UtensilsCrossed size={13} /> Descanso de este día
                </p>
                {/* En tarjetas, como la tira de arriba: tres datos que se leen
                    de un vistazo en vez de cuatro frases seguidas. Y sin el
                    párrafo que explicaba la mecánica del descuento: quien abre
                    este bloque quiere saber qué pasó ese día, no cómo funciona
                    el motor. */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Dato rotulo="Su horario">
                    <span className="font-mono text-sm">{a.ventana.inicio} → {a.ventana.fin}</span>
                    {a.minutosVentana !== null && (
                      <p className="text-[11px] text-muted">{enHoras(a.minutosVentana)}</p>
                    )}
                  </Dato>

                  <Dato rotulo="Se lo tomó">
                    {a.salida ? (
                      <>
                        <span className="font-mono text-sm">{hhmm(a.salida)} → {hhmm(a.regreso) ?? '···'}</span>
                        <p className="text-[11px] text-muted">
                          {a.minutos !== null ? enHoras(a.minutos) : 'sigue fuera'}
                          {a.regresoEstimado && ' · regreso estimado'}
                        </p>
                      </>
                    ) : (
                      <span className="text-sm text-muted">no lo marcó</span>
                    )}
                  </Dato>

                  {/* Lo de MÁS es lo que se tomó menos lo que le corresponde, no
                      lo que se pasó al volver: quien sale quince minutos antes y
                      vuelve quince tarde se tomó media hora de más, no quince. */}
                  <Dato rotulo="Efecto en el día">
                    {(() => {
                      if (a.estado === 'EN_CURSO') return <span className="text-sm text-amber-700 font-semibold">está fuera ahora</span>;
                      if (a.estado === 'ABIERTO') return <span className="text-sm text-red-600 font-semibold">no volvió a marcar</span>;
                      if (a.estado === 'MARCADO' && a.minutos !== null && a.minutosVentana !== null) {
                        const deMas = a.minutos - a.minutosVentana;
                        if (deMas > 0) return (
                          <>
                            <span className="text-sm text-orange-700 font-semibold">−{enHoras(deMas)}</span>
                            <p className="text-[11px] text-muted">se tomó de más</p>
                          </>
                        );
                        return (
                          <>
                            <span className="text-sm text-green-700 font-semibold">dentro de su hora</span>
                            {a.minutosDescontados > 0 && (
                              <p className="text-[11px] text-muted">se descontó {enHoras(a.minutosDescontados)}</p>
                            )}
                          </>
                        );
                      }
                      return (
                        <>
                          <span className="text-sm">−{enHoras(a.minutosDescontados)}</span>
                          <p className="text-[11px] text-muted">de la ventana, siguió marcado</p>
                        </>
                      );
                    })()}
                  </Dato>
                </div>
              </div>
            )}

            {/* El resto del día */}
            {j.tramos.length > 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Las {j.tramos.length} marcaciones de ese día
                </p>
                <div className="space-y-1.5">
                  {j.tramos.map((t, i) => {
                    const esEste = t.id === r.id;
                    return (
                      /* Vuelven a ser botones. Dejaron de serlo cuando cada
                         marcación tenía su fila en la tabla y bastaba cerrar y
                         tocar la otra; ahora la jornada entera es UNA fila, así
                         que esta lista es el único camino al regreso del
                         almuerzo —y a su foto, su hora y su botón de editar. */
                      <button key={t.id} type="button" disabled={esEste}
                        onClick={() => onVerMarcacion(t.id)}
                        className={`w-full text-left border rounded-xl px-3 py-2 text-sm transition-colors ${
                          esEste ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-primary hover:bg-gray-50'}`}>
                        <span className="flex items-baseline justify-between gap-2 flex-wrap">
                          <span>
                            <span className="text-muted">{i + 1}.</span>{' '}
                            <span className="font-mono">{hhmm(t.entrada) ?? '—'} → {hhmm(t.salida) ?? '—'}</span>
                            {t.momentoSalida === 'SALIDA_ALMUERZO' && <span className="text-[11px] text-yellow-700"> · salió a su descanso</span>}
                            {t.momentoEntrada === 'REGRESO_ALMUERZO' && <span className="text-[11px] text-yellow-700"> · volvió del descanso</span>}
                            {t.salidaEstimada && <span className="text-[11px] text-amber-700"> · salida estimada</span>}
                            {t.entradaEstimada && <span className="text-[11px] text-amber-700"> · regreso estimado</span>}
                          </span>
                          {t.entrada && t.salida && (
                            <span className="text-xs text-muted shrink-0">
                              {enHoras(Math.round((new Date(t.salida).getTime() - new Date(t.entrada).getTime()) / 60000))}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lo que el horario exigía ese día */}
            {j.dia && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Lo que el horario pedía ese día
                </p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1.5">
                  <Chip tono={j.dia.congelado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}>
                    {j.dia.congelado ? 'Guardado ese día' : 'Reconstruido con el horario actual'}
                  </Chip>
                  {j.dia.programado ? (
                    <p>
                      Entrada {j.dia.horaEntrada} · Salida {j.dia.horaSalida} ·
                      Tolerancia de llegada {j.dia.toleranciaMin} min
                      {j.dia.toleranciaSalidaMin > 0 && ` · Tolerancia de salida ${j.dia.toleranciaSalidaMin} min`}
                    </p>
                  ) : (
                    <p>Ese día no estaba programado en su horario.</p>
                  )}
                  {!j.dia.congelado && (
                    <p className="text-[11px] text-muted">
                      Este día se armó con el horario que tiene hoy esta persona, que es el mismo
                      que se usó para liquidarlo. Solo cambiaría si le modificas el horario.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Verificación facial: la evidencia del DÍA, no la de esta
                marcación. Mostrar solo el par de la marcación abierta era el bug:
                en una jornada con almuerzo, la foto de la salida a almorzar
                aparecía rotulada "Salida" —como si la persona se hubiera ido a su
                casa a las 14:04 cuando volvió a las 14:50— y las dos marcas de la
                tarde no se veían por ningún lado. */}
            <FotosJornada registroId={registroId} />

            {/* Rastro de cambios y acciones */}
            <div className="border-t border-gray-100 pt-4">
              <div className="text-[11px] text-muted space-y-0.5 mb-4">
                <p>Creado el {format(toZonedTime(new Date(r.creadoEn), TZ), "d 'de' MMMM 'a las' HH:mm", { locale: es })}</p>
                {r.editadoEn ? (
                  <p>
                    Última corrección: {r.editadoPor === 'SISTEMA' ? 'el sistema' : r.editadoPor},
                    {' '}{format(toZonedTime(new Date(r.editadoEn), TZ), "d 'de' MMMM 'a las' HH:mm", { locale: es })}.
                    {' '}Solo se guarda la última: no queda registro de qué campo cambió.
                  </p>
                ) : <p>Sin correcciones desde que se creó.</p>}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => onEliminar(r.id)}
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
  );
}
