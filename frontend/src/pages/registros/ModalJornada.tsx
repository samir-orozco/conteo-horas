import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import {
  X, Edit2, Trash2, Camera, ArrowLeft, ImageOff, MapPin, UtensilsCrossed,
  Clock3, Info, CalendarClock,
} from 'lucide-react';
import api from '../../lib/api';

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
  tramos: { id: string; entrada: string | null; salida: string | null; salidaAlmuerzo: boolean; entradaEstimada: boolean; salidaEstimada: boolean }[];
  almuerzo: {
    estado: 'SIN_VENTANA' | 'MARCADO' | 'ABIERTO' | 'NO_MARCADO';
    ventana: { inicio: string; fin: string } | null;
    salida: string | null; regreso: string | null;
    minutos: number | null; minutosDescontados: number;
    regresoEstimado: boolean; seExcedio: boolean; minutosDeMas: number;
  };
  minutosDelDia: number;
  minutosTarde: number | null;
  motivoSinTardanza: string | null;
  festivo: { nombre: string } | null;
  novedad: { tipo: string; descripcion: string | null; aprobado: boolean; fechaInicio: string; fechaFin: string; horaInicio: string | null; horaFin: string | null } | null;
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
  NO_ES_PRIMERA: 'No es la primera entrada del día. La llegada tarde solo se mide en la primera, para que volver del almuerzo no cuente como llegar tarde.',
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
  // Para saltar a otro tramo del mismo día sin cerrar el modal.
  onCambiarDeTramo: (registroId: string) => void;
};

