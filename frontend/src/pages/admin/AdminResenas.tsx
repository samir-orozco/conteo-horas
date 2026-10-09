import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { mensajeDeError } from '../../lib/errores';
import { fechaCorta } from '../../lib/fechas';
import AdminFormularioResena from '../../features/resenas/AdminFormularioResena';
import AdminVistaPrevia from '../../features/resenas/AdminVistaPrevia';
import {
  cambiarEstadoResena, listarResenasAdmin, NOMBRE_ANONIMO, quitarNombreResena,
  type ResenaAdmin, type ResumenResenas,
} from '../../features/resenas/api';
import {
  PESTANAS, accionesDelAdmin, autorReal, avisoDeEmpresa, contarPorPestana, detallesDeOrigen,
  etiquetaDeAccion, etiquetaDeEstado, etiquetaDeMarca, filtrarResenas, promedioLegible, puedeQuitarNombre,
  requiereSeguimiento, tarjetaDeVistaPrevia, type AccionDelAdmin, type FiltroEstrellas, type Filtros,
} from '../../features/resenas/adminResenas';

// La pantalla «Reseñas» del super admin (docs/RESENAS.md, sección 4, 8 de octubre de 2026).
//
// El dueño las lee, decide cuáles salen en la landing y carga las que llegan por otros canales. Nada
// se publica solo (D4): toda reseña nace «Por revisar» y publicarla es un clic suyo, después de ver la
// tarjeta tal como saldría.
//
// La lista llega ENTERA del servidor (una por empresa como máximo, más las manuales), así que las
// pestañas, los filtros y el buscador trabajan aquí. Las omitidas vienen en la lista pero no se
// muestran: no son una reseña, solo se cuentan en el resumen.

const claseInput = 'border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amarillo/40';
const clasePastilla = 'inline-block rounded-full border px-2 py-0.5 text-xs font-semibold';

const ESTILO_DE_ESTADO: Record<string, string> = {
  POR_REVISAR: 'bg-amber-50 text-amber-800 border-amber-200',
  PUBLICADA: 'bg-green-50 text-green-800 border-green-200',
  OCULTA: 'bg-gray-100 text-gray-700 border-gray-200',
  ARCHIVADA: 'bg-gray-50 text-gray-500 border-gray-200',
};

const HECHO: Record<AccionDelAdmin, string> = {
  PUBLICADA: 'Reseña publicada: ya sale en la landing.',
  OCULTA: 'Reseña oculta: ya no sale en la landing.',
  ARCHIVADA: 'Reseña archivada.',
  POR_REVISAR: 'La reseña volvió a «Por revisar».',
};

type Datos = { resenas: ResenaAdmin[]; resumen: ResumenResenas };
type Aviso = { tipo: 'ok' | 'error'; texto: string };

