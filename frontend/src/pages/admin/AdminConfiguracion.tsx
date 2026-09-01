import { useEffect, useState } from 'react';
import { Save, Package } from 'lucide-react';
import api from '../../lib/api';
import { formatearMiles, parsearMiles } from '../../lib/dinero';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type PlanDef = { id: string; nombre: string; precioMensual: number; precioAnual: number; limite: number; features: Record<string, boolean> };
type Data = { planes: Record<string, PlanDef>; funciones: { key: string; label: string }[]; orden: string[] };

// Editor de planes de la plataforma (precio, límite y funciones). Los cambios
// aplican de inmediato al gating, la landing y los cobros nuevos.
export default function AdminConfiguracion() {
  const [data, setData] = useState<Data | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => { api.get('/admin/planes').then(r => setData(r.data)); }, []);

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
                  <label key={f.key} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                    <input type="checkbox" checked={!!p.features[f.key]} onChange={e => setFeature(id, f.key, e.target.checked)} className="rounded" />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Nota: el precio de un cliente puntual se ajusta en su ficha de empresa (precio y funciones "a la medida"), sin cambiar el plan base.
      </p>
    </div>
  );
}
