import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Wallet, Users, LogOut, Link2, BadgePercent, ArrowUpRight, X, FileText, UserCog } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import logoCompleto from '../assets/logo-completo.svg';

const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const METODO_LABEL: Record<string, string> = { NEQUI: 'Nequi', BANCOLOMBIA: 'Bancolombia', DAVIPLATA: 'Daviplata', OTRO: '' };
const ESTADO: Record<string, { t: string; c: string }> = {
  PRUEBA: { t: 'En prueba', c: 'bg-blue-100 text-blue-700' },
  ACTIVA: { t: 'Activa', c: 'bg-green-100 text-green-700' },
  EN_MORA: { t: 'En mora', c: 'bg-amber-100 text-amber-700' },
  SUSPENDIDA: { t: 'Suspendida', c: 'bg-red-100 text-red-700' },
  CANCELADA: { t: 'Cancelada', c: 'bg-gray-100 text-gray-500' },
};

const METODOS = [
  { v: 'NEQUI', t: 'Nequi' }, { v: 'BANCOLOMBIA', t: 'Bancolombia' },
  { v: 'DAVIPLATA', t: 'Daviplata' }, { v: 'OTRO', t: 'Otro banco' },
];

type Panel = {
  nombre: string; email: string | null; codigo: string; porcentaje: number; duracionMeses: number | null; telefono: string | null;
  pago: { metodo: string | null; banco: string | null; tipoCuenta: string | null; numero: string | null; titular: string | null; documento: string | null };
  billetera: { totalComision: number; totalRetirado: number; enProceso: number; disponible: number };
  referidos: { id: string; nombre: string; estado: string | null; atribuidoEn: string | null }[];
  comisiones: { id: string; empresa: string; monto: number; porcentaje: number; montoBase: number; estado: string; creadoEn: string }[];
  retiros: { id: string; monto: number; estado: string; solicitadoEn: string; procesadoEn: string | null; comprobanteBase64: string | null; nota: string | null }[];
};

const RETIRO: Record<string, { t: string; c: string }> = {
  SOLICITADO: { t: 'Solicitado', c: 'bg-blue-100 text-blue-700' },
  APROBADO: { t: 'Aprobado', c: 'bg-indigo-100 text-indigo-700' },
  PAGADO: { t: 'Pagado', c: 'bg-green-100 text-green-700' },
  RECHAZADO: { t: 'Rechazado', c: 'bg-red-100 text-red-700' },
};