export default function AdminResenas() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ pestana: 'TODAS', estrellas: '', origen: '', buscar: '' });
  // La que está esperando respuesta del servidor: sus botones se apagan contra el doble clic.
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [porPublicar, setPorPublicar] = useState<ResenaAdmin | null>(null);
  const [porQuitarNombre, setPorQuitarNombre] = useState<ResenaAdmin | null>(null);
  // undefined: cerrado; null: una nueva; una reseña: editar esa.
  const [enFormulario, setEnFormulario] = useState<ResenaAdmin | null | undefined>(undefined);

  // Con `then` y no con `try` alrededor de un `await`: el linter de React lee el `catch` como si
  // pudiera correr en el mismo turno del efecto, y con eso como un render encadenado.
  const cargar = useCallback(() => listarResenasAdmin()
    .then(lista => { setDatos(lista); setErrorDeCarga(''); })
    .catch((e: unknown) => setErrorDeCarga(mensajeDeError(e, 'No se pudieron cargar las reseñas.'))), []);
  useEffect(() => { void cargar(); }, [cargar]);

  const resenas = useMemo(() => datos?.resenas ?? [], [datos]);
  const conteo = useMemo(() => contarPorPestana(resenas), [resenas]);
  const visibles = useMemo(() => filtrarResenas(resenas, filtros), [resenas, filtros]);
  const empresasConResena = useMemo(
    () => new Set(resenas.map(r => r.empresaId).filter((id): id is string => Boolean(id))), [resenas]);

  const filtrar = (cambios: Partial<Filtros>) => setFiltros(f => ({ ...f, ...cambios }));

  // Toda acción: avisa qué pasó y vuelve a pedir la lista, que es la que sabe el estado nuevo.
  async function hacer(r: ResenaAdmin, accion: () => Promise<void>, hecho: string) {
    setEnCurso(r.id);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: hecho });
      await cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e, 'No se pudo hacer el cambio.') });
    } finally {
      setEnCurso(null);
    }
  }

  // Publicar pasa antes por la vista previa (R25); lo demás se puede deshacer y va directo.
  const mover = (r: ResenaAdmin, hacia: AccionDelAdmin) => {
    if (hacia === 'PUBLICADA') { setPorPublicar(r); return; }
    void hacer(r, () => cambiarEstadoResena(r.id, hacia), HECHO[hacia]);
  };

  const publicar = async () => {
    if (!porPublicar) return;
    await hacer(porPublicar, () => cambiarEstadoResena(porPublicar.id, 'PUBLICADA'), HECHO.PUBLICADA);
    setPorPublicar(null);
  };

  const quitarNombre = async () => {
    if (!porQuitarNombre) return;
    const r = porQuitarNombre;
    setPorQuitarNombre(null);
    await hacer(r, () => quitarNombreResena(r.id), `Se quitó el nombre. La reseña queda como «${NOMBRE_ANONIMO}».`);
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reseñas</h1>
          <p className="text-sm text-muted">Lo que opinan los clientes. Nada sale en la landing hasta que lo publicas.</p>
        </div>
        <button onClick={() => setEnFormulario(null)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink rounded-lg px-4 py-2 text-sm font-bold">
          <Plus size={16} /> Nueva reseña
        </button>
      </div>

      {aviso && (
        <p role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`text-sm rounded-lg px-3 py-2 border ${aviso.tipo === 'error'
            ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
          {aviso.texto}
        </p>
      )}

      {errorDeCarga && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorDeCarga}</p>
      )}

      {datos && <Resumen resumen={datos.resumen} />}

      <div className="flex flex-wrap gap-2">
        {PESTANAS.map(p => {
          const activa = p.id === filtros.pestana;
          return (
            <button key={p.id} aria-pressed={activa} onClick={() => filtrar({ pestana: p.id })}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border ${
                activa ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-gray-200 hover:bg-gray-50'}`}>
              {p.label}
              <span className={`text-xs ${activa ? 'text-white/70' : 'text-muted'}`}>{conteo[p.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-card p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Estrellas
          <select value={filtros.estrellas} onChange={e => filtrar({ estrellas: e.target.value as FiltroEstrellas })} className={claseInput}>
            <option value="">Todas</option>
            {['5', '4', '3', '2', '1'].map(n => <option key={n} value={n}>{n} ★</option>)}
            <option value="SIN">Sin calificación</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Origen
          <select value={filtros.origen} onChange={e => filtrar({ origen: e.target.value as Filtros['origen'] })} className={claseInput}>
            <option value="">Todos</option>
            <option value="CLIENTE">Clientes</option>
            <option value="MANUAL">Manuales</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted flex-1 min-w-[220px]">
          Buscar
          <span className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filtros.buscar} onChange={e => filtrar({ buscar: e.target.value })}
              placeholder="Texto, nombre, empresa o correo"
              className={`${claseInput} w-full pl-9`} />
          </span>
        </label>
      </div>

      <div className="bg-white rounded-card border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {visibles.map(r => (
            <FilaResena key={r.id} r={r} ocupada={enCurso === r.id}
              onMover={hacia => mover(r, hacia)}
              onEditar={() => setEnFormulario(r)}
              onQuitarNombre={() => setPorQuitarNombre(r)} />
          ))}
        </ul>
        {datos && visibles.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">No hay reseñas con esos filtros.</p>
        )}
        {!datos && !errorDeCarga && <p className="px-5 py-10 text-center text-sm text-muted">Cargando…</p>}
      </div>

      {porPublicar && (
        <AdminVistaPrevia resena={porPublicar} enviando={enCurso === porPublicar.id}
          onPublicar={() => void publicar()} onCancelar={() => setPorPublicar(null)} />
      )}

      <ConfirmDialog
        abierto={porQuitarNombre !== null}
        titulo="¿Quitar el nombre de esta reseña?"
        subtitulo={`No se puede deshacer. La firma se borra y la reseña queda como «${NOMBRE_ANONIMO}». Es lo que se hace cuando la persona lo pide.`}
        textoContinuar="Sí, quitar el nombre"
        peligro
        onContinuar={() => void quitarNombre()}
        onCancelar={() => setPorQuitarNombre(null)} />

      {enFormulario !== undefined && (
        <AdminFormularioResena resena={enFormulario} empresasConResena={empresasConResena}
          onCancelar={() => setEnFormulario(undefined)}
          onGuardada={texto => {
            setEnFormulario(undefined);
            setAviso({ tipo: 'ok', texto });
            void cargar();
          }} />
      )}
    </div>
  );
}

