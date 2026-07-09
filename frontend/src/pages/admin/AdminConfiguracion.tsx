import { useEffect, useState } from 'react';
import { Save, BadgeDollarSign } from 'lucide-react';
import api from '../../lib/api';
import { formatearMiles, parsearMiles } from '../Colaboradores';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type Precios = { precioTramo1: number; limiteTramo1: number; precioTramo2: number };

// Precios de la plataforma — editables cuando el super admin quiera.
// Aplican de inmediato a todos los cobros nuevos (tarifas, prorrateos y morosos).
export default function AdminConfiguracion() {
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => { api.get('/admin/configuracion').then(r => setPrecios(r.data)); }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!precios) return;
    setGuardando(true);
    await api.put('/admin/configuracion', precios);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };

  if (!precios) return <div className="p-8 text-muted">Cargando...</div>;

  const ejemplo = (n: number) =>
    Math.min(n, precios.limiteTramo1) * precios.precioTramo1 +
    Math.max(0, n - precios.limiteTramo1) * precios.precioTramo2;

  const input = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-muted">Precios de la plataforma — los cambios aplican de inmediato a todos los cobros</p>
      </div>

      <form onSubmit={guardar} className="bg-white rounded-card border border-gray-200 p-6">
        <p className="font-semibold text-ink mb-4 flex items-center gap-2"><BadgeDollarSign size={17} /> Modelo de precios</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Precio por colaborador (COP/mes)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="text" inputMode="numeric" value={formatearMiles(precios.precioTramo1)}
                onChange={e => setPrecios(p => ({ ...p!, precioTramo1: parsearMiles(e.target.value) }))}
                className={`${input} pl-7`} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Hasta cuántos colaboradores</label>
            <input type="number" min={1} value={precios.limiteTramo1}
              onChange={e => setPrecios(p => ({ ...p!, limiteTramo1: Number(e.target.value) }))}
              className={input} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Precio del adicional (COP/mes)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="text" inputMode="numeric" value={formatearMiles(precios.precioTramo2)}
                onChange={e => setPrecios(p => ({ ...p!, precioTramo2: parsearMiles(e.target.value) }))}
                className={`${input} pl-7`} required />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted mt-4">
          Es decir: los primeros <b className="text-ink">{precios.limiteTramo1}</b> colaboradores a{' '}
          <b className="text-ink">{cop(precios.precioTramo1)}</b> y del {precios.limiteTramo1 + 1} en adelante a{' '}
          <b className="text-ink">{cop(precios.precioTramo2)}</b> cada uno.
        </p>

        <button type="submit" disabled={guardando}
          className="mt-5 flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
          <Save size={16} /> {guardando ? 'Guardando...' : ok ? '¡Guardado!' : 'Guardar precios'}
        </button>
      </form>

      <div className="bg-white rounded-card border border-gray-200 p-6">
        <p className="font-semibold text-ink mb-3">Ejemplos con estos precios (mes completo)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[5, precios.limiteTramo1, precios.limiteTramo1 + 10, 50].map(n => (
            <div key={n} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-muted">{n} colaboradores</p>
              <p className="font-bold text-ink">{cop(ejemplo(n))}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">
          La facturación es por mes calendario: quien entra a mitad de mes paga proporcional a los días
          restantes, y todas las renovaciones caen el día 1.
        </p>
      </div>
    </div>
  );
}
