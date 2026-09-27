import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Search, ShieldAlert, Trash2, UserCheck, X } from 'lucide-react';
import api from '../../lib/api';
import { cuandoPaso, estiloDeTipo, etiquetaDeTipo, resumenDeVeces, tituloDeEvento } from '../../features/admin/registroDelSistema';

// El registro del sistema (23 de septiembre de 2026).
//
// Tres pestañas sobre la misma tabla: lo que se rompió, quién intentó entrar sin permiso, y quién
// hizo qué. Aquí NO hay borrado automático —decisión del dueño—, así que el borrado es explícito y
// vive arriba a la derecha.
//
// El filtrado y la paginación los hace el SERVIDOR. Filtrar en el navegador solo filtraría la
// página que ya se trajo, y en una tabla que puede tener cientos de miles de filas eso es una
// pantalla que miente.

type EventoFila = {
  id: string; tipo: string; origen: string; veces: number;
  primeraVez: string; ultimaVez: string;
  metodo: string | null; ruta: string | null; estado: number | null;
  mensaje: string; ip: string | null;
  usuarioEmail: string | null; usuarioNombre: string | null;
  empresaId: string | null; empresaNombre: string | null; navegador: string | null;
};
type EventoDetalle = EventoFila & { detalle: string | null };
type Alcance = { todo: true } | { desde: string; hasta: string; tipo: string };

const PESTANAS = [
  { tipo: 'ERROR', label: 'Errores', icono: AlertTriangle },
  { tipo: 'ACCESO', label: 'Accesos', icono: ShieldAlert },
  { tipo: 'AUDITORIA', label: 'Acciones', icono: UserCheck },
] as const;

const claseInput = 'border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amarillo/40';

