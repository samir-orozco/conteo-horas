import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Wallet, Power, Link as LinkIcon, Infinity as InfinityIcon, ImagePlus, Trash2, ChevronDown, CalendarClock, Tag, MoreVertical } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import { formatearMiles, parsearMiles } from '../../lib/dinero';
import { copiarTexto } from '../../lib/clipboard';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type EmpresaRow = {
  id: string; nombre: string; nit: string; email: string; telefono: string | null;
  marcadorToken: string; exentaPago: boolean; activa: boolean;
  colaboradoresActivos: number; tarifaMensual: number;
  estadoSuscripcion: string | null; diasMora: number;
  pagadoHasta: string | null; finPrueba: string | null; precioModo: string | null;
};
type Cobro = { tipo: string; monto: number; diasRestantes: number; diasMes: number; cubreHasta: string; tarifaMesCompleto: number };

const ESTADO_CHIP: Record<string, string> = {
  PRUEBA: 'bg-primary/40 text-ink',
  ACTIVA: 'bg-green-100 text-green-800',
  EN_MORA: 'bg-orange-100 text-orange-800',
  SUSPENDIDA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-gray-100 text-gray-600',
  ILIMITADA: 'bg-purple-100 text-purple-800',
};

export default function AdminEmpresas() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', nit: '', email: '', telefono: '',
    adminNombre: '', adminEmail: '', adminPassword: '',
  });

  // Modales de acción
  const [cambiandoEstado, setCambiandoEstado] = useState<EmpresaRow | null>(null);
  const [cambiandoIlimitado, setCambiandoIlimitado] = useState<EmpresaRow | null>(null);
  const [pagando, setPagando] = useState<EmpresaRow | null>(null);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [formPago, setFormPago] = useState({ monto: 0, metodo: 'MANUAL', nota: '', comprobanteBase64: '' });
  const [guardandoPago, setGuardandoPago] = useState(false);
  // Ampliar prueba
  const [ampliando, setAmpliando] = useState<EmpresaRow | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [guardandoPrueba, setGuardandoPrueba] = useState(false);
  // Precio del cliente
  const [preciando, setPreciando] = useState<EmpresaRow | null>(null);
  const [formPrecio, setFormPrecio] = useState({ modo: 'GLOBAL', precioFijo: 0, precioTramo1: 0, limiteTramo1: 0, precioTramo2: 0 });
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  // Menú "más opciones" por fila (posición fija calculada desde el botón)
  const [menu, setMenu] = useState<{ emp: EmpresaRow; x: number; y: number } | null>(null);

  const abrirMenu = (emp: EmpresaRow, ev: React.MouseEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ emp, x: r.right, y: r.bottom + 6 });
  };
  // Ejecuta una acción del menú y lo cierra
  const accionMenu = (fn: () => void) => { fn(); setMenu(null); };

  const cargar = () => api.get('/admin/empresas').then(r => setEmpresas(r.data));
  useEffect(() => { cargar(); }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/empresas', {
        nombre: form.nombre, nit: form.nit, email: form.email, telefono: form.telefono || undefined,
        admin: { nombre: form.adminNombre, email: form.adminEmail, password: form.adminPassword },
      });
      setModal(false);
      setForm({ nombre: '', nit: '', email: '', telefono: '', adminNombre: '', adminEmail: '', adminPassword: '' });
      setToast('Empresa creada con éxito');
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear la empresa');
    }
  };

  const abrirPago = async (emp: EmpresaRow) => {
    setPagando(emp);
    setCobro(null);
    setFormPago({ monto: 0, metodo: 'MANUAL', nota: '', comprobanteBase64: '' });
    const r = await api.get(`/admin/empresas/${emp.id}/cobro`);
    setCobro(r.data);
    setFormPago(p => ({ ...p, monto: r.data.monto > 0 ? r.data.monto : r.data.tarifaMesCompleto }));
  };

  const adjuntarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormPago(p => ({ ...p, comprobanteBase64: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagando) return;
    setGuardandoPago(true);
    try {
      await api.post(`/admin/empresas/${pagando.id}/pagos`, {
        monto: formPago.monto,
        metodo: formPago.metodo,
        nota: formPago.nota || undefined,
        comprobanteBase64: formPago.comprobanteBase64 || undefined,
      });
      setPagando(null);
      setToast('Pago registrado con éxito');
      cargar();
    } finally {
      setGuardandoPago(false);
    }
  };

  const confirmarEstado = async () => {
    if (!cambiandoEstado) return;
    await api.put(`/admin/empresas/${cambiandoEstado.id}`, { activa: !cambiandoEstado.activa });
    setToast(cambiandoEstado.activa ? 'Empresa desactivada' : 'Empresa activada');
    setCambiandoEstado(null);
    cargar();
  };

  const confirmarIlimitado = async () => {
    if (!cambiandoIlimitado) return;
    await api.put(`/admin/empresas/${cambiandoIlimitado.id}`, { exentaPago: !cambiandoIlimitado.exentaPago });
    setToast(cambiandoIlimitado.exentaPago ? 'Acceso ilimitado retirado' : 'Acceso ilimitado activado');
    setCambiandoIlimitado(null);
    cargar();
  };

  const abrirAmpliar = (emp: EmpresaRow) => {
    // Sugiere +7 días desde la fecha de fin de prueba actual (o desde hoy)
    const base = emp.finPrueba ? new Date(emp.finPrueba) : new Date();
    const sugerida = new Date(Math.max(base.getTime(), Date.now()) + 7 * 86400000);
    setNuevaFecha(sugerida.toISOString().slice(0, 10));
    setAmpliando(emp);
  };

  const guardarAmpliar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ampliando || !nuevaFecha) return;
    setGuardandoPrueba(true);
    try {
      // Fin del día seleccionado (23:59 Bogotá) para que la prueba cubra ese día completo
      await api.put(`/admin/empresas/${ampliando.id}/prueba`, { finPrueba: new Date(`${nuevaFecha}T23:59:00-05:00`).toISOString() });
      setToast('Prueba ampliada');
      setAmpliando(null);
      cargar();
    } finally { setGuardandoPrueba(false); }
  };

  const abrirPrecio = async (emp: EmpresaRow) => {
    setPreciando(emp);
    // Trae el detalle para prellenar el override actual
    const r = await api.get(`/admin/empresas/${emp.id}`);
    const s = r.data.suscripcion ?? {};
    setFormPrecio({
      modo: s.precioModo ?? 'GLOBAL',
      precioFijo: s.precioFijo ?? 0,
      precioTramo1: s.precioTramo1 ?? 0,
      limiteTramo1: s.limiteTramo1 ?? 0,
      precioTramo2: s.precioTramo2 ?? 0,
    });
  };

  const guardarPrecio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preciando) return;
    setGuardandoPrecio(true);
    try {
      await api.put(`/admin/empresas/${preciando.id}/precio`, formPrecio);
      setToast('Precio del cliente actualizado');
      setPreciando(null);
      cargar();
    } finally { setGuardandoPrecio(false); }
  };

  const copiarLinkMarcador = async (emp: EmpresaRow) => {
    await copiarTexto(`${window.location.origin}/marcador/${emp.marcadorToken}`);
    setToast('Link del marcador copiado con éxito');
  };

  const input = 'w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Empresas</h1>
          <p className="text-sm text-muted">Clientes de la plataforma</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-semibold px-4 py-2.5 rounded-xl text-sm">
          <Plus size={17} /> Nueva empresa
        </button>
      </div>

      <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-gray-100">
              <th className="px-5 py-3.5">Empresa</th>
              <th className="px-5 py-3.5">NIT</th>
              <th className="px-5 py-3.5 text-center">Colaboradores</th>
              <th className="px-5 py-3.5 text-right">Tarifa/mes</th>
              <th className="px-5 py-3.5">Suscripción</th>
              <th className="px-5 py-3.5">Vigencia</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map(e => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/admin/empresas/${e.id}`)}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-ink">{e.nombre}</p>
                  <p className="text-xs text-muted">{e.email}</p>
                </td>
                <td className="px-5 py-3.5 text-muted">{e.nit}</td>
                <td className="px-5 py-3.5 text-center font-medium text-ink">{e.colaboradoresActivos}</td>
                <td className="px-5 py-3.5 text-right font-medium text-ink">
                  {e.exentaPago ? <span className="text-purple-700">Gratis</span> : cop(e.tarifaMensual)}
                </td>
                <td className="px-5 py-3.5">
                  {e.estadoSuscripcion && (
                    <span className={`inline-block whitespace-nowrap text-xs font-bold px-2.5 py-1 rounded-full ${ESTADO_CHIP[e.estadoSuscripcion] ?? ''}`}>
                      {e.estadoSuscripcion}{e.estadoSuscripcion === 'EN_MORA' ? ` (${e.diasMora}d)` : ''}
                    </span>
                  )}
                  {!e.activa && <span className="ml-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-200 text-gray-600">INACTIVA</span>}
                </td>
                <td className="px-5 py-3.5 text-muted text-xs">
                  {e.exentaPago
                    ? 'Sin vencimiento'
                    : e.pagadoHasta
                      ? `Pagado hasta ${new Date(e.pagadoHasta).toLocaleDateString('es-CO')}`
                      : e.finPrueba
                        ? `Prueba hasta ${new Date(e.finPrueba).toLocaleDateString('es-CO')}`
                        : '—'}
                </td>
                <td className="px-5 py-3.5" onClick={ev => ev.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => copiarLinkMarcador(e)} title="Copiar link del marcador"
                      className="p-2 rounded-lg text-muted hover:bg-primary/30 hover:text-ink">
                      <LinkIcon size={16} />
                    </button>
                    <button onClick={() => abrirPago(e)} title="Registrar pago" disabled={e.exentaPago}
                      className="p-2 rounded-lg text-muted hover:bg-primary/30 hover:text-ink disabled:opacity-30">
                      <Wallet size={16} />
                    </button>
                    <button onClick={ev => abrirMenu(e, ev)} title="Más opciones"
                      className={`p-2 rounded-lg ${menu?.emp.id === e.id ? 'bg-gray-100 text-ink' : 'text-muted hover:bg-gray-100 hover:text-ink'}`}>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">Aún no hay empresas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal registrar pago */}
      {pagando && (
        <div className="fixed inset-0 !mt-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="hp-pop bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-ink">Registrar pago</h2>
              <button onClick={() => setPagando(null)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-4">{pagando.nombre} · {pagando.nit}</p>

            {cobro && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted">Mes completo ({pagando.colaboradoresActivos} colab.)</span><span className="text-ink font-medium">{cop(cobro.tarifaMesCompleto)}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted">Sugerido hoy ({cobro.diasRestantes} de {cobro.diasMes} días)</span>
                  <span className="font-bold text-ink">{cobro.monto > 0 ? cop(cobro.monto) : 'Al día'}</span>
                </div>
                <p className="text-[11px] text-muted">Cubre hasta el {new Date(cobro.cubreHasta).toLocaleDateString('es-CO')}</p>
              </div>
            )}

            <form onSubmit={registrarPago} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Monto recibido (COP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                    <input type="text" inputMode="numeric" value={formatearMiles(formPago.monto)}
                      onChange={e => setFormPago(p => ({ ...p, monto: parsearMiles(e.target.value) }))}
                      className={`${input} pl-7`} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Método</label>
                  <div className="relative">
                    <select value={formPago.metodo} onChange={e => setFormPago(p => ({ ...p, metodo: e.target.value }))}
                      className={`${input} appearance-none pr-9 cursor-pointer`}>
                      <option value="MANUAL">Transferencia / Efectivo</option>
                      <option value="LINK_WOMPI">Wompi</option>
                      <option value="TARJETA_RECURRENTE">Tarjeta recurrente</option>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nota (referencia, banco, observaciones)</label>
                <input value={formPago.nota} onChange={e => setFormPago(p => ({ ...p, nota: e.target.value }))}
                  placeholder="Ej: transferencia Bancolombia ref 12345" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Comprobante (opcional)</label>
                {formPago.comprobanteBase64 ? (
                  <div className="relative">
                    <img src={formPago.comprobanteBase64} alt="comprobante" className="w-full max-h-44 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                    <button type="button" onClick={() => setFormPago(p => ({ ...p, comprobanteBase64: '' }))}
                      className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 text-sm text-muted cursor-pointer hover:border-primary hover:text-ink">
                    <ImagePlus size={18} /> Adjuntar foto del comprobante
                    <input type="file" accept="image/*" className="hidden" onChange={adjuntarFoto} />
                  </label>
                )}
              </div>
              <button type="submit" disabled={guardandoPago || !formPago.monto}
                className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-xl disabled:opacity-60">
                {guardandoPago ? 'Registrando...' : `Registrar pago de ${cop(formPago.monto)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación activar/desactivar */}
      <ConfirmDialog
        abierto={!!cambiandoEstado}
        peligro={cambiandoEstado?.activa ?? false}
        titulo={cambiandoEstado?.activa ? '¿Desactivar empresa?' : '¿Activar empresa?'}
        subtitulo={cambiandoEstado
          ? cambiandoEstado.activa
            ? `${cambiandoEstado.nombre} perderá el acceso al panel y su kiosco dejará de funcionar. Sus datos se conservan.`
            : `${cambiandoEstado.nombre} recuperará el acceso al panel y su kiosco.`
          : ''}
        textoContinuar={cambiandoEstado?.activa ? 'Sí, desactivar' : 'Sí, activar'}
        onContinuar={confirmarEstado}
        onCancelar={() => setCambiandoEstado(null)}
      />

      {/* Menú "más opciones" de una empresa */}
      {menu && (
        <>
          <div className="fixed inset-0 !mt-0 z-40" onClick={() => setMenu(null)} />
          <div className="fixed z-50 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 text-sm"
            style={{ top: menu.y, left: Math.max(8, menu.x - 224) }}>
            <button onClick={() => accionMenu(() => setCambiandoIlimitado(menu.emp))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 text-ink">
              <InfinityIcon size={15} className={menu.emp.exentaPago ? 'text-purple-600' : 'text-muted'} />
              {menu.emp.exentaPago ? 'Quitar acceso ilimitado' : 'Dar acceso ilimitado'}
            </button>
            <button onClick={() => accionMenu(() => abrirAmpliar(menu.emp))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 text-ink">
              <CalendarClock size={15} className="text-muted" /> Ampliar prueba
            </button>
            <button onClick={() => accionMenu(() => abrirPrecio(menu.emp))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 text-ink">
              <Tag size={15} className={menu.emp.precioModo ? 'text-emerald-600' : 'text-muted'} /> Precio del cliente
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button onClick={() => accionMenu(() => setCambiandoEstado(menu.emp))}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 ${menu.emp.activa ? 'text-red-600' : 'text-green-700'}`}>
              <Power size={15} /> {menu.emp.activa ? 'Desactivar empresa' : 'Activar empresa'}
            </button>
          </div>
        </>
      )}

      {/* Modal ampliar prueba */}
      {ampliando && (
        <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAmpliando(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={ev => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><CalendarClock size={18} className="text-primary-dark" /> Ampliar prueba</h3>
              <button onClick={() => setAmpliando(null)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-4">
              {ampliando.nombre} · prueba actual hasta {ampliando.finPrueba ? new Date(ampliando.finPrueba).toLocaleDateString('es-CO') : '—'}.
            </p>
            <form onSubmit={guardarAmpliar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nueva fecha de fin de prueba</label>
                <input type="date" value={nuevaFecha} onChange={ev => setNuevaFecha(ev.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {!ampliando.pagadoHasta && (ampliando.estadoSuscripcion === 'SUSPENDIDA' || ampliando.estadoSuscripcion === 'EN_MORA') && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">Esto reactivará la empresa (volverá a estado de prueba).</p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAmpliando(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardandoPrueba}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
                  {guardandoPrueba ? 'Guardando...' : 'Ampliar prueba'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal precio del cliente */}
      {preciando && (
        <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreciando(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={ev => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><Tag size={18} className="text-emerald-600" /> Precio del cliente</h3>
              <button onClick={() => setPreciando(null)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-4">{preciando.nombre} · define un precio propio o usa el global de la plataforma.</p>
            <form onSubmit={guardarPrecio} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Modo de precio</label>
                <select value={formPrecio.modo} onChange={ev => setFormPrecio(p => ({ ...p, modo: ev.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="GLOBAL">Precio global de la plataforma</option>
                  <option value="FIJO">Precio fijo mensual</option>
                  <option value="TRAMOS">Tarifa por colaborador propia</option>
                </select>
              </div>

              {formPrecio.modo === 'FIJO' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Valor fijo mensual (COP)</label>
                  <input inputMode="numeric" value={formatearMiles(formPrecio.precioFijo)}
                    onChange={ev => setFormPrecio(p => ({ ...p, precioFijo: parsearMiles(ev.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <p className="text-xs text-muted mt-1">Se cobra igual sin importar cuántos colaboradores tenga.</p>
                </div>
              )}

              {formPrecio.modo === 'TRAMOS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Precio por colaborador (tramo 1)</label>
                      <input inputMode="numeric" value={formatearMiles(formPrecio.precioTramo1)}
                        onChange={ev => setFormPrecio(p => ({ ...p, precioTramo1: parsearMiles(ev.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Hasta cuántos colaboradores</label>
                      <input type="number" min={1} step={1} value={formPrecio.limiteTramo1}
                        onChange={ev => setFormPrecio(p => ({ ...p, limiteTramo1: Number(ev.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Precio por colaborador extra (tramo 2)</label>
                    <input inputMode="numeric" value={formatearMiles(formPrecio.precioTramo2)}
                      onChange={ev => setFormPrecio(p => ({ ...p, precioTramo2: parsearMiles(ev.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setPreciando(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardandoPrecio}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
                  {guardandoPrecio ? 'Guardando...' : 'Guardar precio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación acceso ilimitado */}
      <ConfirmDialog
        abierto={!!cambiandoIlimitado}
        titulo={cambiandoIlimitado?.exentaPago ? '¿Quitar acceso ilimitado?' : '¿Dar acceso ilimitado?'}
        subtitulo={cambiandoIlimitado
          ? cambiandoIlimitado.exentaPago
            ? `${cambiandoIlimitado.nombre} volverá al esquema de pago normal (mes calendario).`
            : `${cambiandoIlimitado.nombre} usará HoraPro gratis, sin cobros ni bloqueos, hasta que lo desactives.`
          : ''}
        textoContinuar={cambiandoIlimitado?.exentaPago ? 'Sí, quitar' : 'Sí, dar acceso'}
        onContinuar={confirmarIlimitado}
        onCancelar={() => setCambiandoIlimitado(null)}
      />

      {/* Modal nueva empresa */}
      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink">Nueva empresa</h2>
              <button onClick={() => setModal(false)} className="text-muted hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={crear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className={input} placeholder="Nombre de la empresa" required
                  value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                <input className={input} placeholder="NIT (ej: 900123456-7)" required
                  value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className={input} type="email" placeholder="Email de contacto" required
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <input className={input} placeholder="Teléfono (opcional)"
                  value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted pt-2">Usuario administrador</p>
              <input className={input} placeholder="Nombre del administrador" required
                value={form.adminNombre} onChange={e => setForm({ ...form, adminNombre: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className={input} type="email" placeholder="Email de acceso" required
                  value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} />
                <input className={input} type="password" placeholder="Contraseña" required minLength={6}
                  value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <p className="text-xs text-muted">La empresa inicia con 7 días de prueba gratis.</p>
              <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-xl">
                Crear empresa
              </button>
            </form>
          </div>
        </div>
      )}

      <Toast mensaje={toast} onClose={() => setToast(null)} />
    </div>
  );
}
