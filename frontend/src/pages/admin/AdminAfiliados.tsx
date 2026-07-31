import { useEffect, useState } from 'react';
import { Plus, X, Pencil, Link2, Copy, Check, Send, Users, Wallet, Handshake, Mail, Banknote, Upload } from 'lucide-react';
import api from '../../lib/api';

type AfiliadoRow = {
  id: string; nombre: string; codigo: string; porcentaje: number; duracionMeses: number | null;
  activo: boolean; telefono: string | null; email: string | null; invitacionPendiente: boolean; autoRegistroPendiente?: boolean; referidos: number;
};
type Detalle = AfiliadoRow & {
  pago: { metodo: string | null; banco: string | null; tipoCuenta: string | null; numero: string | null; titular: string | null; documento: string | null };
  referidos: { id: string; nombre: string; nit: string; estado: string | null; atribuidoEn: string | null }[];
  billetera: { totalComision: number; totalRetirado: number; enProceso: number; disponible: number };
} & { referidosCount?: number };

type RetiroPendiente = {
  id: string; monto: number; solicitadoEn: string;
  afiliado: { id: string; nombre: string; pagoMetodo: string | null; pagoBanco: string | null; pagoTipoCuenta: string | null; pagoNumero: string | null; pagoTitular: string | null; pagoDocumento: string | null };
};

const METODOS = [
  { v: 'NEQUI', t: 'Nequi' }, { v: 'BANCOLOMBIA', t: 'Bancolombia' },
  { v: 'DAVIPLATA', t: 'Daviplata' }, { v: 'OTRO', t: 'Otro banco' },
];
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const linkDe = (codigo: string) => `${window.location.origin}/?ref=${codigo}`;

const FORM_VACIO = {
  nombre: '', email: '', porcentaje: '20', duracionMeses: '12', telefono: '',
  pagoMetodo: '', pagoBanco: '', pagoTipoCuenta: 'AHORROS', pagoNumero: '', pagoTitular: '', pagoDocumento: '',
};