export default function PanelAfiliado() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Panel | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [modalRetiro, setModalRetiro] = useState(false);
  const [monto, setMonto] = useState('');
  const [errRetiro, setErrRetiro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [perfil, setPerfil] = useState({ nombre: '', telefono: '', pagoMetodo: '', pagoBanco: '', pagoTipoCuenta: 'AHORROS', pagoNumero: '', pagoTitular: '', pagoDocumento: '', passwordActual: '', passwordNueva: '' });
  const [errPerfil, setErrPerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const recargar = () => api.get('/afiliado').then(r => setP(r.data));
  useEffect(() => { recargar(); }, []);

  const setP2 = (k: keyof typeof perfil, v: string) => setPerfil(pf => ({ ...pf, [k]: v }));
  const abrirPerfil = () => {
    if (!p) return;
    setErrPerfil('');
    setPerfil({
      nombre: p.nombre, telefono: p.telefono ?? '',
      pagoMetodo: p.pago.metodo ?? '', pagoBanco: p.pago.banco ?? '', pagoTipoCuenta: p.pago.tipoCuenta ?? 'AHORROS',
      pagoNumero: p.pago.numero ?? '', pagoTitular: p.pago.titular ?? '', pagoDocumento: p.pago.documento ?? '',
      passwordActual: '', passwordNueva: '',
    });
    setModalPerfil(true);
  };
  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrPerfil(''); setGuardandoPerfil(true);
    try {
      await api.put('/afiliado/perfil', {
        nombre: perfil.nombre.trim(), telefono: perfil.telefono.trim(),
        pagoMetodo: perfil.pagoMetodo || undefined, pagoBanco: perfil.pagoBanco.trim(),
        pagoTipoCuenta: perfil.pagoTipoCuenta, pagoNumero: perfil.pagoNumero.trim(),
        pagoTitular: perfil.pagoTitular.trim(), pagoDocumento: perfil.pagoDocumento.trim(),
        passwordActual: perfil.passwordActual || undefined, passwordNueva: perfil.passwordNueva || undefined,
      });
      setModalPerfil(false);
      recargar();
    } catch (err: any) {
      setErrPerfil(err.response?.data?.error ?? 'No pudimos guardar');
    } finally { setGuardandoPerfil(false); }
  };
  const perfilEsBanco = perfil.pagoMetodo === 'BANCOLOMBIA' || perfil.pagoMetodo === 'OTRO';

  const abrirRetiro = () => { setMonto(String(p?.billetera.disponible ?? '')); setErrRetiro(''); setModalRetiro(true); };
  const solicitarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrRetiro(''); setEnviando(true);
    try {
      await api.post('/afiliado/retiros', { monto: Number(monto) });
      setModalRetiro(false);
      recargar();
    } catch (err: any) {
      setErrRetiro(err.response?.data?.error ?? 'No pudimos registrar la solicitud');
    } finally { setEnviando(false); }
  };

  const link = p ? `${window.location.origin}/?ref=${p.codigo}` : '';
  const copiar = () => { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); };
  const salir = () => { logout(); navigate('/login'); };
  const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="min-h-screen bg-[#f6f6f4]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <img src={logoCompleto} alt="HoraPro" className="h-8" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-ink leading-tight">{usuario?.nombre}</p>
              <p className="text-[11px] text-muted">Afiliado</p>
            </div>
            <button onClick={abrirPerfil} title="Editar mis datos" className="text-muted hover:text-ink"><UserCog size={18} /></button>
            <button onClick={salir} title="Cerrar sesión" className="text-muted hover:text-ink"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {!p ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-ink">Hola, {p.nombre.split(' ')[0]}</h1>
              <p className="text-sm text-muted">Comparte tu link y gana comisión por cada cliente que pague.</p>
            </div>

            {/* Link + términos */}
            <div className="bg-white rounded-card border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5"><Link2 size={14} /> Tu link de referido</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                <input readOnly value={link} className="flex-1 bg-transparent text-sm text-ink outline-none" />
                <button onClick={copiar} className="flex items-center gap-1.5 text-sm font-semibold text-ink bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg shrink-0">
                  {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                <BadgePercent size={13} /> Ganas <b className="text-ink">{p.porcentaje}%</b> de cada pago
                {p.duracionMeses == null ? ' de forma indefinida.' : <> durante <b className="text-ink">&nbsp;{p.duracionMeses} meses</b>&nbsp;desde su primer pago.</>}
              </p>
            </div>

            {/* Billetera */}
            <div className="bg-white rounded-card border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3 flex items-center gap-1.5"><Wallet size={14} /> Billetera</p>
              <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted">Disponible para retirar</p>
                  <p className="text-3xl font-extrabold text-ink">{cop(p.billetera.disponible)}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div><p className="text-xs text-muted">Ganado</p><p className="font-semibold text-ink">{cop(p.billetera.totalComision)}</p></div>
                  <div><p className="text-xs text-muted">En proceso</p><p className="font-semibold text-ink">{cop(p.billetera.enProceso)}</p></div>
                  <div><p className="text-xs text-muted">Retirado</p><p className="font-semibold text-ink">{cop(p.billetera.totalRetirado)}</p></div>
                </div>
              </div>
              <button onClick={abrirRetiro} disabled={p.billetera.disponible <= 0}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowUpRight size={15} /> Solicitar retiro
              </button>
              <p className="text-[11px] text-muted mt-2">El pago se hace por fuera a tu cuenta registrada; verás el comprobante aquí.</p>

              {p.retiros.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3 space-y-1.5">
                  {p.retiros.map(r => {
                    const e = RETIRO[r.estado] ?? { t: r.estado, c: 'bg-gray-100 text-gray-500' };
                    return (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{cop(r.monto)}</span>
                          <span className="text-[11px] text-gray-400">{fecha(r.solicitadoEn)}</span>
                          {r.comprobanteBase64 && (
                            <button onClick={() => setComprobante(r.comprobanteBase64)} className="text-[11px] text-primary-dark font-medium inline-flex items-center gap-1 hover:underline">
                              <FileText size={12} /> Comprobante
                            </button>
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${e.c}`}>{e.t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Referidos */}
            <div className="bg-white rounded-card border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3 flex items-center gap-1.5"><Users size={14} /> Tus referidos ({p.referidos.length})</p>
              {p.referidos.length === 0 ? (
                <p className="text-sm text-muted">Todavía nadie se ha registrado con tu link. ¡Compártelo!</p>
              ) : (
                <div className="space-y-1.5">
                  {p.referidos.map(r => {
                    const e = ESTADO[r.estado ?? ''] ?? { t: r.estado ?? '—', c: 'bg-gray-100 text-gray-500' };
                    return (
                      <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
                        <div>
                          <p className="font-medium text-ink text-sm">{r.nombre}</p>
                          <p className="text-[11px] text-gray-400">Desde {fecha(r.atribuidoEn)}</p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${e.c}`}>{e.t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Datos de pago */}
            {p.pago.metodo && (
              <div className="bg-white rounded-card border border-gray-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Cómo te pagamos</p>
                <p className="text-sm text-ink">
                  {p.pago.metodo === 'OTRO' ? p.pago.banco : METODO_LABEL[p.pago.metodo]}
                  {p.pago.tipoCuenta ? ` · ${p.pago.tipoCuenta === 'AHORROS' ? 'Ahorros' : 'Corriente'}` : ''}
                  {p.pago.numero ? ` · ${p.pago.numero}` : ''}
                </p>
                {p.pago.titular && <p className="text-xs text-muted mt-0.5">{p.pago.titular}{p.pago.documento ? ` · ${p.pago.documento}` : ''}</p>}
                <p className="text-[11px] text-gray-400 mt-2">¿Datos incorrectos? Escríbenos para actualizarlos.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal solicitar retiro */}
      {modalRetiro && p && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-ink">Solicitar retiro</h3>
              <button onClick={() => setModalRetiro(false)}><X size={19} className="text-gray-400" /></button>
            </div>
            <form onSubmit={solicitarRetiro} className="p-5 space-y-4">
              <p className="text-sm text-muted">Disponible: <b className="text-ink">{cop(p.billetera.disponible)}</b></p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Monto a retirar</label>
                <input type="number" min={1} max={p.billetera.disponible} value={monto} onChange={e => setMonto(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <p className="text-[11px] text-muted">Te lo pagaremos a: {p.pago.metodo === 'OTRO' ? p.pago.banco : METODO_LABEL[p.pago.metodo ?? '']} {p.pago.numero}.</p>
              {errRetiro && <p className="text-red-600 text-sm">{errRetiro}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setModalRetiro(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={enviando} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">
                  {enviando ? 'Enviando…' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar perfil */}
      {modalPerfil && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">Mis datos</h3>
              <button onClick={() => setModalPerfil(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarPerfil} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nombre</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required value={perfil.nombre} onChange={e => setP2('nombre', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Teléfono</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.telefono} onChange={e => setP2('telefono', e.target.value)} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Datos de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Método</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoMetodo} onChange={e => setP2('pagoMetodo', e.target.value)}>
                      <option value="">— Sin definir —</option>
                      {METODOS.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
                    </select>
                  </div>
                  {perfil.pagoMetodo === 'OTRO' && (
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Banco</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoBanco} onChange={e => setP2('pagoBanco', e.target.value)} />
                    </div>
                  )}
                  {perfilEsBanco && (
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Tipo de cuenta</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoTipoCuenta} onChange={e => setP2('pagoTipoCuenta', e.target.value)}>
                        <option value="AHORROS">Ahorros</option>
                        <option value="CORRIENTE">Corriente</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{perfil.pagoMetodo === 'NEQUI' || perfil.pagoMetodo === 'DAVIPLATA' ? 'Celular' : 'Número de cuenta'}</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoNumero} onChange={e => setP2('pagoNumero', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Titular</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoTitular} onChange={e => setP2('pagoTitular', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Documento</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.pagoDocumento} onChange={e => setP2('pagoDocumento', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Cambiar contraseña <span className="normal-case text-gray-400 font-normal">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="password" placeholder="Contraseña actual" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.passwordActual} onChange={e => setP2('passwordActual', e.target.value)} />
                  <input type="password" placeholder="Nueva (mín. 6)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={perfil.passwordNueva} onChange={e => setP2('passwordNueva', e.target.value)} />
                </div>
              </div>

              {errPerfil && <p className="text-red-600 text-sm">{errPerfil}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModalPerfil(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardandoPerfil} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">
                  {guardandoPerfil ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ver comprobante */}
      {comprobante && (
        <div className="fixed inset-0 !mt-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setComprobante(null)}>
          <div className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={comprobante} alt="Comprobante de pago" className="w-full rounded-xl shadow-2xl bg-white" />
            <button onClick={() => setComprobante(null)} className="mt-3 mx-auto block text-white text-sm font-medium">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
