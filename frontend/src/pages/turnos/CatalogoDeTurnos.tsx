import { useState, useEffect, useId } from 'react';
import { Clock, Plus, Pencil, Trash2, X, Info, Utensils, Timer, Coffee, MapPin } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import ListaDeDescansos from '../configuracion/ListaDeDescansos';
import { MAX_DESCANSOS_POR_FRANJA, minutosEntre, type Ventana } from '../../lib/descansos';
import { COLORES_DE_TURNO, ETIQUETA_COLOR, CLASES_COLOR, PUNTO_COLOR, normalizarColor } from '../../lib/coloresDeTurno';
import { cuerpoDeLaPlantilla, type FormularioDePlantilla } from './cuerpoDeLaPlantilla';

// EL CATÁLOGO DE TURNOS DE LA EMPRESA (19 de septiembre de 2026, turnos rotativos paso 1).
//
// Un turno es una FRANJA SIN DÍAS: «Mañana 06:00-14:00», «Noche 22:00-06:00». Los días se los pone
// el planificador al pintar el calendario, y por eso el mismo turno sirve para cualquier persona en
// cualquier fecha.
//
// EL FORMULARIO VA EN DOS COLUMNAS (23 de septiembre de 2026, pedido del dueño). No es decoración:
// las dos columnas son dos preguntas distintas y antes estaban apiladas en una tira de once campos.
//
//   Izquierda  — QUÉ ES el turno: cómo se llama, de qué color se ve, a qué horas, en qué sede.
//   Derecha    — QUÉ REGLAS trae: almuerzo, tolerancias, descansos.
//
// Las tres reglas de la derecha son bloques con la misma forma (icono, nombre, interruptor, y el
// detalle solo cuando está encendido), porque las tres se contestan igual: «¿este turno tiene esto?
// ¿y con qué valores?». Antes eran una casilla suelta, otra casilla suelta y una lista, y no se
// parecían entre sí aunque fueran lo mismo.
//
// El editor de descansos es el MISMO de los horarios (`ListaDeDescansos`), no una copia.

type Plantilla = {
  id: string; nombre: string; color: string; sedeId: string | null;
  horaEntrada: string | null; horaSalida: string | null; tieneAlmuerzo: boolean;
  almuerzoInicio: string | null; almuerzoFin: string | null; descansos: Ventana[];
  // NULL en las tres significa «la tolerancia del horario», nunca «cero».
  toleranciaMin: number | null; toleranciaSalidaMin: number | null; ajustaEntrada: boolean | null;
};

type Sede = { id: string; nombre: string };

const VACIO: FormularioDePlantilla = {
  nombre: '', color: 'grafito', sedeId: '',
  horaEntrada: '08:00', horaSalida: '17:00',
  tieneAlmuerzo: true, almuerzoInicio: '', almuerzoFin: '',
  descansos: [],
  // Un turno nuevo hereda la tolerancia del horario de cada persona, que es como funcionaba todo
  // antes de que esto existiera: quien no toque el interruptor no nota ningún cambio.
  usaToleranciaPropia: false, toleranciaMin: '', toleranciaSalidaMin: '', ajustaEntrada: false,
};

