import { useEffect, useState } from 'react';
import { Save, Package } from 'lucide-react';
import api from '../../lib/api';
import { formatearMiles, parsearMiles } from '../../lib/dinero';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type PlanDef = { id: string; nombre: string; precioMensual: number; precioAnual: number; limite: number; features: Record<string, boolean> };
type Data = { planes: Record<string, PlanDef>; funciones: { key: string; label: string; proximamente?: boolean }[]; orden: string[] };
// Una vigencia del auxilio de transporte, tal como la fija el decreto de cada enero.
type Vigencia = { id: string; vigenteDesde: string; valor: number; tope: number };

// Editor de planes de la plataforma (precio, límite y funciones). Los cambios
// aplican de inmediato al gating, la landing y los cobros nuevos.
export default function AdminConfiguracion() {
  const [data, setData] = useState<Data | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Las vigencias del auxilio de transporte: una fila por decreto, la más reciente primero.
  const [auxilios, setAuxilios] = useState<Vigencia[]>([]);
  const [nueva, setNueva] = useState({ vigenteDesde: '', valor: '', tope: '' });
  const [errorAux, setErrorAux] = useState('');

  useEffect(() => { api.get('/admin/planes').then(r => setData(r.data)); }, []);
  useEffect(() => { api.get('/admin/auxilios').then(r => setAuxilios(r.data)).catch(() => setAuxilios([])); }, []);

  // Agrega una vigencia. NO edita las anteriores: si se cambiara la del año pasado, un reporte de
  // diciembre pasaría a liquidarse con el decreto de enero y la historia dejaría de cuadrar con lo
  // que se pagó. Reenviar la misma fecha sí corrige esa fila, para una digitación mal puesta.
  const agregarVigencia = async () => {
    setErrorAux('');
    try {
      await api.post('/admin/auxilios', {
        vigenteDesde: nueva.vigenteDesde.trim(),
        valor: Number(nueva.valor),
        tope: Number(nueva.tope),
      });
      const r = await api.get('/admin/auxilios');
      setAuxilios(r.data);
      setNueva({ vigenteDesde: '', valor: '', tope: '' });
    } catch (err) {
      // El mensaje del servidor explica cuál de los tres datos está mal; el nuestro es el respaldo.
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrorAux(delServidor ?? 'No pudimos guardar la vigencia.');
    }
  };

  const setPlan = (id: string, cambio: Partial<PlanDef>) =>
    setData(d => d ? { ...d, planes: { ...d.planes, [id]: { ...d.planes[id], ...cambio } } } : d);
  const setFeature = (id: string, key: string, val: boolean) =>
    setData(d => d ? { ...d, planes: { ...d.planes, [id]: { ...d.planes[id], features: { ...d.planes[id].features, [key]: val } } } } : d);

  const guardar = async () => {
    if (!data) return;
    setGuardando(true);
    const payload: any = {};
    for (const id of data.orden) {
      const p = data.planes[id];
      payload[id] = { precioMensual: p.precioMensual, precioAnual: p.precioAnual, limite: p.limite, features: p.features };
    }
    const r = await api.put('/admin/planes', payload);
    setData(r.data);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };

  if (!data) return <div className="p-8 text-muted">Cargando...</div>;

  const input = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Planes de la plataforma</h1>
          <p className="text-sm text-muted">Precio, cupo de colaboradores y funciones de cada plan. Los cambios aplican a todas las empresas de ese plan.</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 shrink-0">
          <Save size={16} /> {guardando ? 'Guardando...' : ok ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {data.orden.map(id => {
          const p = data.planes[id];
          return (
            <div key={id} className="bg-white rounded-card border border-gray-200 p-6">
              <p className="font-bold text-ink mb-4 flex items-center gap-2"><Package size={17} /> {p.nombre}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Precio mensual (COP)</label>
                  <input type="text" inputMode="numeric" value={formatearMiles(p.precioMensual)}
                    onChange={e => setPlan(id, { precioMensual: parsearMiles(e.target.value) })} className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Precio anual (COP)</label>
                  <input type="text" inputMode="numeric" value={formatearMiles(p.precioAnual)}
                    onChange={e => setPlan(id, { precioAnual: parsearMiles(e.target.value) })} className={input} />
                  <p className="text-[11px] text-muted mt-1">Sugerido (2 meses gratis): {cop(p.precioMensual * 10)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cupo de colaboradores</label>
                  <input type="number" min={1} value={p.limite}
                    onChange={e => setPlan(id, { limite: Number(e.target.value) })} className={input} />
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-muted mt-5 mb-2">Funciones incluidas</p>
              <div className="space-y-1.5">
                {data.funciones.map(f => (
                  // Lo que todavía no existe se ve, pero no se puede marcar (Siigo, 15 de septiembre de 2026).
                  f.proximamente ? (
                    <label key={f.key} className="flex items-center gap-2.5 text-sm text-muted cursor-not-allowed">
                      <input type="checkbox" checked={false} disabled className="rounded" />
                      {f.label}
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">PRÓXIMAMENTE</span>
                    </label>
                  ) : (
                    <label key={f.key} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                      <input type="checkbox" checked={!!p.features[f.key]} onChange={e => setFeature(id, f.key, e.target.checked)} className="rounded" />
                      {f.label}
                    </label>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Nota: el precio de un cliente puntual se ajusta en su ficha de empresa (precio y funciones "a la medida"), sin cambiar el plan base.
      </p>

      {/* El auxilio de transporte lo fija un decreto cada enero. Antes vivía en el `seed` y cambiarlo
          exigía un despliegue; ahora se agrega aquí, y cada año es una fila nueva. */}
      <section aria-label="Auxilio de transporte" className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Auxilio de transporte</h2>
          <p className="text-sm text-muted">
            El valor y el tope que fija el decreto cada enero. Se <b>agrega</b> una vigencia por año: las
            anteriores no se tocan, para que un reporte viejo siga mostrando lo que se pagó entonces.
          </p>
        </div>

        <div className="space-y-1.5">
          {auxilios.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay ninguna vigencia cargada.</p>
          ) : auxilios.map(v => (
            <div key={v.id} className="flex flex-wrap items-baseline gap-x-4 text-sm bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-medium text-ink tabular-nums">{v.vigenteDesde.slice(0, 10)}</span>
              <span className="text-muted">auxilio <b className="text-ink">{formatearMiles(v.valor)}</b></span>
              <span className="text-muted">tope <b className="text-ink">{formatearMiles(v.tope)}</b></span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">Rige desde</span>
            <input value={nueva.vigenteDesde} placeholder="2027-01-01" className={`${input} w-40`}
              onChange={e => setNueva(n => ({ ...n, vigenteDesde: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">Auxilio</span>
            <input value={nueva.valor} inputMode="numeric" placeholder="270000" className={`${input} w-36`}
              onChange={e => setNueva(n => ({ ...n, valor: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted mb-1">Tope</span>
            <input value={nueva.tope} inputMode="numeric" placeholder="3800000" className={`${input} w-36`}
              onChange={e => setNueva(n => ({ ...n, tope: e.target.value }))} />
          </label>
          <button onClick={agregarVigencia}
            className="bg-primary hover:bg-primary-dark text-ink font-semibold px-4 py-2 rounded-xl text-sm">
            Agregar vigencia
          </button>
        </div>

        {errorAux && <p role="alert" className="text-sm text-red-600">{errorAux}</p>}
      </section>
    </div>
  );
}
