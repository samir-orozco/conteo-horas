import { useEffect, useState } from 'react';
import {
  Copy, Check, ExternalLink, MonitorSmartphone, ScanFace, ShieldCheck, KeyRound, Trash2,
  TabletSmartphone, Pencil, X, Lock, QrCode, Download, RefreshCw, Clock, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toDataURL } from 'qrcode';
import { useMiPlan } from '../lib/plan';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { estadoDelKiosco } from '../features/marcador/estadoDelKiosco';
import { avisoDeProteccion, haceCuanto } from '../features/marcador/textosDelKiosco';

type Dispositivo = { id: string; nombre: string; creadoEn: string; ultimoUso: string | null };
type EstadoServidor = { activos: number; conRostro: number; ultimaMarcacion: string | null };

// Cómo se pinta cada aviso de protección. El tono lo decide `avisoDeProteccion`, no el componente.
const TONOS = {
  ALERTA: 'bg-amber-50 border-amber-200 text-amber-900',
  PELIGRO: 'bg-red-50 border-red-200 text-red-900',
  BIEN: 'bg-green-50 border-green-200 text-green-900',
} as const;

// Una tarjeta de estado. Va como `group` con su rótulo por nombre: así se puede encontrar por lo
// que dice ser, y no por su posición en la fila.
function TarjetaDeEstado({ rotulo, Icono, valor, nota }: {
  rotulo: string; Icono: typeof ScanFace; valor: string; nota: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="bg-white rounded-card border border-gray-200 p-5">
      <Icono size={20} className="text-muted mb-2" />
      <p className="font-semibold text-ink text-sm mb-1">{rotulo}</p>
      <p className="text-lg font-bold text-ink tabular-nums">{valor}</p>
      <p className="text-xs text-muted mt-0.5">{nota}</p>
    </div>
  );
}