// R15: el promedio y las barras salen solo de las reseñas de clientes, con las archivadas y las de una
// estrella. Las omitidas no son una calificación y se cuentan aparte.
function Resumen({ resumen }: { resumen: ResumenResenas }) {
  if (resumen.total === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-card p-4 text-sm text-muted">
        Todavía no hay calificaciones de clientes.
        {resumen.omitidas > 0 && ` ${resumen.omitidas === 1 ? '1 empresa omitió' : `${resumen.omitidas} empresas omitieron`} la reseña.`}
      </div>
    );
  }
  const mayor = Math.max(...Object.values(resumen.distribucion), 1);
  return (
    <div className="bg-white border border-gray-200 rounded-card p-4 flex flex-wrap gap-x-10 gap-y-4 items-start">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">De clientes</p>
        <p className="text-3xl font-extrabold text-ink"><span>{promedioLegible(resumen.promedio)} ★</span></p>
        <p className="text-sm text-muted">{resumen.total === 1 ? '1 reseña' : `${resumen.total} reseñas`}</p>
        {resumen.omitidas > 0 && (
          <p className="text-xs text-muted mt-1">
            {resumen.omitidas === 1 ? '1 empresa omitió' : `${resumen.omitidas} empresas omitieron`} la reseña
          </p>
        )}
      </div>
      <ul aria-label="Distribución por estrellas" className="space-y-1 min-w-[220px] flex-1 max-w-sm">
        {([5, 4, 3, 2, 1] as const).map(n => {
          const cuantas = resumen.distribucion[n];
          return (
            <li key={n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${cuantas}`}
              className="flex items-center gap-2 text-xs text-muted">
              <span className="w-6 text-right" aria-hidden="true">{n}★</span>
              <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <span className="block h-full bg-primary rounded-full" style={{ width: `${(cuantas / mayor) * 100}%` }} />
              </span>
              <span className="w-6" aria-hidden="true">{cuantas}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Estrellas({ n }: { n: number | null }) {
  if (n == null) return <span className="text-xs text-muted">Sin calificación</span>;
  return (
    <span role="img" aria-label={`${n} de 5 estrellas`} className="text-primary-dark tracking-tight whitespace-nowrap">
      {'★'.repeat(n)}<span className="text-gray-300">{'☆'.repeat(5 - n)}</span>
    </span>
  );
}

type PropsFila = {
  r: ResenaAdmin;
  ocupada: boolean;
  onMover: (hacia: AccionDelAdmin) => void;
  onEditar: () => void;
  onQuitarNombre: () => void;
};

// R14: la firma tal como saldría y, si es anónima, quién la escribió; debajo, de dónde vino.
function FilaResena({ r, ocupada, onMover, onEditar, onQuitarNombre }: PropsFila) {
  const tarjeta = tarjetaDeVistaPrevia(r);
  const autor = autorReal(r);
  const aviso = avisoDeEmpresa(r);
  const acciones = accionesDelAdmin(r.estado);
  const sinPublicar = acciones.includes('PUBLICADA') && !r.publicable;
  const idMotivo = `motivo-${r.id}`;

  return (
    <li className="px-5 py-4 flex flex-col md:flex-row gap-3 md:gap-6">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Estrellas n={r.estrellas} />
          {requiereSeguimiento(r.estrellas) && (
            <span role="img" aria-label="Para hacerle seguimiento" title="Para hacerle seguimiento" className="text-red-600">⚑</span>
          )}
          <span className={`${clasePastilla} ${ESTILO_DE_ESTADO[r.estado] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {etiquetaDeEstado(r.estado)}
          </span>
          {r.marcas.map(m => (
            <span key={m} className={`${clasePastilla} bg-amber-50 text-amber-800 border-amber-200`}>{etiquetaDeMarca(m)}</span>
          ))}
          {aviso && <span className={`${clasePastilla} bg-red-50 text-red-700 border-red-200`}>{aviso}</span>}
          {r.esReferida && <span className={`${clasePastilla} bg-blue-50 text-blue-700 border-blue-200`}>Referida</span>}
        </div>

        {r.texto
          ? <blockquote style={{ whiteSpace: 'pre-line' }} className="text-sm text-ink break-words">"{r.texto}"</blockquote>
          : <p className="text-sm text-muted italic">Sin comentario</p>}

        <p className="text-sm text-ink">
          <span className="font-semibold">{tarjeta.nombre}</span>
          {tarjeta.detalle && <span className="text-muted"> · {tarjeta.detalle}</span>}
        </p>
        {autor && <p className="text-xs text-muted">Escrita por {autor}. Esto no sale en la web.</p>}
        {r.nombreRetiradoEn && <p className="text-xs text-muted">Nombre quitado el {fechaCorta(r.nombreRetiradoEn)}.</p>}
        <p className="text-xs text-muted">{detallesDeOrigen(r).join(' · ')}</p>
      </div>

      <div className="flex flex-col items-start md:items-end gap-2 md:max-w-[16rem]">
        <div className="flex flex-wrap gap-2 md:justify-end">
          {acciones.map(hacia => (
            <button key={hacia} onClick={() => onMover(hacia)}
              disabled={ocupada || (hacia === 'PUBLICADA' && !r.publicable)}
              aria-describedby={hacia === 'PUBLICADA' && sinPublicar ? idMotivo : undefined}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              {etiquetaDeAccion(hacia)}
            </button>
          ))}
          {r.origen === 'MANUAL' && (
            <button onClick={onEditar} disabled={ocupada}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-40">
              Editar
            </button>
          )}
          {puedeQuitarNombre(r) && (
            <button onClick={onQuitarNombre} disabled={ocupada}
              className="border border-red-200 text-red-700 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-40">
              Quitar el nombre
            </button>
          )}
        </div>
        {sinPublicar && <p id={idMotivo} className="text-xs text-muted md:text-right">{r.motivoNoPublicable}</p>}
      </div>
    </li>
  );
}
