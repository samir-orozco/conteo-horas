import { useSearchParams } from 'react-router-dom';
import CatalogoDeTurnos from './turnos/CatalogoDeTurnos';
import CalendarioDeTurnos from './turnos/CalendarioDeTurnos';
import FuncionBloqueada from '../components/FuncionBloqueada';
import { useMiPlan } from '../lib/plan';

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

  // ESTE MÓDULO ES DEL PLAN EMPRESARIAL (30 de septiembre de 2026, decisión del dueño), y el super
  // admin puede prendérselo o apagárselo a un cliente suelto desde su ficha.
  //
  // EL ÍTEM SIGUE EN EL MENÚ para quien no lo tiene, y es aquí donde se le ofrece subir. Es el patrón
  // de Reportes, Sedes y Conexiones, y la razón es de venta: a lo que no se ve nadie le pide acceso.
  //
  // CON EL PLAN TODAVÍA EN `null` NO SE BLOQUEA. `useMiPlan` arranca vacío y resuelve después, así que
  // bloquear con `null` le enseñaría el candado durante un instante, en cada entrada, a un cliente que
  // sí lo tiene pagado. El servidor es el que de verdad guarda la puerta: las nueve rutas responden
  // 403 por su `preHandler`, así que esto es la cortesía de explicarlo, no la cerradura.
  const { plan } = useMiPlan();
  const sinPlan = !!plan && !plan.features.turnos;

  return (
    <div className="w-full">
      <div className="px-6 md:px-8 pt-6 md:pt-8">
        {/* EL SUBTÍTULO ES DE LA MAQUETA. No es relleno: esta pantalla y «Configuración → Horario»
            se parecen lo bastante como para que alguien entre aquí buscando las tolerancias. Una
            línea que diga qué se hace aquí ahorra ese viaje. */}
        {/* La etiqueta BETA no va aquí sino en el MENÚ (decisión del dueño): ahí se ve antes de
            entrar, que es cuando sirve para decidir si uno se apoya en este módulo. */}
        <h2 className="text-2xl font-bold text-ink">Turnos</h2>
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

      {sinPlan ? (
        <div className="px-6 md:px-8 pt-6">
          <FuncionBloqueada
            titulo="Turnos y programación"
            descripcion="Arma tu catálogo de turnos y programa a todo tu equipo en un calendario de día, semana o mes, con los avisos de horas y de descansos antes de escribir nada."
            plan="Empresarial"
          />
        </div>
      ) : (
        <>
          {tab === 'calendario' && <CalendarioDeTurnos />}
          {tab === 'catalogo' && <CatalogoDeTurnos />}
        </>
      )}
    </div>
  );
}