// Página del panel empresa: link único del kiosco + seguridad por dispositivos.
export default function MarcadorLink() {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { plan } = useMiPlan();
  const [soloDispositivos, setSoloDispositivos] = useState(false);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [estadoServidor, setEstadoServidor] = useState<EstadoServidor | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [revocando, setRevocando] = useState<Dispositivo | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  // El QR va con el link al que pertenece. Si solo se guardara la imagen, al generar un link
  // nuevo se seguiría mostrando el QR del anterior hasta que terminara de dibujarse el otro, y
  // ese es justo el código que acaba de dejar de servir.
  const [qr, setQr] = useState<{ url: string; dato: string } | null>(null);
  const [confirmarLink, setConfirmarLink] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [avisoLink, setAvisoLink] = useState('');

  const cargar = () => {
    api.get('/configuracion/marcador-link').then(r => {
      setToken(r.data.marcadorToken);
      setSoloDispositivos(r.data.soloDispositivos);
    });
    api.get('/configuracion/dispositivos').then(r => setDispositivos(r.data));
    api.get('/configuracion/kiosco-estado').then(r => setEstadoServidor(r.data)).catch(() => setEstadoServidor(null));
  };
  useEffect(() => { cargar(); }, []);

  const url = token ? `${window.location.origin}/marcador/${token}` : '';

  // El QR se dibuja en el navegador, no en un servicio de internet: mandar el link del kiosco a
  // un tercero para que devuelva una imagen sería regalar la llave de la marcación.
  useEffect(() => {
    if (!url) return;
    let vigente = true;
    // `margin: 2` es el borde blanco del propio código. Con 1 quedaba muy pegado al marco y, más
    // allá de verse apretado, ese borde es lo que ayuda al lector a encontrarlo.
    toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then(dato => { if (vigente) setQr({ url, dato }); })
      .catch(() => { /* sin QR: la tarjeta muestra su hueco y el link se copia igual */ });
    return () => { vigente = false; };
  }, [url]);

  // Solo el QR de ESTE link. Mientras se dibuja el del link nuevo, no se enseña el viejo.
  const qrVigente = qr && qr.url === url ? qr.dato : null;

  const copiar = async () => {
    const { copiarTexto } = await import('../lib/clipboard');
    await copiarTexto(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const descargarQr = () => {
    if (!qrVigente) return;
    const a = document.createElement('a');
    a.href = qrVigente;
    a.download = 'marcador-horapro.png';
    a.click();
  };

  const toggleProteccion = async () => {
    const nuevo = !soloDispositivos;
    await api.put('/configuracion', { KIOSCO_SOLO_DISPOSITIVOS: nuevo ? '1' : '0' });
    setSoloDispositivos(nuevo);
  };

  // Cambiar el link invalida el anterior Y desvincula las tablets, porque cada una guarda su
  // autorización bajo una clave que incluye el token. Por eso pasa por confirmación.
  const regenerarLink = async () => {
    setRegenerando(true);
    try {
      const r = await api.post('/configuracion/marcador-link/regenerar');
      setToken(r.data.marcadorToken);
      setDispositivos([]);
      setCodigo(null);
      setConfirmarLink(false);
      setAvisoLink(r.data.dispositivosRevocados > 0
        ? `Link nuevo listo. Se desvincularon ${r.data.dispositivosRevocados} dispositivo(s): vuelve a vincularlos con un código.`
        : 'Link nuevo listo. El anterior dejó de funcionar.');
    } catch {
      setAvisoLink('No pudimos cambiar el link. Inténtalo de nuevo.');
    } finally {
      setRegenerando(false);
    }
  };

  const [errorDisp, setErrorDisp] = useState('');
  const generarCodigo = async () => {
    setErrorDisp('');
    try {
      const r = await api.post('/configuracion/dispositivos/codigo');
      setCodigo(r.data.codigo);
    } catch (err) {
      // Sin `any`: el mensaje del servidor se lee con la forma que tiene, y si no viene, va el nuestro.
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorDisp(delServidor ?? 'No pudimos generar el código.');
    }
  };

  const sinCupoDispositivos = !!plan && !plan.features.multiDispositivo && dispositivos.length >= 1;

  const revocar = async () => {
    if (!revocando) return;
    await api.delete(`/configuracion/dispositivos/${revocando.id}`);
    setRevocando(null);
    cargar();
  };

  const abrirEdicion = (d: Dispositivo) => { setEditandoId(d.id); setNombreEdit(d.nombre); };
  const guardarNombre = async (id: string) => {
    const limpio = nombreEdit.trim();
    if (!limpio) return;
    await api.put(`/configuracion/dispositivos/${id}`, { nombre: limpio });
    setEditandoId(null);
    cargar();
  };

  const estado = estadoDelKiosco({
    soloDispositivos,
    dispositivos: dispositivos.length,
    activos: estadoServidor?.activos ?? 0,
    conRostro: estadoServidor?.conRostro ?? 0,
    ultimaMarcacion: estadoServidor?.ultimaMarcacion ?? null,
  }, new Date());
  const aviso = avisoDeProteccion(estado, dispositivos.length);

  return (
    <div className="p-6 md:p-8 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Marcador</h1>
        <p className="text-sm text-muted">El kiosco donde tus colaboradores registran entrada y salida</p>
      </div>

      {/* Dos columnas: a la izquierda TODO lo que se opera (link, aviso, protección y estado), y a
          la derecha solo el QR. Antes el aviso cruzaba por debajo de las dos y se leía como si
          hablara también del código, que no tiene nada que ver. */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem] gap-6 items-start">
        <div className="space-y-6">
        <div className="bg-white rounded-card border border-gray-200 p-6">
          <p className="font-semibold text-ink mb-1">Link único de tu empresa</p>
          <p className="text-sm text-muted mb-4">
            Ábrelo en la tablet, computador o celular que uses como reloj de marcación.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-ink break-all">
              {url || 'Cargando...'}
            </code>
            <div className="flex gap-2">
              <button onClick={copiar} disabled={!token}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-semibold px-4 py-3 rounded-xl text-sm disabled:opacity-60">
                {copiado ? <Check size={16} /> : <Copy size={16} />}{copiado ? 'Copiado' : 'Copiar'}
              </button>
              <a href={url || '#'} target="_blank" rel="noreferrer"
                className={`flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-ink font-semibold px-4 py-3 rounded-xl text-sm ${!token ? 'pointer-events-none opacity-60' : ''}`}>
                <ExternalLink size={16} />Abrir
              </a>
            </div>
          </div>

          {/* Cambiar el link: la única defensa si la URL se filtró. Antes no existía y había que
              tocar la base de datos. */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <button onClick={() => { setAvisoLink(''); setConfirmarLink(true); }} disabled={!token || regenerando}
              className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-ink font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60">
              <RefreshCw size={15} /> Generar link nuevo
            </button>
            <p className="text-xs text-muted flex-1 min-w-[16rem]">
              Úsalo si el link se filtró. El anterior deja de funcionar y hay que volver a vincular las tablets.
            </p>
          </div>
          {avisoLink && <p className="mt-3 text-sm text-ink bg-primary/20 rounded-lg px-3 py-2">{avisoLink}</p>}
        </div>

      {/* Qué tan abierto está el kiosco ahora mismo. Sin esto, una empresa expuesta se ve igual
          que una protegida. */}
      <div role="status" aria-label="Estado de la protección"
        className={`rounded-card border px-5 py-4 text-sm flex items-start gap-2.5 ${TONOS[aviso.tono]}`}>
        {aviso.tono === 'BIEN' ? <ShieldCheck size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
        <span>{aviso.texto}</span>
      </div>

      {/* Seguridad: solo dispositivos autorizados */}
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><ShieldCheck size={17} /> Solo dispositivos autorizados</p>
            <p className="text-sm text-muted">
              Evita que alguien copie el link y marque desde su casa: con esta opción activa,
              el kiosco solo funciona en dispositivos que vincules con un código.
            </p>
          </div>
          <button onClick={toggleProteccion} role="switch" aria-checked={soloDispositivos}
            aria-label="Solo dispositivos autorizados"
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${soloDispositivos ? 'bg-primary' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${soloDispositivos ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {soloDispositivos && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            {sinCupoDispositivos ? (
              <div className="mb-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-muted flex items-center gap-2">
                  <Lock size={15} /> Tu plan permite <b className="text-ink">un solo dispositivo</b>. Elimina el actual o sube de plan para vincular más.
                </p>
                <button onClick={() => navigate('/app/configuracion?tab=suscripcion')}
                  className="shrink-0 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg">Subir de plan</button>
              </div>
            ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <button onClick={generarCodigo}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-semibold px-4 py-2.5 rounded-xl text-sm">
                <KeyRound size={16} /> Generar código de vinculación
              </button>
              {codigo && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold tracking-[0.3em] bg-gray-50 border border-gray-200 rounded-xl px-4 py-1.5 text-ink">{codigo}</span>
                  <span className="text-xs text-muted">digítalo en el kiosco<br />(vence en 10 min, un solo uso)</span>
                </div>
              )}
            </div>
            )}
            {errorDisp && <p className="text-sm text-red-600 mb-3">{errorDisp}</p>}

            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Dispositivos vinculados</p>
            {dispositivos.length === 0 ? (
              <p className="text-sm text-muted">Aún no hay dispositivos. Genera un código y ábrelo en la tablet del kiosco.</p>
            ) : (
              <div className="space-y-2">
                {dispositivos.map(d => (
                  <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                    <TabletSmartphone size={16} className="text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editandoId === d.id ? (
                        <div className="flex items-center gap-2">
                          <input autoFocus value={nombreEdit} maxLength={60}
                            onChange={e => setNombreEdit(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') guardarNombre(d.id); if (e.key === 'Escape') setEditandoId(null); }}
                            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          <button onClick={() => guardarNombre(d.id)} title="Guardar" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                          <button onClick={() => setEditandoId(null)} title="Cancelar" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-ink truncate">{d.nombre}</p>
                          <p className="text-xs text-muted">
                            Vinculado el {new Date(d.creadoEn).toLocaleDateString('es-CO')}
                            {d.ultimoUso && ` · último uso ${new Date(d.ultimoUso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </>
                      )}
                    </div>
                    {editandoId !== d.id && (
                      <>
                        <button onClick={() => abrirEdicion(d)} title="Renombrar" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-ink rounded-lg">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setRevocando(d)} title="Revocar" className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lo que está pasando de verdad. Antes eran tres tarjetas de texto fijo que decían lo mismo
          con cualquier configuración y en cualquier empresa. */}
      {estadoServidor && (
        <div className="grid sm:grid-cols-3 gap-4">
          <TarjetaDeEstado
            rotulo="Reconocimiento facial" Icono={ScanFace}
            valor={estado.facial === 'SIN_GENTE' ? 'Sin gente activa' : `${estadoServidor.conRostro} de ${estadoServidor.activos}`}
            nota={estado.facial === 'SIN_GENTE' ? 'No hay a quién registrar todavía'
              : estado.facial === 'NADIE' ? 'Nadie puede marcar sin digitar la cédula'
              : estado.facial === 'TODOS' ? 'Todos pueden marcar con el rostro'
              : 'personas con el rostro registrado'} />
          <TarjetaDeEstado
            rotulo="Última marcación" Icono={Clock}
            valor={estado.minutosSinMarcar === null ? 'Todavía nadie' : haceCuanto(estado.minutosSinMarcar)}
            nota={estado.minutosSinMarcar === null ? 'Nadie ha marcado en este kiosco' : 'en todo el kiosco'} />
          <TarjetaDeEstado
            rotulo="Dispositivos" Icono={MonitorSmartphone}
            valor={soloDispositivos ? String(dispositivos.length) : 'Sin restricción'}
            nota={soloDispositivos ? 'autorizados para abrir el kiosco' : 'tablet, computador o el celular del supervisor'} />
        </div>
      )}
        </div>

        {/* La columna derecha es solo el QR, y por eso no lleva nada debajo. El código va en su
            propio recuadro con aire alrededor: pegado al borde se veía apretado, y un QR sin
            margen además cuesta más de leer para la cámara. */}
        <div className="bg-white rounded-card border border-gray-200 p-6">
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><QrCode size={17} /> Código QR</p>
          <p className="text-sm text-muted mb-5">Escanéalo para abrir el marcador en la tablet, sin copiar la dirección.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 w-fit mx-auto">
            {qrVigente ? (
              <img src={qrVigente} alt="Código QR del marcador" className="w-36 h-36 block" />
            ) : (
              <div className="w-36 h-36 rounded-lg border border-dashed border-gray-300" />
            )}
          </div>
          <button onClick={descargarQr} disabled={!qrVigente}
            className="mt-5 w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-ink font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60">
            <Download size={15} /> Descargar QR
          </button>
        </div>
      </div>

      <ConfirmDialog
        abierto={confirmarLink}
        peligro
        titulo="¿Generar un link nuevo?"
        subtitulo={`El link actual dejará de funcionar y ${dispositivos.length > 0
          ? `los ${dispositivos.length} dispositivos vinculados tendrán que vincularse otra vez con un código`
          : 'habrá que abrir el nuevo en la tablet del kiosco'}. No se puede deshacer.`}
        textoContinuar={regenerando ? 'Generando...' : 'Sí, generar link nuevo'}
        onContinuar={regenerarLink}
        onCancelar={() => setConfirmarLink(false)}
      />

      <ConfirmDialog
        abierto={!!revocando}
        peligro
        titulo="¿Revocar dispositivo?"
        subtitulo={revocando ? `"${revocando.nombre}" dejará de poder abrir el kiosco. Puedes vincularlo de nuevo con otro código.` : ''}
        textoContinuar="Sí, revocar"
        onContinuar={revocar}
        onCancelar={() => setRevocando(null)}
      />
    </div>
  );
}