export default function CatalogoDeTurnos() {
  const [turnos, setTurnos] = useState<Plantilla[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [form, setForm] = useState<FormularioDePlantilla>(VACIO);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState<Plantilla | null>(null);
  const [aviso, setAviso] = useState('');

  const cargar = () => api.get('/plantillas-turno').then(r => setTurnos(r.data));
  useEffect(() => {
    cargar();
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([]));
  }, []);

  const abrir = (p?: Plantilla) => {
    setEditando(p ?? null);
    setError('');
    setForm(p
      ? {
        nombre: p.nombre, color: normalizarColor(p.color), sedeId: p.sedeId ?? '',
        horaEntrada: p.horaEntrada ?? '08:00', horaSalida: p.horaSalida ?? '17:00',
        tieneAlmuerzo: p.tieneAlmuerzo, almuerzoInicio: p.almuerzoInicio ?? '', almuerzoFin: p.almuerzoFin ?? '',
        descansos: p.descansos ?? [],
        // El interruptor se enciende si el turno trae CUALQUIERA de las tres puesta. Se compara
        // contra null y no por verdadero: un turno con tolerancia CERO la tiene puesta, y con una
        // comprobación laxa aparecería como si heredara.
        usaToleranciaPropia: p.toleranciaMin !== null || p.toleranciaSalidaMin !== null || p.ajustaEntrada !== null,
        toleranciaMin: p.toleranciaMin === null ? '' : String(p.toleranciaMin),
        toleranciaSalidaMin: p.toleranciaSalidaMin === null ? '' : String(p.toleranciaSalidaMin),
        ajustaEntrada: p.ajustaEntrada ?? false,
      }
      : VACIO);
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cuerpo = cuerpoDeLaPlantilla(form);
    try {
      if (editando) await api.put(`/plantillas-turno/${editando.id}`, cuerpo);
      else await api.post('/plantillas-turno', cuerpo);
      setModal(false);
      cargar();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'No pudimos guardar el turno');
    }
  };

  const eliminar = async () => {
    if (!eliminando) return;
    setAviso('');
    try {
      await api.delete(`/plantillas-turno/${eliminando.id}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setAviso(msg ?? 'No pudimos eliminar el turno');
    }
    setEliminando(null);
    cargar();
  };

  const duracion = minutosEntre(form.horaEntrada, form.horaSalida);
  const cruzaMedianoche = duracion > 0 && form.horaSalida <= form.horaEntrada;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Turnos</h1>
        <p className="text-sm text-muted">
          Los turnos que existen en tu empresa. Definirlos aquí una vez es lo que después deja
          armar el calendario de cada persona sin volver a escribir horarios.
        </p>
      </div>

      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Clock size={17} /> Catálogo de turnos</h3>
          <button onClick={() => abrir()}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:brightness-95 px-3 py-2 rounded-lg">
            <Plus size={14} /> Nuevo turno
          </button>
        </div>

        {aviso && <p className="text-sm text-red-600 mb-3">{aviso}</p>}

        {turnos.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">Todavía no hay turnos.</p>
        ) : (
          <div className="space-y-2">
            {turnos.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CLASES_COLOR[normalizarColor(p.color)]}`}>
                      {p.nombre}
                    </span>
                  </p>
                  <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {/* TODO turno tiene horario desde el 23 de septiembre de 2026. Antes había aquí
                        una rama para el día libre, que decía «no se espera que marque» en vez de
                        unas horas; se fue con el concepto: un descanso ya no es un turno del
                        catálogo sino una acción sobre el día, en el calendario. */}
                    <span>De {p.horaEntrada} a {p.horaSalida}</span>
                    {p.almuerzoInicio && p.almuerzoFin && (
                      <span>Almuerzo {p.almuerzoInicio}–{p.almuerzoFin}</span>
                    )}
                    {p.descansos?.length > 0 && (
                      <span>{p.descansos.length} descanso{p.descansos.length > 1 ? 's' : ''}</span>
                    )}
                    {p.sedeId && <span>{sedes.find(s => s.id === p.sedeId)?.nombre ?? 'Sede'}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrir(p)} className="p-2 text-gray-400 hover:text-ink" title="Editar"
                    aria-label={`Editar ${p.nombre}`}><Pencil size={15} /></button>
                  <button onClick={() => setEliminando(p)} className="p-2 text-gray-400 hover:text-red-500" title="Eliminar"
                    aria-label={`Eliminar ${p.nombre}`}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          Un turno no se le asigna a nadie desde aquí: se usa para pintar el calendario.
        </p>
      </div>

      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <form onSubmit={guardar} onClick={e => e.stopPropagation()}
            className="hp-pop bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-ink">{editando ? 'Editar turno' : 'Nuevo turno'}</h3>
                <p className="text-xs text-muted mt-0.5">
                  Una franja sin días. Quién lo trabaja y cuándo se decide después, en el calendario.
                </p>
              </div>
              <button type="button" onClick={() => setModal(false)} aria-label="Cerrar">
                <X size={20} className="text-gray-400 hover:text-ink" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-x-7 gap-y-6 p-6">

              {/* COLUMNA IZQUIERDA — QUÉ ES EL TURNO */}
              <div className="space-y-5">
                <div>
                  <label htmlFor="turno-nombre" className="block text-xs font-semibold text-ink mb-1.5">
                    Nombre del turno
                  </label>
                  <input id="turno-nombre" value={form.nombre} required
                    placeholder="Mañana, Noche, Refuerzo…"
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>

                {/* EL COLOR, EN CÍRCULOS CON SU NOMBRE DEBAJO (pedido del dueño). El nombre no es
                    solo decoración: es lo que hace que dos personas puedan hablar del turno «ámbar»
                    sin señalar la pantalla. Y el círculo lleva el relleno sólido de `PUNTO_COLOR`,
                    no el fondo claro de la etiqueta, que en un círculo vacío no se distingue. */}
                <div>
                  <p className="block text-xs font-semibold text-ink mb-2">Color en el calendario</p>
                  <div className="grid grid-cols-4 gap-y-3 gap-x-2">
                    {COLORES_DE_TURNO.map(c => (
                      <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                        aria-label={ETIQUETA_COLOR[c]} aria-pressed={form.color === c}
                        className="group flex flex-col items-center gap-1.5">
                        <span className={`h-8 w-8 rounded-full transition-all ${PUNTO_COLOR[c]} ${form.color === c
                          ? 'ring-2 ring-ink ring-offset-2'
                          : 'ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-gray-300'}`} />
                        <span className={`text-[10px] leading-none ${form.color === c ? 'font-bold text-ink' : 'text-muted'}`}>
                          {ETIQUETA_COLOR[c]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="block text-xs font-semibold text-ink mb-1.5">Franja</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="turno-entrada" className="block text-[11px] text-muted mb-1">Hora de entrada</label>
                      <input id="turno-entrada" type="time" value={form.horaEntrada} required
                        onChange={e => setForm(p => ({ ...p, horaEntrada: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="turno-salida" className="block text-[11px] text-muted mb-1">Hora de salida</label>
                      <input id="turno-salida" type="time" value={form.horaSalida} required
                        onChange={e => setForm(p => ({ ...p, horaSalida: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                  </div>
                  {duracion > 0 && (
                    <p className="text-[11px] text-muted mt-1.5">
                      Dura <b>{(duracion / 60).toFixed(1)} h</b>{cruzaMedianoche ? ' y cruza la medianoche' : ''}.
                    </p>
                  )}
                </div>

                {sedes.length > 1 && (
                  <div>
                    <label htmlFor="turno-sede" className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-1.5">
                      <MapPin size={12} className="text-gray-400" /> Sede
                    </label>
                    <select id="turno-sede" value={form.sedeId} onChange={e => setForm(p => ({ ...p, sedeId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                      <option value="">Cualquier sede</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA — QUÉ REGLAS TRAE */}
              <div className="space-y-3">
                <p className="block text-xs font-semibold text-ink">Reglas de este turno</p>

                <BloqueDeRegla
                  icono={<Utensils size={15} />}
                  titulo="Descontar almuerzo"
                  ayuda="Apágalo en turnos cortos, donde no hay pausa de almuerzo que descontar."
                  activo={form.tieneAlmuerzo}
                  control={
                    <Interruptor etiqueta="Descontar almuerzo" marcado={form.tieneAlmuerzo}
                      onCambiar={v => setForm(p => ({ ...p, tieneAlmuerzo: v }))} />
                  }>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-muted">A qué hora se almuerza (opcional)</p>
                    {(form.almuerzoInicio || form.almuerzoFin) && (
                      <button type="button" onClick={() => setForm(p => ({ ...p, almuerzoInicio: '', almuerzoFin: '' }))}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-600 underline underline-offset-2">
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="turno-almuerzo-desde" className="block text-[11px] text-muted mb-1">Desde</label>
                      <input id="turno-almuerzo-desde" type="time" value={form.almuerzoInicio}
                        onChange={e => setForm(p => ({ ...p, almuerzoInicio: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="turno-almuerzo-hasta" className="block text-[11px] text-muted mb-1">Hasta</label>
                      <input id="turno-almuerzo-hasta" type="time" value={form.almuerzoFin}
                        onChange={e => setForm(p => ({ ...p, almuerzoFin: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-2 leading-relaxed">
                    Esto dice a qué hora, para que el kiosco lo ofrezca entonces. <b>Cuánto</b> se
                    descuenta no depende de esto: vacío, valen los minutos del horario.
                  </p>
                </BloqueDeRegla>

                {/* LA TOLERANCIA PROPIA DEL TURNO (23 de septiembre de 2026). Antes la tolerancia era
                    solo del horario; el dueño la pidió aquí porque un turno nocturno puede merecer
                    otra que uno diurno. */}
                <BloqueDeRegla
                  icono={<Timer size={15} />}
                  titulo="Tolerancia propia"
                  ayuda="Apagada, este turno usa la tolerancia del horario de cada persona, que es como funcionaba antes."
                  activo={form.usaToleranciaPropia}
                  control={
                    <Interruptor etiqueta="Tolerancia propia de este turno" marcado={form.usaToleranciaPropia}
                      onCambiar={v => setForm(p => ({ ...p, usaToleranciaPropia: v }))} />
                  }>
                  <div className="grid grid-cols-2 gap-3">
                    <CampoDeMinutos id="turno-tolerancia-entrada" rotulo="Tolerancia de entrada"
                      valor={form.toleranciaMin}
                      onCambiar={v => setForm(p => ({ ...p, toleranciaMin: v }))} />
                    <CampoDeMinutos id="turno-tolerancia-salida" rotulo="Tolerancia de salida"
                      valor={form.toleranciaSalidaMin}
                      onCambiar={v => setForm(p => ({ ...p, toleranciaSalidaMin: v }))} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer mt-3">
                    <input type="checkbox" checked={form.ajustaEntrada}
                      onChange={e => setForm(p => ({ ...p, ajustaEntrada: e.target.checked }))} className="rounded" />
                    Vale también para llegar antes de la hora
                  </label>
                  <p className="text-[11px] text-muted mt-2 leading-relaxed">
                    En blanco hereda del horario. <b>Cero no es lo mismo que vacío</b>: cero cuenta la
                    tardanza desde el primer minuto.
                  </p>
                </BloqueDeRegla>

                <BloqueDeRegla
                  icono={<Coffee size={15} />}
                  titulo="Descansos no remunerados"
                  ayuda="No se pagan: cuestan su tiempo aunque los tomen a otra hora, igual que el almuerzo."
                  activo
                  control={
                    <span className="shrink-0 text-[11px] font-semibold text-muted tabular-nums">
                      {form.descansos.length}/{MAX_DESCANSOS_POR_FRANJA}
                    </span>
                  }>
                  <ListaDeDescansos descansos={form.descansos} max={MAX_DESCANSOS_POR_FRANJA}
                    onCambiar={descansos => setForm(p => ({ ...p, descansos }))} />
                </BloqueDeRegla>
              </div>
            </div>

            {error && <p className="px-6 -mt-2 pb-2 text-sm text-red-600">{error}</p>}

            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 text-sm font-semibold text-ink bg-primary hover:brightness-95 rounded-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {eliminando && (
        <ConfirmDialog
          abierto
          titulo={`Eliminar ${eliminando.nombre}`}
          subtitulo="El turno deja de aparecer para armar el calendario. Lo que ya esté planificado con él no se toca."
          textoContinuar="Eliminar"
          peligro
          onContinuar={eliminar}
          onCancelar={() => setEliminando(null)}
        />
      )}
    </div>
  );
}

// UNA REGLA DEL TURNO: icono, nombre, su explicación a un toque, el interruptor, y el detalle solo
// cuando está encendida. Las tres de la columna derecha usan esta misma forma porque las tres se
// contestan igual, y antes cada una se veía distinta sin que la diferencia significara nada.
//
// `activo` decide si se muestra el detalle. Los descansos lo llevan siempre en verdadero: esa regla
// no se apaga, se deja vacía.
function BloqueDeRegla({ icono, titulo, ayuda, activo, control, children }: {
  icono: React.ReactNode;
  titulo: string;
  ayuda: string;
  activo: boolean;
  control: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border transition-colors ${activo ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50/60'}`}>
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${activo ? 'bg-primary/20 text-ink' : 'bg-gray-100 text-gray-400'}`}>
          {icono}
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink flex items-center gap-1.5">
          {titulo}
          <Ayuda texto={ayuda} de={titulo} />
        </p>
        {control}
      </header>
      {activo && <div className="border-t border-gray-100 px-3.5 py-3">{children}</div>}
    </section>
  );
}

// La explicación de una regla, a un toque del icono. Es el patrón de tooltip que ya usa
// `ModalImportar.tsx`, no uno nuevo: `role="tooltip"` atado con `aria-describedby`, y visible
// también con el teclado (`group-focus-within`), que es lo que un `title` del navegador no da.
function Ayuda({ texto, de }: { texto: string; de: string }) {
  const id = useId();
  return (
    <span className="relative group/ayuda inline-flex">
      <button type="button" aria-label={`Qué es «${de}»`} aria-describedby={id}
        className="text-gray-400 hover:text-ink focus-visible:text-ink">
        <Info size={13} />
      </button>
      <span id={id} role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-20 mt-1.5 w-52 rounded-lg bg-ink px-2.5 py-2 text-[11px] leading-snug text-white shadow-lg opacity-0 invisible transition-opacity group-hover/ayuda:opacity-100 group-hover/ayuda:visible group-focus-within/ayuda:opacity-100 group-focus-within/ayuda:visible">
        {texto}
      </span>
    </span>
  );
}

// Un sí/no que se ve como un sí/no. Por dentro es una casilla de verdad —no un `div` con `onClick`—
// así que el teclado, el lector de pantalla y las pruebas la encuentran como `checkbox`.
function Interruptor({ marcado, onCambiar, etiqueta }: {
  marcado: boolean;
  onCambiar: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={marcado} aria-label={etiqueta}
        onChange={e => onCambiar(e.target.checked)} />
      <span className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-1" />
      <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}

// Unos minutos. El número va grande y la unidad va pegada al campo, para que no haya que leer «(min)»
// en el rótulo para saber qué se escribe. El marcador de posición dice qué pasa si se deja vacío,
// que es la única parte de esto que no se adivina.
function CampoDeMinutos({ id, rotulo, valor, onCambiar }: {
  id: string;
  rotulo: string;
  valor: string;
  onCambiar: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-muted mb-1">{rotulo}</label>
      <div className="relative">
        <input id={id} type="number" min={0} max={240} value={valor} placeholder="hereda"
          onChange={e => onCambiar(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-base font-semibold text-ink" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">min</span>
      </div>
    </div>
  );
}