export default function AdminAfiliados() {
  const [afiliados, setAfiliados] = useState<AfiliadoRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [invitacion, setInvitacion] = useState<{ link: string; enviada: boolean } | null>(null);

  const [detalle, setDetalle] = useState<Detalle | null>(null);

  // Invitar a que se registre solo
  const [modalInvitar, setModalInvitar] = useState(false);
  const [formInv, setFormInv] = useState({ nombre: '', porcentaje: '20', duracionMeses: '12' });
  const [linkInvitar, setLinkInvitar] = useState<string | null>(null);
  const [errInv, setErrInv] = useState('');
  const [guardandoInv, setGuardandoInv] = useState(false);

  // Retiros pendientes de pago
  const [pendientes, setPendientes] = useState<RetiroPendiente[]>([]);
  const [procesando, setProcesando] = useState<RetiroPendiente | null>(null);
  const [compRetiro, setCompRetiro] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [guardandoRetiro, setGuardandoRetiro] = useState(false);

  const cargar = () => api.get('/admin/afiliados').then(r => { setAfiliados(r.data); setCargando(false); });
  const cargarPendientes = () => api.get('/admin/afiliados/retiros/pendientes').then(r => setPendientes(r.data));
  useEffect(() => { cargar(); cargarPendientes(); }, []);

  const adjuntarComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCompRetiro(String(reader.result));
    reader.readAsDataURL(file);
  };

  const abrirProcesar = (r: RetiroPendiente) => { setProcesando(r); setCompRetiro(''); setMotivoRechazo(''); };

  const procesarRetiro = async (estado: 'PAGADO' | 'RECHAZADO') => {
    if (!procesando) return;
    setGuardandoRetiro(true);
    try {
      await api.put(`/admin/afiliados/retiros/${procesando.id}`, {
        estado,
        comprobanteBase64: estado === 'PAGADO' ? (compRetiro || undefined) : undefined,
        nota: estado === 'RECHAZADO' ? (motivoRechazo || undefined) : undefined,
      });
      setProcesando(null);
      avisar(estado === 'PAGADO' ? 'Retiro marcado como pagado' : 'Retiro rechazado');
      cargarPendientes(); cargar();
    } finally { setGuardandoRetiro(false); }
  };

  const avisar = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const set = (k: keyof typeof FORM_VACIO, v: string) => setForm(p => ({ ...p, [k]: v }));

  const copiarLink = (codigo: string) => {
    navigator.clipboard.writeText(linkDe(codigo));
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

  const abrirNuevo = () => {
    setEditandoId(null); setForm(FORM_VACIO); setError(''); setInvitacion(null); setModal(true);
  };

  const abrirInvitar = () => {
    setFormInv({ nombre: '', porcentaje: '20', duracionMeses: '12' }); setLinkInvitar(null); setErrInv(''); setModalInvitar(true);
  };
  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrInv(''); setGuardandoInv(true);
    try {
      const { data } = await api.post('/admin/afiliados/invitacion', {
        nombre: formInv.nombre.trim() || undefined,
        porcentaje: Number(formInv.porcentaje),
        duracionMeses: formInv.duracionMeses.trim() === '' ? null : Number(formInv.duracionMeses),
      });
      setLinkInvitar(data.inviteLink);
      cargar();
    } catch (err: any) {
      setErrInv(err.response?.data?.error ?? 'No pudimos generar la invitación');
    } finally { setGuardandoInv(false); }
  };

  const abrirEditar = async (id: string) => {
    setError(''); setInvitacion(null);
    const { data } = await api.get(`/admin/afiliados/${id}`);
    setForm({
      nombre: data.nombre, email: data.email ?? '', porcentaje: String(data.porcentaje),
      duracionMeses: data.duracionMeses == null ? '' : String(data.duracionMeses), telefono: data.telefono ?? '',
      pagoMetodo: data.pago.metodo ?? '', pagoBanco: data.pago.banco ?? '',
      pagoTipoCuenta: data.pago.tipoCuenta ?? 'AHORROS', pagoNumero: data.pago.numero ?? '',
      pagoTitular: data.pago.titular ?? '', pagoDocumento: data.pago.documento ?? '',
    });
    setEditandoId(id); setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setGuardando(true);
    const payload = {
      nombre: form.nombre.trim(), email: form.email.trim(),
      porcentaje: Number(form.porcentaje),
      duracionMeses: form.duracionMeses.trim() === '' ? null : Number(form.duracionMeses),
      telefono: form.telefono.trim(),
      pagoMetodo: form.pagoMetodo || undefined, pagoBanco: form.pagoBanco.trim(),
      pagoTipoCuenta: form.pagoTipoCuenta, pagoNumero: form.pagoNumero.trim(),
      pagoTitular: form.pagoTitular.trim(), pagoDocumento: form.pagoDocumento.trim(),
    };
    try {
      if (editandoId) {
        await api.put(`/admin/afiliados/${editandoId}`, payload);
        setModal(false); avisar('Afiliado actualizado');
      } else {
        const { data } = await api.post('/admin/afiliados', payload);
        setInvitacion({ link: data.inviteLink, enviada: data.invitacionEnviada });
        if (data.invitacionEnviada) { setModal(false); avisar('Afiliado creado — invitación enviada'); }
      }
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No pudimos guardar');
    } finally { setGuardando(false); }
  };

  const toggleActivo = async (a: AfiliadoRow) => {
    await api.put(`/admin/afiliados/${a.id}/activo`, { activo: !a.activo });
    cargar();
  };

  const reinvitar = async (a: AfiliadoRow) => {
    try {
      const { data } = await api.post(`/admin/afiliados/${a.id}/reinvitar`);
      if (data.invitacionEnviada) {
        avisar(`Invitación reenviada a ${a.email}`);
      } else {
        // Copiar al portapapeles es "mejor esfuerzo": en móvil puede fallar
        // (permiso, foco de la pestaña) y no debe tapar el aviso del link.
        try { await navigator.clipboard.writeText(data.inviteLink); avisar('Link de invitación copiado. Compártelo tú mismo.'); }
        catch { avisar(`No se pudo copiar. Link: ${data.inviteLink}`); }
      }
      cargar();
    } catch (err: any) {
      avisar(err.response?.data?.error ?? 'No pudimos reenviar la invitación');
    }
  };

  const verDetalle = async (id: string) => {
    const { data } = await api.get(`/admin/afiliados/${id}`);
    setDetalle(data);
  };

  const esBanco = form.pagoMetodo === 'BANCOLOMBIA' || form.pagoMetodo === 'OTRO';
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2"><Handshake size={22} /> Afiliados</h1>
          <p className="text-sm text-muted">Socios que traen clientes. Cada uno tiene su link y su comisión.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={abrirInvitar} className="flex items-center gap-1.5 text-sm font-semibold text-ink bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-xl">
            <Send size={15} /> Invitar
          </button>
          <button onClick={abrirNuevo} className="flex items-center gap-1.5 text-sm font-semibold text-ink bg-primary hover:bg-primary-dark px-4 py-2.5 rounded-xl">
            <Plus size={16} /> Nuevo afiliado
          </button>
        </div>
      </div>

      {/* Retiros pendientes de pago */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-card border border-amber-200 ring-1 ring-amber-100 p-5 mb-6">
          <p className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Banknote size={17} className="text-amber-600" /> Retiros por pagar ({pendientes.length})</p>
          <div className="space-y-2">
            {pendientes.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 flex-wrap border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-sm">{r.afiliado.nombre} — {cop(r.monto)}</p>
                  <p className="text-xs text-muted">
                    {r.afiliado.pagoMetodo === 'OTRO' ? r.afiliado.pagoBanco : (METODOS.find(m => m.v === r.afiliado.pagoMetodo)?.t ?? 'Sin método')}
                    {r.afiliado.pagoNumero ? ` · ${r.afiliado.pagoNumero}` : ''}
                    {r.afiliado.pagoTitular ? ` · ${r.afiliado.pagoTitular}` : ''}
                    {r.afiliado.pagoDocumento ? ` · ${r.afiliado.pagoDocumento}` : ''}
                  </p>
                </div>
                <button onClick={() => abrirProcesar(r)} className="text-sm font-semibold text-ink bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg shrink-0">Procesar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : afiliados.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-200 p-10 text-center">
          <Handshake size={30} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-muted">Aún no tienes afiliados. Crea el primero y compártele su link.</p>
        </div>
      ) : (
        <div className="bg-white rounded-card border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Afiliado</th>
                  <th className="px-4 py-3 text-left">Comisión</th>
                  <th className="px-4 py-3 text-center">Referidos</th>
                  <th className="px-4 py-3 text-left">Link</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {afiliados.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => verDetalle(a.id)} className="font-semibold text-ink hover:underline text-left">{a.nombre}</button>
                      {a.autoRegistroPendiente
                        ? <p className="text-[11px] text-amber-600 font-medium">Invitado · sin registrarse</p>
                        : <p className="text-xs text-gray-400">{a.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{a.porcentaje}%</span>
                      <span className="text-muted"> · {a.duracionMeses == null ? 'indefinido' : `${a.duracionMeses} meses`}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{a.referidos}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => copiarLink(a.codigo)} title={linkDe(a.codigo)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-dark bg-primary/15 hover:bg-primary/30 px-2.5 py-1.5 rounded-lg">
                        {copiado === a.codigo ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> {a.codigo}</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.invitacionPendiente && <p className="text-[11px] text-amber-600 font-medium mb-1">Invitación pendiente</p>}
                      <button onClick={() => toggleActivo(a)} role="switch" aria-checked={a.activo}
                        className={`relative w-11 h-6 rounded-full transition-colors ${a.activo ? 'bg-primary' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${a.activo ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {a.invitacionPendiente && (
                          <button onClick={() => reinvitar(a)} title="Reenviar invitación" className="p-1.5 text-muted hover:bg-gray-100 rounded-lg"><Send size={14} /></button>
                        )}
                        <button onClick={() => abrirEditar(a.id)} title="Editar" className="p-1.5 text-muted hover:bg-gray-100 rounded-lg"><Pencil size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">{editandoId ? 'Editar afiliado' : 'Nuevo afiliado'}</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            {invitacion ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700"><Check size={18} /> <p className="font-semibold">Afiliado creado</p></div>
                <p className="text-sm text-muted">
                  {invitacion.enviada
                    ? 'Le enviamos un correo para que cree su contraseña.'
                    : 'El correo no está configurado. Compártele este enlace para que cree su contraseña (vence en 24 h):'}
                </p>
                {!invitacion.enviada && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <input readOnly value={invitacion.link} className="flex-1 bg-transparent text-xs text-ink outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(invitacion.link); avisar('Link copiado'); }}
                      className="text-xs font-semibold text-primary-dark px-2 py-1 hover:bg-primary/20 rounded"><Copy size={13} /></button>
                  </div>
                )}
                <button onClick={() => { setModal(false); }} className="w-full bg-primary hover:bg-primary-dark text-ink font-semibold py-2.5 rounded-lg">Listo</button>
              </div>
            ) : (
              <form onSubmit={guardar} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted mb-1">Nombre</label>
                    <input className={inp} required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Referidor" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted mb-1">Correo (para su acceso)</label>
                    <input className={inp} type="email" required disabled={!!editandoId} value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@correo.com" />
                    {editandoId && <p className="text-[11px] text-gray-400 mt-1">El correo no se puede cambiar aquí.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Comisión (%)</label>
                    <input className={inp} type="number" min={0} max={100} step={0.5} required value={form.porcentaje} onChange={e => set('porcentaje', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Duración (meses)</label>
                    <input className={inp} type="number" min={0} value={form.duracionMeses} onChange={e => set('duracionMeses', e.target.value)} placeholder="Vacío = indefinido" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted mb-1">Teléfono <span className="text-gray-400">(opcional)</span></label>
                    <input className={inp} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="3001234567" />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Datos de pago (para el egreso de comisiones)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Método</label>
                      <select className={inp} value={form.pagoMetodo} onChange={e => set('pagoMetodo', e.target.value)}>
                        <option value="">— Sin definir —</option>
                        {METODOS.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
                      </select>
                    </div>
                    {form.pagoMetodo === 'OTRO' && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Nombre del banco</label>
                        <input className={inp} value={form.pagoBanco} onChange={e => set('pagoBanco', e.target.value)} placeholder="Davivienda, BBVA…" />
                      </div>
                    )}
                    {esBanco && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Tipo de cuenta</label>
                        <select className={inp} value={form.pagoTipoCuenta} onChange={e => set('pagoTipoCuenta', e.target.value)}>
                          <option value="AHORROS">Ahorros</option>
                          <option value="CORRIENTE">Corriente</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">{form.pagoMetodo === 'NEQUI' || form.pagoMetodo === 'DAVIPLATA' ? 'Celular' : 'Número de cuenta'}</label>
                      <input className={inp} value={form.pagoNumero} onChange={e => set('pagoNumero', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Titular</label>
                      <input className={inp} value={form.pagoTitular} onChange={e => set('pagoTitular', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Documento del titular</label>
                      <input className={inp} value={form.pagoDocumento} onChange={e => set('pagoDocumento', e.target.value)} placeholder="Cédula / NIT" />
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={guardando} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">
                    {guardando ? 'Guardando…' : editandoId ? 'Guardar' : 'Crear e invitar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal invitar (auto-registro) */}
      {modalInvitar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">Invitar afiliado</h3>
              <button onClick={() => setModalInvitar(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            {linkInvitar ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700"><Check size={18} /> <p className="font-semibold">Invitación lista</p></div>
                <p className="text-sm text-muted">Comparte este enlace. El afiliado llenará sus propios datos y creará su cuenta:</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <input readOnly value={linkInvitar} className="flex-1 bg-transparent text-xs text-ink outline-none" />
                  <button onClick={() => { navigator.clipboard.writeText(linkInvitar); avisar('Link copiado'); }} className="text-xs font-semibold text-primary-dark px-2 py-1 hover:bg-primary/20 rounded"><Copy size={13} /></button>
                </div>
                <button onClick={() => setModalInvitar(false)} className="w-full bg-primary hover:bg-primary-dark text-ink font-semibold py-2.5 rounded-lg">Listo</button>
              </div>
            ) : (
              <form onSubmit={invitar} className="p-6 space-y-4">
                <p className="text-sm text-muted">Defines solo el trato; el afiliado se registra solo con su nombre, correo, clave y datos de pago.</p>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nombre <span className="text-gray-400">(opcional, para tu referencia)</span></label>
                  <input className={inp} value={formInv.nombre} onChange={e => setFormInv(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan Referidor" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Comisión (%)</label>
                    <input className={inp} type="number" min={0} max={100} step={0.5} required value={formInv.porcentaje} onChange={e => setFormInv(p => ({ ...p, porcentaje: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Duración (meses)</label>
                    <input className={inp} type="number" min={0} value={formInv.duracionMeses} onChange={e => setFormInv(p => ({ ...p, duracionMeses: e.target.value }))} placeholder="Vacío = indefinido" />
                  </div>
                </div>
                {errInv && <p className="text-red-600 text-sm">{errInv}</p>}
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setModalInvitar(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={guardandoInv} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">
                    {guardandoInv ? 'Generando…' : 'Generar link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-ink">{detalle.nombre}</h3>
                <p className="text-xs text-muted flex items-center gap-1"><Mail size={12} /> {detalle.email}</p>
              </div>
              <button onClick={() => setDetalle(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                <Link2 size={15} className="text-muted shrink-0" />
                <input readOnly value={linkDe(detalle.codigo)} className="flex-1 bg-transparent text-xs text-ink outline-none" />
                <button onClick={() => copiarLink(detalle.codigo)} className="text-xs font-semibold text-primary-dark px-2 py-1 hover:bg-primary/20 rounded">
                  {copiado === detalle.codigo ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-xl p-3">
                  <p className="text-xs text-ink/70 flex items-center gap-1"><Wallet size={13} /> Disponible</p>
                  <p className="text-lg font-bold text-ink">{cop(detalle.billetera.disponible)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-muted flex items-center gap-1"><Users size={13} /> Referidos</p>
                  <p className="text-lg font-bold text-ink">{detalle.referidos.length}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Referidos</p>
                {detalle.referidos.length === 0 ? (
                  <p className="text-sm text-muted">Todavía nadie se ha registrado con su link.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detalle.referidos.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                        <div>
                          <p className="font-medium text-ink">{r.nombre}</p>
                          <p className="text-[11px] text-gray-400">{r.atribuidoEn ? new Date(r.atribuidoEn).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                        </div>
                        <span className="text-xs font-medium text-muted">{r.estado ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal procesar retiro */}
      {procesando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-ink">Procesar retiro</h3>
              <button onClick={() => setProcesando(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-ink">{procesando.afiliado.nombre} — {cop(procesando.monto)}</p>
                <p className="text-xs text-muted mt-1">
                  Pagar a: {procesando.afiliado.pagoMetodo === 'OTRO' ? procesando.afiliado.pagoBanco : (METODOS.find(m => m.v === procesando.afiliado.pagoMetodo)?.t ?? 'Sin método')}
                  {procesando.afiliado.pagoTipoCuenta ? ` · ${procesando.afiliado.pagoTipoCuenta === 'AHORROS' ? 'Ahorros' : 'Corriente'}` : ''}
                  {procesando.afiliado.pagoNumero ? ` · ${procesando.afiliado.pagoNumero}` : ''}
                </p>
                {procesando.afiliado.pagoTitular && <p className="text-xs text-muted">{procesando.afiliado.pagoTitular}{procesando.afiliado.pagoDocumento ? ` · ${procesando.afiliado.pagoDocumento}` : ''}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Comprobante de pago (imagen)</label>
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-sm text-muted cursor-pointer hover:border-primary">
                  <Upload size={15} /> {compRetiro ? 'Comprobante cargado ✓' : 'Subir comprobante'}
                  <input type="file" accept="image/*" onChange={adjuntarComprobante} className="hidden" />
                </label>
              </div>

              <button onClick={() => procesarRetiro('PAGADO')} disabled={guardandoRetiro}
                className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
                <Check size={16} /> Marcar como pagado
              </button>

              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-medium text-muted mb-1">¿Rechazar? Motivo (opcional)</label>
                <input value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej. datos de pago incorrectos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2" />
                <button onClick={() => procesarRetiro('RECHAZADO')} disabled={guardandoRetiro}
                  className="w-full border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2 rounded-lg text-sm disabled:opacity-60">
                  Rechazar solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-[70]">{toast}</div>
      )}
    </div>
  );
}