export default function AdminRegistro() {
  const [tipo, setTipo] = useState<string>('ERROR');
  const [buscar, setBuscar] = useState('');
  const [buscarAplicado, setBuscarAplicado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [pagina, setPagina] = useState(1);

  const [eventos, setEventos] = useState<EventoFila[]>([]);
  const [total, setTotal] = useState(0);
  const [porPagina, setPorPagina] = useState(50);
  // "Cargando" se DERIVA de qué consulta se trajo por última vez, en vez de ser un estado que el
  // efecto pone en true nada más entrar. Fijarlo dentro del efecto encadena renders (lo marca el
  // linter de React) y además abre una carrera: con dos respuestas fuera de orden, la lenta pisaba
  // a la rápida y la tabla mostraba el filtro anterior.
  const [consultaCargada, setConsultaCargada] = useState<string | null>(null);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);

  const [abierto, setAbierto] = useState<EventoDetalle | null>(null);
  const [panelBorrado, setPanelBorrado] = useState(false);
  const [porConfirmar, setPorConfirmar] = useState<{ alcance: Alcance; texto: string } | null>(null);
  const [aviso, setAviso] = useState('');

  // El buscador espera a que la persona deje de escribir. Sin esto, "45.153.160.8" son doce
  // consultas a una tabla que puede ser enorme.
  useEffect(() => {
    const t = setTimeout(() => { setBuscarAplicado(buscar); setPagina(1); }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const consulta = useMemo(() => {
    const p = new URLSearchParams({ tipo, pagina: String(pagina) });
    if (buscarAplicado) p.set('buscar', buscarAplicado);
    if (empresaId) p.set('empresaId', empresaId);
    // Las dos fechas o ninguna: un rango a medias no es un rango, y el servidor lo descarta.
    if (desde && hasta) { p.set('desde', desde); p.set('hasta', hasta); }
    return p.toString();
  }, [tipo, pagina, buscarAplicado, empresaId, desde, hasta]);

  const cargar = useCallback(async () => {
    try {
      const [lista, resumen] = await Promise.all([
        api.get(`/admin/eventos?${consulta}`),
        api.get(`/admin/eventos/resumen?${consulta}`),
      ]);
      setEventos(lista.data.eventos);
      setTotal(lista.data.total);
      setPorPagina(lista.data.porPagina);
      const porTipo: Record<string, number> = {};
      for (const t of resumen.data.porTipo) porTipo[t.tipo] = t.filas;
      setConteos(porTipo);
    } finally {
      // También cuando falla: si no, la pantalla se queda diciendo "Cargando…" para siempre y
      // parece colgada cuando lo que pasó es que la consulta no salió.
      setConsultaCargada(consulta);
    }
  }, [consulta]);

  useEffect(() => { void cargar(); }, [cargar]);
  const cargando = consultaCargada !== consulta;
  useEffect(() => { api.get('/admin/empresas').then(r => setEmpresas(r.data)).catch(() => setEmpresas([])); }, []);

  const abrir = async (id: string) => {
    const r = await api.get(`/admin/eventos/${id}`);
    setAbierto(r.data);
  };

  const exportar = () => {
    window.open(`${api.defaults.baseURL}/admin/eventos/exportar?${consulta}`, '_blank');
  };

  const borrar = async () => {
    if (!porConfirmar) return;
    const r = await api.delete('/admin/eventos', { data: porConfirmar.alcance });
    setAviso(`Se borraron ${r?.data?.borrados ?? 0} registros.`);
    setPorConfirmar(null);
    setPanelBorrado(false);
    void cargar();
  };

  const hayPeriodo = Boolean(desde && hasta);
  const paginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Registro del sistema</h1>
          <p className="text-sm text-muted">
            Lo que falla, quién intenta entrar sin permiso y quién hizo qué. Nada se borra solo.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar}
            className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50">
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => setPanelBorrado(v => !v)}
            className="inline-flex items-center gap-2 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50">
            <Trash2 size={16} /> Borrar
          </button>
        </div>
      </div>

      {aviso && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{aviso}</p>}

      {panelBorrado && (
        <div className="bg-white border border-red-200 rounded-card p-4 space-y-3">
          <p className="text-sm text-ink font-semibold">¿Qué se borra?</p>
          <p className="text-xs text-muted">
            El borrado no se puede deshacer. Un período borra únicamente lo de esas fechas, dentro de la pestaña
            que estás viendo.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!hayPeriodo}
              onClick={() => setPorConfirmar({
                alcance: { desde, hasta, tipo },
                texto: `todo lo de "${etiquetaDeTipo(tipo)}" entre ${desde} y ${hasta}`,
              })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Borrar el período
            </button>
            <button
              onClick={() => setPorConfirmar({ alcance: { todo: true }, texto: 'TODO el registro del sistema' })}
              className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50">
              Borrar todo el registro
            </button>
          </div>
          {!hayPeriodo && <p className="text-xs text-muted">Para borrar un período, pon las dos fechas en los filtros.</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PESTANAS.map(p => {
          const activa = p.tipo === tipo;
          return (
            <button key={p.tipo}
              onClick={() => { setTipo(p.tipo); setPagina(1); }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border ${
                activa ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-gray-200 hover:bg-gray-50'}`}>
              <p.icono size={16} />
              {p.label}
              <span className={`text-xs ${activa ? 'text-white/70' : 'text-muted'}`}>{conteos[p.tipo] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-card p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Empresa
          <select value={empresaId} onChange={e => { setEmpresaId(e.target.value); setPagina(1); }} className={claseInput}>
            <option value="">Todas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Desde
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPagina(1); }} className={claseInput} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Hasta
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPagina(1); }} className={claseInput} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted flex-1 min-w-[220px]">
          Buscar
          <span className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={buscar} onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por mensaje, ruta, IP, usuario o empresa"
              className={`${claseInput} w-full pl-9`} />
          </span>
        </label>
      </div>

      <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-gray-100">
              <th className="px-5 py-3.5">Veces</th>
              <th className="px-5 py-3.5">Última vez</th>
              <th className="px-5 py-3.5">Qué pasó</th>
              <th className="px-5 py-3.5">Quién / desde dónde</th>
              <th className="px-5 py-3.5">Empresa</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map(e => (
              <tr key={e.id} onClick={() => abrir(e.id)}
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer align-top">
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${estiloDeTipo(e.tipo)}`}>
                    {etiquetaDeTipo(e.tipo)}
                  </span>
                  <p className="text-xs text-muted mt-1">{resumenDeVeces(e.veces)}</p>
                </td>
                <td className="px-5 py-3.5 text-muted whitespace-nowrap">{cuandoPaso(e.ultimaVez)}</td>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-ink">{tituloDeEvento(e)}</p>
                  {/* En Accesos y en Acciones el título YA es el mensaje ("Demasiados intentos
                      seguidos", "Borró una empresa"): repetirlo debajo llenaba la fila de texto
                      duplicado. Solo en Errores son dos cosas distintas —la ruta y el fallo—. */}
                  {e.mensaje !== tituloDeEvento(e) && (
                    <p className="text-xs text-muted break-words max-w-xl">{e.mensaje}</p>
                  )}
                  {e.origen === 'NAVEGADOR' && <p className="text-xs text-muted mt-1">Pasó en el navegador de la persona</p>}
                </td>
                <td className="px-5 py-3.5 text-xs text-muted">
                  {e.usuarioEmail && <p className="text-ink">{e.usuarioEmail}</p>}
                  {e.ip && <p>{e.ip}</p>}
                </td>
                <td className="px-5 py-3.5 text-muted">{e.empresaNombre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && eventos.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">No hay nada registrado con esos filtros.</p>
        )}
        {cargando && <p className="px-5 py-10 text-center text-sm text-muted">Cargando…</p>}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{total.toLocaleString('es-CO')} en total</span>
          <span className="flex gap-2">
            <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 disabled:opacity-40">Anterior</button>
            <span className="px-2 py-1.5">Página {pagina} de {paginas}</span>
            <button disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 disabled:opacity-40">Siguiente</button>
          </span>
        </div>
      )}

      {abierto && <DetalleDelEvento evento={abierto} onCerrar={() => setAbierto(null)} />}

      {porConfirmar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-card p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-ink">Esto no se puede deshacer</h2>
            <p className="text-sm text-muted">Se va a borrar {porConfirmar.texto}.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPorConfirmar(null)}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={borrar}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleDelEvento({ evento, onCerrar }: { evento: EventoDetalle; onCerrar: () => void }) {
  const datos: [string, string | null][] = [
    ['Cuándo empezó', cuandoPaso(evento.primeraVez)],
    ['Última vez', cuandoPaso(evento.ultimaVez)],
    ['Veces', resumenDeVeces(evento.veces)],
    ['Ruta', [evento.metodo, evento.ruta].filter(Boolean).join(' ') || null],
    ['Respuesta', evento.estado ? String(evento.estado) : null],
    ['Usuario', evento.usuarioEmail ? `${evento.usuarioNombre ?? ''} ${evento.usuarioEmail}`.trim() : null],
    ['Empresa', evento.empresaNombre],
    ['IP', evento.ip],
    ['Navegador', evento.navegador],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-card max-w-3xl w-full max-h-[85vh] overflow-auto">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${estiloDeTipo(evento.tipo)}`}>
              {etiquetaDeTipo(evento.tipo)}
            </span>
            <h2 className="text-lg font-bold text-ink mt-2">{tituloDeEvento(evento)}</h2>
            <p className="text-sm text-muted break-words">{evento.mensaje}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
          {datos.filter(([, v]) => v).map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs uppercase tracking-wide text-muted">{etiqueta}</dt>
              <dd className="text-sm text-ink break-words">{valor}</dd>
            </div>
          ))}
        </dl>

        {evento.detalle && (
          <div className="px-6 pb-6">
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Rastro completo</p>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto whitespace-pre-wrap break-words max-h-80">
              {evento.detalle}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
