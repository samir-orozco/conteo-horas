import { useSearchParams } from 'react-router-dom';
import CatalogoDeTurnos from './turnos/CatalogoDeTurnos';
import CalendarioDeTurnos from './turnos/CalendarioDeTurnos';

// TURNOS: dónde se ve y se arma lo que cada persona trabaja cada día (20 de septiembre de 2026).
//
// Vive en el menú principal y no dentro de Configuración, y la diferencia no es cosmética:
//
//   Configuración → Horario   es la POLÍTICA: tolerancias, almuerzo, `ajustaEntrada`. Se define una
//                             vez y casi no se toca.
//   Turnos                    es el CALENDARIO: quién trabaja qué día. Se mira todas las semanas.
//
// La misma pantalla sirve para los dos tipos de empresa, que fue la decisión que simplificó todo:
// quien tiene horarios fijos ve de solo lectura lo que su gente cumple; quien rota, pinta encima.
// No hace falta marcar a nadie como «fijo» o «rotativo»: es una consecuencia de dónde salen sus
// días, no un interruptor que alguien tenga que configurar.
const TABS = [
  { id: 'calendario', label: 'Calendario' },
  { id: 'catalogo', label: 'Catálogo' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function Turnos() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'calendario') as TabId;

  return (
    <div className="w-full">
      <div className="px-6 md:px-8 pt-6 md:pt-8">
        {/* EL SUBTÍTULO ES DE LA MAQUETA. No es relleno: esta pantalla y «Configuración → Horario»
            se parecen lo bastante como para que alguien entre aquí buscando las tolerancias. Una
            línea que diga qué se hace aquí ahorra ese viaje. */}
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-ink">Turnos</h2>
          {/* BETA, pedido del dueño el 28 de septiembre de 2026. El módulo se está estrenando y va a
              cambiar de forma: la etiqueta es lo que le dice a un cliente que lo que ve hoy puede no
              ser lo de la semana que viene, y es lo que hace que un cambio no se lea como un fallo. */}
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#8a6d1f]">
            Beta
          </span>
        </div>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">Organiza y programa los turnos de tu equipo</p>
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setParams(t.id === 'calendario' ? {} : { tab: t.id })}
                className={`pb-3 whitespace-nowrap text-sm border-b-2 transition-colors ${tab === t.id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted font-medium hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {tab === 'calendario' && <CalendarioDeTurnos />}
      {tab === 'catalogo' && <CatalogoDeTurnos />}
    </div>
  );
}
