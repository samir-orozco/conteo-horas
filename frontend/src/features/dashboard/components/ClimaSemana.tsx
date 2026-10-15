import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Gift, Lock, Smile, UserRoundSearch } from 'lucide-react';
import { IMAGEN_DE_CARITA } from '../../clima/caritas';
import { COLOR_DE_CARITA, caritaDelPromedio, decimal, respondieron, variacion } from '../../clima/panelClima';
import { ultimoDiaCubierto } from '../../../lib/fechas';
import { invitacionDelClima, repartoDeCaritas } from '../clima';
import type { ClimaDelInicio, VistazoDelClima } from '../types';

// EL CLIMA LABORAL EN EL INICIO (15 de octubre de 2026). Solo la recibe el administrador: el servidor no la manda
// a nadie más. Con la función: el ánimo de los últimos 7 días, cómo se sintieron y cuántas personas necesitan
// atención, que lleva al panel. Sin ella: las MISMAS cifras de la vista sin el plan de la página del clima, sin
// nombres, y la invitación a probarlo. Las cuentas son las del panel (backend: utils/lecturasDelClima.ts).

const QUE_ES = 'Tu equipo califica su día con una carita al marcar la salida, y tú ves cómo está el ánimo, por qué y quién necesita atención.';

function Cifras({ v }: { v: VistazoDelClima }) {
  const carita = caritaDelPromedio(v.promedio);
  const cambio = variacion(v.variacion);
  const resp = respondieron(v.total, v.jornadas);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-muted mb-1">Ánimo promedio</p>
        <div className="flex items-center gap-2">
          {carita !== null && <img src={IMAGEN_DE_CARITA[carita]} alt="" className="w-9 h-9" />}
          <span className="text-3xl font-bold text-ink tabular-nums">{v.promedio !== null ? decimal(v.promedio) : '—'}</span>
          <span className="text-sm text-muted">de 5</span>
        </div>
        <p className="text-xs text-muted mt-1">
          {cambio
            ? <><span className={cambio.sube === true ? 'text-green-700 font-semibold' : cambio.sube === false ? 'text-red-700 font-semibold' : 'font-semibold'}>{cambio.texto}</span> frente a los 7 días anteriores</>
            : 'Sin días anteriores para comparar'}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted mb-1">Respondieron</p>
        <span className="block text-3xl font-bold text-ink tabular-nums leading-9">{resp.porcentaje !== null ? `${resp.porcentaje} %` : '—'}</span>
        <p className="text-xs text-muted mt-1">{resp.porcentaje !== null ? resp.texto : 'Nadie cerró jornada en el kiosco'}</p>
      </div>
    </div>
  );
}

// La barra de cómo se sintieron. El color ayuda, pero la carita y la cantidad van escritas debajo de cada tramo:
// el color nunca es lo único que dice cuál es (ver la nota de COLOR_DE_CARITA).
function Reparto({ distribucion }: { distribucion: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const tramos = repartoDeCaritas(distribucion);
  return (
    <div className="mt-5">
      <div aria-hidden className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
        {tramos.map(t => t.ancho > 0 && <div key={t.carita} style={{ width: `${t.ancho}%`, background: COLOR_DE_CARITA[t.carita] }} />)}
      </div>
      <ul aria-label="Cómo se sintieron" className="grid grid-cols-5 mt-2">
        {tramos.map(t => (
          <li key={t.carita} aria-label={`${t.nombre}: ${t.cantidad}`} title={t.nombre} className="flex flex-col items-center gap-0.5">
            <img src={IMAGEN_DE_CARITA[t.carita]} alt="" className="w-6 h-6" />
            <span aria-hidden className="text-xs font-semibold text-ink tabular-nums">{t.cantidad}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const personas = (n: number) => `${n} ${n === 1 ? 'persona necesita' : 'personas necesitan'} atención`;

export default function ClimaSemana({ clima }: { clima: ClimaDelInicio }) {
  const navigate = useNavigate();
  const v = clima.vistazo;
  const conFuncion = clima.estado === 'ACTIVO';

  return (
    <section aria-label="Clima laboral" className={`bg-white rounded-card p-5 ${conFuncion ? 'border border-gray-200' : 'border border-dashed border-gray-300'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="font-semibold text-ink flex items-center gap-2">
          {conFuncion ? <Smile size={16} className="text-green-600" /> : <Lock size={16} className="text-muted" />} Clima laboral
        </p>
        {conFuncion
          ? <span className="text-xs text-muted">últimos 7 días</span>
          : <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full shrink-0">Plan Empresarial</span>}
      </div>
      {conFuncion && clima.prueba.vigente && (
        <p className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-ink">
          <Gift size={13} aria-hidden="true" /> Prueba gratis hasta el {ultimoDiaCubierto(clima.prueba.vigente.hasta)}
        </p>
      )}

      {v.total === 0 ? (
        conFuncion ? (
          <div>
            <p className="text-sm text-ink font-semibold">Nadie calificó su día en los últimos 7 días.</p>
            <p className="text-sm text-muted mt-1">La pregunta sale en el kiosco al marcar la salida que cierra la jornada.</p>
          </div>
        ) : <p className="text-sm text-muted">{QUE_ES}</p>
      ) : (
        <>
          <Cifras v={v} />
          {conFuncion && <Reparto distribucion={clima.distribucion} />}
        </>
      )}

      {/* «Necesita atención» es cómo está cada uno hoy, no los 7 días: una semana sin respuestas no la esconde. */}
      {conFuncion ? (
        v.atencion > 0 ? (
          // Al seguimiento: ahí están siempre, con su caso. El resumen del panel las esconde en un período sin respuestas.
          <button type="button" onClick={() => navigate('/app/clima?tab=seguimiento')}
            className="mt-4 w-full flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-left text-sm font-medium text-ink hover:border-ink transition-colors">
            <UserRoundSearch size={16} className="text-muted shrink-0" aria-hidden="true" />
            <span className="flex-1">{personas(v.atencion)}</span>
            <ArrowRight size={14} className="text-muted shrink-0" />
          </button>
        ) : v.total > 0 && <p className="mt-4 text-xs text-muted">Nadie lleva tres respuestas malas seguidas</p>
      ) : (
        <SinPlan atencion={v.atencion} clima={clima} />
      )}
    </section>
  );
}

function SinPlan({ atencion, clima }: { atencion: number; clima: ClimaDelInicio }) {
  const navigate = useNavigate();
  const inv = invitacionDelClima(clima.prueba);
  return (
    <div className="mt-4 space-y-3">
      {atencion > 0 && (
        <div className="text-sm">
          <p className="text-ink font-medium">{personas(atencion)}</p>
          <p className="text-xs text-muted">Con el plan Empresarial ves quiénes y por qué</p>
        </div>
      )}
      {inv.nota && <p className="text-xs text-muted">{inv.nota}</p>}
      <button type="button" onClick={() => navigate(inv.destino)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg">
        {clima.prueba.disponible ? <Gift size={15} aria-hidden="true" /> : null}{inv.boton}{clima.prueba.disponible ? null : <ArrowUpRight size={15} />}
      </button>
    </div>
  );
}