export default function ModalJornada({ registroId, onCerrar, onEditar, onEliminar, onCambiarDeTramo }: Props) {
  const [j, setJ] = useState<Jornada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viendoFotos, setViendoFotos] = useState(false);
  const [fotos, setFotos] = useState<{ fotoEntrada: string | null; fotoSalida: string | null } | null>(null);

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

  const verFotos = async () => {
    setViendoFotos(true);
    if (fotos) return;
    const r = await api.get(`/registros/${registroId}/fotos`);
    setFotos(r.data);
  };

  const r = j?.registro;
  const entrada = hhmm(r?.entrada ?? null);
  const salida = hhmm(r?.salida ?? null);
  const a = j?.almuerzo;

  // Extremos del día: la primera entrada y la última salida de todos los tramos.
  const primeraEntrada = j ? hhmm(j.tramos.find(t => t.entrada)?.entrada ?? null) : null;
  const ultimaSalida = j ? hhmm([...j.tramos].reverse().find(t => t.salida)?.salida ?? null) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            {viendoFotos && (
              <button onClick={() => setViendoFotos(false)}
                className="flex items-center gap-1 text-xs font-semibold text-ink hover:underline mb-1">
                <ArrowLeft size={14} /> Volver
              </button>
            )}
            <h3 className="font-bold text-lg text-ink truncate">
              {viendoFotos ? 'Verificación facial' : entrada ? `Marcación de las ${entrada}` : 'Marcación sin hora de entrada'}
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

        {j && r && viendoFotos && (
          <div className="p-6">
            {!fotos ? (
              <p className="text-center text-gray-400 py-10 text-sm">Cargando fotos...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ foto: fotos.fotoEntrada, label: 'Entrada', hora: entrada },
                  { foto: fotos.fotoSalida, label: 'Salida', hora: salida }].map(({ foto, label, hora }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-muted uppercase mb-1.5">{label}{hora && ` · ${hora}`}</p>
                    {foto ? (
                      <img src={foto} alt={`Foto de ${label.toLowerCase()}`} className="w-full rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                        <ImageOff size={22} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-muted">Sin foto: se marcó con cédula o fue un registro manual.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted mt-4 flex items-center gap-1.5">
              <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
            </p>
          </div>
        )}

        {j && r && !viendoFotos && (
          <div className="p-6 space-y-5">
            {/* Estado de un vistazo */}
            <div className="flex flex-wrap gap-1.5">
              {r.entrada && !r.salida && <Chip tono="bg-green-100 text-green-800">Está adentro ahora</Chip>}
              {r.salidaEstimada && <Chip tono="bg-amber-50 text-amber-700">El sistema cerró este turno</Chip>}
              {r.salidaAlmuerzo && <Chip tono="bg-yellow-50 text-yellow-700">Salió a almorzar</Chip>}
              {r.entradaEstimada && <Chip tono="bg-amber-50 text-amber-700">Regreso puesto por el sistema</Chip>}
              {r.editadoPor && <Chip tono="bg-blue-50 text-blue-700">Corregido a mano</Chip>}
              {j.festivo && <Chip tono="bg-purple-100 text-purple-700">Festivo: {j.festivo.nombre}</Chip>}
              {j.novedad && (
                <Chip tono={j.novedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                  Novedad {j.novedad.aprobado ? 'aprobada' : 'pendiente'}: {j.novedad.tipo}
                </Chip>
              )}
              {j.dia && !j.dia.programado && <Chip tono="bg-gray-100 text-gray-600">Día de descanso</Chip>}
            </div>

            {/* Lo primero que se pregunta el administrador: ¿trabajó su jornada? */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Dato rotulo="Entró"><span className="font-mono text-green-700">{primeraEntrada ?? '—'}</span></Dato>
              <Dato rotulo="Salió"><span className="font-mono text-red-600">{ultimaSalida ?? '—'}</span></Dato>
              <Dato rotulo="Almuerzo">
                {a && a.minutosDescontados > 0 ? `−${enHoras(a.minutosDescontados)}` : <span className="text-gray-400">—</span>}
              </Dato>
              <Dato rotulo="Contado ese día">
                <b className="text-base">{enHoras(j.minutosDelDia)}</b>
                {j.dia?.programado && (
                  <p className="text-[11px] text-muted">el horario pedía {enHoras(j.dia.minutosEsperados)}</p>
                )}
              </Dato>
            </div>
            <p className="text-[11px] text-muted -mt-3">
              El tiempo contado suma todas las marcaciones del día y ya tiene descontado el almuerzo.
              No es plata: el reparto en horas ordinarias, extras y recargos está en Reportes.
            </p>

            {/* Salió a almorzar y nunca volvió: la tarde no se está contando. */}
            {a?.estado === 'ABIERTO' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-900 flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  Salió a almorzar a las <b>{hhmm(a.salida)}</b> y nunca volvió a marcar.
                  El resto de ese día <b>no se está contando ni pagando</b>. Si siguió trabajando,
                  agrega la marcación de la tarde con el botón <b>Editar</b> o creando una nueva.
                </span>
              </div>
            )}

            {/* Esta marcación */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                <Clock3 size={13} /> Esta marcación
              </p>
              <div className="border border-gray-100 rounded-xl px-4 py-3 space-y-2.5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-mono text-lg">
                    <span className="text-green-700">{entrada ?? '— sin marcar —'}</span>
                    <span className="text-gray-300 mx-2">→</span>
                    <span className="text-red-600">{salida ?? '— sin marcar —'}</span>
                  </span>
                  {r.entrada && r.salida && (
                    <span className="font-semibold text-ink">
                      {enHoras(Math.round((new Date(r.salida).getTime() - new Date(r.entrada).getTime()) / 60000))}
                    </span>
                  )}
                </div>
                {r.salidaEstimada && (
                  <p className="text-[11px] text-amber-700">
                    La hora de salida la puso el sistema porque nadie la marcó. Conviene revisarla.
                  </p>
                )}
                {r.entrada && !r.salida && (
                  <p className="text-[11px] text-green-700">
                    Sigue adentro desde las {entrada}. Mientras no tenga salida, este turno no suma horas.
                  </p>
                )}

                <div className="text-sm flex items-start gap-2">
                  <CalendarClock size={14} className="text-muted mt-0.5 shrink-0" />
                  <div>
                    {j.minutosTarde === null ? (
                      <span className="text-muted">{SIN_TARDANZA[j.motivoSinTardanza ?? ''] ?? 'No se puede medir la llegada de esta marcación.'}</span>
                    ) : j.minutosTarde > 0 ? (
                      <span>
                        Llegó <b>{enHoras(j.minutosTarde)} tarde</b>: entraba a las {j.dia?.horaEntrada}
                        {(j.dia?.toleranciaMin ?? 0) > 0 && ` con ${j.dia!.toleranciaMin} min de tolerancia`}.
                      </span>
                    ) : (
                      <span>
                        Llegó a tiempo{j.dia?.horaEntrada && `: entraba a las ${j.dia.horaEntrada}`}.
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm flex items-start gap-2">
                  <MapPin size={14} className="text-muted mt-0.5 shrink-0" />
                  <span>
                    {r.sede
                      ? <>Marcó en <b>{r.sede.nombre}</b>{!r.sede.activa && <span className="text-muted"> (sede desactivada)</span>}</>
                      : <span className="text-muted">No quedó registrada la sede de esta marcación.</span>}
                  </span>
                </div>

                {r.observacion && (
                  <p className="text-sm text-ink bg-gray-50 rounded-lg px-3 py-2">{r.observacion}</p>
                )}

                {(r.tieneFotoEntrada || r.tieneFotoSalida) && (
                  <button onClick={verFotos}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
                    <Camera size={14} /> Ver fotos de verificación facial
                  </button>
                )}
              </div>
            </div>

            {/* Almuerzo del día */}
            {a && (a.estado !== 'SIN_VENTANA' || a.minutosDescontados > 0) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
                  <UtensilsCrossed size={13} /> Almuerzo de este día
                </p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <p>
                    {a.ventana
                      ? <>Horario de almuerzo de ese día: <b>{a.ventana.inicio} a {a.ventana.fin}</b></>
                      : <>Ese día no tenía horario de almuerzo definido: se descuenta <b>{enHoras(a.minutosDescontados)}</b> fija</>}
                  </p>
                  {a.estado === 'MARCADO' && (
                    <p>
                      Salió a las <b>{hhmm(a.salida)}</b> y regresó a las <b>{hhmm(a.regreso)}</b>
                      {a.regresoEstimado && <span className="text-amber-700"> (regreso puesto por el sistema)</span>}
                      {a.seExcedio && <span className="text-amber-700"> · volvió {enHoras(a.minutosDeMas)} después del fin</span>}
                    </p>
                  )}
                  {a.estado === 'ABIERTO' && <p><b>Salió a almorzar y no volvió a marcar.</b></p>}
                  {a.estado === 'NO_MARCADO' && a.ventana && <p><b>No marcó</b> su salida a almuerzo.</p>}

                  {a.estado === 'MARCADO' && (
                    <p className="pt-1">
                      Estuvo por fuera <b>{enHoras(a.minutos ?? 0)}</b> · se le descontó <b>{enHoras(a.minutosDescontados)}</b>
                    </p>
                  )}
                  {a.ventana && (
                    <p className="text-[11px] text-muted pt-1">
                      Se descuentan los minutos del horario de almuerzo en los que la persona siguió marcada,
                      no lo que duró el almuerzo. Por eso quien marca su salida paga menos que quien no la marca.
                    </p>
                  )}
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
                      <button key={t.id} disabled={esEste}
                        onClick={() => onCambiarDeTramo(t.id)}
                        className={`w-full text-left border rounded-xl px-3 py-2 text-sm transition-colors ${
                          esEste ? 'border-primary ring-1 ring-primary/40 bg-primary/5 cursor-default'
                                 : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <span className="text-muted">{i + 1}.</span>{' '}
                        <span className="font-mono">{hhmm(t.entrada) ?? '—'} → {hhmm(t.salida) ?? '—'}</span>
                        {t.salidaAlmuerzo && <span className="text-[11px] text-yellow-700"> · salió a almorzar</span>}
                        {t.salidaEstimada && <span className="text-[11px] text-amber-700"> · salida estimada</span>}
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
                      Tolerancia de llegada {j.dia.toleranciaMin} min ·
                      Pedía <b>{enHoras(j.dia.minutosEsperados)}</b>
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
