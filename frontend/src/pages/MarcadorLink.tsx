import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink, MonitorSmartphone, ScanFace, ShieldCheck, KeyRound, Trash2, TabletSmartphone, Pencil, X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMiPlan } from '../lib/plan';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';

type Dispositivo = { id: string; nombre: string; creadoEn: string; ultimoUso: string | null };

// Página del panel empresa: link único del kiosco + seguridad por dispositivos.
export default function MarcadorLink() {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { plan } = useMiPlan();
  const [soloDispositivos, setSoloDispositivos] = useState(false);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [revocando, setRevocando] = useState<Dispositivo | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');

  const cargar = () => {
    api.get('/configuracion/marcador-link').then(r => {
      setToken(r.data.marcadorToken);
      setSoloDispositivos(r.data.soloDispositivos);
    });
    api.get('/configuracion/dispositivos').then(r => setDispositivos(r.data));
  };
  useEffect(() => { cargar(); }, []);

  const url = token ? `${window.location.origin}/marcador/${token}` : '';

  const copiar = async () => {
    const { copiarTexto } = await import('../lib/clipboard');
    await copiarTexto(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const toggleProteccion = async () => {
    const nuevo = !soloDispositivos;
    await api.put('/configuracion', { KIOSCO_SOLO_DISPOSITIVOS: nuevo ? '1' : '0' });
    setSoloDispositivos(nuevo);
  };

  const [errorDisp, setErrorDisp] = useState('');
  const generarCodigo = async () => {
    setErrorDisp('');
    try {
      const r = await api.post('/configuracion/dispositivos/codigo');
      setCodigo(r.data.codigo);
    } catch (err: any) {
      setErrorDisp(err.response?.data?.error ?? 'No pudimos generar el código.');
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

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Marcador</h1>
        <p className="text-sm text-muted">El kiosco donde tus colaboradores registran entrada y salida</p>
      </div>

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

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <MonitorSmartphone size={20} className="text-muted mb-2" />
          <p className="font-semibold text-ink text-sm mb-1">Cualquier dispositivo</p>
          <p className="text-xs text-muted">Tablet en recepción, computador o el celular del supervisor.</p>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <ShieldCheck size={20} className="text-muted mb-2" />
          <p className="font-semibold text-ink text-sm mb-1">Solo marcación</p>
          <p className="text-xs text-muted">El colaborador ingresa con su cédula y solo puede marcar entrada o salida.</p>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <ScanFace size={20} className="text-muted mb-2" />
          <p className="font-semibold text-ink text-sm mb-1">Reconocimiento facial</p>
          <p className="text-xs text-muted">Registra el rostro de cada colaborador desde su perfil y marcará sin digitar la cédula.</p>
        </div>
      </div>

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
