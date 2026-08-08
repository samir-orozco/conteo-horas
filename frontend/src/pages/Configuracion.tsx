import { useSearchParams } from 'react-router-dom';
import TabCuenta from './configuracion/TabCuenta';
import TabHorario from './configuracion/TabHorario';
import TabMarcacion from './configuracion/TabMarcacion';
import TabConexiones from './configuracion/TabConexiones';
import TabNovedades from './configuracion/TabNovedades';
import Suscripcion from './Suscripcion';

const TABS = [
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'horario', label: 'Horario' },
  { id: 'novedades', label: 'Novedades' },
  { id: 'marcacion', label: 'Marcación' },
  { id: 'conexiones', label: 'Conexiones' },
  { id: 'suscripcion', label: 'Suscripción' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function Configuracion() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'cuenta') as TabId;

  return (
    <div className="w-full">
      <div className="px-6 md:px-8 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold text-ink mb-5">Configuración</h2>
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setParams(t.id === 'cuenta' ? {} : { tab: t.id })}
                className={`pb-3 whitespace-nowrap text-sm border-b-2 transition-colors ${tab === t.id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted font-medium hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {tab === 'cuenta' && <TabCuenta />}
      {tab === 'horario' && <TabHorario />}
      {tab === 'novedades' && <TabNovedades />}
      {tab === 'marcacion' && <TabMarcacion />}
      {tab === 'conexiones' && <TabConexiones />}
      {tab === 'suscripcion' && <Suscripcion />}
    </div>
  );
}
