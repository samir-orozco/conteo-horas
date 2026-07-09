import { useEffect, useState } from 'react';
import { Building2, Users, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';
import api from '../../lib/api';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type Dashboard = {
  totalEmpresas: number;
  empresasActivas: number;
  colaboradoresTotales: number;
  suscripciones: { prueba: number; activas: number; enMora: number; suspendidas: number };
  ingresosMes: number;
  ingresosTotales: number;
  mrrProyectado: number;
};
type Moroso = {
  empresaId: string; empresa: string; nit: string; email: string; telefono: string | null;
  estado: string; diasMora: number; vencioEl: string; montoAdeudado: number;
};
type Ingresos = { anio: number; total: number; porMes: { mes: number; total: number; pagos: number }[] };

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function Card({ icon: Icon, titulo, valor, detalle }: { icon: any; titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-muted text-sm mb-2">
        <Icon size={16} />{titulo}
      </div>
      <p className="text-2xl font-bold text-ink">{valor}</p>
      {detalle && <p className="text-xs text-muted mt-1">{detalle}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [morosos, setMorosos] = useState<Moroso[]>([]);
  const [ingresos, setIngresos] = useState<Ingresos | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data));
    api.get('/admin/morosos').then(r => setMorosos(r.data));
    api.get('/admin/ingresos').then(r => setIngresos(r.data));
  }, []);

  if (!data) return <div className="p-8 text-muted">Cargando...</div>;

  const maxMes = Math.max(1, ...(ingresos?.porMes.map(m => m.total) ?? [1]));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted">Visión general de la plataforma HoraPro</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Building2} titulo="Empresas activas" valor={String(data.empresasActivas)}
          detalle={`${data.totalEmpresas} en total`} />
        <Card icon={Users} titulo="Colaboradores" valor={String(data.colaboradoresTotales)}
          detalle="activos en la plataforma" />
        <Card icon={TrendingUp} titulo="MRR proyectado" valor={cop(data.mrrProyectado)}
          detalle="con empresas vigentes" />
        <Card icon={Wallet} titulo="Ingresos del mes" valor={cop(data.ingresosMes)}
          detalle={`${cop(data.ingresosTotales)} histórico`} />
      </div>

      {/* Estado de suscripciones */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En prueba', valor: data.suscripciones.prueba, color: 'bg-primary/40 text-ink' },
          { label: 'Activas', valor: data.suscripciones.activas, color: 'bg-green-100 text-green-800' },
          { label: 'En mora', valor: data.suscripciones.enMora, color: 'bg-orange-100 text-orange-800' },
          { label: 'Suspendidas', valor: data.suscripciones.suspendidas, color: 'bg-red-100 text-red-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-card px-4 py-3 ${s.color}`}>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
            <p className="text-xl font-bold">{s.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ingresos por mes */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <h2 className="font-semibold text-ink mb-1">Ingresos {ingresos?.anio}</h2>
          <p className="text-sm text-muted mb-4">Total: {cop(ingresos?.total ?? 0)}</p>
          <div className="flex items-end gap-1.5 h-36">
            {ingresos?.porMes.map(m => (
              <div key={m.mes} className="flex-1 h-full flex flex-col items-center justify-end gap-1" title={`${MESES[m.mes - 1]}: ${cop(m.total)} (${m.pagos} pagos)`}>
                <div
                  className={`w-full rounded-t-md ${m.total > 0 ? 'bg-primary' : 'bg-gray-100'}`}
                  style={{ height: `${Math.max(4, (m.total / maxMes) * 90)}%` }}
                />
                <span className="text-[10px] text-muted">{MESES[m.mes - 1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de morosos */}
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <AlertTriangle size={17} className="text-orange-500" /> Alertas de morosos
          </h2>
          {morosos.length === 0 ? (
            <p className="text-sm text-muted">Sin empresas en mora. Todo al día ✓</p>
          ) : (
            <div className="space-y-3">
              {morosos.map(m => (
                <div key={m.empresaId} className={`rounded-xl border px-4 py-3 ${m.estado === 'SUSPENDIDA' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink text-sm">{m.empresa}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.estado === 'SUSPENDIDA' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                      {m.estado === 'SUSPENDIDA' ? 'Suspendida' : `${m.diasMora} día${m.diasMora === 1 ? '' : 's'} de mora`}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Debe {cop(m.montoAdeudado)} · venció el {new Date(m.vencioEl).toLocaleDateString('es-CO')} · {m.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
